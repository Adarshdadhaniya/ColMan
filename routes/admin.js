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
router.get("/timetable", isAdmin, wrapAsync(adminController.renderAllTimetables));
router.get("/timetable/add", isAdmin, adminController.renderAddForm);
router.post("/timetable/add", wrapAsync(adminController.addTimetable));

router.get("/timetable/bulk-upload", isAdmin, adminController.renderBulkUploadForm);
router.post(
  "/timetable/bulk-upload",
  isAdmin,
  upload.single("csvFile"),
  wrapAsync(adminController.bulkUploadTimetables)
);

router.get("/timetable/by-class/:classGroup", isAdmin, wrapAsync(adminController.viewTimetableByClass));
router.get("/timetable/by-teacher/:teacherId", isAdmin, wrapAsync(adminController.viewTimetableByTeacher));

// ---------------- SLOTS ----------------
router.get("/editslot", wrapAsync(adminController.renderEditSlot));
router.put("/editslot/:id", wrapAsync(adminController.updateSlot));

// ---------------- DASHBOARD ----------------
router.get("/dashboard", isLoggedIn, isAdmin, wrapAsync(adminController.dashboard));

module.exports = router;
