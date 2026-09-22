const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const StoreCreditExpiryLog = require("../models/StoreCreditExpiryLog");
const storeCreditService = require("./storeCreditService");
const { createAndDispatchNotification } = require("./notificationService");

/**
 * 1. Process all expired credits atomically
 * Scans for credits where expiresAt <= now and remainingCreditAmount > 0
 */
const processStoreCreditExpirations = async () => {
  const now = new Date();
  const eligibleTxns = await StoreCreditTransaction.find({
    type: "CREDIT",
    isExpired: false,
    remainingCreditAmount: { $gt: 0 },
    expiresAt: { $ne: null, $lte: now },
  });

  let expiredCount = 0;
  let totalExpiredAmount = 0;

  for (const txn of eligibleTxns) {
    try {
      const result = await storeCreditService.expireSingleCredit({
        transactionId: txn._id,
      });

      if (result.success) {
        expiredCount += 1;
        totalExpiredAmount += Number(result.expiredAmount || 0);

        await StoreCreditExpiryLog.updateOne(
          { transactionId: txn._id },
          { $set: { expiredAt: now, remainingAmount: 0 } }
        );
      }
    } catch (err) {
      console.error(`[ExpiryService] Error expiring transaction ${txn.transactionId}:`, err.message);
    }
  }

  return {
    success: true,
    expiredCount,
    totalExpiredAmount: Number(totalExpiredAmount.toFixed(2)),
    processedAt: now,
  };
};

/**
 * 2. Send multi-tiered reminder notifications: 7 days, 3 days, and 1 day before expiration
 * Strictly prevents duplicate notifications using boolean flags on StoreCreditExpiryLog.
 */
const sendExpiryReminders = async () => {
  const now = new Date();
  const results = {
    reminders7Days: 0,
    reminders3Days: 0,
    reminders1Day: 0,
  };

  // --- Tier 1: 7 Days Before (between 6d and 7d from now) ---
  const sevenDaysStart = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const sevenDaysEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000);

  const logs7d = await StoreCreditExpiryLog.find({
    reminderSent7Days: false,
    expiredAt: null,
    remainingAmount: { $gt: 0 },
    expiresAt: { $gte: sevenDaysStart, $lte: sevenDaysEnd },
  });

  for (const log of logs7d) {
    try {
      log.reminderSent7Days = true;
      await log.save();

      await createAndDispatchNotification({
        recipient: log.userId,
        role: "customer",
        category: "PAYMENT",
        event: "STORE_CREDIT_EXPIRING",
        title: "Store Credit Expiring in 7 Days",
        message: `You have ₹${log.remainingAmount} of store credit expiring on ${new Date(log.expiresAt).toLocaleDateString("en-IN")}. Use it now to curate special gifts!`,
        priority: "Medium",
        link: "profile",
        metadata: { amount: log.remainingAmount, expiresAt: log.expiresAt, daysRemaining: 7 },
      });
      results.reminders7Days += 1;
    } catch (err) {
      console.warn("[ExpiryService] 7d reminder error:", err.message);
    }
  }

  // --- Tier 2: 3 Days Before (between 2d and 3d from now) ---
  const threeDaysStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const threeDaysEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000);

  const logs3d = await StoreCreditExpiryLog.find({
    reminderSent3Days: false,
    expiredAt: null,
    remainingAmount: { $gt: 0 },
    expiresAt: { $gte: threeDaysStart, $lte: threeDaysEnd },
  });

  for (const log of logs3d) {
    try {
      log.reminderSent3Days = true;
      await log.save();

      await createAndDispatchNotification({
        recipient: log.userId,
        role: "customer",
        category: "PAYMENT",
        event: "STORE_CREDIT_EXPIRING",
        title: "Store Credit Expiring in 3 Days",
        message: `Reminder: ₹${log.remainingAmount} of store credit will expire on ${new Date(log.expiresAt).toLocaleDateString("en-IN")}. Don't miss out!`,
        priority: "High",
        link: "profile",
        metadata: { amount: log.remainingAmount, expiresAt: log.expiresAt, daysRemaining: 3 },
      });
      results.reminders3Days += 1;
    } catch (err) {
      console.warn("[ExpiryService] 3d reminder error:", err.message);
    }
  }

  // --- Tier 3: 1 Day Before (between now and 24h from now) ---
  const oneDayEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const logs1d = await StoreCreditExpiryLog.find({
    reminderSent1Day: false,
    expiredAt: null,
    remainingAmount: { $gt: 0 },
    expiresAt: { $gte: now, $lte: oneDayEnd },
  });

  for (const log of logs1d) {
    try {
      log.reminderSent1Day = true;
      await log.save();

      await createAndDispatchNotification({
        recipient: log.userId,
        role: "customer",
        category: "PAYMENT",
        event: "STORE_CREDIT_EXPIRING",
        title: "Final Alert: Store Credit Expiring in 24 Hours",
        message: `Urgent: ₹${log.remainingAmount} of your store credit expires in 24 hours. Redeem it before it expires!`,
        priority: "Urgent",
        link: "profile",
        metadata: { amount: log.remainingAmount, expiresAt: log.expiresAt, daysRemaining: 1 },
      });
      results.reminders1Day += 1;
    } catch (err) {
      console.warn("[ExpiryService] 1d reminder error:", err.message);
    }
  }

  return results;
};

/**
 * Run full expiry cycle: process expirations + dispatch reminders
 */
const runExpiryCycle = async () => {
  const expirations = await processStoreCreditExpirations();
  const reminders = await sendExpiryReminders();
  return { expirations, reminders };
};

module.exports = {
  processStoreCreditExpirations,
  sendExpiryReminders,
  runExpiryCycle,
};
