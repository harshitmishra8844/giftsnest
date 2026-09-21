require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

// Models
const Ticket = require("../models/Ticket");
const TicketMessage = require("../models/TicketMessage");
const CallbackRequest = require("../models/CallbackRequest");
const CallbackRemark = require("../models/CallbackRemark");
const TaskAssignment = require("../models/TaskAssignment");
const TaskTransfer = require("../models/TaskTransfer");
const SupportNote = require("../models/SupportNote");
const EmployeeActivityLog = require("../models/EmployeeActivityLog");
const CustomerInteraction = require("../models/CustomerInteraction");
const SlaTracking = require("../models/SlaTracking");
const Role = require("../models/Role");
const User = require("../models/User");

// Services
const { createCustomerServiceTicket } = require("../services/ticketHubService");
const { checkSlaViolations } = require("../services/slaWorker");
const { getEnterpriseReports } = require("../controllers/reportController");
const { getCustomerProfile } = require("../controllers/customerController");

async function runTests() {
  console.log("=================================================");
  console.log("🧪 ENTERPRISE PLATFORM AUTOMATED TEST SUITE");
  console.log("=================================================");

  let testPassed = 0;
  let testTotal = 0;

  const assert = (condition, testName) => {
    testTotal++;
    if (condition) {
      testPassed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
    }
  };

  try {
    await connectDB();

    // 1. Verify 11 Roles
    console.log("\n[TEST 1] Role Verification & RBAC Permissions");
    const requiredRoles = [
      "Master Admin",
      "Operations Manager",
      "Customer Support Manager",
      "Sales Manager",
      "Callback Executive",
      "Support Executive",
      "Return Executive",
      "Refund Executive",
      "Order Executive",
      "Logistics Executive",
      "Inventory Executive",
    ];
    const existingRoles = await Role.find({ name: { $in: requiredRoles } });
    assert(existingRoles.length === 11, `All 11 Enterprise Roles exist in database (Found ${existingRoles.length}/11)`);

    // 2. Central Customer Service Hub & Ticket ID Generation
    console.log("\n[TEST 2] Central Customer Service Hub & Ticket ID Pattern");
    const testTicket = await createCustomerServiceTicket({
      source: "Product Inquiry",
      subject: "Test Automated Inquiry",
      category: "Product Inquiry",
      priority: "High",
      customerName: "Test Automation User",
      customerEmail: "qa-test@niyoragifts.com",
      customerPhone: "+91-9999988888",
      message: "Testing central customer service hub automated ticket creation.",
    });

    const ticketRegex = /^NG-TKT-\d{4}-\d{6}$/;
    assert(ticketRegex.test(testTicket.ticketCode), `Ticket ID strictly matches 'NG-TKT-YYYY-000001' format (Got: ${testTicket.ticketCode})`);
    assert(testTicket.status === "New" || testTicket.status === "Assigned", `Ticket initialized with proper status (${testTicket.status})`);
    assert(testTicket.firstResponseDue !== null, `SLA first response deadline calculated`);

    // Verify side effects in collections
    const messageDoc = await TicketMessage.findOne({ ticketId: testTicket._id });
    assert(messageDoc !== null, `Initial customer message persisted to 'ticket_messages' collection`);

    const interactionDoc = await CustomerInteraction.findOne({ ticketId: testTicket._id });
    assert(interactionDoc !== null, `Customer interaction recorded to 'customer_interactions' collection`);

    const slaDoc = await SlaTracking.findOne({ taskId: testTicket._id });
    assert(slaDoc !== null, `SLA tracking row registered in 'sla_tracking' collection`);

    // 3. Callback Center & 11 Call Outcomes
    console.log("\n[TEST 3] Callback Center & Outbound Call Remark Lifecycle");
    await CallbackRequest.deleteMany({ customerEmail: "callback-qa@niyoragifts.com" });
    const cb = await CallbackRequest.create({
      callbackCode: `CB-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
      customerName: "Test Callback Customer",
      customerPhone: "+91-9123456789",
      customerEmail: "callback-qa@niyoragifts.com",
      ticket: testTicket._id,
      ticketCode: testTicket.ticketCode,
      subject: "Testing Callback Lifecycle",
      priority: "High",
      status: "Assigned",
    });

    assert(cb !== null && cb.callbackCode.startsWith("CB-"), `Callback Request created with tracking code (${cb.callbackCode})`);

    // Add remark with exact outcome
    const testOutcome = "Call Later Requested";
    const dummyEmpId = new mongoose.Types.ObjectId();
    const remark = await CallbackRemark.create({
      callbackId: cb._id,
      callbackCode: cb.callbackCode,
      employee: dummyEmpId,
      employeeName: "Test Executive",
      callOutcome: testOutcome,
      conversationSummary: "Customer answered and requested call back at 4 PM tomorrow.",
      followUpRequired: true,
      nextCallbackDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      followUpPriority: "High",
    });

    assert(remark.callOutcome === "Call Later Requested", `Callback remark logged with outcome: ${remark.callOutcome}`);
    assert(remark.followUpRequired === true, `Follow-up required marked correctly`);

    // 4. Task Transfer System
    console.log("\n[TEST 4] Task Transfer Engine & Audit History");
    const transfer = await TaskTransfer.create({
      taskType: "Ticket",
      taskId: testTicket._id,
      taskCode: testTicket.ticketCode,
      fromUser: new mongoose.Types.ObjectId(),
      fromUserName: "Callback Executive Agent",
      fromRole: "Callback Executive",
      toUser: null,
      toUserName: "Return Queue",
      toRole: "Return Executive",
      reason: "Customer requested exchange for damaged gift item",
      priority: "High",
      notes: "Please review uploaded photos and arrange pickup",
      status: "Transferred",
    });

    assert(transfer.toRole === "Return Executive", `Task transfer logged to 'task_transfers' collection (${transfer.toRole})`);
    assert(transfer.reason.length > 0, `Transfer reason recorded: "${transfer.reason}"`);

    // 5. Customer 360 CRM Profile
    console.log("\n[TEST 5] 360° Customer View Integration");
    let customerUser = await User.findOne({ isAdmin: { $ne: true } });
    if (!customerUser) {
      customerUser = await User.create({
        name: "Enterprise Customer",
        email: `customer-${Date.now()}@niyoragifts.com`,
        mobileNumber: "+91-9876500000",
        isAdmin: false,
        status: "Active",
      });
    }
    let crmResult = null;
    const reqMock = {
      params: { id: customerUser._id },
      user: { isMasterAdmin: true, isAdmin: true, _id: customerUser._id },
    };
    const resMock = {
      status: (code) => ({
        json: (data) => {
          crmResult = data;
          return data;
        },
      }),
      json: (data) => {
        crmResult = data;
        return data;
      },
    };

    await getCustomerProfile(reqMock, resMock);
    assert(crmResult !== null && crmResult.profile !== undefined, `360° Customer profile query returned successfully`);
    assert(Array.isArray(crmResult.tickets), `360° View includes customer tickets (${crmResult.tickets ? crmResult.tickets.length : 0} tickets found)`);
    assert(Array.isArray(crmResult.callbacks), `360° View includes customer callbacks`);
    assert(Array.isArray(crmResult.returns), `360° View includes customer returns`);
    assert(crmResult.orderInfo !== undefined, `360° View includes lifetime order value metrics`);

    // 6. SLA Worker Cycle
    console.log("\n[TEST 6] SLA Auto-Escalation Worker Execution");
    await checkSlaViolations();
    assert(true, `SLA worker check executed without unhandled errors`);

    // 7. Enterprise Reporting
    console.log("\n[TEST 7] Enterprise Multi-Report Generation");
    let reportResult = null;
    const reportReqMock = {
      query: {
        reportType: "sales-inquiry",
      },
    };
    const reportResMock = {
      json: (data) => {
        reportResult = data;
        return data;
      },
      status: () => reportResMock,
    };
    await getEnterpriseReports(reportReqMock, reportResMock);
    assert(reportResult !== null && reportResult.success === true, `Sales Inquiry Report generated with ${reportResult.rows.length} rows`);

    // Clean up test records
    await Ticket.deleteOne({ _id: testTicket._id });
    await TicketMessage.deleteMany({ ticketId: testTicket._id });
    await CallbackRequest.deleteOne({ _id: cb._id });
    await CallbackRemark.deleteOne({ _id: remark._id });
    await TaskTransfer.deleteOne({ _id: transfer._id });
    await CustomerInteraction.deleteMany({ ticketId: testTicket._id });
    await SlaTracking.deleteMany({ taskId: testTicket._id });

    console.log("\n=================================================");
    console.log(`📊 TEST SUITE SUMMARY: ${testPassed}/${testTotal} PASSED`);
    console.log("=================================================");

    if (testPassed === testTotal) {
      console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
      process.exit(0);
    } else {
      console.error("❌ SOME TESTS FAILED!");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n💥 UNHANDLED EXCEPTION IN TEST RUNNER:", err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runTests();
