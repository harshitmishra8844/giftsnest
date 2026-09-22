const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/User");
const Order = require("../models/Order");
const RefundRecord = require("../models/RefundRecord");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const refundController = require("../controllers/refundController");

// Helper mock request and response
const createMockReq = (user, body = {}, params = {}, query = {}) => ({
  user,
  body,
  params,
  query,
  headers: { "user-agent": "Automated Phase 5 Test Suite" },
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

async function runPhase5Validation() {
  console.log("=== PHASE 5: REFUND + STORE CREDIT INTEGRATION TEST ===");
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/niyora";
  await mongoose.connect(mongoURI);
  console.log("MongoDB connected successfully");

  // 1. Create test actors
  const customer = await User.create({
    name: "Refund Target Customer",
    email: `customer_refund_${Date.now()}@example.com`,
    password: "Password123!",
    mobileNumber: "9812345678",
  });

  const supportExec = await User.create({
    name: "Pooja Support Exec",
    email: `pooja_${Date.now()}@example.com`,
    password: "Password123!",
    role: "staff",
    designation: "Customer Support Executive",
    permissions: ["SUPPORT_READ", "SUPPORT_MANAGE"],
  });

  const refundManager = await User.create({
    name: "Vikram Refund Lead",
    email: `vikram_${Date.now()}@example.com`,
    password: "Password123!",
    role: "staff",
    designation: "Refund Manager",
    permissions: ["FINANCE_MANAGE"],
  });

  // 2. Create paid test order
  const order = await Order.create({
    orderCode: `ORD-TEST-${Date.now()}`,
    userId: customer._id,
    email: customer.email,
    products: [{ productId: "p1", name: "Premium Gift Box", price: 850, quantity: 1 }],
    totalPrice: 850,
    subtotal: 850,
    paymentMethod: "Online",
    paymentStatus: "Paid",
    status: "Order Confirmed",
    razorpayPaymentId: "pay_test_phase5_online",
    address: {
      fullName: customer.name,
      phone: customer.mobileNumber,
      line1: "456 Test Lane",
      city: "Bangalore",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
    },
  });
  console.log("Created Paid Order:", order.orderCode, "Amount: ₹850");

  try {
    // Step 1: Support Exec raises refund request
    const raiseReq = createMockReq(supportExec, {
      orderId: order._id,
      orderNumber: order.orderCode,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.mobileNumber,
      refundAmount: 850,
      refundType: "Full",
      refundReason: "Customer requested store credit refund",
      customerExplanation: "Would prefer wallet balance to buy something else",
      executiveRemarks: "Verified customer over call, requested Store Credit.",
      source: "Phone Call",
    });
    const raiseRes = createMockRes();
    await refundController.raiseRefundRequest(raiseReq, raiseRes);

    if (raiseRes.statusCode !== 201 || !raiseRes.data?.refundRecord) {
      throw new Error("Failed to raise refund: " + JSON.stringify(raiseRes.data));
    }
    const refundRecord = raiseRes.data.refundRecord;
    console.log("Raised Refund Request:", refundRecord.refundId, "Status:", refundRecord.status);

    // Security Gate: Support Exec cannot verify or approve
    const illegalVerifyReq = createMockReq(supportExec, { paymentVerified: true }, { id: refundRecord._id });
    const illegalVerifyRes = createMockRes();
    await refundController.verifyRefundEligibility(illegalVerifyReq, illegalVerifyRes);
    if (illegalVerifyRes.statusCode !== 403) {
      throw new Error("Security barrier breached: support exec was able to verify payment!");
    }
    console.log("Security barrier verified: Support Executive prohibited from verifying payments (HTTP 403)");

    // Step 2: Refund Team verifies payment
    const verifyReq = createMockReq(
      refundManager,
      {
        paymentVerified: true,
        paymentVerificationNotes: "Payment pay_test_phase5_online verified in gateway records",
        orderEligibilityVerified: true,
        fraudCheckPassed: true,
        duplicateCheckPassed: true,
      },
      { id: refundRecord._id }
    );
    const verifyRes = createMockRes();
    await refundController.verifyRefundEligibility(verifyReq, verifyRes);
    if (verifyRes.statusCode !== 200) {
      throw new Error("Verification failed: " + JSON.stringify(verifyRes.data));
    }
    console.log("Payment and eligibility verified by Refund Manager");

    // Step 3: Refund Team approves with refundMethod = "Store Credit"
    const approveReq = createMockReq(
      refundManager,
      {
        approvedAmount: 850,
        refundMethod: "Store Credit",
        approvalRemarks: "Approved for 100% instant store credit credit to customer wallet",
      },
      { id: refundRecord._id }
    );
    const approveRes = createMockRes();
    await refundController.approveRefundRequest(approveReq, approveRes);
    if (approveRes.statusCode !== 200) {
      throw new Error("Approval failed: " + JSON.stringify(approveRes.data));
    }
    console.log("Refund Approved with Method: Store Credit");

    // Step 4: Process Refund
    const processReq = createMockReq(refundManager, {}, { id: refundRecord._id });
    const processRes = createMockRes();
    await refundController.processRefundGateway(processReq, processRes);
    if (processRes.statusCode !== 200) {
      throw new Error("Refund processing failed: " + JSON.stringify(processRes.data));
    }
    console.log("Processed Refund Response:", processRes.data.refund.status, "Txn:", processRes.data.refund.gatewayRefundId);

    // Step 5: Verify Ledger & Customer Account Balance
    const customerAccount = await StoreCreditAccount.findOne({ userId: customer._id });
    console.log("Customer Store Credit Balance:", customerAccount?.balance);
    if (!customerAccount || customerAccount.balance !== 850) {
      throw new Error(`Expected customer store credit balance to be ₹850, got ₹${customerAccount?.balance}`);
    }

    const creditTransaction = await StoreCreditTransaction.findOne({
      userId: customer._id,
      referenceType: "REFUND",
      referenceId: refundRecord.refundId,
    });
    if (!creditTransaction || creditTransaction.amount !== 850) {
      throw new Error("Store credit transaction record missing or amount mismatch!");
    }
    console.log("Ledger Transaction Verified:", creditTransaction.transactionId, "Amount: ₹", creditTransaction.amount);

    // Step 6: Verify Synchronized Order Record
    const updatedOrder = await Order.findById(order._id);
    if (updatedOrder.refundStatus !== "REFUNDED") {
      throw new Error(`Expected order refundStatus to be REFUNDED, got: ${updatedOrder.refundStatus}`);
    }
    console.log("Order synchronized successfully with refundStatus:", updatedOrder.refundStatus);

    console.log("✅ Phase 5 (Refund + Store Credit Integration) Passed 100%!");
  } finally {
    // Cleanup
    await RefundRecord.deleteMany({ customerId: customer._id });
    await StoreCreditAccount.deleteMany({ userId: customer._id });
    await StoreCreditTransaction.deleteMany({ userId: customer._id });
    await Order.deleteOne({ _id: order._id });
    await User.deleteMany({ _id: { $in: [customer._id, supportExec._id, refundManager._id] } });
    await mongoose.connection.close();
  }
}

runPhase5Validation().catch((err) => {
  console.error("❌ Phase 5 Validation Failed:", err);
  process.exit(1);
});
