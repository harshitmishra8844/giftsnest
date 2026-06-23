const ActivityLog = require("../models/ActivityLog");

/**
 * Logs an administrative/employee action to the ActivityLog database.
 * @param {string} userId - The ID of the employee performing the action
 * @param {string} userName - The name of the employee
 * @param {string} action - Action title/type (e.g. "PRODUCT_CREATED")
 * @param {string} details - Detailed context (e.g. "Created product Frame-XYZ with stock 10")
 * @param {Object} req - The Express request object to resolve IP, UA, and device
 */
const logActivity = async (userId, userName, action, details, req = null) => {
  try {
    let ipAddress = "127.0.0.1";
    let userAgent = "Unknown";
    let device = "Desktop";

    if (req) {
      // Resolve IP
      const xForwarded = req.headers["x-forwarded-for"];
      ipAddress = xForwarded 
        ? xForwarded.split(",")[0].trim() 
        : (req.ip || req.connection?.remoteAddress || "127.0.0.1");

      // Resolve User Agent
      userAgent = req.headers["user-agent"] || "Unknown";

      // Classify Device
      const ua = userAgent.toLowerCase();
      if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipad")) {
        device = ua.includes("ipad") || ua.includes("tablet") ? "Tablet" : "Mobile";
      } else {
        device = "Desktop";
      }
    }

    await ActivityLog.create({
      userId,
      userName,
      action,
      details,
      ipAddress,
      userAgent,
      device,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("[logService] Failed to record activity log:", error.message);
  }
};

module.exports = { logActivity };
