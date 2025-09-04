// models/ExchangeSlot.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const exchangeSlotSchema = new Schema({
  teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
  classGroup: { type: String, required: true },
  subject: { type: String, required: true },
  originalSlot: { type: Schema.Types.ObjectId, ref: "TimetableSlot" },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  room: { type: String, required: true },
  isExtra: { type: Boolean, default: false },
  exchangeType: { type: String, enum: ["free", "swap","cover"], required: true },
});

module.exports = mongoose.model("ExchangeSlot", exchangeSlotSchema);
