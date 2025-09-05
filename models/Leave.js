const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  slots: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimetableSlot",
      required: true,
    }
  ],
  reason: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("Leave", leaveSchema);
