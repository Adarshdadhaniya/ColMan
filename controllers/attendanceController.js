// controllers/attendanceController.js
const Attendance = require("../models/attendance");
const TimetableSlot = require("../models/TimetableSlot");
const User = require("../models/User");

function dayNameFromDate(date) {
  return new Date(date).toLocaleDateString("en-US", { weekday: "long" });
}

module.exports = {
    getChooseDate: (req, res) => {
  res.render("attendance/date");
},

postChooseDate: (req, res) => {
  const { date } = req.body;
  if (!date) return res.redirect("/attendance/date");
  res.redirect(`/attendance/slots?date=${date}`);
},

getSlotsForDate: async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.redirect("/attendance/date");

    const teacherId = req.user._id;
    const day = dayNameFromDate(date);

    // base timetable slots for that teacher/day
  let slots = await TimetableSlot.find({
  teacher: teacherId,
  $or: [
    { date: date },   // date-specific adjusted slot
    { day: day }      // base recurring slot (if no date override)
  ]
}).lean();

    res.render("attendance/slots", { date, slots });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading slots");
  }
},

  // Step 1: show attendance form
  getMarkAttendance: async (req, res) => {
    try {
      const { date, slotId } = req.query;
      if (!date || !slotId) return res.status(400).send("Date and slot required");

      const slot = await TimetableSlot.findById(slotId).lean();
      if (!slot) return res.status(404).send("Slot not found");

      // get students in that classGroup
      const students = await User.find({ 
        role: "student", 
        classGroup: { $in: slot.classGroup } 
      }).lean();
      console.log(students.length);

      // load existing attendance if already marked
      const existing = await Attendance.find({ slot: slotId, date }).lean();

      res.render("attendance/mark", { date, slot, students, existing });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

  // Step 2: save attendance
  postMarkAttendance: async (req, res) => {
    try {
      const { date, slotId, records } = req.body; 
      // records is object: { studentId: "present"/"absent"/... }

      const teacherId = req.user._id;

      for (let studentId in records) {
        const status = records[studentId];

        await Attendance.findOneAndUpdate(
          { date, slot: slotId, student: studentId },
          { date, slot: slotId, student: studentId, status, markedBy: teacherId },
          { upsert: true, new: true }
        );
      }

      res.redirect(`/attendance/view?date=${date}&slotId=${slotId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error saving attendance");
    }
  },

  // Step 3: view attendance for class/date
  getViewAttendance: async (req, res) => {
    try {
      const { date, slotId } = req.query;
      if (!date || !slotId) return res.status(400).send("Date and slot required");

      const slot = await TimetableSlot.findById(slotId).lean();
      const records = await Attendance.find({ date, slot: slotId })
        .populate("student")
        .lean();

      res.render("attendance/view", { date, slot, records });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

  // Step 4: view one student’s full attendance
  getStudentAttendance: async (req, res) => {
    try {
      const studentId = req.params.id;
      const student = await User.findById(studentId).lean();
      const records = await Attendance.find({ student: studentId })
        .populate("slot")
        .lean();

      res.render("attendance/student", { student, records });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },
};
