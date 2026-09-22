const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Order = require("../models/Order");
const RefundRecord = require("../models/RefundRecord");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const storeCreditService = require("../services/storeCreditService");
const {
  raiseRefundRequest,
  verifyRefundEligibility,
  approveRefundRequest,
  processRefundGateway,
} = require("../controllers/refundController");

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

async function runPhase14Test() {
  console.log("=== STARTING PHASE 14: REFUND TEAM WORKFLOW & ROLE SEPARATION TEST ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  // 1. Create a Customer
  const customer = await User.create({
    name: "Refund Tester Customer",
    email: `refund_test_cust_${Date.now()}@test.com`,
    password: "Password123!",
    role: "customer",
  });

  // 2. Create a Customer Service Executive (Should NOT be able to approve or process)
  const csAgent = await User.create({
    name: "Aman CS Executive",
    email: `cs_exec_${Date.now()}@test.com`,
    password: "Password123!",
    role: "employee",
    designation: "Customer Support Associate",
    permissions: ["AGENT_ASSIST_VIEW", "TICKETS_MANAGE", "CUSTOMERS_VIEW"],
  });

  // 3. Create a Refund Team Finance Officer (CAN approve and process)
  const refundOfficer = await User.create({
    name: "Sneha Refund Specialist",
    email: `refund_officer_${Date.now()}@test.com`,
    password: "Password123!",
    role: "employee",
    designation: "Refund Specialist",
    permissions: ["FINANCE_MANAGE", "ORDERS_RETURNS"],
  });

  // 4. Create an Order
  const order = await Order.create({
    userId: customer._id,
    orderCode: `ORD-P14-${Date.now()}`,
    items: [
      {
        name: "Luxury Silk Tie",
        price: 2500,
        quantity: 1,
      },
    ],
    totalPrice: 2500,
    address: {
      fullName: "Refund Tester",
      phone: "9876543210",
      line1: "123 High Street",
      city: "Bangalore",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
    },
    paymentMethod: "Online",
    isPaid: true,
    paidAt: new Date(),
    status: "Delivered",
  });
  console.log(`✓ Created test order: ${order.orderCode} (₹${order.totalPrice})`);

  // Step A: Customer Service Executive raises refund request
  const reqRaise = {
    body: {
      orderId: order._id.toString(),
      refundAmount: 2500,
      refundReason: "Customer reported stitching defect upon opening parcel",
      reasonCategory: "Product Defective",
      detailedReason: "Customer reported stitching defect upon opening parcel",
    },
    user: csAgent,
    ip: "127.0.0.1",
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resRaise = mockRes();
  await raiseRefundRequest(reqRaise, resRaise);
  const refundRecord = resRaise.data?.refundRecord || resRaise.data?.refund;
  if (!resRaise.data?.success || !refundRecord) {
    throw new Error(`CS Agent failed to raise refund: ${JSON.stringify(resRaise.data)}`);
  }
  const refundId = refundRecord._id;
  console.log(`✓ 1. Customer Service Executive successfully raised Refund Request #${refundRecord.refundId}.`);

  // Step B: CS Executive attempts to VERIFY refund -> MUST BE 403
  const reqCsVerify = {
    params: { id: refundId.toString() },
    body: { paymentVerified: true, paymentVerificationNotes: "Verified by CS" },
    user: csAgent,
  };
  const resCsVerify = mockRes();
  await verifyRefundEligibility(reqCsVerify, resCsVerify);
  if (resCsVerify.statusCode !== 403) {
    throw new Error(`CS Agent was NOT blocked from verifying! Got ${resCsVerify.statusCode}`);
  }
  console.log(`✓ 2. Firewall verified: CS Agent blocked from verifying refund (HTTP 403: "${resCsVerify.data?.message}").`);

  // Step C: CS Executive attempts to APPROVE refund -> MUST BE 403
  const reqCsApprove = {
    params: { id: refundId.toString() },
    body: { approvedAmount: 2500, refundMethod: "Store Credit" },
    user: csAgent,
  };
  const resCsApprove = mockRes();
  await approveRefundRequest(reqCsApprove, resCsApprove);
  if (resCsApprove.statusCode !== 403) {
    throw new Error(`CS Agent was NOT blocked from approving! Got ${resCsApprove.statusCode}`);
  }
  console.log(`✓ 3. Firewall verified: CS Agent blocked from approving refund (HTTP 403: "${resCsApprove.data?.message}").`);

  // Step D: CS Executive attempts to PROCESS gateway payout -> MUST BE 403
  const reqCsProcess = {
    params: { id: refundId.toString() },
    user: csAgent,
  };
  const resCsProcess = mockRes();
  await processRefundGateway(reqCsProcess, resCsProcess);
  if (resCsProcess.statusCode !== 403) {
    throw new Error(`CS Agent was NOT blocked from processing payout! Got ${resCsProcess.statusCode}`);
  }
  console.log(`✓ 4. Firewall verified: CS Agent blocked from processing refund payout (HTTP 403: "${resCsProcess.data?.message}").`);

  // Step E: Refund Officer VERIFIES the refund
  const reqRoVerify = {
    params: { id: refundId.toString() },
    body: {
      paymentVerified: true,
      paymentVerificationNotes: "Gateway transaction verified, receipt matched.",
      orderEligibilityVerified: true,
      fraudCheckPassed: true,
      duplicateCheckPassed: true,
    },
    user: refundOfficer,
    ip: "127.0.0.1",
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resRoVerify = mockRes();
  await verifyRefundEligibility(reqRoVerify, resRoVerify);
  if (resRoVerify.statusCode !== 200 || !resRoVerify.data?.success) {
    throw new Error(`Refund Officer verification failed: ${JSON.stringify(resRoVerify.data)}`);
  }
  console.log(`✓ 5. Authorized Refund Officer successfully verified refund eligibility.`);

  // Step F: Refund Officer APPROVES with method = "Store Credit"
  const reqRoApprove = {
    params: { id: refundId.toString() },
    body: {
      approvedAmount: 2500,
      refundMethod: "Store Credit",
      approvalRemarks: "Approved full refund as Store Credit at customer's request",
    },
    user: refundOfficer,
    ip: "127.0.0.1",
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resRoApprove = mockRes();
  await approveRefundRequest(reqRoApprove, resRoApprove);
  if (resRoApprove.statusCode !== 200 || resRoApprove.data?.refund?.refundMethod !== "Store Credit") {
    throw new Error(`Refund Officer approval failed: ${JSON.stringify(resRoApprove.data)}`);
  }
  console.log(`✓ 6. Authorized Refund Officer approved refund for ₹2500 with method 'Store Credit'.`);

  // Step G: Refund Officer PROCESSES the refund (disbursement to Store Credit wallet)
  const reqRoProcess = {
    params: { id: refundId.toString() },
    user: refundOfficer,
    ip: "127.0.0.1",
    headers: { "x-forwarded-for": "127.0.0.1" },
  };
  const resRoProcess = mockRes();
  await processRefundGateway(reqRoProcess, resRoProcess);
  if (resRoProcess.statusCode !== 200 || !resRoProcess.data?.success) {
    throw new Error(`Refund Officer processing failed: ${JSON.stringify(resRoProcess.data)}`);
  }
  console.log(`✓ 7. Authorized Refund Officer disbursed ₹2500 payout directly to customer Store Credit wallet.`);

  // Step H: Verify Customer's Store Credit account has received the ₹2500
  const custBalance = await storeCreditService.getAccountBalance(customer._id);
  if (custBalance.balance !== 2500) {
    throw new Error(`Expected customer balance ₹2500, got ₹${custBalance.balance}`);
  }
  console.log(`✓ 8. Customer Store Credit wallet balance confirmed: ₹${custBalance.balance} (Account: ${custBalance.accountNumber}).`);

  console.log("=== PHASE 14: ALL REFUND WORKFLOW & ROLE SEPARATION TESTS PASSED ===");
  await mongoose.disconnect();
  process.exit(0);
}

runPhase14Test().catch((err) => {
  console.error("❌ Phase 14 Test failed:", err);
  process.exit(1);
});
