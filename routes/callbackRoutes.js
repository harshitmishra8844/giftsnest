const express = require("express");
const {
  requestCallbackPublic,
  createCallbackRequest,
  getCallbacks,
  getCallbackById,
  assignCallback,
  addCallRemark,
  editLatestRemark,
  getCallbackReports,
  exportCallbackData,
  getMyCallbacks,
} = require("../controllers/callbackController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");

const router = express.Router();

// Public Storefront Callback Request Submission (Customer / Guest)
router.post("/request", requestCallbackPublic);
router.post("/public", requestCallbackPublic);

// Customer Self-Service: view their callbacks
router.get("/my", protect, getMyCallbacks);
router.get("/my-callbacks", protect, getMyCallbacks);
router.get("/my/callbacks", protect, getMyCallbacks);

// Require authenticated staff/admin across all callback operations
router.use(protect);


// Analytics and Exports (placed before :id route)
router.get("/reports/analytics", checkPermission(["TICKETS_MANAGE", "BUSINESS_ANALYTICS_VIEW", "CUSTOMERS_VIEW"]), getCallbackReports);
router.get("/reports/export", checkPermission(["TICKETS_MANAGE", "BUSINESS_ANALYTICS_VIEW", "CUSTOMERS_VIEW"]), exportCallbackData);

// Callback CRUD & Queue
router.post("/", checkPermission(["TICKETS_MANAGE", "CUSTOMERS_VIEW"]), createCallbackRequest);
router.get("/", checkPermission(["TICKETS_MANAGE", "CUSTOMERS_VIEW"]), getCallbacks);
router.get("/:id", checkPermission(["TICKETS_MANAGE", "CUSTOMERS_VIEW"]), getCallbackById);

// Staff Assignment
router.patch("/:id/assign", checkPermission(["TICKETS_MANAGE", "EMPLOYEES_MANAGE"]), assignCallback);

// Call Remarks Section & Follow-ups
router.post("/:id/remarks", checkPermission(["TICKETS_MANAGE", "CUSTOMERS_VIEW"]), addCallRemark);
router.put("/:id/remarks/:remarkId", checkPermission(["TICKETS_MANAGE", "CUSTOMERS_VIEW"]), editLatestRemark);

module.exports = router;
