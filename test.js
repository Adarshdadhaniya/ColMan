// const mongoose = require("mongoose");
// const User = require("./models/User"); // adjust path if needed
// const TimetableSlot = require("./models/TimetableSlot"); // adjust path if needed

// // List of teacher usernames to check
// const teacherUsernames = [
//   "teacher13", "teacher15", "teacher19", "teacher20",
//   "teacher24", "teacher28", "teacher29", "teacher35",
//   "teacher36", "teacher37", "teacher41", "teacher42",
//   "teacher45", "teacher6","teacher1"
// ];

// // Target day and time slot
// const targetDay = "Tuesday";
// const targetTimeSlot = "11-12";

// async function checkTeachers() {
//   try {
//     // Connect to MongoDB
//     await mongoose.connect("mongodb://127.0.0.1:27017/colMan", {
//       useNewUrlParser: true,
//       useUnifiedTopology: true
//     });

//     // Fetch teachers by username
//     const teachers = await User.find({ username: { $in: teacherUsernames } });

//     console.log(`Checking availability for ${targetDay} ${targetTimeSlot}...\n`);

//     for (const t of teachers) {
//       // Check if teacher has a slot at that day/time
//       const busySlot = await TimetableSlot.findOne({
//         teacher: t._id,
//         day: targetDay,
//         timeSlot: targetTimeSlot
//       });

//       if (busySlot) {
//         console.log(`${t.username} — Busy in ${busySlot.subject || busySlot.timeSlot}`);
//       } else {
//         console.log(`${t.username} — Free`);
//       }
//     }

//     mongoose.connection.close();
//   } catch (err) {
//     console.error(err);
//     mongoose.connection.close();
//   }
// }

// checkTeachers();



const fs = require('fs');
const path = require('path');

const exchangeDir = path.join(__dirname, 'views', 'exchange');

const files = fs.readdirSync(exchangeDir).filter(file => file.endsWith('.ejs'));

files.forEach(file => {
  const filePath = path.join(exchangeDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  console.log(`\n===== ${file} =====\n`);
  console.log(content);
});