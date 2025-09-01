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
  res.render("teacher/selectfromclasses", { classGroups });
}; 

// STEP 1: Show classes teacher is teaching
module.exports.getSelectClass = async (req, res) => {
  const teacherId = req.user._id;
  const classes = await TimetableSlot.distinct("classGroup", { teacher: teacherId });
  res.render("teacher/selectClass", { classes });
};

// STEP 2: Handle class selection and date input
module.exports.postSelectClass = async (req, res) => {
  const { classGroup, date } = req.body;
  res.redirect(`/teacher/extra/select-slot/${classGroup}/${date}`);
};

// STEP 3: Show slots for that class & date
module.exports.getSelectSlot = async (req, res) => {
  const { classGroup, date } = req.params;
  const teacherId = req.user._id;

  const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" });

  // Find slots already booked for that date/classGroup
  const slots = await TimetableSlot.find({
    collegeId: req.user.collegeId,
    classGroup,
    day: dayName,
    timeSlot: { $exists: true },
  }).populate("teacher");
  console.log(slots);
  res.render("teacher/selectSlot", {
    classGroup,
    date,
    slots,
    timeSlots: TIME_SLOTS,
    days: DAYS
  });
};

// STEP 4: Handle slot choice
module.exports.postSelectSlot = async (req, res) => {
  const { classGroup, date, slot, isFree } = req.body;
  const day = new Date(date).toLocaleDateString("en-US", { weekday: "long" });

  if (isFree === "true") {
    // Next → pick a room
    res.redirect(`/teacher/extra/select-room/${classGroup}/${day}/${slot}`);
  } else {
    // Occupied slot → exchange
    res.redirect(`/exchange/initiate?classGroup=${classGroup}&date=${date}&slot=${slot}`);
  }
};

// STEP 5: Show available rooms for that slot
module.exports.getSelectRoom = async (req, res) => {
  const { classGroup, day, slot } = req.params;

  // all rooms
  const allRooms = await TimetableSlot.distinct("room", { collegeId: req.user.collegeId });

  // rooms already booked for that day+slot
  const bookedRooms = await TimetableSlot.distinct("room", {
    collegeId: req.user.collegeId,
    day,
    timeSlot: slot,
  });

  const freeRooms = allRooms.filter(r => !bookedRooms.includes(r));

  // Calculate date from day for the form (assuming current week)
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const targetDayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(day);
  const daysDiff = targetDayIndex - currentDay;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysDiff);
  const date = targetDate.toISOString().split('T')[0];

  res.render("teacher/selectRoom", {
    classGroup,
    day,
    date,
    slot,
    freeRooms,
  });
};

// STEP 6: Handle room choice → go to subject selection
module.exports.postSelectRoom = (req, res) => {
  const { classGroup, date, slot, room } = req.body;
  res.redirect(`/teacher/extra/select-subject/${classGroup}/${date}/${slot}/${room}`);
};

// STEP 7: Show subjects teacher teaches this classGroup
module.exports.getSelectSubject = async (req, res) => {
  const { classGroup, date, slot, room } = req.params;

  const teacherId = req.user._id;
  const subjects = await TimetableSlot.distinct("subject", {
    teacher: teacherId,
    classGroup,
  });

  res.render("teacher/selectSubject", {
    classGroup,
    date,
    slot,
    room,
    subjects,
  });
};

// STEP 8: Create the extra class
module.exports.postCreateExtra = async (req, res) => {
  const { classGroup, date, slot, room, subject } = req.body;

  await TimetableSlot.create({
    collegeId: req.user.collegeId,
    classGroup,
    subject,
    teacher: req.user._id,
    day: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
    date,
    timeSlot: slot,
    room,
    isExtra: true,
  });

  res.redirect("/teacher/dashboard");
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