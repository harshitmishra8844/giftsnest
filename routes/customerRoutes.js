const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");
const {
  getCustomers,
  getCustomerProfile,
  updateCustomerStatus,
  softDeleteCustomer,
  restoreCustomer,
  permanentDeleteCustomer,
  addCustomerNote,
  sendCustomerNotifications,
  bulkCustomerAction,
  exportCustomersData,
  getCustomerAnalytics,
} = require("../controllers/customerController");

const router = express.Router();

// Require admin protection for all customer management endpoints
router.use(protect);

router.get("/", checkPermission("CUSTOMERS_VIEW"), getCustomers);
router.get("/analytics", checkPermission("CUSTOMERS_VIEW"), getCustomerAnalytics);
router.post("/export-data", checkPermission("CUSTOMERS_VIEW"), exportCustomersData);
router.post("/notifications", checkPermission("CUSTOMERS_NOTIFY"), sendCustomerNotifications);
router.post("/bulk", checkPermission("CUSTOMERS_EDIT"), bulkCustomerAction);

router.get("/:id", checkPermission("CUSTOMERS_VIEW"), getCustomerProfile);
router.put("/:id/status", checkPermission("CUSTOMERS_EDIT"), updateCustomerStatus);
router.delete("/:id", checkPermission("CUSTOMERS_DELETE"), softDeleteCustomer);
router.delete("/:id/permanent", checkPermission("CUSTOMERS_PURGE"), permanentDeleteCustomer);
router.post("/:id/restore", checkPermission("CUSTOMERS_DELETE"), restoreCustomer);
router.post("/:id/notes", checkPermission("CUSTOMERS_EDIT"), addCustomerNote);

module.exports = router;
