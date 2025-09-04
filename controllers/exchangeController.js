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
    const day = dayNameFromDate(date);
    const slotIdObj = await TimetableSlot.findById(slotId).lean();
    console.log(slotIdObj);
    const busySlots = await TimetableSlot.find({
      teacher: teacherId,
      timeSlot: slotIdObj.timeSlot,
      $or: [
        { date: date },       // one-time
        { date: null, day } 
         // recurring
      ]
    }).lean();

    if (busySlots.length) {
      res.redirect(`/exchange/busy-options?slotId=${slotId}&teacherId=${teacherId}&date=${date}`);
    } else {
      // instead of direct subject, go to mode selection
      res.redirect(`/exchange/choose-mode?slotId=${slotId}&teacherId=${teacherId}&date=${date}`);
    }
  },
    getChooseMode: async (req, res) => {
  const { slotId, teacherId, busySlotId, date, dateB } = req.query;

  const initiatorSlot = await TimetableSlot.findById(slotId).lean();
  const target = await User.findById(teacherId).lean();

  let busySlot = null;
  if (busySlotId) {
    busySlot = await TimetableSlot.findById(busySlotId).lean();
  }

  

  res.render("exchange/choose_mode", {
    slot: initiatorSlot,
    target,
    busySlotId,
    date,
    dateB: dateB || '',
    
  });
},
postChooseMode: async (req, res) => {
  try {
    const { slotId, teacherId, busySlotId, date, mode, dateB } = req.body;

    // Fetch main slot, target teacher, and busy slot (if any)
    const slot = await TimetableSlot.findById(slotId).lean();
    if (!slot) return res.status(404).send("Slot not found");

    const target = await User.findById(teacherId).lean();
    if (!target) return res.status(404).send("Target teacher not found");

    const busySlot = busySlotId ? await TimetableSlot.findById(busySlotId).lean() : null;

    // Determine subjects for target teacher if same classGroup
    let subjects = [];
    if (slot.classGroup && target.classGroup?.includes(slot.classGroup)) {
      // Make sure subjectsForGroups exists
      subjects = (target.subjectsForGroups && target.subjectsForGroups[slot.classGroup]) || [];
    } else {
      // Different classGroup → target must teach this slot's subject
      subjects = [slot.subject];
    }

    // Render choose_subject page with all necessary info
    res.render("exchange/choose_subject", {
      slot,
      target,
      busySlot,
      subjects,
      date,
      mode,
      dateB: dateB || ''
    });
  } catch (err) {
    console.error("postChooseMode error:", err);
    res.status(500).send("Internal server error");
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
  `/exchange/choose-mode?slotId=${slotId}&teacherId=${teacherId}&busySlotId=${busySlotId}&date=${date}`
);
},

getChooseSubject: async (req, res) => {
  try {
    const { slotId, teacherId, busySlotId, date, mode, dateB } = req.query; // include dateB

    const slot = await TimetableSlot.findById(slotId).lean();       
    const target = await User.findById(teacherId).lean();           
    const busySlot = busySlotId ? await TimetableSlot.findById(busySlotId).lean() : null;

    let subjects = [];
    if (slot.classGroup && Array.isArray(target.classGroup) && target.classGroup.includes(slot.classGroup)) {
      subjects = target.teaches || [];
    }

    res.render("exchange/choose_subject", {
      slot,
      target,
      busySlot,
      subjects,
      date,
      mode,
      dateB: dateB || ""   // ✅ pass dateB to the template
    });
  } catch (err) {
    console.error("Error in getChooseSubject:", err);
    res.status(500).send("Server error");
  }
}
,
postAcceptSubject: async (req, res) => {
  const { id } = req.params;
  const { targetSubject } = req.body;

  // Save subject into the request
  await ExchangeRequest.findByIdAndUpdate(id, { targetSubject });

  // Continue to final accept
  res.redirect(`/exchange/accept-final/${id}`);
},


   postChooseSubject: async (req, res) => {
  // Instead of redirect, directly call postSendRequest with body
  return module.exports.postSendRequest(req, res);
},


 postSendRequest: async (req, res) => {
  const { slotId, teacherId, busySlotId, date, dateB, mode, targetSubject } = req.body;

  const slot = await TimetableSlot.findById(slotId);
  const target = await User.findById(teacherId);
  const busySlot = busySlotId ? await TimetableSlot.findById(busySlotId) : null;
  
  // If target was busy, mark their original slot FREE
  if (busySlotId) {
    const busySlot = await TimetableSlot.findById(busySlotId);
    await TimetableSlot.create({
      ...busySlot.toObject(),
      _id: undefined,
      teacher: busySlot.teacher,
    });
  }

  const exchangeRequest = new ExchangeRequest({
    sender: req.user._id,
    receiver: target._id,
    initiatingSlot: slot._id,
    targetSlot: busySlotId || null,
    type: mode,               // 'cover' or 'swap'
    initiatingSubject: slot.subject,
    targetSubject,
    dateA: date,
    dateB: dateB || null
  });

  await exchangeRequest.save();
  res.redirect("/exchange/requests");
}
,

  getRequests: async (req, res) => {
    const sent = await ExchangeRequest.find({ sender: req.user._id }).populate('receiver initiatingSlot targetSlot').lean();
    const received = await ExchangeRequest.find({ receiver: req.user._id }).populate('sender initiatingSlot targetSlot').lean();
    res.render("exchange/requests", { sent, received });
  },
 getAcceptRequest: async (req, res) => {
  const { id } = req.params;
  const request = await ExchangeRequest.findById(id)
    .populate("initiatingSlot targetSlot sender receiver")
    .lean();

  if (!request) return res.redirect("/exchange/requests");

  // If subject already chosen, skip to postAcceptRequest
  if (request.targetSubject) {
    return res.redirect(`/exchange/accept-final/${id}`);
  }

  // If same classGroup and targetSubject missing → show subject picker
  const subjects = request.receiver.teaches || [];

  // Pass dateB and mode to EJS
  res.render("exchange/accept_subject", { 
    request, 
    subjects,
    dateB: request.dateB,   // <-- pass dateB
    mode: request.type       // <-- pass mode ('cover' or 'swap')
  });
},

postAcceptRequest: async (req, res) => {
  try {
    const requestId = req.params.id;
    const { targetSubject } = req.body;

    const request = await ExchangeRequest.findById(requestId)
      .populate('initiatingSlot targetSlot sender receiver');

    if (!request) return res.status(404).send("Request not found");
    if (request.status !== "pending") return res.redirect("/exchange/requests");

    const {
      type,
      initiatingSlot,
      targetSlot,
      dateA,
      dateB,
      sender,
      receiver,
      initiatingSubject
    } = request;

    // Compute day and collegeId
    const dayA = initiatingSlot.day || new Date(dateA).toLocaleDateString("en-US", { weekday: "long" });
    const collegeIdA = initiatingSlot.collegeId || sender.collegeId || receiver.collegeId;

    if (type === "cover") {
      // Cover: only receiver teaches sender's slot
      await TimetableSlot.create({
        teacher: receiver._id,
        classGroup: initiatingSlot.classGroup,
        subject: targetSubject,           // make sure targetSubject is sent from form
        date: dateA,
        day: dayA,
        timeSlot: initiatingSlot.timeSlot,
        room: initiatingSlot.room,
        collegeId: collegeIdA
      });
      // Sender continues their original slot; no changes
    }

    if (type === "swap") {
      // 1. Update sender's slot to be taught by receiver
      await TimetableSlot.create({
        teacher: receiver._id,
        classGroup: initiatingSlot.classGroup,
        subject: targetSubject,
        date: dateA,
        day: dayA,
        timeSlot: initiatingSlot.timeSlot,
        room: initiatingSlot.room,
        collegeId: collegeIdA
      });

      // 2. Update receiver's original slot to be taught by sender
      if (targetSlot) {
        const dayB = targetSlot.day || new Date(dateB || dateA).toLocaleDateString("en-US", { weekday: "long" });
        const collegeIdB = targetSlot.collegeId || sender.collegeId || receiver.collegeId;

        await TimetableSlot.create({
          teacher: sender._id,
          classGroup: targetSlot.classGroup,
          subject: initiatingSubject,
          date: dateB || dateA,
          day: dayB,
          timeSlot: targetSlot.timeSlot,
          room: targetSlot.room,
          collegeId: collegeIdB
        });
      }
    }

    request.status = "accepted";
    request.targetSubject = targetSubject; // store selected subject
    await request.save();

    res.redirect("/exchange/requests");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
},


  postDeclineRequest: async (req, res) => {
    await ExchangeRequest.findByIdAndUpdate(req.params.id, { status: "declined" });
    res.redirect("/exchange/requests");
  }
};
