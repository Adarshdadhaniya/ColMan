const Leave = require("../models/Leave");
const TimetableSlot = require("../models/TimetableSlot");
const ExchangeRequest = require("../models/ExchangeRequest");
const User = require("../models/User");

module.exports = {

  // Show leave application page
  getApplyLeave: async (req, res) => {
    const teacherId = req.user._id;
    // Fetch teacher's timetable slots for selection
const slots = await TimetableSlot.find({
  teacher: teacherId,
  subject: { $ne: "free" }   // $ne = "not equal"
}).lean();
    res.render("leave/apply_leave", { slots });
  },

  // Handle leave application submission
  postApplyLeave: async (req, res) => {
  
    const { date, slotIds, reason } = req.body; // slotIds = array of selected slots
    const teacherId = req.user._id;

    if (!slotIds || slotIds.length === 0) {
      return res.status(400).send("No slots selected for leave");
    }
   const slotIds1 = Array.isArray(slotIds) ? slotIds : [slotIds];
    // console.log(`Teacher ${teacherId} applying for leave on ${date} for slots: ${slotIds1}`);
    // 1. Create leave entry
    const leave = await Leave.create({
      teacher: teacherId,
      date,
      slots: slotIds1,
      reason,
    });
    
    // 2. For each slot, create a new TimetableSlot marked as free
    for (let slotId of slotIds1) {
        console.log(`Processing slot ID: ${slotId}`);
      const originalSlot = await TimetableSlot.findById(slotId).lean();
    //   console.log(originalSlot);
      if (!originalSlot) continue;

      await TimetableSlot.create({
        teacher: originalSlot.teacher, // same teacher
        classGroup: originalSlot.classGroup,
        subject: "free", // mark as free
        date: originalSlot.date,
        timeSlot: originalSlot.timeSlot,
        room: originalSlot.room,
        day: originalSlot.day,
        collegeId: originalSlot.collegeId,
      });

      // 3. Send cover requests to all teachers in the same classGroup
      const classmatesTeachers = await User.find({
        classGroup: originalSlot.classGroup,
        _id: { $ne: teacherId },
        role: "teacher"
      }).lean();
       console.log(`Found ${classmatesTeachers.length} potential cover teachers in classGroup ${originalSlot.classGroup}`);
      for (let t of classmatesTeachers) {
        await ExchangeRequest.create({
          type: "cover",
          sender: teacherId,
          receiver: t._id,
          initiatingSlot: originalSlot._id,
          targetSlot: null,
          dateA: date,
          dateB: null,
          status: "pending",
          initiatingSubject: originalSlot.subject,
          targetSubject: "",
        });
      }
      console.log(`Cover requests sent to ${classmatesTeachers.length} teachers for slot ${slotId}`);
    }

    res.redirect("/leave/apply");
  },
};
