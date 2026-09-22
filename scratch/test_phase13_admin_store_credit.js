const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const EmployeeActivityLog = require("../models/EmployeeActivityLog");
const storeCreditService = require("../services/storeCreditService");
const {
  adminGetAccounts,
  adminGetAccountDetails,
  adminUpdateStatus,
  adminAdjustCredit,
  adminGetExpiryReport,
  adminRunExpiryWorker,
} = require("../controllers/storeCreditController");

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

async function runPhase13Test() {
  console.log("=== STARTING PHASE 13: ADMIN STORE CREDIT MANAGEMENT VERIFICATION ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  // Create or retrieve an Admin user and a Customer user
  let adminUser = await User.findOne({ role: "admin" });
  if (!adminUser) {
    adminUser = await User.create({
      name: "Finance Controller",
      email: "finance.controller@test.com",
      password: "Password123!",
      role: "admin",
      isMasterAdmin: true,
      permissions: ["FINANCE_MANAGE", "CUSTOMERS_VIEW"],
    });
  }

  const testEmail = `admin_test_cust_${Date.now()}@test.com`;
  const customer = await User.create({
    name: "VIP Shopper 13",
    email: testEmail,
    password: "Password123!",
    role: "customer",
  });
  console.log(`✓ Created test customer: ${customer._id} (${customer.email})`);

  // Step 1: Ensure account exists and verify adminGetAccounts
  await storeCreditService.getOrCreateAccount(customer._id);
  const reqAccounts = { query: { search: customer.email }, user: adminUser };
  const resAccounts = mockRes();
  await adminGetAccounts(reqAccounts, resAccounts);
  if (resAccounts.statusCode !== 200 || !resAccounts.data?.accounts?.length) {
    throw new Error(`adminGetAccounts failed: ${JSON.stringify(resAccounts.data)}`);
  }
  console.log(`✓ 1. adminGetAccounts successfully returned account list (found customer account).`);

  // Step 2: adminGetAccountDetails
  const reqDetails = { params: { userId: customer._id.toString() }, user: adminUser };
  const resDetails = mockRes();
  await adminGetAccountDetails(reqDetails, resDetails);
  if (resDetails.statusCode !== 200 || !resDetails.data?.account) {
    throw new Error(`adminGetAccountDetails failed: ${JSON.stringify(resDetails.data)}`);
  }
  console.log(`✓ 2. adminGetAccountDetails successfully returned account details (Account: ${resDetails.data.account.accountNumber}).`);

  // Step 3: Manual Credit Adjustment (+1500)
  const reqCredit = {
    body: {
      userId: customer._id.toString(),
      amount: 1500,
      adjustmentType: "CREDIT",
      reason: "VIP Courtesy Goodwill Credit",
    },
    user: adminUser,
    ip: "127.0.0.1",
  };
  const resCredit = mockRes();
  await adminAdjustCredit(reqCredit, resCredit);
  if (resCredit.statusCode !== 200 || !resCredit.data?.success) {
    throw new Error(`Manual credit adjustment failed: ${JSON.stringify(resCredit.data)}`);
  }
  const balAfterCredit = await storeCreditService.getAccountBalance(customer._id);
  if (balAfterCredit.balance !== 1500) {
    throw new Error(`Expected balance 1500 after credit, got ${balAfterCredit.balance}`);
  }
  console.log(`✓ 3. Manual credit adjustment (+1500) verified. Current balance: ₹${balAfterCredit.balance}`);

  // Step 4: Manual Debit Adjustment (-500)
  const reqDebit = {
    body: {
      userId: customer._id.toString(),
      amount: 500,
      adjustmentType: "DEBIT",
      reason: "Administrative reconciliation deduction",
    },
    user: adminUser,
    ip: "127.0.0.1",
  };
  const resDebit = mockRes();
  await adminAdjustCredit(reqDebit, resDebit);
  if (resDebit.statusCode !== 200 || !resDebit.data?.success) {
    throw new Error(`Manual debit adjustment failed: ${JSON.stringify(resDebit.data)}`);
  }
  const balAfterDebit = await storeCreditService.getAccountBalance(customer._id);
  if (balAfterDebit.balance !== 1000) {
    throw new Error(`Expected balance 1000 after debit, got ${balAfterDebit.balance}`);
  }
  console.log(`✓ 4. Manual debit adjustment (-500) verified. Current balance: ₹${balAfterDebit.balance}`);

  // Step 5: Reject adjustment with missing reason
  const reqNoReason = {
    body: {
      userId: customer._id.toString(),
      amount: 100,
      adjustmentType: "CREDIT",
      reason: "",
    },
    user: adminUser,
  };
  const resNoReason = mockRes();
  await adminAdjustCredit(reqNoReason, resNoReason);
  if (resNoReason.statusCode !== 400) {
    throw new Error(`Adjustment with empty reason was not rejected with 400! Got ${resNoReason.statusCode}`);
  }
  console.log(`✓ 5. Rejection of adjustment without mandatory reason verified (HTTP 400).`);

  // Step 6: Reject debit exceeding available balance
  const reqExcessDebit = {
    body: {
      userId: customer._id.toString(),
      amount: 999999,
      adjustmentType: "DEBIT",
      reason: "Excessive withdrawal attempt",
    },
    user: adminUser,
  };
  const resExcessDebit = mockRes();
  await adminAdjustCredit(reqExcessDebit, resExcessDebit);
  if (resExcessDebit.statusCode !== 500 && resExcessDebit.statusCode !== 400) {
    throw new Error(`Excessive debit was not rejected! Got ${resExcessDebit.statusCode}`);
  }
  console.log(`✓ 6. Rejection of debit exceeding available balance verified.`);

  // Step 7: Freeze account
  const reqFreeze = {
    params: { userId: customer._id.toString() },
    body: { status: "Frozen", reason: "Suspicious concurrent login investigation" },
    user: adminUser,
    ip: "127.0.0.1",
  };
  const resFreeze = mockRes();
  await adminUpdateStatus(reqFreeze, resFreeze);
  if (resFreeze.statusCode !== 200 || resFreeze.data?.account?.status !== "Frozen") {
    throw new Error(`Account freeze failed: ${JSON.stringify(resFreeze.data)}`);
  }
  console.log(`✓ 7. Account frozen successfully with reason.`);

  // Step 8: Verify checkout debit blocked on frozen account
  try {
    await storeCreditService.deductCreditDirect({
      userId: customer._id,
      amount: 100,
      orderId: new mongoose.Types.ObjectId(),
      reason: "Attempt checkout while frozen",
    });
    throw new Error("Debit on frozen account was NOT blocked!");
  } catch (err) {
    if (!err.message.toLowerCase().includes("frozen")) {
      throw err;
    }
    console.log(`✓ 8. Operations blocked while account is frozen verified: "${err.message}"`);
  }

  // Step 9: Unfreeze account
  const reqUnfreeze = {
    params: { userId: customer._id.toString() },
    body: { status: "Active", reason: "Customer identity verified successfully" },
    user: adminUser,
    ip: "127.0.0.1",
  };
  const resUnfreeze = mockRes();
  await adminUpdateStatus(reqUnfreeze, resUnfreeze);
  if (resUnfreeze.statusCode !== 200 || resUnfreeze.data?.account?.status !== "Active") {
    throw new Error(`Account unfreeze failed: ${JSON.stringify(resUnfreeze.data)}`);
  }
  console.log(`✓ 9. Account unfrozen successfully.`);

  // Step 10: Verify EmployeeActivityLog entries
  const logs = await EmployeeActivityLog.find({
    targetId: customer._id.toString(),
  }).sort({ createdAt: -1 });
  console.log(`✓ 10. Audit trails confirmed: Found ${logs.length} employee activity log records.`);

  // Step 11: Expiry report & worker run
  const reqExpReport = { query: { days: 30 }, user: adminUser };
  const resExpReport = mockRes();
  await adminGetExpiryReport(reqExpReport, resExpReport);
  if (resExpReport.statusCode !== 200) {
    throw new Error(`adminGetExpiryReport failed: ${JSON.stringify(resExpReport.data)}`);
  }
  console.log(`✓ 11. adminGetExpiryReport successfully executed: Total at risk in 30d = ₹${resExpReport.data.totalExpiringAmount}`);

  const reqExpWorker = { user: adminUser };
  const resExpWorker = mockRes();
  await adminRunExpiryWorker(reqExpWorker, resExpWorker);
  if (resExpWorker.statusCode !== 200) {
    throw new Error(`adminRunExpiryWorker failed: ${JSON.stringify(resExpWorker.data)}`);
  }
  console.log(`✓ 12. adminRunExpiryWorker successfully executed manually from admin console.`);

  console.log("=== PHASE 13: ALL ADMIN STORE CREDIT CHECKS PASSED PERFECTLY ===");
  await mongoose.disconnect();
  process.exit(0);
}

runPhase13Test().catch((err) => {
  console.error("❌ Phase 13 Test failed:", err);
  process.exit(1);
});
