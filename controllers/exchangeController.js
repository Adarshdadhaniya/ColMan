// controllers/exchangeController.js
const TimetableSlot = require("../models/TimetableSlot");
const User = require("../models/User");
const ExchangeRequest = require("../models/ExchangeRequest");
const ExchangeSlot = require("../models/ExchangeSlot");
const dayNameFromDate = require("../utils/dayNameFromDate");
const fs = require("fs");

async function getTeacherCache() {
  return JSON.parse(fs.readFileSync("teacherCache.json", "utf8"));
}

module.exports = {
  getChooseDate: (req, res) => {
    res.render("exchange/chooseDate");
  },

  postChooseDate: (req, res) => {
    const { date } = req.body;
    res.redirect(`/exchange/select-slot?date=${date}`);
  },

  getSelectSlot: async (req, res) => {
    try {
      const userId = req.user._id;
      const dateStr = req.query.date;

      if (!dateStr) return res.redirect("/exchange/date");

      // Convert date string to Date object and get day name
      const date = new Date(dateStr);
      let day = dayNameFromDate(dateStr);
      day = day.charAt(0).toUpperCase() + day.slice(1); // "Monday", "Tuesday", etc.

      console.log("Looking for slots on", date, "which is a", day);

      // Find all slots: recurring (date:null && day matches) OR one-time (date matches exactly)
      const slots = await TimetableSlot.find({
        teacher: userId,
        $or: [
          { date: date },      // one-time slot for that exact date
          { day: day },        // recurring weekly slot
        ],
      }).lean();

      console.log("Found slots:", slots);

      res.render("exchange/select_slot", { slots, date: dateStr, user: req.user });
    } catch (err) {
      console.error("Error fetching slots:", err);
      res.status(500).send("Server Error");
    }
  },

  postSelectSlot: async (req, res) => {
    const { slotId, date } = req.body;
    res.redirect(`/exchange/choose-teacher?slotId=${slotId}&date=${date}`);
  },

  getChooseTeacher: async (req, res) => {
    try {
      const { slotId, date } = req.query;
      if (!slotId || !date) return res.redirect("/exchange/date");

      const initiatorSlot = await TimetableSlot.findById(slotId).lean();
      if (!initiatorSlot) return res.status(404).send("Slot not found");

      // Convert date string to Date object and day name
      const dateObj = new Date(date);
      let day = dayNameFromDate(date);
      day = day.charAt(0).toUpperCase() + day.slice(1); // "Monday"

      // Get all teachers in the college except the initiator
      const allTeachers = await User.find({
        collegeId: req.user.collegeId,
        role: "teacher",
        _id: { $ne: req.user._id },
      }).lean();

      // Fetch all slots on that day for all teachers
      const slotsOnDate = await TimetableSlot.find({
        $or: [
          { date: dateObj },
          { day: day },
        ],
      }).lean();

      // Categorize teachers
      const categorizedTeachers = {
        sameClassGroupFree: [],
        sameClassGroupBusy: [],
        differentClassGroupFree: [],
        differentClassGroupBusy: [],
      };

      allTeachers.forEach((t) => {
        const sharesClassGroup = t.classGroup.includes(initiatorSlot.classGroup);

        // Check if teacher is busy in any slot on that day
        const isBusy = slotsOnDate.some(
          (s) => s.teacher.toString() === t._id.toString() && s.timeSlot === initiatorSlot.timeSlot
        );

        if (sharesClassGroup && !isBusy) categorizedTeachers.sameClassGroupFree.push(t);
        else if (sharesClassGroup && isBusy) categorizedTeachers.sameClassGroupBusy.push(t);
        else if (!sharesClassGroup && !isBusy) categorizedTeachers.differentClassGroupFree.push(t);
        else categorizedTeachers.differentClassGroupBusy.push(t);
      });

      res.render("exchange/busy_options", {
        slot: initiatorSlot,
        date,
        teachers: categorizedTeachers,
      });
    } catch (err) {
      console.error("Error in getChooseTeacher:", err);
      res.status(500).send("Server Error");
    }
  },

getChooseTeacher: async (req, res) => {
  try {
    const userId = req.user._id;
    const { slotId, date } = req.query;
    if (!slotId || !date) return res.redirect("/exchange/date");

    const initiatorSlot = await TimetableSlot.findById(slotId).lean();
    if (!initiatorSlot) return res.status(404).send("Slot not found");

    // get day name from date
    const day = dayNameFromDate(date);

    // get all teachers excluding the initiator
    const allTeachers = await User.find({ _id: { $ne: userId }, role: "teacher" }).lean();

    // categories object
    const categories = {
      sameClassFree: [],
      sameClassBusy: [],
      diffClassFree: [],
      diffClassBusy: [],
    };

    // get all busy slots for that day and timeSlot
    const busySlots = await TimetableSlot.find({ day: initiatorSlot.day, timeSlot: initiatorSlot.timeSlot }).lean();
    const busyTeacherIds = busySlots.map(s => s.teacher.toString());

    // categorize teachers
    allTeachers.forEach(t => {
      const sharesClassGroup = Array.isArray(t.classGroup) && t.classGroup.includes(initiatorSlot.classGroup);
      const isBusy = busyTeacherIds.includes(t._id.toString());

      if (sharesClassGroup && !isBusy) categories.sameClassFree.push(t);
      else if (sharesClassGroup && isBusy) categories.sameClassBusy.push({ teacher: t, slot: busySlots.find(s => s.teacher.toString() === t._id.toString()) });
      else if (!sharesClassGroup && !isBusy) categories.diffClassFree.push(t);
      else categories.diffClassBusy.push({ teacher: t, slot: busySlots.find(s => s.teacher.toString() === t._id.toString()) });
    });

    // render EJS
    res.render("exchange/choose_teacher", {
      initiatorSlot,
      date,
      sameGroup_free: categories.sameClassFree,
      sameGroup_busy: categories.sameClassBusy,
      diffGroup_free: categories.diffClassFree,
      diffGroup_busy: categories.diffClassBusy
    });
  } catch (err) {
    console.error("Error in getChooseTeacher:", err);
    res.status(500).send("Server error");
  }
},

  postChooseTeacher: async (req, res) => {
    const { slotId, date, teacherId } = req.body;
    const targetTeacher = await User.findById(teacherId).lean();
   const day = dayNameFromDate(date); // e.g. "Monday"

const busySlots = await TimetableSlot.find({
  teacher: teacherId,
  $or: [
    { date: date },       // one-time slot
    { date: null, day }   // recurring weekly slot
  ]
}).lean();

    if (busySlots.length) {
      res.redirect(`/exchange/busy-options?slotId=${slotId}&teacherId=${teacherId}&date=${date}`);
    } else {
      res.redirect(`/exchange/choose-subject?slotId=${slotId}&teacherId=${teacherId}&date=${date}`);
    }
  },

  getBusyOptions: async (req, res) => {
  const { slotId, teacherId, date } = req.query;

  // find all slots where this teacher is busy on the chosen date
  const busySlots = await TimetableSlot.find({
    teacher: teacherId,
    $or: [
      { date },                        // one-time slot
      { date: null, day: dayNameFromDate(date) } // recurring weekly slot
    ]
  }).lean();

  res.render("exchange/busy_options", {
    busySlots,
    slotId,
    teacherId,
    date
  });
},


 postBusyOptions: async (req, res) => {
  const { slotId, teacherId, busySlotId, date } = req.body;

  res.redirect(
    `/exchange/choose-subject?slotId=${slotId}&teacherId=${teacherId}&busySlotId=${busySlotId}&date=${date}`
  );
},

 getChooseSubject: async (req, res) => {
  try {
    const { slotId, teacherId, busySlotId, date } = req.query;

    const slot = await TimetableSlot.findById(slotId).lean();       // initiator's slot
    const target = await User.findById(teacherId).lean();           // other teacher
    const busySlot = busySlotId ? await TimetableSlot.findById(busySlotId).lean() : null;

    let subjects = [];

    // If target teacher also teaches this classGroup → they must pick one of *their* subjects for it
    if (slot.classGroup && Array.isArray(target.classGroup) && target.classGroup.includes(slot.classGroup)) {
      // Assuming you store teacher’s subjects in `target.teaches`
      subjects = target.teaches || [];
    }

    res.render("exchange/chooseSubject", {
      slot,          // initiator’s slot
      target,        // target teacher
      busySlot,      // the target teacher’s conflicting slot (null if free)
      subjects,      // subjects they can pick (only filled if same classGroup)
      date
    });
  } catch (err) {
    console.error("Error in getChooseSubject:", err);
    res.status(500).send("Server error");
  }
},


  postChooseSubject: async (req, res) => {
    const { slotId, teacherId, busySlotId, date, targetSubject } = req.body;
    res.redirect(`/exchange/send-request?slotId=${slotId}&teacherId=${teacherId}&busySlotId=${busySlotId}&date=${date}&targetSubject=${targetSubject}`);
  },

  postSendRequest: async (req, res) => {
    const { slotId, teacherId, busySlotId, date, targetSubject } = req.query;
    const slot = await TimetableSlot.findById(slotId);
    const receiver = await User.findById(teacherId);

    const type = busySlotId ? "swap" : "free";

    const exchangeRequest = new ExchangeRequest({
      sender: req.user._id,
      receiver: teacherId,
      initiatingSlot: slotId,
      targetSlot: busySlotId || undefined,
      type,
      initiatingSubject: slot.subject,
      targetSubject: targetSubject || slot.subject,
      dateA: date,
    });

    await exchangeRequest.save();
    res.redirect("/exchange/requests");
  },

  getRequests: async (req, res) => {
    const sent = await ExchangeRequest.find({ sender: req.user._id }).populate('receiver initiatingSlot targetSlot').lean();
    const received = await ExchangeRequest.find({ receiver: req.user._id }).populate('sender initiatingSlot targetSlot').lean();
    res.render("exchange/requests", { sent, received });
  },
postAcceptRequest: async (req, res) => {
  const { id } = req.params;
  const request = await ExchangeRequest.findById(id)
    .populate("initiatingSlot targetSlot")
    .lean();
  if (!request) return res.redirect("/exchange/requests");

  const t1 = request.sender;
  const t2 = request.receiver;
  const isSwap = request.type === "swap";
  const chosenGroup = request.chosenClassGroup;

  // Handle t2 original slot: create FREE if necessary
  if (isSwap) {
    if (request.dateB) {
      // Create FREE for t2 at dateB
      await TimetableSlot.create({
        teacher: t2,
        classGroup: chosenGroup,
        subject: "FREE",
        day: dayNameFromDate(request.dateB),
        timeSlot: request.initiatingSlot.timeSlot,
        collegeId: request.initiatingSlot.collegeId,
        room: request.initiatingSlot.room,
      });
    }
    // Create FREE for t2 at dateA if needed
    await TimetableSlot.create({
      teacher: t2,
      classGroup: chosenGroup,
      subject: "FREE",
      day: dayNameFromDate(request.dateA),
      timeSlot: request.initiatingSlot.timeSlot,
      collegeId: request.initiatingSlot.collegeId,
      room: request.initiatingSlot.room,
    });
  }

  // Create ExchangeSlot entries for t2
  await ExchangeSlot.create({
    teacher: t2,
    classGroup: request.initiatingSlot.classGroup,
    subject: request.targetSubject || request.initiatingSlot.subject,
    date: request.dateA,
    timeSlot: request.initiatingSlot.timeSlot,
    type: isSwap ? "swap" : "cover",
  });

  // For swap with two dates, create t1's ExchangeSlot at dateB
  if (isSwap && request.dateB) {
    await ExchangeSlot.create({
      teacher: t1,
      classGroup: chosenGroup,
      subject: request.initiatingSubject,
      date: request.dateB,
      timeSlot: request.targetSlot
        ? request.targetSlot.timeSlot
        : request.initiatingSlot.timeSlot,
      type: "swap",
    });
  }

  // Update request status
  await ExchangeRequest.findByIdAndUpdate(id, { status: "accepted" });

  res.redirect("/exchange/requests");
},

  postDeclineRequest: async (req, res) => {
    await ExchangeRequest.findByIdAndUpdate(req.params.id, { status: "declined" });
    res.redirect("/exchange/requests");
  }
};
