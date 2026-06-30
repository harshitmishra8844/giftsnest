const CustomerTimeline = require("../models/CustomerTimeline");

/**
 * Log a customer event into their activity timeline dossier.
 * @param {string} userId - User ObjectId
 * @param {string} eventType - Type of event
 * @param {string} eventTitle - Main headline/title
 * @param {string} eventDescription - Optional verbose details
 * @param {object} metadata - Optional metadata details
 * @param {object} req - Express request object to parse IP/useragent
 */
const logTimelineEvent = async (userId, eventType, eventTitle, eventDescription = "", metadata = {}, req = null) => {
  try {
    let ipAddress = "";
    let userAgent = "";
    let device = "Desktop";

    if (req) {
      ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      userAgent = req.headers["user-agent"] || "";
      if (/mobile|android|iphone/i.test(userAgent)) {
        device = "Mobile";
      } else if (/ipad|tablet/i.test(userAgent)) {
        device = "Tablet";
      }
    }

    const timeline = await CustomerTimeline.create({
      userId,
      eventType,
      eventTitle,
      eventDescription,
      metadata,
      ipAddress,
      userAgent,
      device,
      timestamp: new Date(),
    });

    return timeline;
  } catch (error) {
    console.error(`[timelineService] Failed to write timeline log for user ${userId}:`, error.message);
    return null;
  }
};

module.exports = { logTimelineEvent };
