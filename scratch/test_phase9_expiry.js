const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/User");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const StoreCreditExpiryLog = require("../models/StoreCreditExpiryLog");
const storeCreditService = require("../services/storeCreditService");
const storeCreditExpiryService = require("../services/storeCreditExpiryService");

async function runPhase9Validation() {
  console.log("=== PHASE 9: STORE CREDIT EXPIRY & REMINDER WORKER TEST ===");
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/niyora";
  await mongoose.connect(mongoURI);
  console.log("MongoDB connected successfully");

  const customer = await User.create({
    name: "Expiry Test Customer",
    email: `expiry_cust_${Date.now()}@example.com`,
    password: "Password123!",
    mobileNumber: "9876543299",
  });

  try {
    const now = new Date();

    // 1. Credit A: Already Expired (1 day in the past) - ₹300
    const expiredPast = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const creditA = await storeCreditService.addCredit({
      userId: customer._id,
      amount: 300,
      referenceType: "REFUND",
      referenceId: "REF-EXP-PAST",
      expiresAt: expiredPast,
    });
    console.log("Credit A Added (Past Expiry): ₹300, Txn:", creditA.transaction.transactionId);

    // 2. Credit B: Expiring in 12 hours (1-day reminder tier) - ₹200
    const expiring12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const creditB = await storeCreditService.addCredit({
      userId: customer._id,
      amount: 200,
      referenceType: "REFUND",
      referenceId: "REF-EXP-12H",
      expiresAt: expiring12h,
    });
    console.log("Credit B Added (12h Expiry): ₹200, Txn:", creditB.transaction.transactionId);

    // 3. Credit C: Expiring in 2.5 days (3-day reminder tier) - ₹500
    const expiring2_5d = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000);
    const creditC = await storeCreditService.addCredit({
      userId: customer._id,
      amount: 500,
      referenceType: "REFUND",
      referenceId: "REF-EXP-3D",
      expiresAt: expiring2_5d,
    });
    console.log("Credit C Added (3-day Expiry): ₹500, Txn:", creditC.transaction.transactionId);

    // 4. Credit D: Expiring in 6.5 days (7-day reminder tier) - ₹700
    const expiring6_5d = new Date(now.getTime() + 6.5 * 24 * 60 * 60 * 1000);
    const creditD = await storeCreditService.addCredit({
      userId: customer._id,
      amount: 700,
      referenceType: "REFUND",
      referenceId: "REF-EXP-7D",
      expiresAt: expiring6_5d,
    });
    console.log("Credit D Added (7-day Expiry): ₹700, Txn:", creditD.transaction.transactionId);

    // Initial total balance: 300 + 200 + 500 + 700 = 1700
    let balanceInfo = await storeCreditService.getAccountBalance(customer._id);
    console.log("\nInitial Customer Balance:", balanceInfo.balance, "(Expected: 1700)");
    if (balanceInfo.balance !== 1700) throw new Error("Initial balance should be 1700");

    // ==========================================
    // TEST 1: Process Automated Expirations
    // ==========================================
    console.log("\nRunning processStoreCreditExpirations()...");
    const expiryResult = await storeCreditExpiryService.processStoreCreditExpirations();
    console.log(`Expired count: ${expiryResult.expiredCount}, Amount: ₹${expiryResult.totalExpiredAmount}`);
    if (expiryResult.expiredCount !== 1 || expiryResult.totalExpiredAmount !== 300) {
      throw new Error(`Expected exactly 1 expired credit of ₹300, got ${expiryResult.expiredCount} (₹${expiryResult.totalExpiredAmount})`);
    }

    // Customer balance should now be 1700 - 300 = 1400
    balanceInfo = await storeCreditService.getAccountBalance(customer._id);
    console.log("Balance after expiration:", balanceInfo.balance, "(Expected: 1400)");
    if (balanceInfo.balance !== 1400) throw new Error("Balance after expiration should be 1400");

    // Check Credit A transaction in DB
    const txnA = await StoreCreditTransaction.findById(creditA.transaction._id);
    console.log("Credit A status: isExpired =", txnA.isExpired, "remainingCreditAmount =", txnA.remainingCreditAmount);
    if (!txnA.isExpired || txnA.remainingCreditAmount !== 0) {
      throw new Error("Credit A should be marked expired with 0 remaining amount");
    }

    // ==========================================
    // TEST 2: Multi-Tier Reminder Notifications
    // ==========================================
    console.log("\nRunning sendExpiryReminders()...");
    const reminderResult = await storeCreditExpiryService.sendExpiryReminders();
    console.log("Reminders Sent:", reminderResult);
    if (reminderResult.reminders1Day !== 1) throw new Error("Expected 1 reminder for 1-day tier (Credit B)");
    if (reminderResult.reminders3Days !== 1) throw new Error("Expected 1 reminder for 3-day tier (Credit C)");
    if (reminderResult.reminders7Days !== 1) throw new Error("Expected 1 reminder for 7-day tier (Credit D)");

    // TEST 3: Duplicate Reminder Prevention
    console.log("\nRe-running sendExpiryReminders() to verify zero duplicate notifications...");
    const duplicateReminderResult = await storeCreditExpiryService.sendExpiryReminders();
    console.log("Duplicate Reminders Sent:", duplicateReminderResult);
    if (
      duplicateReminderResult.reminders1Day !== 0 ||
      duplicateReminderResult.reminders3Days !== 0 ||
      duplicateReminderResult.reminders7Days !== 0
    ) {
      throw new Error("Duplicate reminder prevention failed! Reminders were resent!");
    }
    console.log("Verified: Zero duplicate reminder notifications dispatched.");

    console.log("✅ Phase 9 (Store Credit Expiry & Reminder System) Passed 100%!");
  } finally {
    // Cleanup
    await StoreCreditAccount.deleteMany({ userId: customer._id });
    await StoreCreditTransaction.deleteMany({ userId: customer._id });
    await StoreCreditExpiryLog.deleteMany({ userId: customer._id });
    await User.deleteOne({ _id: customer._id });
    await mongoose.connection.close();
  }
}

runPhase9Validation().catch((err) => {
  console.error("❌ Phase 9 Validation Failed:", err);
  process.exit(1);
});
