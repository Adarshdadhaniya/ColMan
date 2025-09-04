const express = require("express");
const router = express.Router();
const exchangeController = require("../controllers/exchangeController");
const { isLoggedIn } = require("../middlewear");

router.get("/date", isLoggedIn, exchangeController.getChooseDate);
router.post("/date", isLoggedIn, exchangeController.postChooseDate);

router.get("/select-slot", isLoggedIn, exchangeController.getSelectSlot);
router.post("/select-slot", isLoggedIn, exchangeController.postSelectSlot);

router.get("/choose-teacher", isLoggedIn, exchangeController.getChooseTeacher);
router.post("/choose-teacher", isLoggedIn, exchangeController.postChooseTeacher);

router.get("/busy-options", isLoggedIn, exchangeController.getBusyOptions);
router.post("/busy-options", isLoggedIn, exchangeController.postBusyOptions);

// 🔹 New step
router.get("/choose-mode", isLoggedIn, exchangeController.getChooseMode);
router.post("/choose-mode", isLoggedIn, exchangeController.postChooseMode);

router.get("/choose-subject", isLoggedIn, exchangeController.getChooseSubject);
router.post("/choose-subject", isLoggedIn, exchangeController.postChooseSubject);

router.post("/send-request", isLoggedIn, exchangeController.postSendRequest);

router.get("/requests", isLoggedIn, exchangeController.getRequests);
router.post("/accept/:id", isLoggedIn, exchangeController.postAcceptRequest);
router.post("/decline/:id", isLoggedIn, exchangeController.postDeclineRequest);

router.get("/accept/:id", isLoggedIn, exchangeController.getAcceptRequest);
router.post("/accept/:id", isLoggedIn, exchangeController.postAcceptSubject);
router.get("/accept-final/:id", isLoggedIn, exchangeController.postAcceptRequest);


module.exports = router;
