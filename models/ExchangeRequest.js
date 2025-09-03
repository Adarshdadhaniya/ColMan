// models/ExchangeRequest.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const exchangeRequestSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  initiatingSlot: { type: Schema.Types.ObjectId, ref: "TimetableSlot", required: true },
  targetSlot: { type: Schema.Types.ObjectId, ref: "TimetableSlot" }, // optional if T2 free
  type: { type: String, enum: ["free", "swap"], required: true },
  initiatingSubject: { type: String },
  targetSubject: { type: String },
  dateA: { type: Date, required: true }, // T2 teaches T1
  dateB: { type: Date }, // T1 teaches T2, optional if one-way
  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
});

module.exports = mongoose.model("ExchangeRequest", exchangeRequestSchema);
