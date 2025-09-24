const jwt = require("jsonwebtoken");

 const adminPaths = ['/n8n_cosmia/shippingbo/callback', '/n8n_cosmia/gmail/callback', '/n8n_cosmia/gmail/auth']; 

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access denied. Missing Token" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });

    req.user = user;

    // Restrict: only admins allowed for /user paths
    if (req.baseUrl.includes("/user") && (req.user.role !== "admin" || req.user.role !== "super_admin")) {
      return res.status(403).json({ error: "Access denied: Admins only" });
    }

    next();
  });
};

module.exports = authenticateToken;
