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
  ], // Only for teachers
  rollNumber: {
    type: Number,
  }, // Only for students
});


userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
