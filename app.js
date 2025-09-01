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
// const exchangerouter = require("./routes/exchange.js");



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
// app.use("/exchange",exchangerouter);
app.use("/", usersRouter);



// cron.schedule("0 2 * * *", async () => {
//   const today = new Date();
//   await TimetableSlot.deleteMany({
//     isExtra: true,
//     date: { $lt: today }
//   });
//   console.log("🗑️ Old extra classes removed");
// });





cron.schedule("18 18 * * *", async () =>  {
  // get tomorrow's date (midnight)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 100);
  tomorrow.setHours(0, 0, 0, 0);

  await TimetableSlot.deleteMany({
    isExtra: true,
    date: { $lt: tomorrow }
  });

  console.log("🗑️ Old extra classes (before tomorrow) removed at 6:01 PM");
});



app.listen(2000, () => {
  console.log("server is listening to port 2000");
});
