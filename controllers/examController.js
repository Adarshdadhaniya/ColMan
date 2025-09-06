// controllers/examController.js
const Exam = require("../models/Exam");
const TimetableSlot = require("../models/TimetableSlot");
const User = require("../models/User");
const { ROOMS } = require("../utils/room");




// --- Helpers ---
function toMinutes(str) {
  str = str.trim();
  // handle formats: "9", "9:00", "9-10", "09:00-12:00"
  let [h, m] = str.split(":").map(Number);
  if (isNaN(m)) m = 0;
  return h * 60 + m;
}

function slotToMinutes(slotStr) {
  const [startRaw, endRaw] = slotStr.split("-").map(s => s.trim());
  const start = toMinutes(startRaw);
  let end = toMinutes(endRaw);

  // handle shorthand like "10-1" → 10:00 → 13:00
  if (end <= start) {
    end += 12 * 60; // assume PM if wrapped
  }

  return [start, end];
}


function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}


function dateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getDayName(date) {
  return date.toLocaleDateString("en-US", { weekday: "long" }); // e.g., "Monday"
}

// Optimized availability check
// Check which teachers are free for a given date + time range
async function teachersFreeForRange(date, timeSlot) {
  const [s, e] = slotToMinutes(timeSlot);

  const dateStart = dateOnly(date);
  const dayName = getDayName(dateStart);

  const busy = new Set();
  const slots = await TimetableSlot.find({
    $or: [{ date: dateStart }, { date: null, day: dayName }],
  }).lean();

  for (const slot of slots) {
    if (!slot.timeSlot || !slot.teacher) continue;
    const [rs, re] = slotToMinutes(slot.timeSlot);
    if (rangesOverlap(s, e, rs, re)) {
      busy.add(slot.teacher.toString());
    }
  }

  const allTeachers = await User.find({ role: "teacher" }).lean();
  return allTeachers.filter((t) => !busy.has(t._id.toString()));
}
// Check if a single teacher has a conflict
async function teacherHasConflict(teacherId, date, timeSlot) {
  const [s, e] = slotToMinutes(timeSlot);

  const dateStart = dateOnly(date);
  const dayName = getDayName(dateStart);

  const slots = await TimetableSlot.find({
    teacher: teacherId,
    $or: [{ date: dateStart }, { date: null, day: dayName }],
  }).lean();

  for (const slot of slots) {
    if (!slot.timeSlot) continue;
    const [rs, re] = slotToMinutes(slot.timeSlot);
    if (rangesOverlap(s, e, rs, re)) return true;
  }

  return false;
}
// --- Controller exports ---

module.exports.getCreateExamForm = async (req, res) => {
  try {
    res.render("exam/create", { rooms: ROOMS });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

module.exports.postCreateExam = async (req, res) => {
  try {
    const { examType, subject, classGroup, date, timeSlot, selectedRooms } =
      req.body;
    const roomAssignments = (Array.isArray(selectedRooms)
      ? selectedRooms
      : selectedRooms
      ? [selectedRooms]
      : []
    ).map((r) => {
      const [room, cap] = r.split("|");
      return { room, capacity: Number(cap), students: [] };
    });

    const exam = await Exam.create({
      examType,
      subject: subject.trim().toUpperCase(),
      classGroup: classGroup.trim().toUpperCase(),
      date: new Date(date),
      timeSlot: timeSlot.trim(),
      roomAssignments,
      invigilators: [],
      createdBy: req.user._id,
    });

    // after exam creation → go to assign students first
    res.redirect(`/exam/${exam._id}/assign-students`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating exam");
  }
};
// Get available rooms (now checks both date and recurring day slots)
module.exports.getAvailableRooms = async (req, res) => {
  try {
    const { date, timeSlot } = req.query;
    if (!date || !timeSlot) return res.json([]);

    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dayName = getDayName(dateStart);

    const [examStart, examEnd] = slotToMinutes(timeSlot);

    // fetch all slots for that date OR recurring slots for that weekday
    const busySlots = await TimetableSlot.find({
      $or: [{ date: dateStart }, { date: null, day: dayName }],
    }).lean();

    const busyRooms = new Set();

    for (const slot of busySlots) {
      if (!slot.timeSlot || !slot.room) continue;
      const [slotStart, slotEnd] = slotToMinutes(slot.timeSlot);
      if (rangesOverlap(examStart, examEnd, slotStart, slotEnd)) {
        busyRooms.add(slot.room);
      }
    }

    const freeRooms = ROOMS.filter((r) => !busyRooms.has(r.room));
    res.json(freeRooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


module.exports.getAssignStudents = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("roomAssignments.students")
      .lean();
    if (!exam) return res.status(404).send("Exam not found");

    const students = await User.find({
      role: "student",
      classGroup: exam.classGroup,
    }).lean();

    res.render("exam/assign-students", { exam, students });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

module.exports.postAssignStudents = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).send("Exam not found");

    for (let i = 0; i < exam.roomAssignments.length; i++) {
      const key = `room_${i}`;
      const values = req.body[key];
      if (!values) {
        exam.roomAssignments[i].students = [];
      } else {
        const arr = Array.isArray(values) ? values : [values];
        exam.roomAssignments[i].students = arr;
      }
    }

    await exam.save();

    // after assigning students → move to invigilator assignment
    res.redirect(`/exam/${exam._id}/assign-invigilators`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

module.exports.getAssignInvigilators = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).lean();
    if (!exam) return res.status(404).send("Exam not found");

    const freeTeachers = await teachersFreeForRange(exam.date, exam.timeSlot);
    const creator = await User.findById(exam.createdBy).lean();
    const creatorIsFree = freeTeachers.some(
      (t) => t._id.toString() === creator._id.toString()
    );
    if (!creatorIsFree) {
      creator.conflict = true;
      freeTeachers.unshift(creator);
    }

    res.render("exam/assign-invigilators", {
      exam,
      rooms: exam.roomAssignments,
      freeTeachers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

module.exports.postAssignInvigilators = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).send("Exam not found");

    const invForRoom =
      req.body["invigilatorForRoom[]"] ||
      req.body.invigilatorForRoom ||
      req.body.invigilatorForRoom;
    const overrideCreatorBusy = !!req.body.overrideCreatorBusy;
    const arr = Array.isArray(invForRoom)
      ? invForRoom
      : invForRoom
      ? [invForRoom]
      : [];

    const slotsToCreate = [];

    for (let i = 0; i < arr.length; i++) {
      const tid = arr[i];
      if (!tid) continue;

      const hasConflict = await teacherHasConflict(
        tid,
        exam.date,
        exam.timeSlot
      );

      if (hasConflict) {
        if (tid.toString() === exam.createdBy.toString() && overrideCreatorBusy) {
          // same logic for free placeholder if override
          const dateStart = dateOnly(exam.date);
          const dayName = getDayName(dateStart);
          const existing = await TimetableSlot.find({
            teacher: tid,
            $or: [{ date: dateStart }, { date: null, day: dayName }],
          }).lean();

          for (const slot of existing) {
            const [rs, re] = slotToMinutes(slot.timeSlot);
const [examS, examE] = slotToMinutes(exam.timeSlot);
            if (rangesOverlap(rs, re, examS, examE)) {
              slotsToCreate.push({
                collegeId: req.user.collegeId,
                classGroup: slot.classGroup,
                subject: "FREE",
                teacher: slot.teacher,
                day: "not applicable",
                date: dateOnly(slot.date || exam.date),
                timeSlot: slot.timeSlot,
                room: slot.room,
                isExtra: slot.isExtra || false,
              });
            }
          }
        } else {
          const teacher = await User.findById(tid).lean();
          return res
            .status(400)
            .send(
              `Teacher ${
                teacher ? teacher.username : tid
              } has a conflicting timetable. Remove them or choose a different teacher.`
            );
        }
      }

      const roomEntry = exam.roomAssignments[i];
      if (!roomEntry || !roomEntry.students.length) continue; // only assign if students present

      slotsToCreate.push({
        collegeId: req.user.collegeId || "",
        classGroup: exam.classGroup,
        subject: "EXAM",
        teacher: tid,
        day: "not applicable",
        date: dateOnly(exam.date),
        timeSlot: exam.timeSlot,
        room: roomEntry.room,
        isExtra: false,
      });

      if (!exam.invigilators.map((x) => x.toString()).includes(tid))
        exam.invigilators.push(tid);
    }

    if (slotsToCreate.length) await TimetableSlot.insertMany(slotsToCreate);
    await exam.save();

    return res.redirect("/exam/duties");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

module.exports.getUpcomingExamsStudent = async (req, res) => {
  try {
    const classGroups = Array.isArray(req.user.classGroup)
      ? req.user.classGroup
      : [req.user.classGroup];
    const exams = await Exam.find({ classGroup: { $in: classGroups } })
      .sort({ date: 1 })
      .lean();
    res.render("exam/upcomingStudent", { exams });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

module.exports.getExamDutiesTeacher = async (req, res) => {
  try {
    const exams = await Exam.find({ invigilators: req.user._id })
      .sort({ date: 1 })
      .lean();
    res.render("exam/dutiesTeacher", { exams });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
