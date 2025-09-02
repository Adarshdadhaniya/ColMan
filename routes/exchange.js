const express = require("express");
const router = express.Router();
const exchangeController = require("../controllers/exchangeController");
const { isLoggedIn } = require("../middlewear");

// Zeroth route: select date
router.get("/date", isLoggedIn, exchangeController.getChooseDate);
router.post("/date", isLoggedIn, exchangeController.postChooseDate);

// First route: select one of your own slots for that date
router.get("/select-slot", isLoggedIn, exchangeController.getSelectSlot);

// Second route: list teachers categorized
router.get("/choose-teacher", isLoggedIn, exchangeController.getChooseTeacher);

// If target is free -> create request directly
router.post("/request/send", isLoggedIn, exchangeController.postSendRequest);

// If target is busy and same-group -> show options
router.get("/busy-options", isLoggedIn, exchangeController.getBusyOptions);

// Show swap candidate slots from the other teacher
router.get("/select-swap-slot", isLoggedIn, exchangeController.getSelectSwapSlot);

// Accept/reject/manage requests
router.get("/requests", isLoggedIn, exchangeController.getRequests);
router.post("/requests/:id/accept", isLoggedIn, exchangeController.postAcceptRequest);
router.post("/requests/:id/reject", isLoggedIn, exchangeController.postRejectRequest);

module.exports = router;
