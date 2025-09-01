const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isTeacher } = require("../middlewear.js");
const teacherController = require("../controllers/teacher.js");

router.get("/dashboard", isLoggedIn, isTeacher, teacherController.renderDashboard);
// Select a class to view its timetable
router.get("/timetable/class", teacherController.selectClassTimetable);

// View timetable for a specific class
router.get("/timetable/class/:classGroup", teacherController.viewTimetableByClass);

// View timetable by teacher ID
router.get("/timetable/teacher/:teacherId", teacherController.viewTimetableByTeacher);   //Extra teacher is required as conflict will arise with the above route

router.get("/extraClass", teacherController.getAvailableExtraClassForm);
router.get("/extraClass/confirm", teacherController.renderExtraClassBookingForm);
router.post("/extraClass/book", teacherController.bookExtraClass);





module.exports = router;
