const mongoose = require("mongoose");

const { Schema } = mongoose;

const exchangeSlotSchema = new Schema({
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
    ref: "User",
    required: true,
  },
  day: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: null,
  },
  timeSlot: {
    type: String,
    required: true,
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

module.exports = mongoose.model("ExchangeSlot", exchangeSlotSchema);
