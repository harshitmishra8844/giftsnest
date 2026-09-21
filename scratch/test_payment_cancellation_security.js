const mongoose = require("mongoose");
const dotenv = require("dotenv");
const crypto = require("crypto");
dotenv.config();

const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const FailedOrderRecord = require("../models/FailedOrderRecord");
const Notification = require("../models/Notification");
const { verifyPayment, recordPaymentFailure } = require("../controllers/paymentController");
const { customerCancelOrder, updateOrderStatus } = require("../controllers/orderController");

const assert = (condition, message) => {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
};

const runTestSuite = async () => {
  console.log("\n=================================================");
  console.log("🧪 ONLINE PAYMENT & CANCELLATION SECURITY TEST SUITE");
  console.log("=================================================");

  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/niyora");
  console.log("Connected to MongoDB");

  let testUser = await User.findOne({ email: "test_buyer_security@niyora.com" });
  if (!testUser) {
    testUser = await User.create({
      name: "Security Test Buyer",
      email: "test_buyer_security@niyora.com",
      password: "Password123!",
      mobileNumber: "9876543210",
      isVerified: true,
    });
  }

  let otherUser = await User.findOne({ email: "other_buyer_security@niyora.com" });
  if (!otherUser) {
    otherUser = await User.create({
      name: "Other User",
      email: "other_buyer_security@niyora.com",
      password: "Password123!",
      mobileNumber: "9876543211",
      isVerified: true,
    });
  }

  let testProduct = await Product.findOne({ sku: "TEST-PAY-SEC-01" });
  if (!testProduct) {
    testProduct = await Product.create({
      sku: "TEST-PAY-SEC-01",
      name: "Luxury Security Test Gift",
      price: 1500,
      stock: 50,
      category: "Celebration",
      description: "A luxury test gift for payment security suite",
      image: "https://example.com/test-gift.jpg",
      codEnabled: true,
    });
  } else {
    testProduct.stock = 50;
    await testProduct.save();
  }

  const initialStock = testProduct.stock;
  console.log(`Starting Product Stock: ${initialStock}`);

  // -------------------------------------------------------------
  // TEST 1: Online Payment Success
  // -------------------------------------------------------------
  console.log("\n[TEST 1] Online Payment Success Verification");
  process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "test_secret_key_12345";
  
  const order1 = await Order.create({
    orderCode: `SEC-SUCC-${Date.now().toString().slice(-6)}`,
    userId: testUser._id,
    email: testUser.email,
    products: [{ productId: testProduct._id.toString(), name: testProduct.name, price: 1500, quantity: 2 }],
    totalPrice: 3000,
    address: { fullName: "Buyer", phone: "9876543210", line1: "Street", city: "City", state: "State", postalCode: "110001", country: "India" },
    status: "Pending",
    paymentStatus: "Pending",
    paymentMethod: "Online",
    razorpayOrderId: "rzp_order_success_001",
  });

  const validSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`rzp_order_success_001|pay_success_123`)
    .digest("hex");

  const reqVerifySuccess = {
    body: {
      appOrderId: order1._id.toString(),
      razorpay_order_id: "rzp_order_success_001",
      razorpay_payment_id: "pay_success_123",
      razorpay_signature: validSignature,
    },
    ip: "127.0.0.1",
    headers: {},
  };

  let verifyResData = null;
  const resVerifySuccess = {
    status: function (s) { this.statusCode = s; return this; },
    json: function (d) { verifyResData = d; return this; },
  };

  await verifyPayment(reqVerifySuccess, resVerifySuccess);
  assert(resVerifySuccess.statusCode === 200, "verifyPayment returns 200 for valid signature");
  const updatedOrder1 = await Order.findById(order1._id);
  assert(updatedOrder1.status === "Order Confirmed", "Order status transitioned to 'Order Confirmed'");
  assert(updatedOrder1.paymentStatus === "Paid", "PaymentStatus marked as 'Paid'");
  
  const stockAfterSuccess = (await Product.findById(testProduct._id)).stock;
  assert(stockAfterSuccess === initialStock - 2, `Inventory successfully decremented (Expected: ${initialStock - 2}, Got: ${stockAfterSuccess})`);

  // -------------------------------------------------------------
  // TEST 2: Online Payment Failure (Signature Mismatch / Anti-Tamper)
  // -------------------------------------------------------------
  console.log("\n[TEST 2] Online Payment Failure & Anti-Bypass (Fake Signature)");
  const order2 = await Order.create({
    orderCode: `SEC-FAIL-${Date.now().toString().slice(-6)}`,
    userId: testUser._id,
    email: testUser.email,
    products: [{ productId: testProduct._id.toString(), name: testProduct.name, price: 1500, quantity: 2 }],
    totalPrice: 3000,
    address: { fullName: "Buyer", phone: "9876543210", line1: "Street", city: "City", state: "State", postalCode: "110001", country: "India" },
    status: "Pending",
    paymentStatus: "Pending",
    paymentMethod: "Online",
    razorpayOrderId: "rzp_order_fail_002",
  });

  const reqVerifyFail = {
    body: {
      appOrderId: order2._id.toString(),
      razorpay_order_id: "rzp_order_fail_002",
      razorpay_payment_id: "pay_fake_999",
      razorpay_signature: "invalid_tampered_signature_string",
    },
    ip: "127.0.0.1",
    headers: {},
  };

  let failResData = null;
  const resVerifyFail = {
    status: function (s) { this.statusCode = s; return this; },
    json: function (d) { failResData = d; return this; },
  };

  await verifyPayment(reqVerifyFail, resVerifyFail);
  assert(resVerifyFail.statusCode === 400, "verifyPayment returns 400 for tampered signature");
  assert(
    failResData.message === "Your payment was unsuccessful. No order has been placed. Please try again.",
    "Returned exact required failure message to customer"
  );

  const updatedOrder2 = await Order.findById(order2._id);
  assert(updatedOrder2.status === "FAILED_PAYMENT", "Order status strictly set to 'FAILED_PAYMENT'");
  assert(updatedOrder2.paymentStatus === "Failed", "Payment status set to 'Failed'");

  const failedRecord2 = await FailedOrderRecord.findOne({ orderId: order2._id });
  assert(failedRecord2 !== null, "FailedOrderRecord permanently created in audit collection");
  assert(failedRecord2.orderStatus === "FAILED_PAYMENT", "FailedOrderRecord orderStatus = FAILED_PAYMENT");

  const stockAfterFailure = (await Product.findById(testProduct._id)).stock;
  assert(stockAfterFailure === stockAfterSuccess, "Inventory was NOT decremented on failed payment");

  // -------------------------------------------------------------
  // TEST 3: Payment Timeout Recording
  // -------------------------------------------------------------
  console.log("\n[TEST 3] Payment Timeout Recording");
  const order3 = await Order.create({
    orderCode: `SEC-TIME-${Date.now().toString().slice(-6)}`,
    userId: testUser._id,
    email: testUser.email,
    products: [{ productId: testProduct._id.toString(), name: testProduct.name, price: 1500, quantity: 1 }],
    totalPrice: 1500,
    address: { fullName: "Buyer", phone: "9876543210", line1: "Street", city: "City", state: "State", postalCode: "110001", country: "India" },
    status: "Pending",
    paymentStatus: "Pending",
    paymentMethod: "Online",
    razorpayOrderId: "rzp_order_timeout_003",
  });

  const reqTimeout = {
    body: {
      appOrderId: order3._id.toString(),
      paymentAttemptId: "rzp_order_timeout_003",
      failureReason: "Payment session expired or timed out",
      failureType: "PAYMENT_TIMEOUT",
    },
    ip: "127.0.0.1",
    headers: {},
  };

  let timeoutResData = null;
  const resTimeout = {
    status: function (s) { this.statusCode = s; return this; },
    json: function (d) { timeoutResData = d; return this; },
  };

  await recordPaymentFailure(reqTimeout, resTimeout);
  assert(resTimeout.statusCode === 200, "recordPaymentFailure returns 200");
  assert(
    timeoutResData.message === "Your payment was unsuccessful. No order has been placed. Please try again.",
    "Correct failure message returned for timeout"
  );
  const updatedOrder3 = await Order.findById(order3._id);
  assert(updatedOrder3.status === "FAILED_PAYMENT", "Order 3 marked as 'FAILED_PAYMENT'");
  const timeoutRecord = await FailedOrderRecord.findOne({ orderId: order3._id });
  assert(timeoutRecord.failureType === "PAYMENT_TIMEOUT", "FailedOrderRecord logged failureType = PAYMENT_TIMEOUT");

  // -------------------------------------------------------------
  // TEST 4: Gateway Error / User Dismissed Modal
  // -------------------------------------------------------------
  console.log("\n[TEST 4] Gateway Error & User Closed Window");
  const order4 = await Order.create({
    orderCode: `SEC-GATE-${Date.now().toString().slice(-6)}`,
    userId: testUser._id,
    email: testUser.email,
    products: [{ productId: testProduct._id.toString(), name: testProduct.name, price: 1500, quantity: 1 }],
    totalPrice: 1500,
    address: { fullName: "Buyer", phone: "9876543210", line1: "Street", city: "City", state: "State", postalCode: "110001", country: "India" },
    status: "Pending",
    paymentStatus: "Pending",
    paymentMethod: "Online",
    razorpayOrderId: "rzp_order_gate_004",
  });

  const reqGateway = {
    body: {
      appOrderId: order4._id.toString(),
      paymentAttemptId: "rzp_order_gate_004",
      failureReason: "Bank server unresponsive / Gateway 502",
      failureType: "GATEWAY_ERROR",
    },
    ip: "127.0.0.1",
    headers: {},
  };

  let gatewayResData = null;
  const resGateway = {
    status: function (s) { this.statusCode = s; return this; },
    json: function (d) { gatewayResData = d; return this; },
  };

  await recordPaymentFailure(reqGateway, resGateway);
  const updatedOrder4 = await Order.findById(order4._id);
  assert(updatedOrder4.status === "FAILED_PAYMENT", "Order 4 marked as 'FAILED_PAYMENT' on gateway error");

  // -------------------------------------------------------------
  // TEST 5: Customer Cancellation Before Processing & Inventory Restoration
  // -------------------------------------------------------------
  console.log("\n[TEST 5] Customer Cancellation Before Processing & Inventory Restoration");
  const stockBeforeCOD = (await Product.findById(testProduct._id)).stock;
  
  // Create a confirmed order that decremented stock (e.g. COD or confirmed online)
  const order5 = await Order.create({
    orderCode: `SEC-CAN-${Date.now().toString().slice(-6)}`,
    userId: testUser._id,
    email: testUser.email,
    products: [{ productId: testProduct._id.toString(), name: testProduct.name, price: 1500, quantity: 3 }],
    totalPrice: 4500,
    address: { fullName: "Buyer", phone: "9876543210", line1: "Street", city: "City", state: "State", postalCode: "110001", country: "India" },
    status: "Order Confirmed",
    paymentStatus: "Pending",
    paymentMethod: "COD",
  });

  // Decrement stock for confirmed COD order
  const { decrementStockForPaidOrder } = require("../services/inventoryService");
  await decrementStockForPaidOrder(order5);
  const stockAfterCOD = (await Product.findById(testProduct._id)).stock;
  assert(stockAfterCOD === stockBeforeCOD - 3, `Stock decremented by 3 for order 5 (Now: ${stockAfterCOD})`);

  // Customer cancels the order
  const reqCancel = {
    user: testUser,
    params: { id: order5._id.toString() },
    body: { reason: "Ordered by mistake, cancelling before fulfillment" },
    ip: "192.168.1.100",
    headers: { "x-forwarded-for": "192.168.1.100", "user-agent": "Mozilla/5.0 Test Agent" },
  };

  let cancelResData = null;
  const resCancel = {
    status: function (s) { this.statusCode = s; return this; },
    json: function (d) { cancelResData = d; return this; },
  };

  await customerCancelOrder(reqCancel, resCancel);
  assert(resCancel.statusCode === 200, "customerCancelOrder returns 200 on eligible status");
  assert(cancelResData.message === "Order Cancelled Successfully", "Returned 'Order Cancelled Successfully'");

  const updatedOrder5 = await Order.findById(order5._id);
  assert(updatedOrder5.status === "CUSTOMER_CANCELLED", "Order status is 'CUSTOMER_CANCELLED'");
  assert(updatedOrder5.orderStatus === "CUSTOMER_CANCELLED", "orderStatus field is 'CUSTOMER_CANCELLED'");
  assert(updatedOrder5.cancelledBy === "CUSTOMER", "cancelledBy field recorded as 'CUSTOMER'");
  assert(updatedOrder5.cancellationReason === "Ordered by mistake, cancelling before fulfillment", "cancellationReason recorded");
  assert(updatedOrder5.cancellationIpAddress === "192.168.1.100", "cancellationIpAddress recorded");

  // Verify inventory restored automatically
  const stockAfterCancel = (await Product.findById(testProduct._id)).stock;
  assert(stockAfterCancel === stockBeforeCOD, `Inventory automatically restored to ${stockBeforeCOD}`);

  // -------------------------------------------------------------
  // TEST 6: Customer Cancellation Prohibited After Processing
  // -------------------------------------------------------------
  console.log("\n[TEST 6] Customer Cancellation Prohibited in Processing Status");
  const order6 = await Order.create({
    orderCode: `SEC-PROC-${Date.now().toString().slice(-6)}`,
    userId: testUser._id,
    email: testUser.email,
    products: [{ productId: testProduct._id.toString(), name: testProduct.name, price: 1500, quantity: 1 }],
    totalPrice: 1500,
    address: { fullName: "Buyer", phone: "9876543210", line1: "Street", city: "City", state: "State", postalCode: "110001", country: "India" },
    status: "Processing",
    paymentStatus: "Paid",
    paymentMethod: "Online",
  });

  const reqCancelProcessing = {
    user: testUser,
    params: { id: order6._id.toString() },
    body: { reason: "Please cancel my parcel" },
    ip: "127.0.0.1",
    headers: {},
  };

  let procCancelData = null;
  const resCancelProcessing = {
    status: function (s) { this.statusCode = s; return this; },
    json: function (d) { procCancelData = d; return this; },
  };

  await customerCancelOrder(reqCancelProcessing, resCancelProcessing);
  assert(resCancelProcessing.statusCode === 400, "customerCancelOrder rejected with 400 for Processing status");
  assert(
    procCancelData.message === "This order is already being processed and can no longer be cancelled from your account. Please contact customer support for assistance.",
    "Returned exact processing cancellation refusal message"
  );
  const checkOrder6 = await Order.findById(order6._id);
  assert(checkOrder6.status === "Processing", "Order status remained 'Processing'");

  // -------------------------------------------------------------
  // TEST 7: Multi-Party Notifications Delivered on Cancellation
  // -------------------------------------------------------------
  console.log("\n[TEST 7] Multi-Party Notification Delivery on Cancellation");
  const customerNotif = await Notification.findOne({
    role: "customer",
    event: "ORDER_CANCELLED",
    "metadata.orderId": order5._id,
  });
  assert(customerNotif !== null, "Notification created for Customer on order cancellation");

  const adminNotif = await Notification.findOne({
    role: "admin",
    event: "ORDER_CANCELLED",
    "metadata.orderId": order5._id,
  });
  assert(adminNotif !== null, "Notification created for Admin on customer order cancellation");
  assert(adminNotif.title.includes("Customer Cancelled Order Alert"), "Admin alert title formatted correctly");

  // -------------------------------------------------------------
  // TEST 8: Anti-Tamper: Block Moving FAILED_PAYMENT to Active Fulfillment
  // -------------------------------------------------------------
  console.log("\n[TEST 8] Anti-Tamper: Block Moving FAILED_PAYMENT to Active Fulfillment");
  const reqAdminStatus = {
    params: { id: order2._id.toString() },
    body: { status: "Order Confirmed" },
    user: { _id: new mongoose.Types.ObjectId(), name: "Admin User" },
  };

  let adminStatusData = null;
  const resAdminStatus = {
    status: function (s) { this.statusCode = s; return this; },
    json: function (d) { adminStatusData = d; return this; },
  };

  await updateOrderStatus(reqAdminStatus, resAdminStatus);
  assert(resAdminStatus.statusCode === 400, "Admin rejected from moving FAILED_PAYMENT order to Order Confirmed without paid verification");
  assert(
    adminStatusData.message.includes("failed payment order to active fulfillment"),
    "Proper anti-fraud safeguard error returned"
  );

  // -------------------------------------------------------------
  // TEST 9: Unauthorized User Cannot Cancel Another Customer's Order
  // -------------------------------------------------------------
  console.log("\n[TEST 9] Unauthorized Cancellation Protection");
  const reqUnauthorizedCancel = {
    user: otherUser,
    params: { id: order1._id.toString() },
    body: { reason: "Malicious attempt to cancel" },
    ip: "127.0.0.1",
    headers: {},
  };

  let unauthCancelData = null;
  const resUnauthorizedCancel = {
    status: function (s) { this.statusCode = s; return this; },
    json: function (d) { unauthCancelData = d; return this; },
  };

  await customerCancelOrder(reqUnauthorizedCancel, resUnauthorizedCancel);
  assert(resUnauthorizedCancel.statusCode === 404, "User cannot cancel an order belonging to another customer");

  console.log("\n=================================================");
  console.log("📊 TEST SUITE SUMMARY: ALL 9 TEST SUITES PASSED! 🎉");
  console.log("=================================================\n");

  await mongoose.disconnect();
  process.exit(0);
};

runTestSuite().catch((err) => {
  console.error("Test Suite Unhandled Error:", err);
  process.exit(1);
});
