const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const {saveRedirectUrl}  = require("../middlewear.js");
const userController = require("../controllers/user.js");



router.route("/signup")
  .get(userController.renderSignUpForm)
  .post(
    saveRedirectUrl,
    wrapAsync(userController.signup)  // errors from async part are caught
  );

//automatic avoiding of duplicate usernames and emails




router.route("/login")
.get( userController.renderloginForm) //rendering the login form
.post(
    saveRedirectUrl,
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
   userController.login
);

router.get("/logout", userController.logout); //logging out the user

module.exports = router;