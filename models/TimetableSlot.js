// models/TimetableSlot.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const timetableSlotSchema = new Schema({
  collegeId: {
    type: String,
    required: true,
  },
  classGroup: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  day: {
    type: String,
    required: true,
    default: 'not applicable' // store string 'not applicable' for exam-related entries
  },
  date: {
    type: Date,
    default: null,
  },
  timeSlot: {
    type: String,
    required: true, // expected format "HH:MM-HH:MM"
  },
  room: {
    type: String,
    required: true,
  },
  isExtra: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('TimetableSlot', timetableSlotSchema);
