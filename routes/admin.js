const express = require("express");
const multer = require("multer");// Import Multer, a middleware for handling multipart/form-data (used for file uploads)
const router = express.Router();
const upload = multer({ dest: "uploads/" });


const adminController = require("../controllers/admin.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isAdmin } = require("../middlewear.js");

// const csv = require("csv-parser");
// const fs = require("fs");
// const User = require("../models/User.js");

router.get("/uploadusers",isLoggedIn,isAdmin, adminController.uploadUsersForm);

// Define a POST route at /uploadusers
router.post(
  "/uploadusers",

  // Use Multer middleware to handle a single file upload with the form field name "userFile"
  upload.single("userFile"),
 
  // Call the controller function to process the uploaded file
  wrapAsync(adminController.uploadUsers)
);


router.get("/users", isLoggedIn, isAdmin, wrapAsync(adminController.viewUsers));

router.get("/dashboard", isLoggedIn, isAdmin, wrapAsync(adminController.dashboard));

router.get("/adduser", isAdmin, adminController.renderAddUserForm);
router.post("/adduser", isAdmin, wrapAsync(adminController.addSingleUser));

router.get("/users/:id/edit", isAdmin, wrapAsync(adminController.renderEditUser));
// In Express route paths, the colon (:) before a word means that part of the URL is a route parameter (a dynamic value).

// In your case:
// js
// Copy
// Edit
// router.get("/users/:id/edit", isAdmin, wrapAsync(adminController.renderEditUser));
// :id is a placeholder for whatever value appears in that position of the URL.

// For example:

// /users/123/edit → req.params.id === "123"

// /users/abc/edit → req.params.id === "abc"

// Update user (PUT)
router.put("/users/:id", isAdmin, wrapAsync(adminController.updateUser));

// Delete user (DELETE)
router.delete("/users/:id", isAdmin, wrapAsync(adminController.deleteUser));

router.get("/timetable", isAdmin, wrapAsync(adminController.renderAllTimetables));
router.get("/timetable/add", isAdmin, adminController.renderAddForm);
router.post("/timetable/add", wrapAsync(adminController.addTimetable));

router.get("/timetable/bulk-upload", isAdmin, adminController.renderBulkUploadForm);
router.post("/timetable/bulk-upload", isAdmin, upload.single("csvFile"), wrapAsync(adminController.bulkUploadTimetables));
router.get("/timetable/by-class/:classGroup", isAdmin, wrapAsync(adminController.viewTimetableByClass));
router.get("/timetable/by-teacher/:teacherId", isAdmin, wrapAsync(adminController.viewTimetableByTeacher));


router.put("/editslot/:id", wrapAsync(adminController.updateSlot));
router.get("/editslot", wrapAsync(adminController.renderEditSlot));


module.exports = router;
