const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Order = require("../models/Order");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const storeCreditService = require("../services/storeCreditService");
const {
  getMyBalance,
  getMyTransactions,
  adminGetAccounts,
  adminAdjustCredit,
  adminUpdateStatus,
} = require("../controllers/storeCreditController");
const { createOrder } = require("../controllers/orderController");

const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (data) {
    this.data = data;
    return this;
  };
  return res;
};

async function runPhase16SecurityAudit() {
  console.log("=== STARTING PHASE 16: COMPREHENSIVE SECURITY AUDIT ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  // Create two distinct customers: Alice and Bob
  const alice = await User.create({
    name: "Alice Security Test",
    email: `alice_${Date.now()}@test.com`,
    password: "Password123!",
    role: "customer",
  });

  const bob = await User.create({
    name: "Bob Security Test",
    email: `bob_${Date.now()}@test.com`,
    password: "Password123!",
    role: "customer",
  });

  // Credit Alice with ₹1000, Bob with ₹100
  await storeCreditService.addCredit({
    userId: alice._id,
    amount: 1000,
    referenceType: "ADMIN_ADJUSTMENT",
    reason: "Alice initial balance",
  });
  await storeCreditService.addCredit({
    userId: bob._id,
    amount: 100,
    referenceType: "ADMIN_ADJUSTMENT",
    reason: "Bob initial balance",
  });

  // ----------------------------------------------------
  // ATTACK VECTOR 1: IDOR & Horizontal Privilege Escalation
  // ----------------------------------------------------
  console.log("\n--- [Audit 1/5] Testing IDOR & Data Leakage ---");
  // Alice calls getMyBalance -> must return ONLY Alice's balance
  const reqAliceBal = { user: alice };
  const resAliceBal = mockRes();
  await getMyBalance(reqAliceBal, resAliceBal);
  if (resAliceBal.data.balance !== 1000) {
    throw new Error(`IDOR Leak: Alice got balance ₹${resAliceBal.data.balance} instead of ₹1000`);
  }

  // Bob calls getMyBalance -> must return ONLY Bob's balance
  const reqBobBal = { user: bob };
  const resBobBal = mockRes();
  await getMyBalance(reqBobBal, resBobBal);
  if (resBobBal.data.balance !== 100) {
    throw new Error(`IDOR Leak: Bob got balance ₹${resBobBal.data.balance} instead of ₹100`);
  }

  // Alice attempts to call admin endpoints -> must be blocked
  const reqAliceAdmin = { user: alice, query: {} };
  const resAliceAdmin = mockRes();
  // Note: authMiddleware blocks via adminOnly, but controller also guards
  const reqAliceAdjust = {
    body: { userId: bob._id.toString(), amount: 1000, adjustmentType: "CREDIT", reason: "Hacking" },
    user: alice,
  };
  const resAliceAdjust = mockRes();
  await adminAdjustCredit(reqAliceAdjust, resAliceAdjust);
  if (resAliceAdjust.statusCode !== 403) {
    throw new Error(`Privilege Escalation! Customer was not blocked from adminAdjustCredit (Got HTTP ${resAliceAdjust.statusCode})`);
  }
  console.log(`✓ IDOR Defense Passed: Customer balance strictly isolated; unauthorized admin access rejected with HTTP 403.`);

  // ----------------------------------------------------
  // ATTACK VECTOR 2: Negative Balance Manipulation Firewall
  // ----------------------------------------------------
  console.log("\n--- [Audit 2/5] Testing Negative Balance Firewall ---");
  // Attempt to directly deduct ₹5000 from Bob (who only has ₹100)
  try {
    await storeCreditService.deductCreditDirect({
      userId: bob._id,
      amount: 5000,
      orderId: new mongoose.Types.ObjectId(),
      reason: "Exploit attempt exceeding balance",
    });
    throw new Error("FIREWALL BREACH: deductCreditDirect allowed negative balance!");
  } catch (err) {
    if (!err.message.includes("Insufficient") && !err.message.includes("balance")) {
      throw err;
    }
    console.log(`✓ Negative Balance Blocked: "${err.message}"`);
  }

  // Attempt to reserve ₹500 from Bob
  try {
    await storeCreditService.reserveCredit({
      userId: bob._id,
      amount: 500,
      orderId: new mongoose.Types.ObjectId(),
    });
    throw new Error("FIREWALL BREACH: reserveCredit allowed negative reservation!");
  } catch (err) {
    if (!err.message.includes("Insufficient") && !err.message.includes("credit")) {
      throw err;
    }
    console.log(`✓ Excessive Reservation Blocked: "${err.message}"`);
  }

  // Verify Bob's balance is STILL exactly 100, not negative
  const bobAccount = await StoreCreditAccount.findOne({ userId: bob._id });
  if (bobAccount.balance < 0 || bobAccount.balance !== 100) {
    throw new Error(`Corrupted balance found: ${bobAccount.balance}`);
  }
  console.log(`✓ Firewall Verified: Account balance invariant intact at ₹${bobAccount.balance} (Zero Negative Balance Firewall).`);

  // ----------------------------------------------------
  // ATTACK VECTOR 3: Checkout Store Credit Tampering
  // ----------------------------------------------------
  console.log("\n--- [Audit 3/5] Testing Checkout Store Credit Tampering ---");
  const Product = require("../models/Product");
  const testProduct = await Product.create({
    name: "Diamond Brooch Security",
    price: 3000,
    category: "Accessories",
    stock: 50,
    description: "Luxury diamond brooch",
    image: "https://example.com/brooch.jpg",
  });

  // Alice has ₹1000 credit. An attacker tries to place an order of ₹3000,
  // but claims they want to pay with 100% Store Credit and bypass online payment.
  // The server order controller MUST calculate remainingOnline = 2000 and NOT mark it as paid.
  const reqTamper = {
    user: alice,
    body: {
      products: [
        {
          productId: testProduct._id,
          name: testProduct.name,
          price: 3000,
          quantity: 1,
        },
      ],
      address: {
        fullName: "Alice Security",
        phone: "9876543210",
        line1: "456 Defense Rd",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      },
      paymentMethod: "Online",
      useStoreCredit: true, // Alice only has 1000, cart is 3000
    },
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resTamper = mockRes();
  await createOrder(reqTamper, resTamper);
  if (!resTamper.data?.order) {
    throw new Error(`Failed to create split order: ${JSON.stringify(resTamper.data)}`);
  }
  const tamperedOrder = resTamper.data.order;
  if (tamperedOrder.isPaid === true) {
    throw new Error("SECURITY FAILURE: Order marked as paid when store credit only covered part of total!");
  }
  if (tamperedOrder.storeCreditAmount !== 1000 || tamperedOrder.onlinePaymentAmount !== 2000) {
    throw new Error(`Tampering detected! storeCreditAmount: ₹${tamperedOrder.storeCreditAmount}, onlinePaymentAmount: ₹${tamperedOrder.onlinePaymentAmount}`);
  }
  if (tamperedOrder.paymentMethod !== "Store Credit + Online") {
    throw new Error(`Payment method error: expected 'Store Credit + Online', got '${tamperedOrder.paymentMethod}'`);
  }
  console.log(`✓ Checkout Tampering Defense Passed: Server strictly clamped storeCreditAmount to ₹${tamperedOrder.storeCreditAmount} and enforced onlinePaymentAmount of ₹${tamperedOrder.onlinePaymentAmount} (Method: ${tamperedOrder.paymentMethod}). Order remains unpaid until online gateway settlement.`);

  // ----------------------------------------------------
  // ATTACK VECTOR 4: Race Conditions & Double-Spending Concurrency
  // ----------------------------------------------------
  console.log("\n--- [Audit 4/5] Testing Concurrency & Double-Spending Mutex Lock ---");
  // Create customer Charlie with ₹500
  const charlie = await User.create({
    name: "Charlie Concurrency Tester",
    email: `charlie_${Date.now()}@test.com`,
    password: "Password123!",
    role: "customer",
  });
  await storeCreditService.addCredit({
    userId: charlie._id,
    amount: 500,
    referenceType: "ADMIN_ADJUSTMENT",
    reason: "Charlie concurrency fund",
  });

  // Launch 10 simultaneous reservations of ₹100 each.
  // Exactly 5 MUST succeed (total ₹500), and 5 MUST fail (insufficient balance).
  // Under a race condition without mutex locks, all 10 might succeed, leading to negative balance (-500).
  const concurrentPromises = [];
  for (let i = 0; i < 10; i++) {
    concurrentPromises.push(
      storeCreditService
        .reserveCredit({
          userId: charlie._id,
          amount: 100,
          orderId: new mongoose.Types.ObjectId(),
        })
        .then(() => ({ success: true }))
        .catch((err) => ({ success: false, error: err.message }))
    );
  }

  const results = await Promise.all(concurrentPromises);
  const successes = results.filter((r) => r.success).length;
  const failures = results.filter((r) => !r.success).length;
  console.log(`Concurrency Test Results: ${successes} succeeded, ${failures} rejected.`);

  if (successes !== 5 || failures !== 5) {
    throw new Error(`RACE CONDITION DETECTED! Expected 5 successes and 5 failures, got ${successes} successes and ${failures} failures.`);
  }

  const charlieBal = await storeCreditService.getAccountBalance(charlie._id);
  if (charlieBal.reservedBalance !== 500 || charlieBal.availableBalance !== 0) {
    throw new Error(`Corrupted state after race test: Available=${charlieBal.availableBalance}, Reserved=${charlieBal.reservedBalance}`);
  }
  console.log(`✓ Concurrency & Race Condition Defense Passed: Mutex serialization prevented double-spending. Available balance: ₹${charlieBal.availableBalance}, Reserved: ₹${charlieBal.reservedBalance}.`);

  // ----------------------------------------------------
  // ATTACK VECTOR 5: Staff Role & Separation of Duties
  // ----------------------------------------------------
  console.log("\n--- [Audit 5/5] Testing Staff Role Separation Enforcement ---");
  const csAgent = await User.create({
    name: "Dave CS Agent",
    email: `dave_cs_${Date.now()}@test.com`,
    password: "Password123!",
    role: "employee",
    designation: "Customer Support Executive",
    permissions: ["AGENT_ASSIST_VIEW", "TICKETS_MANAGE"],
  });

  // Attempt freeze by CS Agent
  const reqCsFreeze = {
    params: { userId: charlie._id.toString() },
    body: { status: "Frozen", reason: "Unauthorized freeze" },
    user: csAgent,
  };
  const resCsFreeze = mockRes();
  await adminUpdateStatus(reqCsFreeze, resCsFreeze);
  if (resCsFreeze.statusCode !== 403) {
    throw new Error(`Role violation: CS Agent was able to freeze account! HTTP ${resCsFreeze.statusCode}`);
  }

  // Attempt manual credit adjustment by CS Agent
  const reqCsAdjust = {
    body: { userId: charlie._id.toString(), amount: 5000, adjustmentType: "CREDIT", reason: "Unauthorized bonus" },
    user: csAgent,
  };
  const resCsAdjust = mockRes();
  await adminAdjustCredit(reqCsAdjust, resCsAdjust);
  if (resCsAdjust.statusCode !== 403) {
    throw new Error(`Role violation: CS Agent was able to adjust store credit! HTTP ${resCsAdjust.statusCode}`);
  }
  console.log(`✓ Staff Role Separation Passed: CS Executives blocked from financial actions (freeze & adjustments rejected with HTTP 403).`);

  console.log("\n=== PHASE 16: ALL SECURITY AUDIT FIREWALL CHECKS PASSED PERFECTLY ===");
  await mongoose.disconnect();
  process.exit(0);
}

runPhase16SecurityAudit().catch((err) => {
  console.error("❌ Phase 16 Security Audit failed:", err);
  process.exit(1);
});
