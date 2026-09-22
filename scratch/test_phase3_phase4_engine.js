const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const storeCreditService = require("../services/storeCreditService");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const StoreCreditReservation = require("../models/StoreCreditReservation");
const User = require("../models/User");

async function runPhase3And4Validation() {
  console.log("=== PHASE 3 & PHASE 4: STORE CREDIT LEDGER & SECURITY VALIDATION ===");
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/niyora";
  await mongoose.connect(mongoURI);
  console.log("MongoDB connected successfully");

  // Create temporary test user
  const testUser = await User.create({
    name: "Store Credit Tester",
    email: `tester_${Date.now()}@example.com`,
    password: "Password123!",
    mobileNumber: "9876543210",
  });
  console.log("Created test user:", testUser._id);

  try {
    // 1. Test getAccountBalance (initial = 0)
    let balanceInfo = await storeCreditService.getAccountBalance(testUser._id);
    console.log("Initial Balance:", balanceInfo.balance, "Available:", balanceInfo.availableBalance);
    if (balanceInfo.balance !== 0) throw new Error("Initial balance should be 0");

    // 2. Test addCredit (credit ₹1000)
    const credit1 = await storeCreditService.addCredit({
      userId: testUser._id,
      amount: 1000,
      referenceType: "REFUND",
      referenceId: "REF-TEST-001",
      description: "Test refund credit",
      idempotencyKey: `IDEM-CREDIT-${Date.now()}`,
    });
    console.log("Credit 1 Added:", credit1.transaction.transactionId, "Balance After:", credit1.balanceAfter);
    if (credit1.balanceAfter !== 1000) throw new Error("Balance after credit 1 should be 1000");

    // 3. Test Idempotency: duplicate request with same key
    const duplicateCredit = await storeCreditService.addCredit({
      userId: testUser._id,
      amount: 1000,
      referenceType: "REFUND",
      referenceId: "REF-TEST-001",
      idempotencyKey: credit1.transaction.idempotencyKey,
    });
    console.log("Idempotent Call Duplicate Flag:", duplicateCredit.isDuplicate);
    if (!duplicateCredit.isDuplicate) throw new Error("Idempotent request should be detected as duplicate");
    balanceInfo = await storeCreditService.getAccountBalance(testUser._id);
    if (balanceInfo.balance !== 1000) throw new Error("Balance should still be 1000 after duplicate request");

    // 4. Test reserveCredit (reserve ₹400 for checkout)
    const reservation = await storeCreditService.reserveCredit({
      userId: testUser._id,
      amount: 400,
      ttlMinutes: 15,
    });
    console.log("Reserved ₹400. Reservation ID:", reservation.reservationId);
    balanceInfo = await storeCreditService.getAccountBalance(testUser._id);
    console.log("Balance after reservation - Available:", balanceInfo.balance, "Reserved:", balanceInfo.reservedBalance);
    if (balanceInfo.balance !== 600 || balanceInfo.reservedBalance !== 400) {
      throw new Error("Balance should be 600 available, 400 reserved");
    }

    // 5. Test Negative Balance Firewall: try to reserve ₹700 (only 600 available)
    let caughtInsufficient = false;
    try {
      await storeCreditService.reserveCredit({
        userId: testUser._id,
        amount: 700,
      });
    } catch (err) {
      caughtInsufficient = true;
      console.log("Caught expected error reserving more than available balance:", err.message);
    }
    if (!caughtInsufficient) throw new Error("Firewall failed to block reservation exceeding available balance");

    // 6. Test releaseReservation (e.g. user cancelled payment)
    const releaseRes = await storeCreditService.releaseReservation({
      reservationId: reservation.reservationId,
      reason: "Payment cancelled by user",
    });
    console.log("Released Reservation. Amount:", releaseRes.releasedAmount);
    balanceInfo = await storeCreditService.getAccountBalance(testUser._id);
    console.log("Balance after release - Available:", balanceInfo.balance, "Reserved:", balanceInfo.reservedBalance);
    if (balanceInfo.balance !== 1000 || balanceInfo.reservedBalance !== 0) {
      throw new Error("Balance should be fully restored to 1000 after release");
    }

    // 7. Test commitReservation (reserve ₹300, then commit on successful order)
    const res2 = await storeCreditService.reserveCredit({
      userId: testUser._id,
      amount: 300,
    });
    const commitRes = await storeCreditService.commitReservation({
      reservationId: res2.reservationId,
      orderId: new mongoose.Types.ObjectId(),
    });
    console.log("Committed Reservation. Transaction:", commitRes.debitTransaction.transactionId);
    balanceInfo = await storeCreditService.getAccountBalance(testUser._id);
    console.log("Balance after commit - Available:", balanceInfo.balance, "Reserved:", balanceInfo.reservedBalance, "Debited:", balanceInfo.totalDebited);
    if (balanceInfo.balance !== 700 || balanceInfo.reservedBalance !== 0 || balanceInfo.totalDebited !== 300) {
      throw new Error("Balance should be 700 available after committing 300");
    }

    // 8. Test Direct Debit (100% store credit purchase of ₹200)
    const directDebit = await storeCreditService.deductCreditDirect({
      userId: testUser._id,
      amount: 200,
      referenceType: "ORDER",
      referenceId: "ORD-100-PERCENT",
    });
    console.log("Direct debit completed. New balance:", directDebit.balanceAfter);
    if (directDebit.balanceAfter !== 500) throw new Error("Balance after direct debit should be 500");

    // 9. Test Concurrency & Race Condition Protection:
    // 5 concurrent attempts to spend ₹200 when available is ₹500. Only 2 should succeed, 3 must fail!
    console.log("Testing Concurrent Checkout Race Condition (5 threads competing for ₹500 with ₹200 each)...");
    const concurrentAttempts = Array.from({ length: 5 }).map((_, i) =>
      storeCreditService
        .reserveCredit({
          userId: testUser._id,
          amount: 200,
        })
        .then(() => ({ success: true, index: i }))
        .catch((err) => ({ success: false, index: i, error: err.message }))
    );
    const results = await Promise.all(concurrentAttempts);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    console.log(`Concurrency Results: ${successCount} Succeeded, ${failCount} Rejected`);
    if (successCount !== 2 || failCount !== 3) {
      throw new Error(`Expected exactly 2 successes and 3 failures, got ${successCount} / ${failCount}`);
    }
    balanceInfo = await storeCreditService.getAccountBalance(testUser._id);
    console.log("Balance after concurrent stress test:", balanceInfo.balance, "Reserved:", balanceInfo.reservedBalance);
    if (balanceInfo.balance !== 100 || balanceInfo.reservedBalance !== 400) {
      throw new Error("Balance integrity compromised during concurrent test");
    }

    // Release the 2 concurrent reservations
    const activeRes = await StoreCreditReservation.find({ userId: testUser._id, status: "RESERVED" });
    for (const r of activeRes) {
      await storeCreditService.releaseReservation({ reservationId: r.reservationId, reason: "Cleanup" });
    }
    balanceInfo = await storeCreditService.getAccountBalance(testUser._id);
    console.log("Balance after releasing concurrent reservations:", balanceInfo.balance);
    if (balanceInfo.balance !== 500) throw new Error("Balance should be 500 after cleanup");

    // 10. Test Account Freezing Security
    console.log("Testing Account Freeze Protection...");
    await storeCreditService.setAccountStatus({
      userId: testUser._id,
      status: "Frozen",
      reason: "Suspicious security check",
      adminUser: { _id: new mongoose.Types.ObjectId(), name: "Security Officer", role: "admin" },
    });

    let caughtFrozen = false;
    try {
      await storeCreditService.reserveCredit({
        userId: testUser._id,
        amount: 50,
      });
    } catch (err) {
      caughtFrozen = true;
      console.log("Caught expected error trying to spend from frozen account:", err.message);
    }
    if (!caughtFrozen) throw new Error("Frozen account should NOT be permitted to reserve credit!");

    // Unfreeze account
    await storeCreditService.setAccountStatus({
      userId: testUser._id,
      status: "Active",
      adminUser: { _id: new mongoose.Types.ObjectId(), name: "Security Officer", role: "admin" },
    });
    balanceInfo = await storeCreditService.getAccountBalance(testUser._id);
    if (balanceInfo.status !== "Active") throw new Error("Account should be active after unfreezing");

    console.log("✅ Phase 3 (Store Credit Engine) and Phase 4 (Security & Concurrency) Passed 100%!");
  } finally {
    // Clean up test data
    await StoreCreditAccount.deleteMany({ userId: testUser._id });
    await StoreCreditTransaction.deleteMany({ userId: testUser._id });
    await StoreCreditReservation.deleteMany({ userId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
    await mongoose.connection.close();
  }
}

runPhase3And4Validation().catch((err) => {
  console.error("❌ Phase 3/4 Validation Failed:", err);
  process.exit(1);
});
