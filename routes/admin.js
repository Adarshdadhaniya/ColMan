const express = require("express");
const multer = require("multer");
const router = express.Router();
const upload = multer({ dest: "uploads/" });
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isAdmin } = require("../middlewear.js");

const adminController = require("../controllers/admin.js");


// ---------------- USERS ----------------
router.route("/uploadusers")
.get( isLoggedIn, isAdmin, adminController.uploadUsersForm)
.post(
  isLoggedIn, isAdmin,
  upload.single("userFile"),
  wrapAsync(adminController.uploadUsers)
);

router.get("/users", isLoggedIn, isAdmin, wrapAsync(adminController.viewUsers));

router.route("/adduser")
  .get(isLoggedIn, isAdmin, adminController.renderAddUserForm)
  .post(isLoggedIn, isAdmin, wrapAsync(adminController.addSingleUser));

router.get("/users/:id/edit",isLoggedIn, isAdmin, wrapAsync(adminController.renderEditUser));

router.route("/users/:id")
  .put(isLoggedIn, isAdmin, wrapAsync(adminController.updateUser))
  .delete( isLoggedIn,isAdmin, wrapAsync(adminController.deleteUser));

// ---------------- TIMETABLE ----------------
router.get("/timetable", isLoggedIn,isAdmin, wrapAsync(adminController.renderAllTimetables));

router.route("/timetable/add")
  .get( isLoggedIn,isAdmin, adminController.renderAddForm)
  .post(isLoggedIn,isAdmin,wrapAsync(adminController.addTimetable));

router.route("/timetable/bulk-upload")
  .get( isLoggedIn,isAdmin, adminController.renderBulkUploadForm)
  .post(
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
