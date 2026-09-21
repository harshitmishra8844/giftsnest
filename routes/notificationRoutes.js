const express = require("express");
const {
  getAdminNotificationStream,
  getAdminNotifications,
  getAdminUnreadCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  deleteAdminNotification,
  getCustomerNotifications,
  markCustomerNotificationRead,
} = require("../controllers/notificationController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// SSE Stream (authenticates token directly from query or header)
router.get("/admin/stream", getAdminNotificationStream);

// Admin Notification Endpoints
router.get("/admin", protect, adminOnly, getAdminNotifications);
router.get("/admin/unread-count", protect, adminOnly, getAdminUnreadCount);
router.patch("/admin/read-all", protect, adminOnly, markAllAdminNotificationsRead);
router.patch("/admin/:id/read", protect, adminOnly, markAdminNotificationRead);
router.delete("/admin/:id", protect, adminOnly, deleteAdminNotification);

// Customer Notification Endpoints
router.get("/customer", protect, getCustomerNotifications);
router.patch("/customer/:id/read", protect, markCustomerNotificationRead);

module.exports = router;
