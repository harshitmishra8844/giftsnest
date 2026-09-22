const express = require("express");
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
  getRefundAuditLogs,
  getMyRefunds,
} = require("../controllers/refundController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Customer Self-Service Route (requires logged-in customer, no admin restriction)
router.get("/my", protect, getMyRefunds);
router.get("/my-refunds", protect, getMyRefunds);
router.get("/my/refunds", protect, getMyRefunds);

// Require authenticated staff/admin for all operations below
router.use(protect);
router.use(adminOnly);


// STEP 1: Customer Service Desk - Raise Refund Request
router.post("/raise", raiseRefundRequest);

// List & Detail
router.get("/", getRefundRequests);
router.get("/analytics/reports", getRefundReports);
router.get("/analytics/export", exportRefundReportsCsv);
router.get("/audit-logs", getRefundAuditLogs);
router.get("/:id", getRefundDetails);

// STEP 3: Refund Team Verification
router.post("/:id/verify", verifyRefundEligibility);

// STEP 4: Refund Team Actions
router.post("/:id/approve", approveRefundRequest);
router.post("/:id/reject", rejectRefundRequest);
router.post("/:id/request-info", requestMoreInfo);
router.post("/:id/escalate", escalateRefund);

// STEP 5 & 6: Refund Processing (Payment Gateway Settlement)
router.post("/:id/process", processRefundGateway);

// Remarks History
router.post("/:id/remarks", addRefundRemark);

module.exports = router;
