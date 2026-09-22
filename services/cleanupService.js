const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const User = require("../models/User");
const Order = require("../models/Order");
const FailedOrderRecord = require("../models/FailedOrderRecord");
const ReplacementOrder = require("../models/ReplacementOrder");
const ReturnRequest = require("../models/ReturnRequest");
const Return = require("../models/Return");
const ReplacementRequest = require("../models/ReplacementRequest");
const RefundRecord = require("../models/RefundRecord");
const RefundTransaction = require("../models/RefundTransaction");
const RefundAuditLog = require("../models/RefundAuditLog");
const ReturnActivityLog = require("../models/ReturnActivityLog");
const Ticket = require("../models/Ticket");
const TicketMessage = require("../models/TicketMessage");
const SupportMessage = require("../models/SupportMessage");
const SupportNote = require("../models/SupportNote");
const CallbackRequest = require("../models/CallbackRequest");
const CallbackRemark = require("../models/CallbackRemark");
const TaskTransfer = require("../models/TaskTransfer");
const TaskAssignment = require("../models/TaskAssignment");
const SlaTracking = require("../models/SlaTracking");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const StoreCreditReservation = require("../models/StoreCreditReservation");
const StoreCreditExpiryLog = require("../models/StoreCreditExpiryLog");
const CustomerInteraction = require("../models/CustomerInteraction");
const CustomerAlert = require("../models/CustomerAlert");
const CustomerVerificationLog = require("../models/CustomerVerificationLog");
const CustomerTimeline = require("../models/CustomerTimeline");
const Notification = require("../models/Notification");
const NotificationLog = require("../models/NotificationLog");
const EmailLog = require("../models/EmailLog");
const PushLog = require("../models/PushLog");
const SmsLog = require("../models/SmsLog");
const WhatsAppLog = require("../models/WhatsAppLog");
const MessageQueue = require("../models/MessageQueue");
const Coupon = require("../models/Coupon");
const CouponAssignment = require("../models/CouponAssignment");
const Product = require("../models/Product");
const Wishlist = require("../models/Wishlist");
const Otp = require("../models/Otp");
const ActivityLog = require("../models/ActivityLog");
const LoginActivityLog = require("../models/LoginActivityLog");
const EmployeeActivityLog = require("../models/EmployeeActivityLog");
const TicketCounter = require("../models/TicketCounter");
const RefundCounter = require("../models/RefundCounter");
const StoreCreditCounter = require("../models/StoreCreditCounter");

const BACKUP_ROOT = path.join(process.cwd(), "backups");

// Recognized test account patterns
const TEST_EMAIL_PATTERNS = [
  /@test\.com$/i,
  /@example\.com$/i,
  /^testsignup/i,
  /^refund_customer_test/i,
  /^support_exec_test/i,
  /^refund_team_test/i,
  /^test_buyer_security/i,
  /^other_buyer_security/i,
  /_1789/i,
  /_1790/i,
  /^cust_1789/i,
  /^admin_1789/i,
  /^perf_/i,
  /^regression_/i,
  /^karan_e2e/i,
  /^finance_head/i,
  /^alice_/i,
  /^bob_/i,
  /^charlie_/i,
  /^dave_cs/i,
  /^notif_test/i,
  /^cancel_cust/i,
  /^checkout_tester/i,
  /^refund_test_cust/i,
  /^cs_exec/i,
  /^refund_officer/i,
  /^admin_test_cust/i
];

const MASTER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "niyoragifts@gmail.com").toLowerCase().trim();

/**
 * Determine if a user document is an automated test / demo account.
 */
function isTestUser(user) {
  if (!user || !user.email) return false;
  const emailLower = user.email.toLowerCase().trim();
  
  // NEVER classify Master Admin as test!
  if (user.isMasterAdmin || emailLower === MASTER_ADMIN_EMAIL) {
    return false;
  }

  // Preserve real customers registered by actual users
  const knownRealEmails = [
    "harshitmishra9897@gmail.com",
    "mishraharshit569@gmail.com",
    "dubeyshubh207@gmail.com",
    "rahul.sharma@gmail.com",
    "priya.patel@gmail.com",
    "try.samyakmishra@gmail.com",
    "harshitmishra8445@gmail.com",
    "harshitmishra8844@gmail.com"
  ];
  if (knownRealEmails.includes(emailLower)) {
    return false;
  }

  return TEST_EMAIL_PATTERNS.some((p) => p.test(emailLower) || p.test(user.name || ""));
}

/**
 * Helper to escape CSV cell content
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  return `"${String(val).replace(/"/g, '""')}"`;
}

/**
 * Scan database and return complete preview breakdown
 */
async function getCleanupPreview() {
  const masterAdmin = await User.findOne({
    $or: [{ email: MASTER_ADMIN_EMAIL }, { isMasterAdmin: true }]
  });

  const totalUsers = await User.countDocuments();
  const allUsers = await User.find().select("email name isAdmin isMasterAdmin role employeeId createdAt");
  const testUsers = allUsers.filter(isTestUser);
  const realUsers = allUsers.filter((u) => !isTestUser(u));

  const totalOrders = await Order.countDocuments();
  const failedOrders = await FailedOrderRecord.countDocuments();
  const replacementOrders = await ReplacementOrder.countDocuments();

  const totalTickets = await Ticket.countDocuments();
  const ticketMessages = await TicketMessage.countDocuments();
  const supportNotes = await SupportNote.countDocuments();
  const supportMessages = await SupportMessage.countDocuments();
  const callbackReqs = await CallbackRequest.countDocuments();
  const callbackRemarks = await CallbackRemark.countDocuments();

  const returnReqs = await ReturnRequest.countDocuments();
  const returns = await Return.countDocuments();
  const replReqs = await ReplacementRequest.countDocuments();
  const refundRecords = await RefundRecord.countDocuments();
  const refundAuditLogs = await RefundAuditLog.countDocuments();
  const returnActivityLogs = await ReturnActivityLog.countDocuments();

  const taskAssignments = await TaskAssignment.countDocuments();
  const taskTransfers = await TaskTransfer.countDocuments();
  const slaTrackings = await SlaTracking.countDocuments();

  const scAccounts = await StoreCreditAccount.countDocuments();
  const scTransactions = await StoreCreditTransaction.countDocuments();
  const scReservations = await StoreCreditReservation.countDocuments();
  const scExpiries = await StoreCreditExpiryLog.countDocuments();

  const custInteractions = await CustomerInteraction.countDocuments();
  const custAlerts = await CustomerAlert.countDocuments();
  const custVerifications = await CustomerVerificationLog.countDocuments();

  const notifs = await Notification.countDocuments();
  const notifLogs = await NotificationLog.countDocuments();
  const emailLogs = await EmailLog.countDocuments();
  const pushLogs = await PushLog.countDocuments();
  const smsLogs = await SmsLog.countDocuments();

  const testCoupons = await Coupon.countDocuments({ code: /^SAVE10_/i });
  const couponAssignments = await CouponAssignment.countDocuments();

  const wishlists = await Wishlist.countDocuments();
  const otps = await Otp.countDocuments();
  const usersWithCart = await User.countDocuments({ "cart.0": { $exists: true } });

  const activityLogs = await ActivityLog.countDocuments();
  const loginActivityLogs = await LoginActivityLog.countDocuments();
  const empActivityLogs = await EmployeeActivityLog.countDocuments();

  // Inspect local upload directories
  let unreferencedUploadCount = 0;
  try {
    const productsDir = path.join(process.cwd(), "uploads", "products");
    const returnsDir = path.join(process.cwd(), "uploads", "returns");
    const ticketsDir = path.join(process.cwd(), "uploads", "tickets");
    if (fs.existsSync(returnsDir)) unreferencedUploadCount += fs.readdirSync(returnsDir).length;
    if (fs.existsSync(ticketsDir)) unreferencedUploadCount += fs.readdirSync(ticketsDir).length;
    if (fs.existsSync(productsDir)) unreferencedUploadCount += fs.readdirSync(productsDir).length;
  } catch (err) {
    console.warn("Upload dir read warning:", err.message);
  }

  // Preserved configurations
  const productsCount = await Product.countDocuments();
  const rolesCount = await mongoose.connection.db.collection("roles").countDocuments();
  const departmentsCount = await mongoose.connection.db.collection("departments").countDocuments();
  const cmsCount = await mongoose.connection.db.collection("cmscontents").countDocuments();
  const slaPoliciesCount = await mongoose.connection.db.collection("slapolicies").countDocuments();
  const segmentsCount = await mongoose.connection.db.collection("customersegments").countDocuments();

  const toDeleteSummary = {
    orders: totalOrders + failedOrders + replacementOrders,
    testCustomers: testUsers.length,
    supportEnquiries: totalTickets + ticketMessages + supportNotes + supportMessages + callbackReqs + callbackRemarks,
    returnsRefunds: returnReqs + returns + replReqs + refundRecords + refundAuditLogs + returnActivityLogs,
    storeCreditRecords: scAccounts + scTransactions + scReservations + scExpiries,
    taskSlaRecords: taskAssignments + taskTransfers + slaTrackings,
    customerInteractions: custInteractions + custAlerts + custVerifications,
    notificationsAndLogs: notifs + notifLogs + emailLogs + pushLogs + smsLogs,
    systemLogs: activityLogs + loginActivityLogs + empActivityLogs,
    testCoupons: testCoupons + couponAssignments,
    wishlistsAndCarts: wishlists + usersWithCart,
    otps: otps,
    tempUploads: unreferencedUploadCount
  };

  const totalToDelete = Object.values(toDeleteSummary).reduce((a, b) => a + b, 0);

  return {
    masterAdminSafe: !!masterAdmin && masterAdmin.isMasterAdmin === true,
    masterAdminEmail: masterAdmin ? masterAdmin.email : null,
    totalToDelete,
    toDeleteSummary,
    preservedData: {
      masterAdmin: masterAdmin ? { name: masterAdmin.name, email: masterAdmin.email } : null,
      realUsersCount: realUsers.length,
      realUsersList: realUsers.map((u) => ({ name: u.name, email: u.email, role: u.role })),
      productsCount,
      rolesCount,
      departmentsCount,
      cmsCount,
      slaPoliciesCount,
      segmentsCount,
      websiteSettings: "Active & Preserved",
      returnSettings: "Active & Preserved",
      emailSettings: "Active & Preserved"
    }
  };
}

/**
 * Creates a complete database snapshot and dedicated customer/order exports.
 */
async function createFullBackup() {
  if (!fs.existsSync(BACKUP_ROOT)) {
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupId = `backup-${timestamp}`;
  const backupDir = path.join(BACKUP_ROOT, backupId);
  fs.mkdirSync(backupDir, { recursive: true });

  const collections = await mongoose.connection.db.listCollections().toArray();
  const collectionCounts = {};

  for (const collInfo of collections) {
    const collName = collInfo.name;
    const docs = await mongoose.connection.db.collection(collName).find().toArray();
    collectionCounts[collName] = docs.length;
    const filePath = path.join(backupDir, `${collName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf8");
  }

  // 1. Export Dedicated Customers JSON & CSV
  const customers = await User.find().lean();
  fs.writeFileSync(
    path.join(backupDir, "customers_export.json"),
    JSON.stringify(customers, null, 2),
    "utf8"
  );

  const customerHeaders = ["ID", "Name", "Email", "Mobile", "Role", "IsAdmin", "IsMasterAdmin", "Status", "CreatedAt"];
  const customerRows = customers.map((c) => [
    escapeCsv(c._id),
    escapeCsv(c.name),
    escapeCsv(c.email),
    escapeCsv(c.mobileNumber || ""),
    escapeCsv(c.role || ""),
    escapeCsv(c.isAdmin ? "true" : "false"),
    escapeCsv(c.isMasterAdmin ? "true" : "false"),
    escapeCsv(c.status || "Active"),
    escapeCsv(c.createdAt ? new Date(c.createdAt).toISOString() : "")
  ].join(","));
  fs.writeFileSync(
    path.join(backupDir, "customers_export.csv"),
    [customerHeaders.join(","), ...customerRows].join("\n"),
    "utf8"
  );

  // 2. Export Dedicated Orders JSON & CSV
  const orders = await Order.find().lean();
  fs.writeFileSync(
    path.join(backupDir, "orders_export.json"),
    JSON.stringify(orders, null, 2),
    "utf8"
  );

  const orderHeaders = ["ID", "OrderCode", "CustomerEmail", "TotalPrice", "PaymentMethod", "Status", "ItemsCount", "CreatedAt"];
  const orderRows = orders.map((o) => [
    escapeCsv(o._id),
    escapeCsv(o.orderCode || ""),
    escapeCsv(o.email || o.shippingAddress?.email || ""),
    escapeCsv(o.totalPrice || 0),
    escapeCsv(o.paymentMethod || ""),
    escapeCsv(o.status || ""),
    escapeCsv(o.products ? o.products.length : 0),
    escapeCsv(o.createdAt ? new Date(o.createdAt).toISOString() : "")
  ].join(","));
  fs.writeFileSync(
    path.join(backupDir, "orders_export.csv"),
    [orderHeaders.join(","), ...orderRows].join("\n"),
    "utf8"
  );

  // 3. Backup Uploads Directory
  const uploadsDir = path.join(process.cwd(), "uploads");
  const backupUploadsDir = path.join(backupDir, "uploads");
  if (fs.existsSync(uploadsDir)) {
    fs.cpSync(uploadsDir, backupUploadsDir, { recursive: true });
  }

  // 4. Save metadata
  const totalDocuments = Object.values(collectionCounts).reduce((a, b) => a + b, 0);
  const metadata = {
    backupId,
    timestamp: new Date().toISOString(),
    totalCollections: collections.length,
    totalDocuments,
    collectionCounts,
    hasUploadsBackup: fs.existsSync(backupUploadsDir),
    customersExportCount: customers.length,
    ordersExportCount: orders.length
  };
  fs.writeFileSync(
    path.join(backupDir, "backup_metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf8"
  );

  return metadata;
}

/**
 * List all existing backups
 */
async function listBackups() {
  if (!fs.existsSync(BACKUP_ROOT)) return [];
  const entries = fs.readdirSync(BACKUP_ROOT, { withFileTypes: true });
  const backups = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const metaPath = path.join(BACKUP_ROOT, entry.name, "backup_metadata.json");
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
          backups.push(meta);
        } catch (e) {
          backups.push({ backupId: entry.name, error: "Metadata corrupt" });
        }
      } else {
        backups.push({ backupId: entry.name, timestamp: "Unknown" });
      }
    }
  }

  backups.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  return backups;
}

/**
 * Execute production data cleanup with mandatory safety checks
 */
async function executeCleanup({ confirmation, executedBy = "Master Admin" }) {
  if (confirmation !== "CONFIRM_PRODUCTION_CLEANUP") {
    throw new Error("Invalid confirmation code. Please type CONFIRM_PRODUCTION_CLEANUP to proceed.");
  }

  // Pre-flight check 1: Master Admin must exist and be protected
  const masterAdmin = await User.findOne({
    $or: [{ email: MASTER_ADMIN_EMAIL }, { isMasterAdmin: true }]
  });
  if (!masterAdmin) {
    throw new Error("Pre-flight check failed: Master Admin account not found! Aborting cleanup.");
  }

  console.log("[cleanup] Creating mandatory full database backup before cleanup...");
  const backupMeta = await createFullBackup();
  console.log(`[cleanup] Full backup successfully saved to ${backupMeta.backupId}`);

  const report = {
    startedAt: new Date().toISOString(),
    backupId: backupMeta.backupId,
    executedBy,
    deleted: {},
    preserved: {},
    errors: []
  };

  try {
    // 1. Delete Orders & Associated Financial Records
    const delOrders = await Order.deleteMany({});
    const delFailed = await FailedOrderRecord.deleteMany({});
    const delReplOrders = await ReplacementOrder.deleteMany({});
    report.deleted.orders = delOrders.deletedCount + delFailed.deletedCount + delReplOrders.deletedCount;

    // 2. Delete Support Tickets, Messages, Notes, Callbacks
    const delTickets = await Ticket.deleteMany({});
    const delTicketMsg = await TicketMessage.deleteMany({});
    const delSupportMsg = await SupportMessage.deleteMany({});
    const delSupportNotes = await SupportNote.deleteMany({});
    const delCallbacks = await CallbackRequest.deleteMany({});
    const delRemarks = await CallbackRemark.deleteMany({});
    report.deleted.supportAndEnquiries =
      delTickets.deletedCount +
      delTicketMsg.deletedCount +
      delSupportMsg.deletedCount +
      delSupportNotes.deletedCount +
      delCallbacks.deletedCount +
      delRemarks.deletedCount;

    // 3. Delete Returns & Refunds Data
    const delReturnReq = await ReturnRequest.deleteMany({});
    const delReturns = await Return.deleteMany({});
    const delReplReq = await ReplacementRequest.deleteMany({});
    const delRefundRecords = await RefundRecord.deleteMany({});
    const delRefundTx = await RefundTransaction.deleteMany({});
    const delRefundAudit = await mongoose.connection.db.collection("refundauditlogs").deleteMany({});
    const delReturnActivity = await ReturnActivityLog.deleteMany({});
    report.deleted.returnsAndRefunds =
      delReturnReq.deletedCount +
      delReturns.deletedCount +
      delReplReq.deletedCount +
      delRefundRecords.deletedCount +
      delRefundTx.deletedCount +
      delRefundAudit.deletedCount +
      delReturnActivity.deletedCount;

    // 4. Delete Task Routing & Escalation Logs
    const delTaskAss = await TaskAssignment.deleteMany({});
    const delTaskTrans = await TaskTransfer.deleteMany({});
    const delSla = await SlaTracking.deleteMany({});
    // Also clean raw tasktransfers/task_transfers collections if named differently
    try {
      await mongoose.connection.db.collection("tasktransfers").deleteMany({});
      await mongoose.connection.db.collection("task_transfers").deleteMany({});
    } catch (e) {}
    report.deleted.taskRouting = delTaskAss.deletedCount + delTaskTrans.deletedCount + delSla.deletedCount;

    // 5. Delete Store Credit Test Data
    const delScAcc = await StoreCreditAccount.deleteMany({});
    const delScTx = await StoreCreditTransaction.deleteMany({});
    const delScRes = await StoreCreditReservation.deleteMany({});
    const delScExp = await StoreCreditExpiryLog.deleteMany({});
    report.deleted.storeCredit = delScAcc.deletedCount + delScTx.deletedCount + delScRes.deletedCount + delScExp.deletedCount;

    // 6. Delete Customer Interactions & Verification Logs
    const delCustInteractions = await CustomerInteraction.deleteMany({});
    const delCustAlerts = await CustomerAlert.deleteMany({});
    const delCustVerif = await CustomerVerificationLog.deleteMany({});
    const delCustTimeline = await CustomerTimeline.deleteMany({});
    report.deleted.customerInteractions =
      delCustInteractions.deletedCount +
      delCustAlerts.deletedCount +
      delCustVerif.deletedCount +
      delCustTimeline.deletedCount;

    // 7. Delete Notifications & Logs
    const delNotifs = await Notification.deleteMany({});
    const delNotifLogs = await NotificationLog.deleteMany({});
    const delEmailLogs = await EmailLog.deleteMany({});
    const delPushLogs = await PushLog.deleteMany({});
    const delSmsLogs = await SmsLog.deleteMany({});
    const delWhatsApp = await WhatsAppLog.deleteMany({});
    const delMsgQueue = await MessageQueue.deleteMany({});
    report.deleted.notifications =
      delNotifs.deletedCount +
      delNotifLogs.deletedCount +
      delEmailLogs.deletedCount +
      delPushLogs.deletedCount +
      delSmsLogs.deletedCount +
      delWhatsApp.deletedCount +
      delMsgQueue.deletedCount;

    // 8. Delete Development Logs
    const delActivityLogs = await ActivityLog.deleteMany({});
    const delLoginLogs = await LoginActivityLog.deleteMany({});
    const delEmpActivity = await EmployeeActivityLog.deleteMany({});
    report.deleted.systemLogs = delActivityLogs.deletedCount + delLoginLogs.deletedCount + delEmpActivity.deletedCount;

    // 9. Delete Test Coupons
    const delCoupons = await Coupon.deleteMany({ code: /^SAVE10_/i });
    const delCouponAssignments = await CouponAssignment.deleteMany({});
    report.deleted.coupons = delCoupons.deletedCount + delCouponAssignments.deletedCount;

    // 10. Clean Wishlists & OTPs
    const delWishlists = await Wishlist.deleteMany({});
    const delOtps = await Otp.deleteMany({});
    report.deleted.wishlistsAndOtps = delWishlists.deletedCount + delOtps.deletedCount;

    // 11. Clean Demo Reviews & Reset Product Ratings
    await Product.updateMany({}, { $set: { reviews: [], rating: 5, numReviews: 0 } });
    report.deleted.demoReviews = "Cleaned embedded reviews and reset ratings to default";

    // 12. Delete Test Users & Clear Active Carts on Remaining Users
    const allUsers = await User.find();
    let deletedUserCount = 0;
    for (const u of allUsers) {
      if (isTestUser(u)) {
        await User.findByIdAndDelete(u._id);
        deletedUserCount++;
      } else {
        // Clear lingering cart items and interaction notes
        u.cart = [];
        u.notes = [];
        u.recentlyViewed = [];
        await u.save();
      }
    }
    report.deleted.testCustomerAccounts = deletedUserCount;

    // 13. Reset Sequence Counters to 0
    await TicketCounter.deleteMany({});
    await RefundCounter.deleteMany({});
    await StoreCreditCounter.deleteMany({});
    report.deleted.countersReset = "Ticket, Refund, and Store Credit sequence counters reset to 0";

    // 14. Clean Unreferenced Temporary Files in Uploads (returns and tickets)
    let cleanedFilesCount = 0;
    const returnsDir = path.join(process.cwd(), "uploads", "returns");
    const ticketsDir = path.join(process.cwd(), "uploads", "tickets");
    if (fs.existsSync(returnsDir)) {
      const files = fs.readdirSync(returnsDir);
      for (const f of files) {
        fs.unlinkSync(path.join(returnsDir, f));
        cleanedFilesCount++;
      }
    }
    if (fs.existsSync(ticketsDir)) {
      const files = fs.readdirSync(ticketsDir);
      for (const f of files) {
        fs.unlinkSync(path.join(ticketsDir, f));
        cleanedFilesCount++;
      }
    }
    report.deleted.tempUploads = cleanedFilesCount;

    // Post-flight check: Verify Master Admin and Catalog remain 100% intact
    const verifyMaster = await User.findOne({ email: MASTER_ADMIN_EMAIL });
    if (!verifyMaster) {
      throw new Error("FATAL: Master Admin missing after cleanup! Rollback immediately!");
    }
    verifyMaster.isAdmin = true;
    verifyMaster.isMasterAdmin = true;
    verifyMaster.status = "Active";
    await verifyMaster.save();

    const remainingProducts = await Product.countDocuments();
    const remainingUsers = await User.countDocuments();

    report.preserved = {
      masterAdminAccount: verifyMaster.email,
      remainingUsersCount: remainingUsers,
      productCatalogCount: remainingProducts,
      status: "Production Ready"
    };

    report.completedAt = new Date().toISOString();
    report.success = true;

    // Save report to disk in backups directory
    const reportPath = path.join(backupMeta.backupId ? path.join(BACKUP_ROOT, backupMeta.backupId) : BACKUP_ROOT, "cleanup_report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    return report;
  } catch (err) {
    report.errors.push(err.message);
    report.success = false;
    console.error("[cleanup] Error during execution:", err);
    throw err;
  }
}

/**
 * Rollback data from a specified backup directory
 */
async function rollbackFromBackup(backupId) {
  const backupDir = path.join(BACKUP_ROOT, backupId);
  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory '${backupId}' not found.`);
  }

  const metaPath = path.join(backupDir, "backup_metadata.json");
  let metadata = null;
  if (fs.existsSync(metaPath)) {
    metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  }

  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json") && f !== "backup_metadata.json" && f !== "cleanup_report.json" && f !== "customers_export.json" && f !== "orders_export.json");

  console.log(`[rollback] Restoring ${files.length} collections from ${backupId}...`);
  const restoredCounts = {};

  for (const file of files) {
    const collName = file.replace(".json", "");
    const filePath = path.join(backupDir, file);
    const docs = JSON.parse(fs.readFileSync(filePath, "utf8"));

    const coll = mongoose.connection.db.collection(collName);
    await coll.deleteMany({});
    if (docs && docs.length > 0) {
      // Map ObjectIds and Dates where applicable
      const formattedDocs = docs.map((d) => {
        if (d._id && typeof d._id === "string" && d._id.length === 24) {
          try {
            d._id = new mongoose.Types.ObjectId(d._id);
          } catch (e) {}
        }
        return d;
      });
      await coll.insertMany(formattedDocs);
    }
    restoredCounts[collName] = docs.length;
  }

  // Restore uploads if backed up
  const backupUploadsDir = path.join(backupDir, "uploads");
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (fs.existsSync(backupUploadsDir)) {
    fs.cpSync(backupUploadsDir, uploadsDir, { recursive: true });
  }

  return {
    backupId,
    restoredAt: new Date().toISOString(),
    totalCollectionsRestored: files.length,
    restoredCounts
  };
}

/**
 * Return absolute path of an exported file for download
 */
function getExportFilePath(type, backupId) {
  let dir = BACKUP_ROOT;
  if (backupId) {
    dir = path.join(BACKUP_ROOT, backupId);
  } else {
    // Pick the most recent backup
    const backups = fs.readdirSync(BACKUP_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .sort((a, b) => b.name.localeCompare(a.name));
    if (backups.length > 0) {
      dir = path.join(BACKUP_ROOT, backups[0].name);
    }
  }

  const filenameMap = {
    customers_csv: "customers_export.csv",
    customers_json: "customers_export.json",
    orders_csv: "orders_export.csv",
    orders_json: "orders_export.json"
  };

  const filename = filenameMap[type];
  if (!filename) throw new Error("Invalid export type requested.");

  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Export file '${filename}' not found in backup '${path.basename(dir)}'.`);
  }

  return { filePath, filename };
}

module.exports = {
  getCleanupPreview,
  createFullBackup,
  executeCleanup,
  rollbackFromBackup,
  listBackups,
  getExportFilePath
};
