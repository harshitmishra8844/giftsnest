const express = require("express");
const {
  searchCustomerAndRecords,
  getCustomer360Profile,
  verifyCustomer,
  createAgentReturnRequest,
  createAgentReplacementRequest,
  createAgentRefundRequest,
  getPendingRefundApprovals,
  approveOrRejectRefund,
  createAgentTicket,
  createAgentCallback,
  addAgentCallRemark,
  getAgentReports,
  exportAgentReportsCsv,
} = require("../controllers/agentAssistController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");

const router = express.Router();

// Require authenticated staff/admin for all endpoints
router.use(protect);
router.use(adminOnly);

// Universal Search
router.get(
  "/search",
  checkPermission(["AGENT_ASSIST_VIEW", "CUSTOMERS_VIEW", "TICKETS_MANAGE", "ORDERS_VIEW"]),
  searchCustomerAndRecords
);

// Customer 360 View
router.get(
  "/customer/:id/360",
  checkPermission(["AGENT_ASSIST_VIEW", "CUSTOMERS_VIEW", "TICKETS_MANAGE", "ORDERS_VIEW"]),
  getCustomer360Profile
);

// Verify Customer Identity
router.post(
  "/verify-customer",
  checkPermission(["AGENT_ASSIST_VIEW", "CUSTOMERS_VIEW", "AGENT_ASSIST_ACTION"]),
  verifyCustomer
);

// Agent Created Return Request
router.post(
  "/returns",
  checkPermission(["AGENT_ASSIST_ACTION", "ORDERS_RETURNS", "TICKETS_MANAGE"]),
  createAgentReturnRequest
);

// Agent Created Replacement Request
router.post(
  "/replacements",
  checkPermission(["AGENT_ASSIST_ACTION", "ORDERS_RETURNS", "INVENTORY_MANAGE"]),
  createAgentReplacementRequest
);

// Agent Created Refund Request
router.post(
  "/refunds",
  checkPermission(["AGENT_REFUND_CREATE", "AGENT_ASSIST_ACTION", "ORDERS_RETURNS", "FINANCE_MANAGE"]),
  createAgentRefundRequest
);

// Refund Approval Queue & Approval Actions (Team Lead / Manager / Master Admin)
router.get(
  "/refunds/pending-approval",
  checkPermission(["AGENT_REFUND_APPROVE", "FINANCE_MANAGE", "ORDERS_RETURNS", "EMPLOYEES_MANAGE"]),
  getPendingRefundApprovals
);

router.patch(
  "/refunds/:id/approval",
  checkPermission(["AGENT_REFUND_APPROVE", "FINANCE_MANAGE", "EMPLOYEES_MANAGE"]),
  approveOrRejectRefund
);

// Agent Created Support Ticket
router.post(
  "/tickets",
  checkPermission(["AGENT_ASSIST_ACTION", "TICKETS_MANAGE", "CUSTOMERS_VIEW"]),
  createAgentTicket
);

// Agent Created Callback
router.post(
  "/callbacks",
  checkPermission(["AGENT_ASSIST_ACTION", "CUSTOMERS_VIEW", "TICKETS_MANAGE"]),
  createAgentCallback
);

// Add Live Call Remarks
router.post(
  "/remarks",
  checkPermission(["AGENT_REMARKS_ADD", "AGENT_ASSIST_ACTION", "CUSTOMERS_VIEW"]),
  addAgentCallRemark
);

// Reporting & CSV Export
router.get(
  "/reports",
  checkPermission(["BUSINESS_ANALYTICS_VIEW", "REPORTS_EXPORT", "CUSTOMERS_VIEW", "AGENT_ASSIST_VIEW"]),
  getAgentReports
);

router.get(
  "/reports/export",
  checkPermission(["REPORTS_EXPORT", "BUSINESS_ANALYTICS_VIEW", "CUSTOMERS_VIEW"]),
  exportAgentReportsCsv
);

module.exports = router;
