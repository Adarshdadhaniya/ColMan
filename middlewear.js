module.exports.saveRedirectUrl = (req, res, next) => {
    if(req.session.redirecturl) {
        res.locals.redirecturl = req.session.redirecturl;
    }
    next();
}




module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirecturl = req.originalUrl;
        return res.redirect("/login");
    }
    next();
}



module.exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {   
    return res.status(403).send("Access Denied");
  }
  next();
};





module.exports.isTeacher = (req, res, next) => {
  if (req.user.role !== "teacher") {
    return res.status(403).send("Access Denied");
  }
  next();
};
