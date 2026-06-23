const Role = require("../models/Role");

/**
 * Middleware to check if the current user has a specific permission.
 * Bypasses checks if the user is isMasterAdmin === true.
 */
const checkPermission = (requiredPermissionOrPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user missing." });
      }

      // Master Admin has unrestricted access
      if (req.user.isMasterAdmin) {
        return next();
      }

      // Must be an admin/employee to access admin panel routes
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      // Inactive employee check
      if (req.user.status === "Inactive") {
        return res.status(403).json({ message: "Access denied. Employee account is inactive/suspended." });
      }

      if (!req.user.roles || req.user.roles.length === 0) {
        return res.status(403).json({ message: "Access denied. No roles assigned to this account." });
      }

      const reqPerms = Array.isArray(requiredPermissionOrPermissions)
        ? requiredPermissionOrPermissions
        : [requiredPermissionOrPermissions];

      const hasAny = reqPerms.some(p => req.user.permissions && (req.user.permissions.includes(p) || req.user.permissions.includes("ALL")));

      if (!hasAny) {
        return res.status(403).json({ 
          message: `Access denied. Insufficient permissions (Requires one of: ${reqPerms.join(", ")}).` 
        });
      }

      return next();
    } catch (error) {
      console.error("Permission check middleware error:", error.message);
      return res.status(500).json({ message: "Failed to verify employee permissions." });
    }
  };
};

module.exports = { checkPermission };
