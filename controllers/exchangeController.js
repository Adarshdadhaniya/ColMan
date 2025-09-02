const TimetableSlot = require("../models/TimetableSlot");
const ExchangeSlot = require("../models/ExchangeSlot");
const ExchangeRequest = require("../models/ExchangeRequest");
const User = require("../models/User");

// util: convert Date -> day name string (e.g. 'monday')
function dayNameFromDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

module.exports = { 
  // Zeroth route
  getChooseDate: (req, res) => {
    res.render("exchange/choose_date");
  },

  postChooseDate: (req, res) => {
    const { date } = req.body;
    if (!date) return res.status(400).send("date required");
    // redirect with date as query
    res.redirect(`/exchange/select-slot?date=${encodeURIComponent(date)}`);
  },

 
  getSelectSlot: async (req, res) => {
    try {
      const userId = req.user._id;
      const dateStr = req.query.date;

      if (!dateStr) return res.redirect("/exchange/date");

      // Convert date string to Date object and get day name
      const date = new Date(dateStr);
      const day = dayNameFromDate(dateStr);
      const dayn=dayFormatted = day.charAt(0).toUpperCase() + day.slice(1);
      console.log("Looking for slots on", date, "which is a", day);
      // Find all slots: recurring (date:null && day matches) OR one-time (date matches exactly)
      const slots = await TimetableSlot.find({
        teacher: userId,
        $or: [
          { date: date },             // one-time slot for that exact date
          { day: dayn },   // recurring weekly slot
        ],
      }).lean();
      console.log("Found slots:", slots);
      res.render("exchange/select_slot", { slots, date: dateStr });
    } catch (err) {
      console.error("Error fetching slots:", err);
      res.status(500).send("Server Error");
    }
  },


getChooseTeacher: async (req, res) => {
  const userId = req.user._id;
  const { slotId, date } = req.query;
  if (!slotId || !date) return res.redirect("/exchange/date");

  const initiatorSlot = await TimetableSlot.findById(slotId).lean();
  if (!initiatorSlot) return res.status(404).send("slot not found");

  const day = dayNameFromDate(date);

  // get all teachers excluding initiator
  const allTeachers = await User.find({
    _id: { $ne: userId },
    role: "teacher"
  }).lean();

  // categories object (matching your EJS expectations)
  const categories = {
    sameClassFree: [],
    sameClassBusy: [],
    diffClassFree: [],
    diffClassBusy: [],
  };

  // loop through teachers and categorize
  for (let t of allTeachers) {
    // check if teacher is busy at that day + timeslot
    const busySlot = await TimetableSlot.findOne({
      teacher: t._id,
      day: initiatorSlot.day,
      timeSlot: initiatorSlot.timeSlot,
    });

    if (t.classGroup.includes(initiatorSlot.classGroup)) {
      if (busySlot) {
        categories.sameClassBusy.push({ teacher: t, slot: busySlot });
      } else {
        categories.sameClassFree.push(t);
      }
    } else {
      if (busySlot) {
        categories.diffClassBusy.push({ teacher: t, slot: busySlot });
      } else {
        categories.diffClassFree.push(t);
      }
    }
  }

  res.render("exchange/choose_teacher", {
    initiatorSlot,
    date,
    sameGroup_free: categories.sameClassFree,
    sameGroup_busy: categories.sameClassBusy,
    diffGroup_free: categories.diffClassFree,
    diffGroup_busy: categories.diffClassBusy
  });
},

  // Third route: create request (for free or cover or swap) -- general send
  postSendRequest: async (req, res) => {
    /* Expected body:
      senderId (from req.user), initiatingSlotId, receiverId, date,
      type: 'free'|'swap'|'cover', targetSlotId (optional)
    */
    try {
      const sender = req.user._id;
      const { initiatingSlotId, receiverId, date, type, targetSlotId } = req.body;
      if (!initiatingSlotId || !receiverId || !date || !type) return res.status(400).send("missing fields");

      const initiatorSlot = await TimetableSlot.findById(initiatingSlotId).lean();
      if (!initiatorSlot) return res.status(404).send("initiating slot not found");

      const day = dayNameFromDate(date);

      const payload = {
        collegeId: initiatorSlot.collegeId,
        sender,
        receiver: receiverId,
        initiatingSlot: initiatorSlot._id,
        date: new Date(date),
        day,
        timeSlot: initiatorSlot.timeSlot,
        classGroup: initiatorSlot.classGroup,
        room: initiatorSlot.room,
        type,
      };

      if (targetSlotId) payload.targetSlot = targetSlotId;

      const request = new ExchangeRequest(payload);
      await request.save();

      // TODO: notify receiver in your app (email/socket/etc.)

      res.redirect("/exchange/requests");
    } catch (err) {
      console.error(err);
      res.status(500).send("server error");
    }
  },

  // Fourth route helper: busy options page
  getBusyOptions: async (req, res) => {
    const { slotId, targetTeacherId, date } = req.query;
    if (!slotId || !targetTeacherId || !date) return res.redirect("/exchange/date");

    const initiatorSlot = await TimetableSlot.findById(slotId).lean();
    const targetTeacher = await User.findById(targetTeacherId).lean();

    // if target is busy at that timeslot we already know it. Show two options: cover or swap
    res.render("exchange/busy_options", { initiatorSlot, targetTeacher, date });
  },

  // Fifth route: select swap slot from other teacher
  getSelectSwapSlot: async (req, res) => {
    const { slotId, targetTeacherId, date } = req.query;
    if (!slotId || !targetTeacherId || !date) return res.redirect("/exchange/date");

    const initiatorSlot = await TimetableSlot.findById(slotId).lean();
    const targetTeacher = await User.findById(targetTeacherId).lean();

    const day = dayNameFromDate(date);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const targetSlots = await TimetableSlot.find({ teacher: targetTeacherId }).lean();

    const initiatorBusySlots = await TimetableSlot.find({
      teacher: req.user._id,
      $or: [ { date: null, day }, { date: { $gte: start, $lte: end } } ],
    }).lean();
    const busySet = new Set(initiatorBusySlots.map(s => `${s.day}::${s.timeSlot}`));

    const candidateSlots = targetSlots.filter(s => {
      const key = `${s.day}::${s.timeSlot}`;
      return !busySet.has(key);
    });

    res.render("exchange/select_swap_slot", { initiatorSlot, targetTeacher, date, candidateSlots });
  },

  // view requests (both sent and received)
  getRequests: async (req, res) => {
    const userId = req.user._id;
    const sent = await ExchangeRequest.find({ sender: userId }).populate('receiver initiatingSlot targetSlot').lean();
    const received = await ExchangeRequest.find({ receiver: userId }).populate('sender initiatingSlot targetSlot').lean();

    res.render("exchange/requests", { sent, received });
  },

  // accept request -> create ExchangeSlot entries and update status
  postAcceptRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = String(req.user._id);
      const request = await ExchangeRequest.findById(id).populate('initiatingSlot targetSlot').exec();
      if (!request) return res.status(404).send('request not found');
      if (String(request.receiver) !== userId) return res.status(403).send('not authorized');

      if (request.status !== 'pending') return res.status(400).send('request already processed');

      if (request.type === 'free' || request.type === 'cover') {
        const initiator = request.initiatingSlot;
        const receiver = request.receiver;

        const recvSlot = new ExchangeSlot({
          collegeId: initiator.collegeId,
          classGroup: initiator.classGroup,
          subject: initiator.subject,
          teacher: receiver,
          day: request.day,
          date: request.date,
          timeSlot: initiator.timeSlot,
          room: initiator.room,
          isExtra: false,
        });

        const freeSlot = new ExchangeSlot({
          collegeId: initiator.collegeId,
          classGroup: initiator.classGroup,
          subject: 'FREE',
          teacher: request.sender,
          day: request.day,
          date: request.date,
          timeSlot: initiator.timeSlot,
          room: 'N/A',
          isExtra: false,
        });

        await recvSlot.save();
        await freeSlot.save();

      } else if (request.type === 'swap') {
        const initiator = request.initiatingSlot;
        const target = request.targetSlot;

        if (!target) return res.status(400).send('missing target slot for swap');

        const recvSlot = new ExchangeSlot({
          collegeId: initiator.collegeId,
          classGroup: initiator.classGroup,
          subject: initiator.subject,
          teacher: request.receiver,
          day: request.day,
          date: request.date,
          timeSlot: initiator.timeSlot,
          room: initiator.room,
          isExtra: false,
        });

        const sendSlot = new ExchangeSlot({
          collegeId: target.collegeId,
          classGroup: target.classGroup,
          subject: target.subject,
          teacher: request.sender,
          day: target.day,
          date: target.date || request.date,
          timeSlot: target.timeSlot,
          room: target.room,
          isExtra: false,
        });

        await recvSlot.save();
        await sendSlot.save();
      }

      request.status = 'accepted';
      await request.save();

      res.redirect('/exchange/requests');
    } catch (err) {
      console.error(err);
      res.status(500).send('server error');
    }
  },

  postRejectRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = String(req.user._id);
      const request = await ExchangeRequest.findById(id).exec();
      if (!request) return res.status(404).send('request not found');
      if (String(request.receiver) !== userId) return res.status(403).send('not authorized');

      request.status = 'rejected';
      await request.save();

      res.redirect('/exchange/requests');
    } catch (err) {
      console.error(err);
      res.status(500).send('server error');
    }
  },
};
