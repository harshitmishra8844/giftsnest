const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { addSseClient } = require("../services/notificationService");

/**
 * SSE Real-Time Event Stream for Admin Console
 * GET /api/notifications/admin/stream
 */
const getAdminNotificationStream = async (req, res) => {
  // Extract token from query or Authorization header
  let token = req.query.token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication token required for SSE stream." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user || (!user.isAdmin && user.role !== "admin")) {
      return res.status(403).json({ message: "Access denied. Admin authorization required." });
    }

    const clientId = `admin_${user._id}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    addSseClient(clientId, res, user);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired SSE authentication token." });
  }
};

/**
 * Get paginated admin notifications with category filter and search
 * GET /api/notifications/admin
 */
const getAdminNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 30,
      category = "All",
      unreadOnly = false,
      search = "",
    } = req.query;

    const query = { role: "admin" };

    if (category && category !== "All") {
      query.category = category.toUpperCase();
    }

    if (String(unreadOnly) === "true") {
      query.isRead = false;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { title: regex },
        { message: regex },
        { event: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ role: "admin", isRead: false }),
    ]);

    res.json({
      notifications,
      total,
      unreadCount,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to retrieve notifications." });
  }
};

/**
 * Quick unread count for header badge
 * GET /api/notifications/admin/unread-count
 */
const getAdminUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ role: "admin", isRead: false });
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve unread count." });
  }
};

/**
 * Mark single admin notification as read
 * PATCH /api/notifications/admin/:id/read
 */
const markAdminNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, role: "admin" },
      { $set: { isRead: true, readAt: new Date(), status: "Read" } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    const unreadCount = await Notification.countDocuments({ role: "admin", isRead: false });
    res.json({ message: "Marked as read.", notification, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update notification." });
  }
};

/**
 * Mark all admin notifications as read
 * PATCH /api/notifications/admin/read-all
 */
const markAllAdminNotificationsRead = async (req, res) => {
  try {
    const { category } = req.body;
    const filter = { role: "admin", isRead: false };
    if (category && category !== "All") {
      filter.category = category.toUpperCase();
    }

    await Notification.updateMany(filter, {
      $set: { isRead: true, readAt: new Date(), status: "Read" },
    });

    res.json({ message: "All notifications marked as read.", unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to mark all as read." });
  }
};

/**
 * Delete a notification
 * DELETE /api/notifications/admin/:id
 */
const deleteAdminNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      role: "admin",
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.json({ message: "Notification deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete notification." });
  }
};

/**
 * Customer notifications
 * GET /api/notifications/customer
 */
const getCustomerNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve notifications." });
  }
};

/**
 * Customer mark notification read
 * PATCH /api/notifications/customer/:id/read
 */
const markCustomerNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true, readAt: new Date(), status: "Read" } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.json({ message: "Notification marked as read.", notification });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification." });
  }
};

module.exports = {
  getAdminNotificationStream,
  getAdminNotifications,
  getAdminUnreadCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  deleteAdminNotification,
  getCustomerNotifications,
  markCustomerNotificationRead,
};
