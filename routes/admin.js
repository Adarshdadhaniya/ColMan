const express = require("express");
const multer = require("multer");
const router = express.Router();
const upload = multer({ dest: "uploads/" });

const adminController = require("../controllers/admin.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isAdmin } = require("../middlewear.js");

// ---------------- USERS ----------------
router.get("/uploadusers", isLoggedIn, isAdmin, adminController.uploadUsersForm);
router.post(
  "/uploadusers",
  upload.single("userFile"),
  wrapAsync(adminController.uploadUsers)
);

router.get("/users", isLoggedIn, isAdmin, wrapAsync(adminController.viewUsers));
router.get("/adduser",isLoggedIn, isAdmin, adminController.renderAddUserForm);
router.post("/adduser",isLoggedIn, isAdmin, wrapAsync(adminController.addSingleUser));
router.get("/users/:id/edit",isLoggedIn, isAdmin, wrapAsync(adminController.renderEditUser));
router.put("/users/:id",isLoggedIn, isAdmin, wrapAsync(adminController.updateUser));
router.delete("/users/:id", isLoggedIn,isAdmin, wrapAsync(adminController.deleteUser));

// ---------------- TIMETABLE ----------------
router.get("/timetable", isLoggedIn,isAdmin, wrapAsync(adminController.renderAllTimetables));
router.get("/timetable/add", isLoggedIn,isAdmin, adminController.renderAddForm);
router.post("/timetable/add", isLoggedIn,isAdmin,wrapAsync(adminController.addTimetable));

router.get("/timetable/bulk-upload", isLoggedIn,isAdmin, adminController.renderBulkUploadForm);
router.post(
  "/timetable/bulk-upload",
  isLoggedIn,
  isAdmin,
  upload.single("csvFile"),
  wrapAsync(adminController.bulkUploadTimetables)
);

router.get("/timetable/by-class/:classGroup", isLoggedIn,isAdmin, wrapAsync(adminController.viewTimetableByClass));
router.get("/timetable/by-teacher/:teacherId",isLoggedIn, isAdmin, wrapAsync(adminController.viewTimetableByTeacher));

// ---------------- SLOTS ----------------
router.get("/editslot",isLoggedIn,isAdmin, wrapAsync(adminController.renderEditSlot));
router.put("/editslot/:id",isLoggedIn,isAdmin, wrapAsync(adminController.updateSlot));

// ---------------- DASHBOARD ----------------
router.get("/dashboard", isLoggedIn, isAdmin, wrapAsync(adminController.dashboard));

module.exports = router;
