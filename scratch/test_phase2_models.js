const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const StoreCreditCounter = require("../models/StoreCreditCounter");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const StoreCreditReservation = require("../models/StoreCreditReservation");
const StoreCreditExpiryLog = require("../models/StoreCreditExpiryLog");
const Order = require("../models/Order");

async function runPhase2Validation() {
  console.log("=== PHASE 2: DATABASE SCHEMA VALIDATION ===");
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/niyora";
  await mongoose.connect(mongoURI);
  console.log("MongoDB connected successfully");

  // 1. Verify StoreCreditCounter
  const code1 = await StoreCreditCounter.getNextTransactionCode();
  const code2 = await StoreCreditCounter.getNextTransactionCode();
  console.log("Generated Sequence 1:", code1);
  console.log("Generated Sequence 2:", code2);
  if (!code1.startsWith("TXN-SC-") || !code2.startsWith("TXN-SC-")) {
    throw new Error("StoreCreditCounter sequence format mismatch");
  }

  // 2. Verify StoreCreditAccount Validation
  const dummyUserId = new mongoose.Types.ObjectId();
  const testAccount = await StoreCreditAccount.create({
    userId: dummyUserId,
    balance: 500,
    currency: "INR",
  });
  console.log("Created test account:", testAccount._id, "Balance:", testAccount.balance);

  // Negative balance protection test
  let caughtError = false;
  try {
    testAccount.balance = -100;
    await testAccount.save();
  } catch (err) {
    caughtError = true;
    console.log("Expected validation caught negative balance:", err.message);
  }
  if (!caughtError) {
    throw new Error("StoreCreditAccount failed to reject negative balance!");
  }

  // Clean up test account
  await StoreCreditAccount.deleteOne({ _id: testAccount._id });

  // 3. Verify Order Model paymentMethod enum
  const dummyOrder = new Order({
    orderCode: `TEST-ORD-${Date.now()}`,
    userId: dummyUserId,
    email: "test@example.com",
    products: [{ productId: "prod1", name: "Test Product", price: 100, quantity: 1 }],
    totalPrice: 100,
    address: {
      fullName: "Test User",
      phone: "9999999999",
      line1: "123 Test St",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
      country: "India",
    },
    paymentMethod: "Store Credit + Online",
    storeCreditAmount: 40,
    onlinePaymentAmount: 60,
  });
  const validationError = dummyOrder.validateSync();
  if (validationError) {
    throw new Error("Order validation failed with Store Credit + Online: " + validationError.message);
  }
  console.log("Order model validated successfully with 'Store Credit + Online' paymentMethod");

  console.log("✅ Phase 2 Database Schema Design Validated Successfully!");
  await mongoose.connection.close();
  process.exit(0);
}

runPhase2Validation().catch((err) => {
  console.error("❌ Phase 2 Validation Failed:", err);
  process.exit(1);
});
