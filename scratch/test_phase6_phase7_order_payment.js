const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const StoreCreditReservation = require("../models/StoreCreditReservation");
const storeCreditService = require("../services/storeCreditService");
const orderController = require("../controllers/orderController");
const paymentController = require("../controllers/paymentController");

const createMockReq = (user, body = {}) => ({
  user,
  body,
  params: {},
  query: {},
  headers: { "user-agent": "Automated Phase 6/7 Test Runner" },
  ip: "127.0.0.1",
});

const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
};

async function runPhase6And7Validation() {
  console.log("=== PHASE 6 & PHASE 7: ORDER + STORE CREDIT & PAYMENT FAILURE PROTECTION ===");
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/niyora";
  await mongoose.connect(mongoURI);
  console.log("MongoDB connected successfully");

  // Drop stale idempotencyKey_1 index if present and sync indexes
  try {
    await mongoose.connection.collection("storecredittransactions").dropIndex("idempotencyKey_1");
  } catch (e) {}
  await StoreCreditTransaction.syncIndexes();

  // 1. Create test user & test product
  const customer = await User.create({
    name: "Checkout Integration Customer",
    email: `checkout_tester_${Date.now()}@example.com`,
    password: "Password123!",
    mobileNumber: "9876501234",
  });

  const product = await Product.create({
    name: "Luxury Silk Scarf",
    price: 500,
    stock: 20,
    description: "Premium gift item",
    category: "Accessories",
    image: "https://example.com/scarf.jpg",
  });

  const shippingAddress = {
    fullName: customer.name,
    phone: customer.mobileNumber,
    line1: "789 Palm Grove",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400050",
    country: "India",
  };

  try {
    // Top up customer store credit with ₹1,000
    await storeCreditService.addCredit({
      userId: customer._id,
      amount: 1000,
      referenceType: "REFUND",
      referenceId: "INITIAL-TEST-CREDIT",
      description: "Initial wallet top up",
    });
    console.log("Initial Store Credit Balance: ₹1,000");

    // ==========================================
    // TEST 1: 100% STORE CREDIT PAYMENT (₹500 order)
    // ==========================================
    console.log("\n--- TEST 1: 100% STORE CREDIT PAYMENT ---");
    const order1Req = createMockReq(customer, {
      products: [{ productId: product._id, name: product.name, price: 500, quantity: 1 }],
      address: shippingAddress,
      useStoreCredit: true,
      paymentMethod: "Store Credit",
    });
    const order1Res = createMockRes();
    await orderController.createOrder(order1Req, order1Res);

    if (order1Res.statusCode !== 201 || !order1Res.data?.order) {
      throw new Error("Failed to create 100% Store Credit order: " + JSON.stringify(order1Res.data));
    }
    const order1 = order1Res.data.order;
    console.log("Order 1 Created:", order1.orderCode);
    console.log("Order 1 Status:", order1.status, "Payment Status:", order1.paymentStatus, "Method:", order1.paymentMethod);

    if (order1.status !== "Order Confirmed" || order1.paymentStatus !== "Paid" || order1.paymentMethod !== "Store Credit") {
      throw new Error("100% Store Credit order should be instantly confirmed and paid!");
    }

    // Verify stock decremented
    const prodAfter1 = await Product.findById(product._id);
    console.log("Stock after 100% credit order:", prodAfter1.stock, "(Expected: 19)");
    if (prodAfter1.stock !== 19) throw new Error("Stock should be decremented to 19");

    // Verify customer balance decremented by ₹500
    let balanceInfo = await storeCreditService.getAccountBalance(customer._id);
    console.log("Customer Balance after Order 1:", balanceInfo.balance, "(Expected: 500)");
    if (balanceInfo.balance !== 500) throw new Error("Balance should be exactly 500");

    // Verify cannot initiate payment on 100% credit order
    const payOrder1Req = createMockReq(customer, { appOrderId: order1._id });
    const payOrder1Res = createMockRes();
    await paymentController.createPaymentOrder(payOrder1Req, payOrder1Res);
    if (payOrder1Res.statusCode !== 400) {
      throw new Error("createPaymentOrder should reject 100% store credit order!");
    }
    console.log("Verified: Online payment correctly blocked for 100% Store Credit order (HTTP 400)");

    // ==========================================
    // TEST 2: SPLIT PAYMENT (Store Credit ₹500 + Online ₹500 for ₹1,000 order)
    // ==========================================
    console.log("\n--- TEST 2: SPLIT PAYMENT SUCCESS ---");
    const order2Req = createMockReq(customer, {
      products: [{ productId: product._id, name: product.name, price: 500, quantity: 2 }],
      address: shippingAddress,
      useStoreCredit: true,
      paymentMethod: "Online",
    });
    const order2Res = createMockRes();
    await orderController.createOrder(order2Req, order2Res);

    if (order2Res.statusCode !== 201) throw new Error("Failed to create split order: " + JSON.stringify(order2Res.data));
    const order2 = order2Res.data.order;
    console.log("Order 2 Created:", order2.orderCode);
    console.log("Order 2 Method:", order2.paymentMethod, "Credit Applied: ₹", order2.storeCreditAmount, "Online Payable: ₹", order2.onlinePaymentAmount);

    if (order2.paymentMethod !== "Store Credit + Online" || order2.storeCreditAmount !== 500 || order2.onlinePaymentAmount !== 500) {
      throw new Error("Split payment calculation mismatch!");
    }
    if (order2.status !== "Pending" || order2.paymentStatus !== "Pending") {
      throw new Error("Split order must remain Pending until online payment is confirmed!");
    }

    // Verify stock NOT decremented yet
    const prodAfter2Initial = await Product.findById(product._id);
    if (prodAfter2Initial.stock !== 19) throw new Error("Stock must NOT be decremented before online payment!");
    console.log("Stock before online verification: 19 (Unchanged)");

    // Check online payment order initiation: amount must be ₹500 (50,000 paise), NOT ₹1,000!
    process.env.RAZORPAY_DEMO_MODE = "true";
    const payOrder2Req = createMockReq(customer, { appOrderId: order2._id });
    const payOrder2Res = createMockRes();
    await paymentController.createPaymentOrder(payOrder2Req, payOrder2Res);
    console.log("Razorpay Order Amount (Paise):", payOrder2Res.data?.amount, "(Expected: 50000 paise = ₹500)");
    if (payOrder2Res.data?.amount !== 50000) {
      throw new Error("Razorpay order amount must be onlinePaymentAmount paise (50000), got: " + payOrder2Res.data?.amount);
    }

    // Complete online payment in demo mode
    const demoPayReq = createMockReq(customer, { appOrderId: order2._id });
    const demoPayRes = createMockRes();
    await paymentController.completeDemoPayment(demoPayReq, demoPayRes);
    if (demoPayRes.statusCode !== 200) throw new Error("Demo payment completion failed!");
    console.log("Split Payment Online Verified! Status:", demoPayRes.data.order.status);

    // Stock should now be decremented by 2 (19 - 2 = 17)
    const prodAfter2Paid = await Product.findById(product._id);
    console.log("Stock after online payment confirmed:", prodAfter2Paid.stock, "(Expected: 17)");
    if (prodAfter2Paid.stock !== 17) throw new Error("Stock should be decremented to 17 after online payment confirmation!");

    // Balance should now be 0 available, 0 reserved, 1000 total debited
    balanceInfo = await storeCreditService.getAccountBalance(customer._id);
    console.log("Balance after split order completed: Available:", balanceInfo.balance, "Reserved:", balanceInfo.reservedBalance);
    if (balanceInfo.balance !== 0 || balanceInfo.reservedBalance !== 0) {
      throw new Error("All credit should be consumed after split payment confirmation");
    }

    // ==========================================
    // TEST 3: PAYMENT FAILURE & RESERVATION RELEASE
    // ==========================================
    console.log("\n--- TEST 3: PAYMENT FAILURE & RESERVATION RELEASE ---");
    // Give customer ₹400 store credit
    await storeCreditService.addCredit({
      userId: customer._id,
      amount: 400,
      referenceType: "REFUND",
      referenceId: "FAIL-TEST-CREDIT",
    });

    // Create split order: Total ₹500 (₹400 credit reserved, ₹100 online)
    const order3Req = createMockReq(customer, {
      products: [{ productId: product._id, name: product.name, price: 500, quantity: 1 }],
      address: shippingAddress,
      useStoreCredit: true,
      paymentMethod: "Online",
    });
    const order3Res = createMockRes();
    await orderController.createOrder(order3Req, order3Res);
    const order3 = order3Res.data.order;
    console.log("Order 3 Created with Reserved Credit:", order3.orderCode, "Reserved: ₹", order3.storeCreditAmount);

    // Check balance during checkout attempt
    balanceInfo = await storeCreditService.getAccountBalance(customer._id);
    console.log("During checkout attempt - Available:", balanceInfo.balance, "Reserved:", balanceInfo.reservedBalance);
    if (balanceInfo.balance !== 0 || balanceInfo.reservedBalance !== 400) {
      throw new Error("Credit should be reserved during checkout");
    }

    // Simulate Payment Failure: User Closed Window / Gateway Decline
    const failReq = createMockReq(customer, {
      appOrderId: order3._id,
      paymentAttemptId: "pay_failed_attempt_123",
      failureReason: "User closed payment window",
      failureType: "USER_CLOSED_WINDOW",
    });
    const failRes = createMockRes();
    await paymentController.recordPaymentFailure(failReq, failRes);
    console.log("Recorded Payment Failure Response Status:", failRes.data?.status);

    // Check Order 3 status: MUST be FAILED_PAYMENT, NEVER CONFIRMED, NEVER COD!
    const failedOrder = await Order.findById(order3._id);
    console.log("Order 3 Status:", failedOrder.status, "PaymentStatus:", failedOrder.paymentStatus, "Method:", failedOrder.paymentMethod);
    if (failedOrder.status !== "FAILED_PAYMENT" || failedOrder.paymentStatus !== "Failed") {
      throw new Error("Failed order must have status FAILED_PAYMENT!");
    }
    if (failedOrder.paymentMethod === "COD") {
      throw new Error("FATAL: Failed order was illegally converted to COD!");
    }

    // Verify Store Credit was RESTORED to customer!
    balanceInfo = await storeCreditService.getAccountBalance(customer._id);
    console.log("Customer Balance after Failure - Available:", balanceInfo.balance, "(Expected: 400), Reserved:", balanceInfo.reservedBalance, "(Expected: 0)");
    if (balanceInfo.balance !== 400 || balanceInfo.reservedBalance !== 0) {
      throw new Error("Reserved store credit was NOT restored after payment failure!");
    }

    // Stock must NOT have been decremented
    const prodAfterFail = await Product.findById(product._id);
    console.log("Stock after payment failure:", prodAfterFail.stock, "(Expected: 17)");
    if (prodAfterFail.stock !== 17) throw new Error("Stock should NOT be decremented for failed payment!");

    console.log("✅ Phase 6 (Order Integration) and Phase 7 (Payment Failure Protection) Passed 100%!");
  } finally {
    // Cleanup
    await Order.deleteMany({ userId: customer._id });
    await StoreCreditAccount.deleteMany({ userId: customer._id });
    await StoreCreditTransaction.deleteMany({ userId: customer._id });
    await StoreCreditReservation.deleteMany({ userId: customer._id });
    await Product.deleteOne({ _id: product._id });
    await User.deleteOne({ _id: customer._id });
    await mongoose.connection.close();
  }
}

runPhase6And7Validation().catch((err) => {
  console.error("❌ Phase 6/7 Validation Failed:", err);
  process.exit(1);
});
