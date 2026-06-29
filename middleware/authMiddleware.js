const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Role = require("../models/Role");

const protect = async (req, res, next) => {
  let token;

  // Read Bearer token or from HTTP-only cookies if present
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.headers.cookie) {
    // Parse cookies manually without requiring cookie-parser dependency
    const cookies = {};
    req.headers.cookie.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      cookies[parts.shift().trim()] = decodeURIComponent(parts.join("="));
    });
    token = cookies.admin_token;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password").populate("roles");

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    if (req.user.status === "Suspended") {
      return res.status(403).json({ message: "Your account has been suspended. Please contact customer support." });
    }

    if (req.user.status === "Deleted") {
      return res.status(403).json({ message: "Your account has been deactivated." });
    }

    if (req.user.isAdmin && req.user.status === "Inactive") {
      return res.status(403).json({ message: "Your employee account has been suspended or deactivated." });
    }

    // Compile dynamic permissions array
    const permissionsSet = new Set();
    if (req.user.isMasterAdmin) {
      permissionsSet.add("ALL");
    }
    if (req.user.roles) {
      req.user.roles.forEach((role) => {
        if (role && role.permissions) {
          role.permissions.forEach((p) => permissionsSet.add(p));
        }
      });
    }
    req.user.permissions = Array.from(permissionsSet);

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
};

module.exports = { protect, adminOnly };
