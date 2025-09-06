const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const { Schema } = mongoose;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  collegeId: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["student", "teacher", "admin"],
    required: true,
  },
  classGroup: [
    {
      type: String,
    },
  ],
  teaches: [
    {
      type: String,
    },
  ],
  rollNumber: {
    type: Number,
  },
});

// ✅ Ensure only one admin per collegeId
userSchema.index(
  { collegeId: 1, role: 1 },
  { unique: true, partialFilterExpression: { role: "admin" } }
);

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
