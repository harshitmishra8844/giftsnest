const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const EmailLog = require("../models/EmailLog");
const EmailSetting = require("../models/EmailSetting");
const { retryEmail, getEmailSettings } = require("../services/emailService");

const router = express.Router();

/**
 * @desc    Get paginated email logs with filtering
 * @route   GET /api/admin/emails/logs
 * @access  Private (Admin)
 */
router.get("/logs", protect, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && req.query.status !== "All") {
      filter.status = req.query.status;
    }
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [
        { to: searchRegex },
        { subject: searchRegex },
        { type: searchRegex }
      ];
    }

    const total = await EmailLog.countDocuments(filter);
    const logs = await EmailLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Get email logs error:", error.message);
    return res.status(500).json({ message: "Failed to fetch email logs." });
  }
});

/**
 * @desc    Manual retry for a failed email
 * @route   POST /api/admin/emails/logs/:id/retry
 * @access  Private (Admin)
 */
router.post("/logs/:id/retry", protect, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const updatedLog = await retryEmail(req.params.id);
    return res.status(200).json({
      message: "Retry triggered successfully.",
      log: updatedLog
    });
  } catch (error) {
    console.error("Retry email error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to retry email dispatch." });
  }
});

/**
 * @desc    Get email settings
 * @route   GET /api/admin/emails/settings
 * @access  Private (Admin)
 */
router.get("/settings", protect, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const settings = await getEmailSettings();
    return res.status(200).json(settings);
  } catch (error) {
    console.error("Get email settings error:", error.message);
    return res.status(500).json({ message: "Failed to fetch email settings." });
  }
});

/**
 * @desc    Update email settings
 * @route   PUT /api/admin/emails/settings
 * @access  Private (Admin)
 */
router.put("/settings", protect, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Master Admin permission check
    if (!req.user.isMasterAdmin && !req.user.permissions?.includes("ROLES_MANAGE")) {
      return res.status(403).json({ message: "Access denied. Superadmin access required." });
    }

    const {
      adminEmails,
      supportEmails,
      notificationsEnabled,
      customerOrderConfirmation,
      customerOrderShipped,
      customerOrderDelivered,
      customerOrderCancelled,
      customerReturnRequest,
      customerReturnApproved,
      adminNewOrderAlert,
      adminCancelRequestAlert,
      adminReturnRequestAlert,
      supportNewOrderAlert,
      supportCancelRequestAlert,
      supportReturnRequestAlert,
      supportReturnApprovedAlert,
      supportRefundProcessAlert
    } = req.body;

    const payload = {};
    if (Array.isArray(adminEmails)) {
      payload.adminEmails = adminEmails.map(e => String(e).trim().toLowerCase()).filter(Boolean);
    }
    if (Array.isArray(supportEmails)) {
      payload.supportEmails = supportEmails.map(e => String(e).trim().toLowerCase()).filter(Boolean);
    }
    if (notificationsEnabled !== undefined) payload.notificationsEnabled = Boolean(notificationsEnabled);
    if (customerOrderConfirmation !== undefined) payload.customerOrderConfirmation = Boolean(customerOrderConfirmation);
    if (customerOrderShipped !== undefined) payload.customerOrderShipped = Boolean(customerOrderShipped);
    if (customerOrderDelivered !== undefined) payload.customerOrderDelivered = Boolean(customerOrderDelivered);
    if (customerOrderCancelled !== undefined) payload.customerOrderCancelled = Boolean(customerOrderCancelled);
    if (customerReturnRequest !== undefined) payload.customerReturnRequest = Boolean(customerReturnRequest);
    if (customerReturnApproved !== undefined) payload.customerReturnApproved = Boolean(customerReturnApproved);
    if (adminNewOrderAlert !== undefined) payload.adminNewOrderAlert = Boolean(adminNewOrderAlert);
    if (adminCancelRequestAlert !== undefined) payload.adminCancelRequestAlert = Boolean(adminCancelRequestAlert);
    if (adminReturnRequestAlert !== undefined) payload.adminReturnRequestAlert = Boolean(adminReturnRequestAlert);
    if (supportNewOrderAlert !== undefined) payload.supportNewOrderAlert = Boolean(supportNewOrderAlert);
    if (supportCancelRequestAlert !== undefined) payload.supportCancelRequestAlert = Boolean(supportCancelRequestAlert);
    if (supportReturnRequestAlert !== undefined) payload.supportReturnRequestAlert = Boolean(supportReturnRequestAlert);
    if (supportReturnApprovedAlert !== undefined) payload.supportReturnApprovedAlert = Boolean(supportReturnApprovedAlert);
    if (supportRefundProcessAlert !== undefined) payload.supportRefundProcessAlert = Boolean(supportRefundProcessAlert);

    const settings = await EmailSetting.findOneAndUpdate(
      { singletonKey: "email" },
      payload,
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
    );

    const { logActivity } = require("../services/logService");
    await logActivity(
      req.user._id,
      req.user.name,
      "EMAIL_SETTINGS_UPDATED",
      `Updated email configurations and notification toggles`,
      req
    );

    return res.status(200).json({
      message: "Email settings updated successfully.",
      settings
    });
  } catch (error) {
    console.error("Update email settings error:", error.message);
    return res.status(500).json({ message: "Failed to save email settings." });
  }
});

module.exports = router;
