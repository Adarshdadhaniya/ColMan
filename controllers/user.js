const User = require("../models/User.js");

module.exports.renderSignUpForm = (req, res) => {
  res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
  let {
    username,
    email,
    password,
    collegeId,
    role,
    classGroup,
    teaches,
    rollNumber,
  } = req.body;
 
  const newUser = new User({
    email,
    username,
    collegeId,
    role,
    classGroup: classGroup ? classGroup.split(";") : [],
    teaches: teaches ? teaches.split(";") : [],
    rollNumber: role === "student" ? rollNumber : undefined,
  });

  const registeredUser = await User.register(newUser, password);

  req.login(registeredUser, (err) => {
    if (err) return next(err);
    res.redirect("/admin/dashboard");
  });
};


module.exports.renderloginForm = (req, res) => {
  res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
  let role = req.user.role;
  
  let redirecturl = "/login"; // default fallback

  if (role === "student") {
    redirecturl = "/student/dashboard";
  } else if (role === "teacher") {
    redirecturl = "/teacher/dashboard";
  } else if (role === "admin") {
    redirecturl = "/admin/dashboard";
  }

  res.redirect(redirecturl);
};

module.exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/login");
  });
};
