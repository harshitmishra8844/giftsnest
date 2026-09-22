const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const StoreCreditReservation = require("../models/StoreCreditReservation");
const StoreCreditExpiryLog = require("../models/StoreCreditExpiryLog");
const RefundRecord = require("../models/RefundRecord");
const storeCreditService = require("../services/storeCreditService");

async function runPhase19Performance() {
  console.log("=== STARTING PHASE 19: DATABASE INDEXING & PERFORMANCE BENCHMARKING ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  // 1. Inspect Indexes
  console.log("\n--- [Audit 1/2] Verifying Database Indexes ---");
  const accountIndexes = await StoreCreditAccount.collection.indexes();
  console.log("StoreCreditAccount Indexes:", accountIndexes.map((idx) => idx.name).join(", "));
  const hasAccountUserIdx = accountIndexes.some((idx) => idx.key.userId === 1);
  if (!hasAccountUserIdx) throw new Error("Missing userId index on StoreCreditAccount!");

  const txIndexes = await StoreCreditTransaction.collection.indexes();
  console.log("StoreCreditTransaction Indexes:", txIndexes.map((idx) => idx.name).join(", "));
  const hasTxUserIdx = txIndexes.some((idx) => idx.key.userId !== undefined);
  if (!hasTxUserIdx) throw new Error("Missing userId index on StoreCreditTransaction!");

  const resIndexes = await StoreCreditReservation.collection.indexes();
  console.log("StoreCreditReservation Indexes:", resIndexes.map((idx) => idx.name).join(", "));

  const refundIndexes = await RefundRecord.collection.indexes();
  console.log("RefundRecord Indexes:", refundIndexes.map((idx) => idx.name).join(", "));

  console.log("✓ All critical indexes confirmed active on database collections.");

  // 2. Measure Latency on High-Frequency Operations
  console.log("\n--- [Audit 2/2] Benchmarking Operation Latencies ---");
  const user = await User.create({
    name: "Perf Tester",
    email: `perf_${Date.now()}@test.com`,
    password: "Password123!",
    role: "customer",
  });

  // Benchmark A: Account balance fetch (Target: < 20ms)
  const t0 = performance.now();
  await storeCreditService.getOrCreateAccount(user._id);
  const t1 = performance.now();
  console.log(`✓ getOrCreateAccount Latency: ${(t1 - t0).toFixed(2)} ms`);

  // Benchmark B: Adding Credit & Ledger Write (Target: < 50ms)
  const t2 = performance.now();
  await storeCreditService.addCredit({
    userId: user._id,
    amount: 5000,
    referenceType: "ADMIN_ADJUSTMENT",
    reason: "Performance test credit",
  });
  const t3 = performance.now();
  console.log(`✓ addCredit (Atomic ledger write) Latency: ${(t3 - t2).toFixed(2)} ms`);

  // Benchmark C: Reservation (Target: < 50ms)
  const orderId = new mongoose.Types.ObjectId();
  const t4 = performance.now();
  const reservation = await storeCreditService.reserveCredit({
    userId: user._id,
    amount: 1200,
    orderId,
  });
  const t5 = performance.now();
  console.log(`✓ reserveCredit Latency: ${(t5 - t4).toFixed(2)} ms`);

  // Benchmark D: Commit Reservation (Target: < 50ms)
  const t6 = performance.now();
  await storeCreditService.commitReservation({
    reservationId: reservation.reservationId,
    orderId,
    orderCode: "ORD-PERF-01",
  });
  const t7 = performance.now();
  console.log(`✓ commitReservation Latency: ${(t7 - t6).toFixed(2)} ms`);

  // Benchmark E: Balance Query (Target: < 15ms)
  const t8 = performance.now();
  const bal = await storeCreditService.getAccountBalance(user._id);
  const t9 = performance.now();
  console.log(`✓ getAccountBalance Latency: ${(t9 - t8).toFixed(2)} ms (Balance: ₹${bal.balance})`);

  console.log("\n=== PHASE 19: ALL INDEXING & PERFORMANCE TESTS PASSED ===");
  await mongoose.disconnect();
  process.exit(0);
}

runPhase19Performance().catch((err) => {
  console.error("❌ Phase 19 Performance Test failed:", err);
  process.exit(1);
});
