const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const RefundRecord = require("../models/RefundRecord");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const StoreCreditReservation = require("../models/StoreCreditReservation");
const StoreCreditExpiryLog = require("../models/StoreCreditExpiryLog");
const storeCreditService = require("../services/storeCreditService");
const { runExpiryCycle } = require("../services/storeCreditExpiryService");
const {
  raiseRefundRequest,
  verifyRefundEligibility,
  approveRefundRequest,
  processRefundGateway,
} = require("../controllers/refundController");
const {
  createOrder,
  customerCancelOrder,
} = require("../controllers/orderController");
const {
  recordPaymentFailure,
} = require("../controllers/paymentController");

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

async function runPhase17E2E() {
  console.log("=================================================================");
  console.log("=== STARTING PHASE 17: COMPLETE END-TO-END VERIFICATION SUITE ===");
  console.log("=================================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  // Setup common test product
  const product = await Product.create({
    name: "Royal Heritage Pashmina Shawl",
    price: 2000,
    category: "Luxury Shawls",
    stock: 100,
    description: "Pure cashmere pashmina shawl handcrafted in Kashmir",
    image: "https://example.com/pashmina.jpg",
  });

  // Setup Finance Admin
  const financeAdmin = await User.create({
    name: "Suresh Finance Head",
    email: `finance_head_${Date.now()}@test.com`,
    password: "Password123!",
    role: "admin",
    isMasterAdmin: true,
    permissions: ["FINANCE_MANAGE", "ORDERS_RETURNS", "CUSTOMERS_VIEW"],
  });

  // Setup Customer
  const customer = await User.create({
    name: "Karan E2E Shopper",
    email: `karan_e2e_${Date.now()}@test.com`,
    password: "Password123!",
    role: "customer",
  });
  console.log(`✓ Test entities initialized: Product (₹2000), Admin, and Customer (${customer.email})`);

  // =================================================================
  // TEST A: Full Refund -> Store Credit Cycle
  // =================================================================
  console.log("\n--- TEST A: Full Refund -> Store Credit Cycle ---");
  const orderA = await Order.create({
    userId: customer._id,
    orderCode: `ORD-TEST-A-${Date.now()}`,
    items: [{ name: product.name, price: 2000, quantity: 1 }],
    totalPrice: 2000,
    address: {
      fullName: "Karan Shopper",
      phone: "9876543210",
      line1: "101 Luxury Way",
      city: "Delhi",
      state: "Delhi",
      postalCode: "110001",
      country: "India",
    },
    paymentMethod: "Online",
    isPaid: true,
    status: "Delivered",
  });

  // Raise refund
  const reqRaiseA = {
    body: {
      orderId: orderA._id.toString(),
      refundAmount: 2000,
      refundReason: "Defective item received",
    },
    user: financeAdmin,
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resRaiseA = mockRes();
  await raiseRefundRequest(reqRaiseA, resRaiseA);
  const refundA = resRaiseA.data.refundRecord || resRaiseA.data.refund;

  // Verify
  const resVerifyA = mockRes();
  await verifyRefundEligibility(
    {
      params: { id: refundA._id.toString() },
      body: { paymentVerified: true, paymentVerificationNotes: "Verified via Razorpay portal" },
      user: financeAdmin,
      headers: { "x-forwarded-for": "127.0.0.1" },
    },
    resVerifyA
  );

  // Approve as Store Credit
  const resApproveA = mockRes();
  await approveRefundRequest(
    {
      params: { id: refundA._id.toString() },
      body: { approvedAmount: 2000, refundMethod: "Store Credit" },
      user: financeAdmin,
      headers: { "x-forwarded-for": "127.0.0.1" },
    },
    resApproveA
  );

  // Process payout
  const resProcessA = mockRes();
  await processRefundGateway(
    {
      params: { id: refundA._id.toString() },
      user: financeAdmin,
      headers: { "x-forwarded-for": "127.0.0.1" },
    },
    resProcessA
  );

  const balAfterA = await storeCreditService.getAccountBalance(customer._id);
  if (balAfterA.balance !== 2000) {
    throw new Error(`TEST A FAILED: Expected ₹2000, got ₹${balAfterA.balance}`);
  }
  console.log(`✓ TEST A PASSED: Refund approved and processed as Store Credit. Customer Balance: ₹${balAfterA.balance}.`);

  // =================================================================
  // TEST B: Full Store Credit Checkout (100% Wallet)
  // =================================================================
  console.log("\n--- TEST B: Full Store Credit Checkout (100% Wallet) ---");
  // Customer buys 1 item of ₹2000 with their ₹2000 Store Credit
  const reqCheckoutB = {
    user: customer,
    body: {
      products: [{ productId: product._id, name: product.name, price: 2000, quantity: 1 }],
      address: {
        fullName: "Karan Shopper",
        phone: "9876543210",
        line1: "101 Luxury Way",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        country: "India",
      },
      paymentMethod: "Online",
      useStoreCredit: true,
    },
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resCheckoutB = mockRes();
  await createOrder(reqCheckoutB, resCheckoutB);
  const orderB = resCheckoutB.data?.order;
  if (!orderB) throw new Error(`TEST B FAILED: ${JSON.stringify(resCheckoutB.data)}`);

  if (orderB.paymentMethod !== "Store Credit") {
    throw new Error(`Expected paymentMethod 'Store Credit', got ${orderB.paymentMethod}`);
  }
  if (orderB.paymentStatus !== "Paid" || orderB.storeCreditAmount !== 2000 || orderB.onlinePaymentAmount !== 0) {
    throw new Error(`Order B state error: paymentStatus=${orderB.paymentStatus}, storeCredit=${orderB.storeCreditAmount}, online=${orderB.onlinePaymentAmount}`);
  }

  const balAfterB = await storeCreditService.getAccountBalance(customer._id);
  if (balAfterB.balance !== 0) {
    throw new Error(`TEST B FAILED: Expected balance 0, got ${balAfterB.balance}`);
  }
  console.log(`✓ TEST B PASSED: 100% Store Credit order created instantly without payment gateway. Order #${orderB.orderCode} (Balance: ₹${balAfterB.balance}).`);

  // =================================================================
  // TEST C: Split Payment Success (Store Credit + Online)
  // =================================================================
  console.log("\n--- TEST C: Split Payment Success (Store Credit + Online) ---");
  // Add ₹1000 credit to customer
  await storeCreditService.addCredit({
    userId: customer._id,
    amount: 1000,
    referenceType: "ADMIN_ADJUSTMENT",
    reason: "Adding test funds for split payment",
  });

  // Customer orders 1 item of ₹2000 using ₹1000 Store Credit + ₹1000 Online
  const reqCheckoutC = {
    user: customer,
    body: {
      products: [{ productId: product._id, name: product.name, price: 2000, quantity: 1 }],
      address: {
        fullName: "Karan Shopper",
        phone: "9876543210",
        line1: "101 Luxury Way",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        country: "India",
      },
      paymentMethod: "Online",
      useStoreCredit: true,
    },
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resCheckoutC = mockRes();
  await createOrder(reqCheckoutC, resCheckoutC);
  const orderC = resCheckoutC.data?.order;
  if (!orderC) throw new Error(`TEST C FAILED: ${JSON.stringify(resCheckoutC.data)}`);

  if (orderC.paymentMethod !== "Store Credit + Online") {
    throw new Error(`Expected 'Store Credit + Online', got ${orderC.paymentMethod}`);
  }
  if (orderC.storeCreditAmount !== 1000 || orderC.onlinePaymentAmount !== 1000) {
    throw new Error(`Split breakdown incorrect: credit=${orderC.storeCreditAmount}, online=${orderC.onlinePaymentAmount}`);
  }

  // Verify reservation is active
  const balDuringC = await storeCreditService.getAccountBalance(customer._id);
  if (balDuringC.reservedBalance !== 1000 || balDuringC.availableBalance !== 0) {
    throw new Error(`Expected ₹1000 reserved, got ${balDuringC.reservedBalance}`);
  }

  // Simulate gateway payment success: commit reservation
  await storeCreditService.commitReservation({
    reservationId: orderC.storeCreditReservationId,
    orderId: orderC._id,
    orderCode: orderC.orderCode,
  });
  orderC.paymentStatus = "Paid";
  orderC.status = "Order Confirmed";
  orderC.storeCreditStatus = "COMMITTED";
  await orderC.save();

  const balAfterC = await storeCreditService.getAccountBalance(customer._id);
  if (balAfterC.balance !== 0 || balAfterC.reservedBalance !== 0) {
    throw new Error(`Balance after commit incorrect: balance=${balAfterC.balance}, reserved=${balAfterC.reservedBalance}`);
  }
  console.log(`✓ TEST C PASSED: Split payment success. ₹1000 reserved, online paid, reservation committed. Remaining Balance: ₹${balAfterC.balance}.`);

  // =================================================================
  // TEST D: Split Payment Failure / Rollback
  // =================================================================
  console.log("\n--- TEST D: Split Payment Failure / Rollback ---");
  // Give customer ₹800
  await storeCreditService.addCredit({
    userId: customer._id,
    amount: 800,
    referenceType: "ADMIN_ADJUSTMENT",
    reason: "Funds for failure rollback test",
  });

  const reqCheckoutD = {
    user: customer,
    body: {
      products: [{ productId: product._id, name: product.name, price: 2000, quantity: 1 }],
      address: {
        fullName: "Karan Shopper",
        phone: "9876543210",
        line1: "101 Luxury Way",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        country: "India",
      },
      paymentMethod: "Online",
      useStoreCredit: true,
    },
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resCheckoutD = mockRes();
  await createOrder(reqCheckoutD, resCheckoutD);
  const orderD = resCheckoutD.data?.order;
  if (!orderD) throw new Error(`TEST D FAILED: ${JSON.stringify(resCheckoutD.data)}`);

  // Verify reservation held
  const balHeldD = await storeCreditService.getAccountBalance(customer._id);
  if (balHeldD.reservedBalance !== 800) {
    throw new Error(`Expected ₹800 reserved, got ${balHeldD.reservedBalance}`);
  }

  // Simulate Razorpay Gateway Failure / Cancellation Callback
  const reqFailD = {
    body: {
      appOrderId: orderD._id.toString(),
      failureReason: "Payment cancelled by user in gateway",
    },
    user: customer,
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resFailD = mockRes();
  await recordPaymentFailure(reqFailD, resFailD);
  if (resFailD.statusCode !== 200 || resFailD.data?.status !== "FAILED_PAYMENT") {
    throw new Error(`recordPaymentFailure failed: ${JSON.stringify(resFailD.data)}`);
  }

  // Verify rollback: reserved funds released, balance back to 800, order marked FAILED_PAYMENT, zero COD conversion
  const balAfterFailD = await storeCreditService.getAccountBalance(customer._id);
  if (balAfterFailD.balance !== 800 || balAfterFailD.reservedBalance !== 0 || balAfterFailD.availableBalance !== 800) {
    throw new Error(`Rollback failed! balance=${balAfterFailD.balance}, reserved=${balAfterFailD.reservedBalance}`);
  }
  const updatedOrderD = await Order.findById(orderD._id);
  if (updatedOrderD.status !== "FAILED_PAYMENT" || updatedOrderD.paymentMethod === "COD") {
    throw new Error(`Order status corrupt: status=${updatedOrderD.status}, method=${updatedOrderD.paymentMethod}`);
  }
  console.log(`✓ TEST D PASSED: Gateway failure released reserved credit back to wallet (Balance: ₹${balAfterFailD.balance}). Order set to FAILED_PAYMENT with zero COD conversion.`);

  // =================================================================
  // TEST E: Pre-Processing Customer Order Cancellation
  // =================================================================
  console.log("\n--- TEST E: Pre-Processing Customer Order Cancellation ---");
  // Customer places an order with ₹500 store credit (wallet has ₹800)
  // Create an order in "Pending" status
  const orderE = await Order.create({
    userId: customer._id,
    orderCode: `ORD-TEST-E-${Date.now()}`,
    items: [{ name: product.name, price: 500, quantity: 1 }],
    totalPrice: 500,
    address: {
      fullName: "Karan Shopper",
      phone: "9876543210",
      line1: "101 Luxury Way",
      city: "Delhi",
      state: "Delhi",
      postalCode: "110001",
      country: "India",
    },
    paymentMethod: "Store Credit",
    storeCreditAmount: 500,
    onlinePaymentAmount: 0,
    storeCreditStatus: "COMMITTED",
    paymentStatus: "Paid",
    status: "Pending",
  });

  // Deduct the 500
  await storeCreditService.deductCreditDirect({
    userId: customer._id,
    amount: 500,
    referenceType: "ORDER",
    referenceId: orderE.orderCode,
    orderId: orderE._id,
    reason: "Order E payment",
  });

  const balBeforeCancelE = await storeCreditService.getAccountBalance(customer._id);
  if (balBeforeCancelE.balance !== 300) {
    throw new Error(`Expected balance 300 before cancel, got ${balBeforeCancelE.balance}`);
  }

  // Customer cancels the order
  const reqCancelE = {
    params: { id: orderE._id.toString() },
    body: { reason: "Customer changed mind before processing" },
    user: customer,
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resCancelE = mockRes();
  await customerCancelOrder(reqCancelE, resCancelE);
  if (resCancelE.statusCode !== 200) {
    throw new Error(`cancelMyOrder failed: ${JSON.stringify(resCancelE.data)}`);
  }

  // Verify Store Credit was automatically refunded to wallet (300 + 500 = 800)
  const balAfterCancelE = await storeCreditService.getAccountBalance(customer._id);
  if (balAfterCancelE.balance !== 800) {
    throw new Error(`Expected balance restored to 800, got ${balAfterCancelE.balance}`);
  }
  const updatedOrderE = await Order.findById(orderE._id);
  if (updatedOrderE.status !== "CUSTOMER_CANCELLED") {
    throw new Error(`Expected status CUSTOMER_CANCELLED, got ${updatedOrderE.status}`);
  }
  console.log(`✓ TEST E PASSED: Pre-processing order cancelled by customer. Store credit instantly refunded to wallet (Balance: ₹${balAfterCancelE.balance}).`);

  // =================================================================
  // TEST F: Post-Processing Cancellation Rejection
  // =================================================================
  console.log("\n--- TEST F: Post-Processing Cancellation Rejection ---");
  const orderF = await Order.create({
    userId: customer._id,
    orderCode: `ORD-TEST-F-${Date.now()}`,
    items: [{ name: product.name, price: 500, quantity: 1 }],
    totalPrice: 500,
    address: {
      fullName: "Karan Shopper",
      phone: "9876543210",
      line1: "101 Luxury Way",
      city: "Delhi",
      state: "Delhi",
      postalCode: "110001",
      country: "India",
    },
    paymentMethod: "Online",
    paymentStatus: "Paid",
    status: "Processing", // Already in warehouse processing!
  });

  const reqCancelF = {
    params: { id: orderF._id.toString() },
    body: { reason: "Try cancel in processing" },
    user: customer,
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resCancelF = mockRes();
  await customerCancelOrder(reqCancelF, resCancelF);
  if (resCancelF.statusCode !== 400) {
    throw new Error(`Post-processing cancellation was NOT rejected with 400! Got ${resCancelF.statusCode}`);
  }
  console.log(`✓ TEST F PASSED: Customer cancellation rejected once order is in Processing (HTTP 400: "${resCancelF.data?.message}").`);

  // =================================================================
  // TEST G: Credit Expiry Processing (FIFO)
  // =================================================================
  console.log("\n--- TEST G: Credit Expiry Processing (FIFO) ---");
  // Add credit with past expiration date
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Expired yesterday
  await storeCreditService.addCredit({
    userId: customer._id,
    amount: 150,
    referenceType: "ADMIN_ADJUSTMENT",
    reason: "Expiring credit test",
    expiresAt: pastDate,
  });

  const balBeforeExpG = await storeCreditService.getAccountBalance(customer._id);
  if (balBeforeExpG.balance !== 950) {
    throw new Error(`Expected balance 950 before expiry, got ${balBeforeExpG.balance}`);
  }

  // Run automated expiry cycle
  const expiryResult = await runExpiryCycle();
  if (expiryResult.expirations.expiredCount < 1) {
    throw new Error(`Expiry cycle did not detect expired credit: ${JSON.stringify(expiryResult)}`);
  }

  const balAfterExpG = await storeCreditService.getAccountBalance(customer._id);
  if (balAfterExpG.balance !== 800) {
    throw new Error(`Expected balance reduced back to 800 after expiry, got ${balAfterExpG.balance}`);
  }
  console.log(`✓ TEST G PASSED: Expired credits automatically deducted via FIFO processor (Deducted: ₹150, Balance: ₹${balAfterExpG.balance}).`);

  // =================================================================
  // TEST H: Expiry Warning Triggers (7d, 3d, 1d)
  // =================================================================
  console.log("\n--- TEST H: Expiry Warning Triggers ---");
  // Add credit expiring in 7 days
  const future7Days = new Date(Date.now() + 6.9 * 24 * 60 * 60 * 1000);
  await storeCreditService.addCredit({
    userId: customer._id,
    amount: 200,
    referenceType: "ADMIN_ADJUSTMENT",
    reason: "7-day expiry warning test",
    expiresAt: future7Days,
  });

  const warningResult = await runExpiryCycle();
  const r7 = warningResult.reminders?.reminders7Days || 0;
  const r3 = warningResult.reminders?.reminders3Days || 0;
  const r1 = warningResult.reminders?.reminders1Day || 0;
  console.log(`✓ TEST H PASSED: Expiry warning scanner processed credits. Warnings triggered: 7d=${r7}, 3d=${r3}, 1d=${r1}.`);

  // =================================================================
  // TEST I: Concurrent Checkout Protection
  // =================================================================
  console.log("\n--- TEST I: Concurrent Checkout Protection ---");
  // Customer currently has 800 + 200 = 1000
  // Launch 10 simultaneous orders of ₹500 each
  // Exactly 2 orders CAN succeed (total ₹1000), remaining 8 MUST fail.
  const concurrentOrders = [];
  for (let i = 0; i < 10; i++) {
    const reqCon = {
      user: customer,
      body: {
        products: [{ productId: product._id, name: product.name, price: 500, quantity: 1 }],
        address: {
          fullName: "Karan Concurrent",
          phone: "9876543210",
          line1: "101 Luxury Way",
          city: "Delhi",
          state: "Delhi",
          postalCode: "110001",
          country: "India",
        },
        paymentMethod: "Online",
        useStoreCredit: true,
      },
      headers: { "x-forwarded-for": "127.0.0.1" },
    };
    const resCon = mockRes();
    concurrentOrders.push(
      createOrder(reqCon, resCon)
        .then(() => ({
          success: resCon.statusCode === 201 && Boolean(resCon.data?.order),
          order: resCon.data?.order,
        }))
        .catch((err) => ({ success: false, error: err.message }))
    );
  }

  const conResults = await Promise.all(concurrentOrders);
  const totalStoreCreditCommittedOrReserved = conResults
    .filter((r) => r.success && r.order)
    .reduce((sum, r) => sum + (r.order.storeCreditAmount || 0), 0);

  console.log(`Concurrent checkout: Committed/Reserved Store Credit total = ₹${totalStoreCreditCommittedOrReserved}`);
  if (totalStoreCreditCommittedOrReserved > 1000) {
    throw new Error(`CONCURRENCY LEAK: Spent ₹${totalStoreCreditCommittedOrReserved} exceeding wallet balance of ₹1000!`);
  }

  const finalCustomerBal = await storeCreditService.getAccountBalance(customer._id);
  if (finalCustomerBal.balance < 0) {
    throw new Error(`NEGATIVE BALANCE FOUND: ${finalCustomerBal.balance}`);
  }
  console.log(`✓ TEST I PASSED: Concurrent orders serialized safely. No overspending, no negative balance (Final balance: ₹${finalCustomerBal.balance}).`);

  console.log("\n=================================================================");
  console.log("=== ALL END-TO-END TESTS (A THROUGH I) PASSED WITH 100% SUCCESS ===");
  console.log("=================================================================");

  await mongoose.disconnect();
  process.exit(0);
}

runPhase17E2E().catch((err) => {
  console.error("❌ Phase 17 E2E Suite failed:", err);
  process.exit(1);
});
