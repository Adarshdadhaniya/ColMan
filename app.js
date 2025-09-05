const express = require("express");
const app = express();
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session"); 
const methodOverride = require("method-override");
const ejsMate=require("ejs-mate");
const MongoStore = require("connect-mongo");
const cron = require("node-cron");
const TimetableSlot = require("./models/TimetableSlot");

const usersRouter = require("./routes/user.js");
const User = require("./models/User.js");
const adminRoutes = require("./routes/admin.js");
 const teacherRouter = require("./routes/teacher.js");
// const roomRoutes = require("./routes/rooms.js");
const exchangerouter = require("./routes/exchange.js");
const leaveRouter = require("./routes/leave.js");



const dbUrl = "mongodb://127.0.0.1:27017/colMan";  


async function main() {                 
  await mongoose.connect(dbUrl);       
}



main()                         
  .then(() => {                        
    console.log("connected to DB");    
  })
  .catch((err) => {                     
    console.log(err);                   
  });






app.set("view engine", "ejs");        
app.engine('ejs',ejsMate);



app.use(express.urlencoded({ extended: true }));  

const store = MongoStore.create({         
  mongoUrl: dbUrl,                             
  crypto: {
    secret: process.env.SECRET,               
  },
  touchAfter: 24 * 3600,                       
                                              
});

store.on("error", (err) => {                  
  console.log("ERROR in MONGO SESSION STORE", err);  
});



const sessionOptions = {
  store,
  secret: "mysecretoption", 
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, 
    maxAge: 1000 * 60 * 60 * 24 * 7,               
    httpOnly: true,                                
    
  },
};      



app.use(session(sessionOptions));                 


app.use(methodOverride("_method"));               


app.use(passport.initialize());                   
app.use(passport.session());                    


passport.use(new LocalStrategy(User.authenticate())); 


passport.serializeUser(User.serializeUser());          
passport.deserializeUser(User.deserializeUser());      




app.use((req, res, next) => {
  res.locals.currentUser = req.user;     // Make the logged-in user available to all EJS templates(only ejs not elsewhere) as `currentUser`

  next();
});




app.use("/admin", adminRoutes);
app.use("/teacher", teacherRouter);
// app.use("/rooms", roomRoutes);
app.use("/exchange",exchangerouter);
app.use("/leave", leaveRouter);
app.use("/", usersRouter);



// cron.schedule("0 2 * * *", async () => {
//   const today = new Date();
//   await TimetableSlot.deleteMany({
//     isExtra: true,
//     date: { $lt: today }
//   });
//   console.log("🗑️ Old extra classes removed");
// });


// const ExchangeRequest = require("./models/ExchangeRequest");

// async function compareExchangeRequests() {
//   try {
//     // 1. Fetch all exchange requests with populated receiver
//     const exchangeRequests = await ExchangeRequest.find({})
//       .populate("receiver")
//       .lean();

//     console.log("All Exchange Requests:", exchangeRequests);

//     // 2. Find all teachers who have slots for BCA2 or BCA3 using $or
//     const slots = await TimetableSlot.find({
//       $or: [{ classGroup: "BCA-2" }, { classGroup: "BCA-3" }]
//     })
//       .populate("teacher") // assuming your TimetableSlot has a `teacher` reference
//       .lean();

//     // Get unique teacher IDs
//     const teacherIds = [...new Set(slots.map(slot => slot.teacher._id.toString()))];

//     console.log("Teachers teaching BCA2/BCA3:", teacherIds);

//     // 3. Compare exchange request receivers with these teachers
//     let count = 0;
//     let matchedRequests = [];
//     exchangeRequests.forEach((req) => {
//       const receiverId = req.receiver?._id.toString();
//       if (teacherIds.includes(receiverId)) {
//         console.log(`Exchange Request ${req._id}: SAME`);
//         count++;
//         matchedRequests.push(req);
//       } else {
//         console.log(`Exchange Request ${req._id}: UNMATCHED`);
//       }
//     });
//     console.log(`Total matched exchange requests: ${count}`);
//     console.log("Matched Exchange Requests:", matchedRequests);
//   } catch (err) {
//     console.error("Error:", err);
//   }
// }

// // Run the comparison function
// compareExchangeRequests();

cron.schedule("0 1 * * *", async () => { // runs at 1:00 AM
  try {
    const now = new Date(); // current date and time

    const result = await TimetableSlot.deleteMany({
      isExtra: true,
      date: { $lt: now } // remove all extra classes with a date before now
    });

    console.log(`🗑️ Deleted ${result.deletedCount} old extra classes at 1:00 AM`);
  } catch (err) {
    console.error("Error deleting old extra classes:", err);
  }
});


// async function findCommonClassGroups() {
//   try {
//     // Fetch teacher15
//     const teacher15 = await User.findOne({ username: "teacher15" }).lean();
//     if (!teacher15) throw new Error("Teacher15 not found");

//     // Fetch the other teachers
//     const otherTeachers = await User.find({
//       username: { $in: ["teacher26", "teacher39", "teacher40", "teacher58"] }
//     }).lean();

//     // Compare classGroups
//     otherTeachers.forEach(t => {
//       const common = t.classGroup.filter(cg => teacher15.classGroup.includes(cg));
//       console.log(`Common classGroups between Teacher15 and ${t.username}:`, common);
//     });

//   } catch (err) {
//     console.error(err);
//   }
// }

// // Run
// findCommonClassGroups();




// async function syncTeacherClassGroups() {
//   const timetableSlots = await TimetableSlot.find({});
//   const teacherClassGroups = {};

//   // Step 1: Collect actual classGroups from timetable
//   for (const slot of timetableSlots) {
//     if (!teacherClassGroups[slot.teacher]) {
//       teacherClassGroups[slot.teacher] = new Set();
//     }
//     teacherClassGroups[slot.teacher].add(slot.classGroup);
//   }

//   // Step 2: Get all teachers
//   const allTeachers = await User.find({ role: "teacher" });

//   for (const teacher of allTeachers) {
//     const classGroupsSet = teacherClassGroups[teacher._id];
//     const oldGroups = teacher.classGroup || [];

//     if (classGroupsSet) {
//       const newGroups = Array.from(classGroupsSet);
//       await User.findByIdAndUpdate(teacher._id, { classGroup: newGroups });

//       console.log(
//         `✅ Teacher ${teacher.username}:\n   Old: [${oldGroups}]\n   New: [${newGroups}]`
//       );
//     } else {
//       await User.findByIdAndUpdate(teacher._id, { classGroup: [] });

//       console.log(
//         `⚠️ Teacher ${teacher.username}:\n   Old: [${oldGroups}]\n   New: [] (cleared, not teaching anything)`
//       );
//     }
//   }
// }

// // Call the function
// syncTeacherClassGroups();


// const cacheTeachers = require("./utils/teacherCache.js");
// cacheTeachers(); // generate cache on server start



app.listen(2000, () => {
  console.log("server is listening to port 2000");
});
