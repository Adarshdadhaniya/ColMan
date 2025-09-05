const mongoose = require("mongoose");
const { Schema } = mongoose;


const attendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: "TimetableSlot", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["present", "absent", "late", "excused"],
    default: "present",
  },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // teacher
  markedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Attendance", attendanceSchema);