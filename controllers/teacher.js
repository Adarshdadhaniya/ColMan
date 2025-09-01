const { DAYS, TIME_SLOTS } = require("../utils/constants");
const TimetableSlot = require("../models/TimetableSlot");
const User = require("../models/User");
const moment = require("moment");

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




module.exports.renderDashboard = (req, res) => {
  res.render("teacher/teacherdash", { teacher: req.user });
};

module.exports.viewTimetableByClass = async (req, res) => {
  const { classGroup } = req.params;
  const slots = await TimetableSlot.find({ classGroup }).populate("teacher");
  const grid = buildGrid(slots, true);
  res.render("teacher/gridbyclass", {
    classGroup,
    grid,
    timeSlots: TIME_SLOTS,
    days: DAYS
  });
};


module.exports.viewTimetableByTeacher = async (req, res) => {
  const { teacherId } = req.params;
  const teacher = await User.findById(teacherId);
  const slots = await TimetableSlot.find({ teacher: teacherId }).populate("teacher");
  const grid = buildGrid(slots, false);
  res.render("teacher/gridbyteacher", {
    teacher,
    grid,
    timeSlots: TIME_SLOTS,
    days: DAYS
  });
};


module.exports.selectClassTimetable = async (req, res) => {
  const classGroups = await TimetableSlot.distinct("classGroup");
  res.render("teacher/selectclass", { classGroups });
}; 






module.exports.getAvailableExtraClassForm = async (req, res) => {
  const { classGroup, date } = req.query;
  const teacherId = req.user?._id;

  try {
    const teacherUser = await User.findById(teacherId);
    const teacherClassGroups = Array.isArray(teacherUser?.classGroup) ? teacherUser.classGroup : [];

    const baseRender = {
      classGroups: teacherClassGroups,
      selectedClassGroup: classGroup || "",
      selectedDate: date || "",
      timeslots: [],
      selectedSlot: "",
    };

    if (!classGroup || !date) {
      return res.render("teacher/extraClassForm", baseRender);
    }

    const dayOfWeek = moment(date).format("dddd");

    const occupiedSlots = await TimetableSlot.find({
      $or: [
        { teacher: teacherId },
        { classGroup }
      ],
      $or: [
        { date: new Date(date) },
        { date: null, day: dayOfWeek }
      ]
    }).distinct("timeSlot");

    const freeSlots = TIME_SLOTS.filter(s => !occupiedSlots.includes(s));

    return res.render("teacher/extraClassForm", {
      ...baseRender,
      timeslots: freeSlots
    });
  } catch (err) {
    console.error("Error rendering extra class form:", err);
    res.status(500).send("Internal Server Error");
  }
};



module.exports.renderExtraClassBookingForm = async (req, res) => {
  const { classGroup, date, slot } = req.query;
  const teacherId = req.user?._id;

  if (!classGroup || !date || !slot) {
    return res.status(400).send("Missing required data");
  }

  try {
    const teacherUser = await User.findById(teacherId);
    const allRooms = await TimetableSlot.distinct("room");

    const dayOfWeek = moment(date).format("dddd");

    const occupiedRooms = await TimetableSlot.find({
      timeSlot: slot,
      $or: [
        { date: new Date(date) },
        { date: null, day: dayOfWeek }
      ]
    }).distinct("room");

    const freeRooms = allRooms.filter(r => !occupiedRooms.includes(r));

    const subjects = Array.isArray(teacherUser.teaches) ? teacherUser.teaches : [];
    

    return res.render("teacher/confirmExtraClass", {
      classGroup,
      date,
      slot,
      freeRooms,
      subjects
    });
  } catch (err) {
    console.error("Error rendering confirm form:", err);
    res.status(500).send("Internal Server Error");
  }
};


module.exports.bookExtraClass = async (req, res) => {
  const { classGroup, date, slot, subject, room } = req.body;
  const teacherId = req.user?._id;

  if (!classGroup || !date || !slot || !subject || !room) {
    return res.status(400).send("Missing required fields");
  }

  try {
    await TimetableSlot.create({
      collegeId: req.user.collegeId,
      classGroup,
      subject,
      teacher: teacherId,
      day: moment(date).format("dddd"),
      date: new Date(date),
      timeSlot: slot,
      room,
      isExtra: true
    });

    res.redirect("/teacher/extraClass?success=1");
  } catch (err) {
    console.error("Error booking extra class:", err);
    res.status(500).send("Could not book extra class");
  }
};





// if (!classGroup) {
//       return res.render("rooms/available",...baseRender); 
//     }  now in the ejs i can directly access occupiedRooms without writing baseRender.occupiedRooms


// ChatGPT said:
// Right—what you’re seeing is just how object spread and EJS rendering work together.

// A few points to clarify:

// 1. What you should do
// Express’s res.render expects the second argument to be an object whose properties become variables in the template. So the canonical way is:

// js
// Copy
// Edit
// return res.render("rooms/available", baseRender);
// Or if you want to override/add per-call values:

// js
// Copy
// Edit
// return res.render("rooms/available", {
//   ...baseRender,
//   selectedSlot: "09:00", // override
//   extraFlag: true        // add
// });
// In your EJS file you can then do:

// ejs
// Copy
// Edit
// <% occupiedRooms.forEach(room => { %>
//   <div><%= room.name %></div>
// <% }) %>
// You don’t need to write baseRender.occupiedRooms because the properties of the object you passed (occupiedRooms, etc.) are injected directly into the template’s context.

// 2. What ...baseRender in your original line does
// This is likely a bug:

// js
// Copy
// Edit
// res.render("rooms/available", ...baseRender);
// ...baseRender will spread the properties of baseRender as individual arguments to res.render, not as one object. That’s not what res.render expects (it wants view, [locals], callback?). If baseRender has keys like occupiedRooms, freeRooms, etc., you’d be passing those as separate positional arguments, which usually results in an error or unexpected behavior. Maybe you meant:

// js
// Copy
// Edit
// res.render("rooms/available", { ...baseRender });
// which is equivalent to just baseRender unless you’re merging in/overriding additional values.

// 3. Template access
// Because you passed an object with occupiedRooms as a property, in EJS you access it by its key:

// ejs
// Copy
// Edit
// <%= occupiedRooms.length %>
// not baseRender.occupiedRooms—there is no baseRender variable in the template unless you explicitly passed one.

// 4. Shallow copy caveat (if you spread)
// If you do { ...baseRender } you get a shallow copy. Mutating nested arrays/objects (like pushing into occupiedRooms) will still affect the original unless you clone those too:

// js
// Copy
// Edit
// const safeRender = {
//   ...baseRender,
//   occupiedRooms: [...baseRender.occupiedRooms]
// };
// Summary
// Replace ...baseRender with either baseRender or { ...baseRender, more: "stuff" } in your res.render call. Then in EJS you can directly refer to occupiedRooms, freeRooms, etc., because they’ve been injected as top-level template variables.






// This takes your date, creates a Moment.js object from it, and then formats it using the "dddd" token, which represents the full name of the day of the week.

    // Examples:

    // js
    // Copy
    // Edit
    // moment("2025-08-04").format("dddd"); // "Monday"
    // moment("2025-08-05").format("dddd"); // "Tuesday"
    // moment().format("dddd");             // today's day name
    // "dddd" → full day name (e.g., "Monday")

    // "ddd" → short day name (e.g., "Mon")

    // "dd" → two-letter day (e.g., "Mo")

    // So if date is "2025-08-04",
    // moment(date).format("dddd") returns "Monday"