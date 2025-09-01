const fs = require("fs");
const csv = require("csv-parser");

const User = require("../models/User"); 
const TimetableSlot = require("../models/TimetableSlot");
const { DAYS, TIME_SLOTS } = require("../utils/constants");

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
      grid[s.day][s.timeSlot] = s;  
    }
  }

  return grid;
}

// ---------------- USERS ----------------
module.exports.uploadUsersForm = (req, res) => {
  res.render("admin/uploadUsers.ejs");
};

module.exports.uploadUsers = async (req, res) => {
  const users = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        users.push({
          username: row.username,
          email: row.email,
          role: row.role,
          classGroup: row.classGroup ? row.classGroup.split(";") : [],
          teaches: row.teaches ? row.teaches.split(";") : [],
          rollNumber: row.rollNumber ? parseInt(row.rollNumber) : undefined,
          password: row.password,
          collegeId: row.collegeId,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  const skippedUsers = [];

  const userPromises = users.map(async (u) => {
    const exists = await User.findOne({ username: u.username });
    if (!exists) {
      const newUser = new User({
        username: u.username,
        email: u.email,
        role: u.role,
        classGroup: u.classGroup,
        teaches: u.teaches,
        rollNumber: u.rollNumber,
        collegeId: u.collegeId,
      });
      await User.register(newUser, u.password);
    } else {
      skippedUsers.push(u);
    }
  });

  await Promise.all(userPromises);

  fs.unlinkSync(req.file.path);

  if (skippedUsers.length > 0) {
    console.log("\n⛔ Skipped Users (already exist):");
    skippedUsers.forEach((u, index) => {
      console.log(`${index + 1}. ${u.username} | ${u.email} | ${u.role}`);
    });
  }

  console.log(skippedUsers.length > 0 ? `\n${skippedUsers.length} users skipped.` : "All users uploaded successfully!");

  res.send("Users uploaded successfully!");
};

module.exports.viewUsers = async (req, res) => {
  const allUsers = await User.find({ collegeId: req.user.collegeId });
  const students = allUsers.filter(u => u.role === "student");
  const teachers = allUsers.filter(u => u.role === "teacher");
  res.render("admin/viewUsers.ejs", { students, teachers });
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
  const { username, email, role, classGroup, teaches, rollNumber, collegeId } = req.body;

  // Check duplicate username
  const existingUserByUsername = await User.findOne({ username, _id: { $ne: id } });
  if (existingUserByUsername) {
    return res.status(400).send("Username already taken!");
  }

  // Update user
  await User.findByIdAndUpdate(id, {
    username,
    email,
    role,
    collegeId,
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

// ---------------- TIMETABLE ----------------
module.exports.renderAllTimetables = async (req, res) => {
  const teachers = await User.find({ role: "teacher" });
  const classGroups = await User.distinct("classGroup", { role: "student" });
  res.render("admin/allTimetables", { teachers, classGroups });
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

module.exports.renderBulkUploadForm = (req, res) => {
  res.render("admin/bulktimetableupload");
};

module.exports.bulkUploadTimetables = async (req, res) => {
  const filePath = req.file.path;

  // Parse CSV into results[] using a Promise
  const results = await new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });

  const teacherEmails = [...new Set(results.map(r => r.teacherEmail))];
  const teachers = await User.find({ email: { $in: teacherEmails } });

  const emailToId = {};
  teachers.forEach(t => {
    emailToId[t.email] = t._id;
  });

  const skippedRows = [];
  const slotPromises = results.map(row => {
    const teacherId = emailToId[row.teacherEmail];
    if (!teacherId) {
      skippedRows.push(row);
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

  if (skippedRows.length > 0) {
    console.log("\n⛔ Skipped Rows (due to missing teachers):");
    skippedRows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.teacherEmail} | ${row.subject} | ${row.classGroup} | ${row.day} ${row.timeSlot}`);
    });
  }

  res.redirect("/admin/dashboard");
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

// ---------------- SLOTS ----------------
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

  res.render("admin/editslot", {
    slot: timetableSlot,
    teachers,
    days: DAYS,
    timeSlots: TIME_SLOTS,
    classGroups,
  });
};

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

// ---------------- DASHBOARD ----------------
module.exports.dashboard = async (req, res) => {
  res.render("admin/admindash.ejs",);
};
