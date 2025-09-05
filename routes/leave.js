const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");
const { isLoggedIn } = require("../middlewear");

// Step 1: Show leave application form
router.get("/apply", isLoggedIn, leaveController.getApplyLeave);

// Step 2: Submit leave application
router.post("/apply", isLoggedIn, leaveController.postApplyLeave);

module.exports = router;
