const express = require("express");
const app = express();
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session"); 
const methodOverride = require("method-override");
const ejsMate=require("ejs-mate");
const MongoStore = require("connect-mongo");


const usersRouter = require("./routes/user.js");
const User = require("./models/User.js");
const adminRoutes = require("./routes/admin.js");
// const teacherRouter = require("./routes/teacher.js");
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
// app.use("/teacher", teacherRouter);
// app.use("/rooms", roomRoutes);
// app.use("/exchange",exchangerouter);
app.use("/", usersRouter);




app.listen(2000, () => {
  console.log("server is listening to port 2000");
});
