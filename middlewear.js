//We need to store the redirecturl in the local variable so that we can use it in the login route as the session variable gets refreshed after the login
module.exports.saveRedirectUrl = (req, res, next) => {
    if(req.session.redirecturl) {
        res.locals.redirecturl = req.session.redirecturl;
    }
    next();
}




module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {//Defined under passport.js
        req.session.redirecturl = req.originalUrl;
        return res.redirect("/login");
    }
    next();
}


/*
    Session Access Scope in Express:

    ✅ Accessible in:
    ----------------
    1. Express routes and middleware:
       You can access session data via `req.session` in any route or middleware.
       
           Example:
           app.get("/dashboard", (req, res) => {
               console.log(req.session);           // ✅ Works
               console.log(req.session.userId);    // ✅ Works if set earlier
           });

    2. EJS templates (indirectly):
       You can pass session values using `res.locals` so they are available in your views.

           Example:
           res.locals.userId = req.session.userId;
           // Accessible in EJS as <%= userId %>

    ❌ Not Accessible in:
    ---------------------
    1. Client-side JavaScript:
       Session data is stored on the server.
       The browser only receives a session ID cookie, not the actual session data.

           // ❌ Won’t work:
           console.log(session); // undefined in client-side JS

    2. Standalone modules/files without request context:
       You cannot access `req.session` unless you pass the `req` object into the function.

           // ❌ Invalid usage:
           module.exports = () => {
               console.log(req.session); // req is undefined
           };

           // ✅ Correct usage:
           module.exports = (req) => {
               console.log(req.session); // Works fine
           };

    Summary:
    --------
    - Use `req.session` inside routes/middleware.
    - Use `res.locals` to send session data to EJS views.
    - Never try to access session data directly from the browser or outside of request context.
*/


// In Express.js, res.locals is a plain object that’s scoped to one request–response cycle. It’s used to pass data from middleware to later middleware or to the view/template without polluting req or using globals.

// Key points
// Scope/lifetime: Exists only for the duration of a single request. Once the response is sent, res.locals is discarded. It is not shared across requests.

// Purpose: Share data (e.g., user info, flash messages, computed values) between middleware and templates. Anything you put on res.locals is available to view engines (like EJS, Pug) automatically.


module.exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {   // req.user is not user-defined — it is added automatically by Passport.js after successful authentication.
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
