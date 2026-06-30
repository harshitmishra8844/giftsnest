const User = require("../models/User");
const Order = require("../models/Order");
const CustomerAlert = require("../models/CustomerAlert");

/**
 * Checks and creates alerts for a specific shopper based on business rules.
 */
const checkCustomerAlerts = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.isAdmin) return;

    const orders = await Order.find({ userId: user._id }).lean();
    const totalSpent = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const cancelledOrders = orders.filter((o) => o.status === "Cancelled");
    const codOrders = orders.filter((o) => o.paymentMethod === "COD");
    
    // 1. VIP Customer Alert (Spent >= ₹15,000)
    if (totalSpent >= 15000) {
      const exists = await CustomerAlert.exists({ userId: user._id, type: "vip_activity", status: "Active" });
      if (!exists) {
        await CustomerAlert.create({
          type: "vip_activity",
          title: "VIP Account Tier Reached",
          message: `${user.name} has spent a total of ₹${totalSpent.toLocaleString()} across ${orders.length} orders.`,
          userId: user._id,
          severity: "Medium",
          assignedRoles: ["Master Admin", "Marketing", "Sales"],
        });
      }
    }

    // 2. COD Abuse Alert (>= 3 cancelled COD orders)
    const cancelledCodCount = cancelledOrders.filter((o) => o.paymentMethod === "COD").length;
    if (cancelledCodCount >= 3) {
      const exists = await CustomerAlert.exists({ userId: user._id, type: "cod_abuse", status: "Active" });
      if (!exists) {
        await CustomerAlert.create({
          type: "cod_abuse",
          title: "COD Abuse Warning",
          message: `${user.name} has cancelled ${cancelledCodCount} Cash on Delivery orders. Risk profile updated.`,
          userId: user._id,
          severity: "High",
          assignedRoles: ["Master Admin", "Sales", "Support"],
        });
      }
    }

    // 3. Failed Payments Alert (>= 3 failed payment status orders)
    const failedPaymentCount = orders.filter((o) => o.paymentStatus === "Failed").length;
    if (failedPaymentCount >= 3) {
      const exists = await CustomerAlert.exists({ userId: user._id, type: "failed_payments", status: "Active" });
      if (!exists) {
        await CustomerAlert.create({
          type: "failed_payments",
          title: "Multiple Failed Payments",
          message: `${user.name} has experienced ${failedPaymentCount} failed payment gateways.`,
          userId: user._id,
          severity: "Low",
          assignedRoles: ["Master Admin", "Support"],
        });
      }
    }

    // 4. Inactive Customer Check (No order for 90 days)
    if (orders.length > 0) {
      const lastOrderDate = new Date(Math.max(...orders.map((o) => new Date(o.createdAt).getTime())));
      const daysSinceLastOrder = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastOrder >= 90) {
        const exists = await CustomerAlert.exists({ userId: user._id, type: "inactive", status: "Active" });
        if (!exists) {
          await CustomerAlert.create({
            type: "inactive",
            title: "Shopper Dormancy Notice",
            message: `${user.name} has not placed an order in ${daysSinceLastOrder} days. Last active on ${lastOrderDate.toLocaleDateString()}.`,
            userId: user._id,
            severity: "Low",
            assignedRoles: ["Master Admin", "Marketing"],
          });
        }
      }
    }
  } catch (error) {
    console.error(`[alertService] Failed to check alerts for user ${userId}:`, error.message);
  }
};

/**
 * Scan all shoppers globally and trigger dormancy warnings.
 */
const runGlobalAlertCheck = async () => {
  try {
    console.info("[alertService] Starting global customer CRM alert diagnostics...");
    const users = await User.find({ isAdmin: { $ne: true }, status: "Active" }).select("_id").lean();
    for (const u of users) {
      await checkCustomerAlerts(u._id);
    }
    console.info("[alertService] Global customer CRM alert diagnostics completed.");
  } catch (error) {
    console.error("[alertService] Global alert scan error:", error.message);
  }
};

module.exports = { checkCustomerAlerts, runGlobalAlertCheck };
