const crypto = require("crypto");
const ReturnActivityLog = require("../models/ReturnActivityLog");
const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Generates a unique, standardized Return/Replacement Request Number
 * Format: RET-2026-XXXXXX (or custom sequential code)
 */
const generateRequestId = (type = "Return") => {
  const year = new Date().getFullYear();
  const hex = crypto.randomBytes(3).toString("hex").toUpperCase();
  const prefix = type === "Replacement" ? "REP" : "RET";
  return `${prefix}-${year}-${hex}`;
};

/**
 * Generates a unique Refund Record ID
 * Format: REF-2026-XXXXXX
 */
const generateRefundId = () => {
  const year = new Date().getFullYear();
  const hex = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `REF-${year}-${hex}`;
};

/**
 * Generates a unique Replacement Order ID
 * Format: REP-ORDER-2026-XXXXXX
 */
const generateReplacementOrderId = () => {
  const year = new Date().getFullYear();
  const hex = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `REP-ORDER-${year}-${hex}`;
};

/**
 * Logs a return/replacement activity event into ReturnActivityLog
 */
const logReturnActivity = async ({
  requestId,
  action,
  status = "",
  performedBy = null,
  performedByName = "System",
  remarks = "",
  metadata = {},
}) => {
  try {
    const activityId = `ACT-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    return await ReturnActivityLog.create({
      activityId,
      requestId,
      action,
      status,
      performedBy,
      performedByName,
      remarks,
      metadata,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("[ReturnActivityService] Failed to log activity:", err.message);
    return null;
  }
};

/**
 * Creates in-app notifications for customer and admins with real-time SSE broadcasts
 */
const notifyCustomerAndAdmins = async ({
  customerId,
  title,
  message,
  type = "Order Update",
  alertAdmin = true,
  adminTitle = "",
  adminMessage = "",
  metadata = {},
}) => {
  try {
    const { createAndDispatchNotification } = require("./notificationService");

    // 1. Notify Customer
    if (customerId) {
      await createAndDispatchNotification({
        recipient: customerId,
        role: "CUSTOMER",
        category: "RETURN",
        event: "RETURN_ALERT",
        priority: "Medium",
        title,
        message,
        link: "/profile",
        metadata,
      });
    }

    // 2. Notify Admins & Master Admin
    if (alertAdmin) {
      await createAndDispatchNotification({
        recipient: null,
        role: "ADMIN",
        category: "RETURN",
        event: "RETURN_ALERT",
        priority: "High",
        title: adminTitle || `[Return Alert] ${title}`,
        message: adminMessage || message,
        link: "/returns-management",
        metadata,
      });
    }
  } catch (err) {
    console.error("[ReturnActivityService] Failed to create notifications:", err.message);
  }
};

module.exports = {
  generateRequestId,
  generateRefundId,
  generateReplacementOrderId,
  logReturnActivity,
  notifyCustomerAndAdmins,
};
