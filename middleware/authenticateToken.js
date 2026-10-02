const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access denied. Missing Token" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });

    req.user = user;

    // exeption pass (get affectation pour les simple user)
    if(req.originalUrl.includes("/userproject") && req.method === "GET") {
      return next();
    }

    // execption pass (list user)
    if(req.baseUrl.includes("/user") && req.method === "GET") {
      return next();
    }

    // Restrict: only admins allowed for /user paths
    if (req.baseUrl.includes("/user") && req.user.role != "admin" && req.user.role != "super_admin") {
      return res.status(403).json({ error: "Access denied: Admins only" });
    }

    // // Restrict: only admins allowed for /user paths
    // if (req.baseUrl.includes("/getdonutSummary") && req.user.role != "super_admin") {
    //   return res.status(403).json({ error: "Access denied: Super admins only" });
    // }

    // // Restrict: only admins allowed for /user paths
    // if (req.baseUrl.includes("/getticketpartitionsummary") && req.user.role != "super_admin") {
    //   return res.status(403).json({ error: "Access denied: Super admins only" });
    // }

    // // Restrict: only admins allowed for /user paths
    // if (req.baseUrl.includes("/getuseractivitysummary") && req.user.role != "super_admin") {
    //   return res.status(403).json({ error: "Access denied: Super admins only" });
    // }

    next();
  });
};

module.exports = authenticateToken;
