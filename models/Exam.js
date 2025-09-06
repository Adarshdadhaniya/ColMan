// models/Exam.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const roomAssignmentSchema = new Schema({
  room: { type: String, required: true }, // e.g., "ROOM51"
  capacity: { type: Number, required: true }, // chosen capacity (full/half)
  students: [{ type: Schema.Types.ObjectId, ref: 'User' }] // assigned by teacher
});

const examSchema = new Schema({
  examType: { type: String, required: true },
  subject: { type: String, required: true },
  classGroup: { type: String, required: true },
  date: { type: Date, required: true },
  // single timeSlot string like "09:00-12:00"
  timeSlot: { type: String, required: true },
  roomAssignments: [roomAssignmentSchema],
  invigilators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Exam', examSchema);
