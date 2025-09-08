const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { isLoggedIn } = require("../middlewear");

// Dashboard route
router.get("/dashboard", isLoggedIn, studentController.getDashboard);

module.exports = router;
