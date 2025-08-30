const fs = require("fs");// Import the built-in 'fs' (File System) module to read/write files on the system
const csv = require("csv-parser");// Import the 'csv-parser' library to parse CSV files into JavaScript objects (stream-based)


const User = require("../models/User"); // Adjust the path based on your project
const TimetableSlot = require("../models/TimetableSlot");
const { DAYS, TIME_SLOTS } = require("../utils/constants");
// const path = require("path");



function buildGrid(slots, forClass = true) {
  const grid = {};
  DAYS.forEach(day => {
    grid[day] = {};
    TIME_SLOTS.forEach(slot => {
      grid[day][slot] = null;
    });
  });

  for (let s of slots) {
    if (grid[s.day]) {
      grid[s.day][s.timeSlot] = s;  // Store full slot object
    }
  }

  return grid;
}


module.exports.renderBulkUploadForm = (req, res) => {
  res.render("admin/bulktimetableupload");
};

module.exports.bulkUploadTimetables = async (req, res) => {
  const filePath = req.file.path;
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => results.push(row))
    .on("end", async () => {
      try {
        // Step 1: Get all unique teacher emails
        const teacherEmails = [...new Set(results.map(r => r.teacherEmail))];
        const teachers = await User.find({ email: { $in: teacherEmails } });

        // Step 2: Map teacher emails to IDs
        const emailToId = {};
        teachers.forEach(t => {
          emailToId[t.email] = t._id;
        });

        // Step 3: Create slots and log skipped
        const skippedRows = [];
        const slotPromises = results.map(row => {
          const teacherId = emailToId[row.teacherEmail];
          if (!teacherId) {
            skippedRows.push(row); // save full row for better debugging
            return null;
          }

          return new TimetableSlot({
            collegeId: row.collegeId,
            classGroup: row.classGroup,
            subject: row.subject,
            teacher: teacherId,
            day: row.day,
            timeSlot: row.timeSlot,
            room: row.room,
            isExtra: row.isExtra === "true"
          }).save();
        }).filter(Boolean);

        await Promise.all(slotPromises);
        fs.unlinkSync(filePath);

        // Log skipped rows clearly
        if (skippedRows.length > 0) {
          console.log("\n⛔ Skipped Rows (due to missing teachers):");
          skippedRows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.teacherEmail} | ${row.subject} | ${row.classGroup} | ${row.day} ${row.timeSlot}`);
          });
        }

        res.redirect("/admin/dashboard");

      } catch (err) {
        console.error("❌ Bulk timetable upload error:", err);
        res.status(500).send("Error uploading timetable slots.");
      }
    });
};


module.exports.viewTimetableByClass = async (req, res) => {
  const { classGroup } = req.params;
  const slots = await TimetableSlot.find({ classGroup }).populate("teacher");
  const grid = buildGrid(slots, true);
  res.render("admin/gridbyclass", { classGroup, grid, timeSlots: TIME_SLOTS, days: DAYS });
};

module.exports.viewTimetableByTeacher = async (req, res) => {
  const { teacherId } = req.params;
  const teacher = await User.findById(teacherId);
  const slots = await TimetableSlot.find({ teacher: teacherId }).populate("teacher");
  const grid = buildGrid(slots, false);
  res.render("admin/gridbyteacher", { teacher, grid, timeSlots: TIME_SLOTS, days: DAYS });
};



module.exports.dashboard = async (req, res) => {
  res.render("admin/admindash.ejs",);
};





// Exported controller function to handle uploaded CSV and create users
module.exports.uploadUsers = (req, res) => {
  const users = []; // Array to store parsed user objects from CSV

  // Create a readable stream from the uploaded CSV file
  fs.createReadStream(req.file.path) // fs is the built-in File System module in Node.js.
    // createReadStream(path) is a method provided by fs to read files as a stream, meaning the file is read in chunks, rather than all at once. This is memory-efficient, especially for large files like CSVs.
    .pipe(csv()) // Pipe the stream through the csv-parser to parse rows
    // .pipe() is a method used to connect one stream to another.
    .on("data", (row) => {
      //.on() is used to listen for events emitted by streams or other event emitters.

      // For each row, create a user object with appropriate field mappings
      const user = {
        username: row.username,
        email: row.email,
        role: row.role,
        classGroup: row.classGroup ? row.classGroup.split(";") : [], // Handle multiple values
        teaches: row.teaches ? row.teaches.split(";") : [],         // Handle multiple values
        rollNumber: row.rollNumber ? parseInt(row.rollNumber) : undefined,
        password: row.password,
        collegeId: row.collegeId, // Include collegeId if present in CSV
      };
      users.push(user); // Add to users array
    })
    .on("end", async () => { // runs at end of file parsing
      try {
        const skippedUsers = []; // To keep track of skipped users (already exist)

        // For each user from the CSV
        const userPromises = users.map(async (u) => {
          const exists = await User.findOne({ username: u.username }); // Check if user exists

          if (!exists) {
            // If user does not exist, register a new one
            const newUser = new User({
              username: u.username,
              email: u.email,
              role: u.role,
              classGroup: u.classGroup,
              teaches: u.teaches,
              rollNumber: u.rollNumber,
              collegeId: u.collegeId, // Store in DB
            });

            await User.register(newUser, u.password); // Register user with hashed password
          } else {
            skippedUsers.push(u); // If user exists, add to skipped list for logging
          }
        });

        await Promise.all(userPromises); // Wait for all async operations

        fs.unlinkSync(req.file.path); // Delete uploaded file after processing

        // Log skipped users clearly
        if (skippedUsers.length > 0) {
          console.log("\n⛔ Skipped Users (already exist):");
          skippedUsers.forEach((u, index) => {
            console.log(`${index + 1}. ${u.username} | ${u.email} | ${u.role}`);
          });
        }
        console.log(skippedUsers.length > 0 ? `\n${skippedUsers.length} users skipped.` : "All users uploaded successfully!");
        res.send("Users uploaded successfully!"); // Send success response
      } catch (err) {
        console.error(err); // Log error
        res.status(500).send("Error uploading users."); // Send error response
      }
    });
};





module.exports.uploadUsersForm = (req, res) => {
  res.render("admin/uploadUsers.ejs");
}
// Path: "admin/uploadUsers.ejs"
// This is a relative path used for rendering views or accessing files.

// ✅ Usage in res.render():
// In Express, use this path without a dot:
//     res.render("admin/uploadUsers")
// This tells Express to look inside the "views/admin/" folder for "uploadUsers.ejs".

// ❌ Do NOT use a leading dot in res.render():
//     res.render("./admin/uploadUsers") // This may fail
// Because Express automatically looks inside the "views" folder, adding "./" can confuse the path resolution.

// ✅ Usage with Node.js file operations (like fs.readFile):
// You CAN use a dot to indicate the current directory:
//     fs.readFile("./admin/uploadUsers.ejs", callback)
// In this case, "./" refers to the directory where the script is running.




module.exports.viewUsers = async (req, res) => {
  const allUsers = await User.find({ collegeId: req.user.collegeId });//returns an array of user objects
  const students = allUsers.filter(u => u.role === "student");
  const teachers = allUsers.filter(u => u.role === "teacher");
  res.render("admin/viewUsers.ejs", { students, teachers });
};





module.exports.renderAddUserForm = (req, res) => {
  res.render("admin/addUser"); // Path to EJS
};

module.exports.addSingleUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      classGroup,
      teaches,
      rollNumber,
    } = req.body;

    const newUser = new User({
      username,
      email,
      role,
      collegeId: req.user.collegeId, // Admin's collegeId
      classGroup: classGroup ? classGroup.split(";") : [],
      // The .split() method in JavaScript takes a string and splits it into an array based on a given separator.
      teaches: teaches ? teaches.split(";") : [],
      rollNumber: rollNumber ? parseInt(rollNumber) : undefined,
    });

    await User.register(newUser, password); // Passport-local-mongoose
    res.redirect("/admin/adduser"); // Or redirect wherever you like
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating user.");
  }
};





module.exports.renderAddUserForm = (req, res) => {
  res.render("admin/addUser");
};

module.exports.addSingleUser = async (req, res) => {
  const {
    username,
    email,
    password,
    role,
    classGroup,
    teaches,
    rollNumber,
  } = req.body;

  const newUser = new User({
    username,
    email,
    role,
    collegeId: req.user.collegeId,
    classGroup: classGroup ? classGroup.split(";") : [],
    teaches: teaches ? teaches.split(";") : [],
    rollNumber: rollNumber ? parseInt(rollNumber) : undefined,
  });

  await User.register(newUser, password);
  res.redirect("/admin/adduser");
};







module.exports.renderEditUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  res.render("admin/editUser", { user });
};

module.exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, role, classGroup, teaches, rollNumber } = req.body;

  await User.findByIdAndUpdate(id, {
    email,
    role,
    classGroup: classGroup ? classGroup.split(";") : [],
    teaches: teaches ? teaches.split(";") : [],
    rollNumber: rollNumber ? parseInt(rollNumber) : undefined,
  });

  res.redirect("/admin/users");
};

module.exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.redirect("/admin/users");
};







module.exports.renderAddForm = async (req, res) => {
  const teachers = await User.find({ role: "teacher" });
  res.render("admin/addtimetable", { teachers });
};



module.exports.addTimetable = async (req, res) => {
  const {
    collegeId,
    classGroup,
    subject,
    teacher,
    day,
    timeSlot,
    room,
    isExtra,
  } = req.body;

  const newSlot = new TimetableSlot({
    collegeId,
    classGroup,
    subject,
    teacher,
    day,
    timeSlot,
    room,
    isExtra: isExtra === "on",
  });

  await newSlot.save();
  res.redirect("/admin/dashboard");
};






module.exports.renderAllTimetables = async (req, res) => {
  const teachers = await User.find({ role: "teacher" });
  const classGroups = await User.distinct("classGroup", { role: "student" });
  res.render("admin/allTimetables", { teachers, classGroups });
};



module.exports.renderEditSlot = async (req, res) => {
  const { day, slot, target, classGroup, teacherId } = req.query;

  let timetableSlot;

  if (target === "class" && classGroup) {
    timetableSlot = await TimetableSlot.findOne({ day, timeSlot: slot, classGroup }).populate("teacher");
  } else if (target === "teacher" && teacherId) {
    timetableSlot = await TimetableSlot.findOne({ day, timeSlot: slot, teacher: teacherId }).populate("teacher");
  }

  if (!timetableSlot) {
    return res.redirect("back");
  }

  const teachers = await User.find({ role: "teacher" });
  const classGroups = await User.distinct("classGroup", { role: "student" });

  // Pass DAYS and TIME_SLOTS into the view
  res.render("admin/editslot", {
    slot: timetableSlot,
    teachers,
    days: DAYS,
    timeSlots: TIME_SLOTS,
    classGroups,
  });
};

//According to me there is no need to findone by classgroup,we can always find by teacherid and day and timeslot
// This is because each slot is unique for a teacher on a specific day and time.  
//Therefore target is not needed at all 




module.exports.updateSlot = async (req, res) => {
  const { id } = req.params;
  const { subject, teacher, classGroup, room, day, timeSlot } = req.body;
  const updatedData = {
    subject,
    teacher,
    classGroup, 
    room,
    day,
    timeSlot
};

await TimetableSlot.findByIdAndUpdate(id, updatedData);

  res.redirect("/admin/timetable");
};
