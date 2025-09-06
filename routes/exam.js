// routes/exam.js
const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { isLoggedIn,isTeacher } = require("../middlewear");

router.get("/create", isLoggedIn,isTeacher, examController.getCreateExamForm);
router.post("/create", isLoggedIn,isTeacher, examController.postCreateExam);

router.get("/:id/assign-students", isLoggedIn,isTeacher, examController.getAssignStudents);
router.post("/:id/assign-students", isLoggedIn,isTeacher, examController.postAssignStudents);

router.get("/:id/assign-invigilators", isLoggedIn,isTeacher, examController.getAssignInvigilators);
router.post("/:id/assign-invigilators", isLoggedIn,isTeacher, examController.postAssignInvigilators);

router.get("/upcoming", isLoggedIn,isTeacher, examController.getUpcomingExamsStudent);
router.get("/duties", isLoggedIn,isTeacher, examController.getExamDutiesTeacher);

// routes/exam.js
router.get("/available-rooms", isLoggedIn, examController.getAvailableRooms);


module.exports = router;
