const ActivityLog = require("../models/ActivityLog");

const getActivityLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    // General search text (username, action, or details)
    if (req.query.search) {
      const searchRegex = new RegExp(String(req.query.search).trim(), "i");
      query.$or = [
        { userName: searchRegex },
        { action: searchRegex },
        { details: searchRegex }
      ];
    }

    // Filter by specific user
    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    // Filter by action keyword
    if (req.query.action) {
      query.action = req.query.action;
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) {
        query.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ActivityLog.countDocuments(query);

    return res.status(200).json({
      logs,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalLogs: total
    });
  } catch (error) {
    console.error("Get logs error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve activity logs" });
  }
};

module.exports = { getActivityLogs };
