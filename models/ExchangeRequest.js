const mongoose = require("mongoose");
const { Schema } = mongoose;

const exchangeRequestSchema = new Schema({
  collegeId: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },

  // The slot being requested to change (the initiator's slot)
  initiatingSlot: {
    type: Schema.Types.ObjectId,
    ref: "TimetableSlot",
    required: true,
  },

  // If this is a swap, this references the target slot on the other teacher
  targetSlot: {
    type: Schema.Types.ObjectId,
    ref: "TimetableSlot",
    default: null,
  },

  // duplicate of important fields for quick queries and history
  date: { type: Date, required: true },
  day: { type: String, required: true },
  timeSlot: { type: String, required: true },
  classGroup: { type: String, required: true },
  room: { type: String, required: true },

  // type: free (receiver covers the slot) | swap (two-way swap) | cover (receiver covers without sender being free?)
  type: { type: String, enum: ["free", "swap", "cover"], required: true },

  // status: pending | accepted | rejected
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

exchangeRequestSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("ExchangeRequest", exchangeRequestSchema);
