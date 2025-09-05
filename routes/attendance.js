// routes/attendance.js
const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { isLoggedIn } = require("../middlewear");




router.get("/date", isLoggedIn, attendanceController.getChooseDate);
router.post("/date", isLoggedIn, attendanceController.postChooseDate);
router.get("/slots", isLoggedIn, attendanceController.getSlotsForDate);
// Show attendance form for a class slot on a given date
router.get("/mark", isLoggedIn, attendanceController.getMarkAttendance);

// Handle attendance submission
router.post("/mark", isLoggedIn, attendanceController.postMarkAttendance);

// View attendance by class/date
router.get("/view", isLoggedIn, attendanceController.getViewAttendance);

// View a single student’s attendance record
router.get("/student/:id", isLoggedIn, attendanceController.getStudentAttendance);




module.exports = router;
