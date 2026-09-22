const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Notification = require("../models/Notification");
const {
  notifyStoreCreditAdded,
  notifyStoreCreditUsed,
  notifyStoreCreditRestored,
  notifyStoreCreditExpiring,
  notifyStoreCreditExpired,
} = require("../services/notificationService");

async function runPhase15Test() {
  console.log("=== STARTING PHASE 15: NOTIFICATION INTEGRATION VERIFICATION ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  const customer = await User.create({
    name: "Notification Tester",
    email: `notif_test_${Date.now()}@test.com`,
    password: "Password123!",
    role: "customer",
  });
  console.log(`✓ Created test customer: ${customer._id}`);

  // Test 1: Store Credit Added
  await notifyStoreCreditAdded({
    userId: customer._id,
    amount: 1200,
    balance: 1200,
    reason: "Order Refund Credit",
    referenceType: "REFUND",
  });
  const notif1 = await Notification.findOne({
    recipient: customer._id,
    event: "STORE_CREDIT_ADDED",
  });
  if (!notif1) throw new Error("STORE_CREDIT_ADDED notification was not created!");
  console.log(`✓ 1. STORE_CREDIT_ADDED notification verified: "${notif1.title}" - ${notif1.message}`);

  // Test 2: Store Credit Used
  await notifyStoreCreditUsed({
    userId: customer._id,
    amount: 400,
    balance: 800,
    orderCode: "ORD-998811",
  });
  const notif2 = await Notification.findOne({
    recipient: customer._id,
    event: "STORE_CREDIT_USED",
  });
  if (!notif2) throw new Error("STORE_CREDIT_USED notification was not created!");
  console.log(`✓ 2. STORE_CREDIT_USED notification verified: "${notif2.title}" - ${notif2.message}`);

  // Test 3: Store Credit Restored
  await notifyStoreCreditRestored({
    userId: customer._id,
    amount: 400,
    balance: 1200,
    orderCode: "ORD-998811",
    reason: "Payment gateway cancelled by user",
  });
  const notif3 = await Notification.findOne({
    recipient: customer._id,
    event: "STORE_CREDIT_RESTORED",
  });
  if (!notif3) throw new Error("STORE_CREDIT_RESTORED notification was not created!");
  console.log(`✓ 3. STORE_CREDIT_RESTORED notification verified: "${notif3.title}" - ${notif3.message}`);

  // Test 4: Store Credit Expiring (7d reminder)
  await notifyStoreCreditExpiring({
    userId: customer._id,
    amount: 500,
    daysRemaining: 7,
    expiryDate: new Date(Date.now() + 7 * 86400000),
  });
  const notif4 = await Notification.findOne({
    recipient: customer._id,
    event: "STORE_CREDIT_EXPIRING",
  });
  if (!notif4) throw new Error("STORE_CREDIT_EXPIRING notification was not created!");
  console.log(`✓ 4. STORE_CREDIT_EXPIRING notification verified: "${notif4.title}"`);

  // Test 5: Store Credit Expired
  await notifyStoreCreditExpired({
    userId: customer._id,
    amount: 500,
    remainingBalance: 700,
  });
  const notif5 = await Notification.findOne({
    recipient: customer._id,
    event: "STORE_CREDIT_EXPIRED",
  });
  if (!notif5) throw new Error("STORE_CREDIT_EXPIRED notification was not created!");
  console.log(`✓ 5. STORE_CREDIT_EXPIRED notification verified: "${notif5.title}" - ${notif5.message}`);

  // Verify total count in DB
  const totalNotifs = await Notification.countDocuments({ recipient: customer._id });
  console.log(`✓ 6. Customer has total ${totalNotifs} store credit notification records.`);

  console.log("=== PHASE 15: ALL NOTIFICATION INTEGRATION CHECKS PASSED ===");
  await mongoose.disconnect();
  process.exit(0);
}

runPhase15Test().catch((err) => {
  console.error("❌ Phase 15 Test failed:", err);
  process.exit(1);
});
