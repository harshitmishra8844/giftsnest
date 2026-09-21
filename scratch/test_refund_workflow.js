const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Order = require("../models/Order");
const User = require("../models/User");
const RefundRecord = require("../models/RefundRecord");
const RefundCounter = require("../models/RefundCounter");
const RefundAuditLog = require("../models/RefundAuditLog");
const TaskAssignment = require("../models/TaskAssignment");
const Notification = require("../models/Notification");
const {
  raiseRefundRequest,
  verifyRefundEligibility,
  approveRefundRequest,
  processRefundGateway,
  rejectRefundRequest,
  requestMoreInfo,
  escalateRefund,
  addRefundRemark,
  getRefundRequests,
  getRefundDetails,
  getRefundReports,
  exportRefundReportsCsv,
} = require("../controllers/refundController");

const assert = (condition, message) => {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
};

const runTestSuite = async () => {
  console.log("\n=================================================");
  console.log("🧪 ENTERPRISE REFUND WORKFLOW SECURITY TEST SUITE");
  console.log("=================================================");

  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/niyora");
  console.log("Connected to MongoDB");

  // 1. Create Mock Users:
  // a) Customer
  let customerUser = await User.findOne({ email: "refund_customer_test@niyora.com" });
  if (!customerUser) {
    customerUser = await User.create({
      name: "Refund Test Customer",
      email: "refund_customer_test@niyora.com",
      password: "Password123!",
      mobileNumber: "9876543220",
      isVerified: true,
    });
  }

  // b) Support Executive (Customer Service Desk - Can RAISE only, CANNOT APPROVE or PROCESS)
  let supportExecutive = await User.findOne({ email: "support_exec_test@niyora.com" });
  if (!supportExecutive) {
    supportExecutive = await User.create({
      name: "Priya Sharma",
      email: "support_exec_test@niyora.com",
      password: "Password123!",
      mobileNumber: "9876543221",
      role: "staff",
      designation: "Customer Service Executive",
      permissions: ["TICKETS_MANAGE", "CUSTOMERS_VIEW", "SUPPORT_CHAT"],
      isVerified: true,
    });
  }

  // c) Refund Executive (Refund Team - CAN VERIFY, APPROVE & PROCESS)
  let refundExecutive = await User.findOne({ email: "refund_team_test@niyora.com" });
  if (!refundExecutive) {
    refundExecutive = await User.create({
      name: "Rohit Verma",
      email: "refund_team_test@niyora.com",
      password: "Password123!",
      mobileNumber: "9876543222",
      role: "staff",
      designation: "Refund Executive",
      permissions: ["FINANCE_MANAGE", "ORDERS_RETURNS", "ORDERS_VIEW"],
      isVerified: true,
    });
  }

  // d) Master Admin
  let masterAdmin = await User.findOne({ email: "master_admin_refund@niyora.com" });
  if (!masterAdmin) {
    masterAdmin = await User.create({
      name: "Master Finance Admin",
      email: "master_admin_refund@niyora.com",
      password: "Password123!",
      mobileNumber: "9876543223",
      role: "admin",
      isAdmin: true,
      isMasterAdmin: true,
      designation: "Master Admin",
      permissions: ["ALL"],
      isVerified: true,
    });
  }

  // Mock Orders
  const order1 = await Order.create({
    orderCode: `ORD-REF-TEST-${Date.now().toString().slice(-6)}`,
    userId: customerUser._id,
    email: customerUser.email,
    products: [{ productId: "PROD-01", name: "Premium Brass Lamp", price: 2500, quantity: 1 }],
    totalPrice: 2500,
    address: { fullName: customerUser.name, phone: customerUser.mobileNumber, line1: "Connaught Place", city: "New Delhi", state: "Delhi", postalCode: "110001", country: "India" },
    status: "Delivered",
    paymentStatus: "Paid",
    paymentMethod: "Online",
    razorpayOrderId: "rzp_ord_refund_101",
    razorpayPaymentId: "pay_rzp_refund_101",
    refundStatus: "NONE",
  });

  const order2 = await Order.create({
    orderCode: `ORD-REF-TEST-${Date.now().toString().slice(-6)}B`,
    userId: customerUser._id,
    email: customerUser.email,
    products: [{ productId: "PROD-02", name: "Customized Mug", price: 800, quantity: 1 }],
    totalPrice: 800,
    address: { fullName: customerUser.name, phone: customerUser.mobileNumber, line1: "MG Road", city: "Bengaluru", state: "Karnataka", postalCode: "560001", country: "India" },
    status: "Delivered",
    paymentStatus: "Paid",
    paymentMethod: "COD",
    refundStatus: "NONE",
  });

  console.log(`\nInitialized Test Orders: #${order1.orderCode} (₹2500) and #${order2.orderCode} (₹800)`);

  // =========================================================================
  // TEST 1: Sequential ID Generation Format REF-YYYY-000001
  // =========================================================================
  console.log("\n[TEST 1] Sequential ID Generation (REF-YYYY-000001)");
  const generatedId1 = await RefundCounter.getNextRefundCode();
  const currentYear = new Date().getFullYear();
  assert(new RegExp(`^REF-${currentYear}-\\d{6}$`).test(generatedId1), `Code matches format REF-${currentYear}-000001 (Got: ${generatedId1})`);

  // =========================================================================
  // TEST 2: Step 1 & 2 - Support Agent Raises Refund Request
  // =========================================================================
  console.log("\n[TEST 2] Step 1 & 2: Support Executive Raises Refund Request");
  let raisedRefundRecord = null;
  const mockReqRaise = {
    user: supportExecutive,
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    socket: { remoteAddress: "192.168.1.100" },
    body: {
      orderId: order1._id.toString(),
      orderNumber: order1.orderCode,
      customerName: customerUser.name,
      customerEmail: customerUser.email,
      customerPhone: customerUser.mobileNumber,
      refundAmount: 2500,
      refundType: "Full",
      refundReason: "Damaged Product",
      customerExplanation: "Product brass base had a dent upon unboxing.",
      executiveRemarks: "Customer shared unboxing photos on phone call. Valid claim.",
      supportingEvidence: [{ url: "https://example.com/dent.jpg", name: "Dent Proof" }],
      source: "Phone Call",
    },
  };

  const mockResRaise = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };

  await raiseRefundRequest(mockReqRaise, mockResRaise);
  assert(mockResRaise.statusCode === 201, `raiseRefundRequest returned 201 (Got: ${mockResRaise.statusCode})`);
  assert(mockResRaise.data.success === true, "Response reports success = true");
  raisedRefundRecord = mockResRaise.data.refundRecord;
  assert(new RegExp(`^REF-${currentYear}-\\d{6}$`).test(raisedRefundRecord.refundId), `Refund ID formatted as REF-YYYY-000001 (Got: ${raisedRefundRecord.refundId})`);
  assert(raisedRefundRecord.status === "PENDING_REFUND_REVIEW", `Status initialized to PENDING_REFUND_REVIEW (Got: ${raisedRefundRecord.status})`);
  assert(raisedRefundRecord.raisedByName === supportExecutive.name, `Raised by executive name preserved (${raisedRefundRecord.raisedByName})`);
  assert(raisedRefundRecord.remarksHistory.length >= 2, `Remarks history initialized with executive notes (Count: ${raisedRefundRecord.remarksHistory.length})`);
  assert(raisedRefundRecord.timeline.length >= 2, `Timeline initialized with raise & queue events (Count: ${raisedRefundRecord.timeline.length})`);

  // Check Order synchronization
  const order1Updated = await Order.findById(order1._id);
  assert(order1Updated.refundStatus === "PENDING_REFUND_REVIEW", `Order refundStatus synchronized to PENDING_REFUND_REVIEW`);
  assert(order1Updated.refundDetails?.refundId === raisedRefundRecord.refundId, `Order refundDetails linked with Refund ID`);

  // =========================================================================
  // TEST 3: Queue Assignment & Notifications
  // =========================================================================
  console.log("\n[TEST 3] Refund Team Queue Auto-Assignment & Notification Dispatch");
  const taskAssignment = await TaskAssignment.findOne({ taskCode: raisedRefundRecord.refundId });
  assert(Boolean(taskAssignment), "TaskAssignment queued automatically for Refund Team");
  assert(taskAssignment.assignedRole === "Refund Executive", `Task assigned to 'Refund Executive' role (Got: ${taskAssignment?.assignedRole})`);

  // =========================================================================
  // TEST 4: Security Separation of Duties Barrier
  // Support Agent CANNOT verify, approve, or process refunds!
  // =========================================================================
  console.log("\n[TEST 4] Security Barrier: Support Agent Prohibited from Approval & Payout");

  const mockResForbidden1 = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };
  await verifyRefundEligibility({ user: supportExecutive, params: { id: raisedRefundRecord._id } }, mockResForbidden1);
  assert(mockResForbidden1.statusCode === 403, `Support Agent blocked with 403 from verifying payment (Got: ${mockResForbidden1.statusCode})`);
  assert(mockResForbidden1.data.message.includes("Access denied"), "Forbidden message returned");

  const mockResForbidden2 = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };
  await approveRefundRequest({ user: supportExecutive, params: { id: raisedRefundRecord._id }, body: {} }, mockResForbidden2);
  assert(mockResForbidden2.statusCode === 403, `Support Agent blocked with 403 from approving refund (Got: ${mockResForbidden2.statusCode})`);

  const mockResForbidden3 = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };
  await processRefundGateway({ user: supportExecutive, params: { id: raisedRefundRecord._id } }, mockResForbidden3);
  assert(mockResForbidden3.statusCode === 403, `Support Agent blocked with 403 from executing gateway refund (Got: ${mockResForbidden3.statusCode})`);

  // =========================================================================
  // TEST 5: Step 3 - Refund Team Reviews & Verifies Payment & Eligibility
  // =========================================================================
  console.log("\n[TEST 5] Step 3: Refund Team Verifies Payment & Eligibility");
  const mockReqVerify = {
    user: refundExecutive,
    params: { id: raisedRefundRecord._id.toString() },
    headers: { "user-agent": "Desktop Chrome Workstation" },
    socket: { remoteAddress: "10.0.0.1" },
    body: {
      paymentVerified: true,
      paymentVerificationNotes: "Payment captured successfully on Razorpay. Order delivered within 7 days.",
      orderEligibilityVerified: true,
      fraudCheckPassed: true,
      duplicateCheckPassed: true,
    },
  };
  const mockResVerify = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await verifyRefundEligibility(mockReqVerify, mockResVerify);
  assert(mockResVerify.data.success === true, "verifyRefundEligibility succeeded for Refund Executive");
  const verifiedRefund = await RefundRecord.findById(raisedRefundRecord._id);
  assert(verifiedRefund.paymentVerified === true, "paymentVerified set to true");
  assert(verifiedRefund.verifiedByName === refundExecutive.name, `verifiedByName attributed to ${refundExecutive.name}`);
  const hasVerifyTimeline = verifiedRefund.timeline.some((e) => e.event === "Payment Verified");
  assert(hasVerifyTimeline, "Timeline event 'Payment Verified' appended");

  // =========================================================================
  // TEST 6: Step 4 - Refund Team Approves Refund
  // =========================================================================
  console.log("\n[TEST 6] Step 4: Refund Team Approves Refund (REFUND_APPROVED)");
  const mockReqApprove = {
    user: refundExecutive,
    params: { id: raisedRefundRecord._id.toString() },
    headers: { "user-agent": "Desktop Chrome Workstation" },
    socket: { remoteAddress: "10.0.0.1" },
    body: {
      approvedAmount: 2500,
      refundMethod: "Original Source",
      approvalRemarks: "Payment verified, full refund approved to original card.",
    },
  };
  const mockResApprove = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await approveRefundRequest(mockReqApprove, mockResApprove);
  assert(mockResApprove.data.success === true, "approveRefundRequest succeeded");
  const approvedRefund = await RefundRecord.findById(raisedRefundRecord._id);
  assert(approvedRefund.status === "REFUND_APPROVED", `Status transitioned to 'REFUND_APPROVED' (Got: ${approvedRefund.status})`);
  assert(approvedRefund.approvedAmount === 2500, `Approved amount recorded as ₹2500`);
  assert(approvedRefund.approvedByName === refundExecutive.name, `approvedByName attributed to ${refundExecutive.name}`);
  const hasApproveTimeline = approvedRefund.timeline.some((e) => e.event === "Refund Approved");
  assert(hasApproveTimeline, "Timeline event 'Refund Approved' appended");

  // =========================================================================
  // TEST 7: Step 5 & 6 - Gateway Processing & REFUNDED Status
  // =========================================================================
  console.log("\n[TEST 7] Step 5 & 6: Process Refund Through Gateway -> REFUNDED");
  const mockReqProcess = {
    user: refundExecutive,
    params: { id: raisedRefundRecord._id.toString() },
    headers: { "user-agent": "Desktop Chrome Workstation" },
    socket: { remoteAddress: "10.0.0.1" },
  };
  const mockResProcess = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await processRefundGateway(mockReqProcess, mockResProcess);
  assert(mockResProcess.data.success === true, "processRefundGateway completed successfully");
  const completedRefund = await RefundRecord.findById(raisedRefundRecord._id);
  assert(completedRefund.status === "REFUNDED", `Status strictly set to 'REFUNDED' (Got: ${completedRefund.status})`);
  assert(Boolean(completedRefund.gatewayRefundId), `Gateway Refund ID stored (${completedRefund.gatewayRefundId})`);
  assert(completedRefund.processedByName === refundExecutive.name, `processedByName attributed to ${refundExecutive.name}`);
  assert(completedRefund.processedAt !== null, "processedAt timestamp populated");
  assert(completedRefund.processingTimeMs >= 0, `processingTimeMs recorded (${completedRefund.processingTimeMs}ms)`);

  // Check Order record update (Step 6 requirement)
  const orderFinal = await Order.findById(order1._id);
  assert(orderFinal.refundStatus === "REFUNDED", `Order record refundStatus strictly set to 'REFUNDED' (Got: ${orderFinal.refundStatus})`);
  assert(orderFinal.refundDetails?.gatewayRefundId === completedRefund.gatewayRefundId, "Order refundDetails stored Gateway Refund ID");
  assert(orderFinal.refundDetails?.refundAmount === 2500, "Order refundDetails stored refund amount");

  // =========================================================================
  // TEST 8: Remarks System (Append-Only Guarantee)
  // =========================================================================
  console.log("\n[TEST 8] Refund Remarks System (Append-Only)");
  const countBeforeRemark = completedRefund.remarksHistory.length;
  const mockReqRemark = {
    user: masterAdmin,
    params: { id: raisedRefundRecord._id.toString() },
    headers: { "user-agent": "Admin Browser" },
    socket: { remoteAddress: "127.0.0.1" },
    body: {
      remarkType: "Internal Notes",
      text: "Master Admin audit review confirmed gateway settlement cleared.",
    },
  };
  const mockResRemark = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await addRefundRemark(mockReqRemark, mockResRemark);
  assert(mockResRemark.data.success === true, "addRefundRemark succeeded");
  const refundWithNewRemark = await RefundRecord.findById(raisedRefundRecord._id);
  assert(refundWithNewRemark.remarksHistory.length === countBeforeRemark + 1, `Remark appended without overwriting (Count: ${refundWithNewRemark.remarksHistory.length})`);
  const lastRemark = refundWithNewRemark.remarksHistory[refundWithNewRemark.remarksHistory.length - 1];
  assert(lastRemark.authorName === masterAdmin.name, `Remark author recorded as ${masterAdmin.name}`);

  // =========================================================================
  // TEST 9: Chronological Timeline Milestones
  // =========================================================================
  console.log("\n[TEST 9] Chronological Milestone Timeline Verification");
  const expectedEvents = [
    "Refund Request Raised by Customer Service Executive",
    "Assigned to Refund Team",
    "Payment Verified",
    "Refund Approved",
    "Refund Sent to Gateway",
    "Refund Completed",
  ];
  const actualEvents = refundWithNewRemark.timeline.map((t) => t.event);
  expectedEvents.forEach((ev) => {
    assert(actualEvents.includes(ev), `Timeline includes milestone: '${ev}'`);
  });

  // =========================================================================
  // TEST 10: Anti-Fraud: Excessive Amount & Duplicate Request Prevention
  // =========================================================================
  console.log("\n[TEST 10] Anti-Fraud & Balance Protection");

  // 1. Attempting to refund more than order balance on order2 (₹800 order, asking ₹1500)
  const mockResExceed = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };
  await raiseRefundRequest(
    {
      user: supportExecutive,
      headers: {},
      socket: {},
      body: {
        orderId: order2._id.toString(),
        orderNumber: order2.orderCode,
        refundAmount: 1500, // exceeds ₹800
        refundReason: "Quality Issue",
      },
    },
    mockResExceed
  );
  assert(mockResExceed.statusCode === 400, `Refund exceeding balance blocked with 400 (Got: ${mockResExceed.statusCode})`);
  assert(mockResExceed.data.message.includes("exceeds remaining refundable"), "Proper excess amount error returned");

  // 2. Order 1 is already fully refunded (₹2500). Attempting another refund should be blocked.
  const mockResAlreadyRefunded = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };
  await raiseRefundRequest(
    {
      user: supportExecutive,
      headers: {},
      socket: {},
      body: {
        orderId: order1._id.toString(),
        orderNumber: order1.orderCode,
        refundAmount: 500,
        refundReason: "Customer Complaint",
      },
    },
    mockResAlreadyRefunded
  );
  assert(mockResAlreadyRefunded.statusCode === 400, `Subsequent refund on fully refunded order blocked with 400 (Got: ${mockResAlreadyRefunded.statusCode})`);

  // =========================================================================
  // TEST 11: Immutable Audit Logging (RefundAuditLog)
  // =========================================================================
  console.log("\n[TEST 11] Immutable Compliance Audit Logs");
  const auditLogs = await RefundAuditLog.find({ refundId: raisedRefundRecord.refundId });
  assert(auditLogs.length >= 4, `At least 4 audit logs recorded across lifecycle (Got: ${auditLogs.length})`);
  const actions = auditLogs.map((l) => l.actionPerformed);
  assert(actions.includes("RAISE_REFUND_REQUEST"), "RAISE_REFUND_REQUEST audit log logged");
  assert(actions.includes("VERIFY_REFUND_PAYMENT"), "VERIFY_REFUND_PAYMENT audit log logged");
  assert(actions.includes("APPROVE_REFUND"), "APPROVE_REFUND audit log logged");
  assert(actions.includes("PROCESS_REFUND_SUCCESS"), "PROCESS_REFUND_SUCCESS audit log logged");

  // Verify Immutability: Attempting to update or delete must throw an error
  try {
    await RefundAuditLog.updateOne({ _id: auditLogs[0]._id }, { $set: { employeeName: "Tampered Name" } });
    assert(false, "Audit log update was NOT blocked!");
  } catch (immErr) {
    assert(immErr.message.includes("immutable"), `Audit log update successfully blocked: "${immErr.message}"`);
  }

  try {
    await RefundAuditLog.deleteOne({ _id: auditLogs[0]._id });
    assert(false, "Audit log deletion was NOT blocked!");
  } catch (immErr) {
    assert(immErr.message.includes("immutable"), `Audit log deletion successfully blocked: "${immErr.message}"`);
  }

  // =========================================================================
  // TEST 12: Reporting & Analytics
  // =========================================================================
  console.log("\n[TEST 12] Reporting & Analytics Generation");
  const mockResReports = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };
  await getRefundReports({ query: {} }, mockResReports);
  assert(mockResReports.data.success === true, "getRefundReports returned success = true");
  const summary = mockResReports.data.summary;
  assert(summary.totalRaised >= 1, `Total raised tracked (${summary.totalRaised})`);
  assert(summary.refundedCount >= 1, `Refunded count tracked (${summary.refundedCount})`);
  assert(summary.totalAmountRefunded.includes("₹"), `Total refunded amount formatted with currency (${summary.totalAmountRefunded})`);

  console.log("\n=================================================");
  console.log("📊 TEST SUITE SUMMARY: ALL 12 TEST SUITES PASSED! 🎉");
  console.log("=================================================\n");

  await mongoose.disconnect();
};

runTestSuite().catch((err) => {
  console.error("Test Suite Unhandled Error:", err);
  process.exit(1);
});
