const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isTeacher } = require("../middlewear.js");
const teacherController = require("../controllers/teacher.js");

router.get("/dashboard", isLoggedIn, isTeacher, teacherController.renderDashboard);
// Select a class to view its timetable
router.get("/timetable/class",isLoggedIn, isTeacher, teacherController.selectClassTimetable);

// View timetable for a specific class
router.get("/timetable/class/:classGroup", isLoggedIn, isTeacher,teacherController.viewTimetableByClass);

// View timetable by teacher ID
router.get("/timetable/teacher/:teacherId", isLoggedIn, isTeacher,teacherController.viewTimetableByTeacher);   //Extra teacher is required as conflict will arise with the above route


// Select class to take extra class
router.get("/extra/select-class", isTeacher, teacherController.getSelectClass);

// Handle class selection & date
router.post("/extra/select-class", isTeacher, teacherController.postSelectClass);

// Show slots for chosen class & date
router.get("/extra/select-slot/:classGroup/:date", isTeacher, teacherController.getSelectSlot);

// Handle slot choice
router.post("/extra/select-slot", isTeacher, teacherController.postSelectSlot);

  
// Choose subject (if slot was empty)
router.get("/extra/select-subject/:classGroup/:date/:slot/:room", isTeacher, teacherController.getSelectSubject);

// Save extra class
router.post("/extra/create", isTeacher, teacherController.postCreateExtra);

// STEP 5: Show available rooms for that slot
router.get("/extra/select-room/:classGroup/:day/:slot", isTeacher, teacherController.getSelectRoom);

// STEP 6: Handle room selection
router.post("/extra/select-room", isTeacher, teacherController.postSelectRoom);




module.exports = router;
