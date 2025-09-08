const TimetableSlot = require("../models/TimetableSlot");
const Exam = require("../models/Exam");

function dateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupByDay(slots) {
  const grouped = {};
  for (const slot of slots) {
    const key = slot.date
      ? new Date(slot.date).toDateString()
      : slot.day; // if no date, use day
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }

  // sort each day's slots by start time
  for (const key in grouped) {
    grouped[key].sort((a, b) => {
      const t1 = a.timeSlot.split("-")[0].trim();
      const t2 = b.timeSlot.split("-")[0].trim();
      return t1.localeCompare(t2);
    });
  }

  return grouped;
}

module.exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;
    const classGroups = Array.isArray(user.classGroup)
      ? user.classGroup
      : [user.classGroup];

    // 1. Get Timetable
    const slots = await TimetableSlot.find({
      classGroup: { $in: classGroups },
    })
      .populate("teacher", "username")
      .sort({ day: 1, timeSlot: 1 })
      .lean();

    const timetable = groupByDay(slots);

    // 2. Get Exams relevant to the student
    const exams = await Exam.find({ classGroup: { $in: classGroups } }).lean();
    const myExams = [];
    for (const exam of exams) {
      for (const ra of exam.roomAssignments) {
        if (
          ra.students.some(
            (s) => s.toString() === user._id.toString()
          )
        ) {
          myExams.push({
            subject: exam.subject,
            date: exam.date,
            timeSlot: exam.timeSlot,
            room: ra.room,
          });
        }
      }
    }

    res.render("student/dashboard", {
      user,
      timetable,
      exams: myExams,
    });
  } catch (err) {
    console.error("Error in getDashboard:", err);
    res.status(500).send("Server error");
  }
};
