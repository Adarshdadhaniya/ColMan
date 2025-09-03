// utils/teacherCache.js
const fs = require("fs");
const User = require("../models/User");

async function generateTeacherCache() {
  const teachers = await User.find({ role: "teacher" }).lean();
  const cache = teachers.map(t => ({
    _id: t._id.toString(),
    classGroups: t.classGroup,
    subjects: t.teaches
  }));
  fs.writeFileSync("teacherCache.json", JSON.stringify(cache, null, 2));
  return cache;
}

module.exports = generateTeacherCache;
