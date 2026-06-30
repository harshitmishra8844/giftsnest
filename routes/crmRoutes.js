const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");
const {
  getCrmDashboardStats,
  getCampaigns,
  createCampaign,
  updateCampaignStatus,
  getSegments,
  createSegment,
  deleteSegment,
  getAlerts,
  resolveAlert,
  getCustomerTimeline,
  getCustomerCoupons,
  assignCouponToCustomer,
  getCustomerCommunicationHistory,
  sendIndividualMessage,
  deleteCampaign,
  deleteAlert,
  deleteNotification,
} = require("../controllers/crmController");

const router = express.Router();

// Require admin authentication protection across all CRM operations
router.use(protect);

// Dashboard stats
router.get("/dashboard", checkPermission("CUSTOMERS_VIEW"), getCrmDashboardStats);

// Campaigns Planner
router.get("/campaigns", checkPermission("MARKETING_CAMPAIGNS"), getCampaigns);
router.post("/campaigns", checkPermission("MARKETING_CAMPAIGNS"), createCampaign);
router.put("/campaigns/:id/status", checkPermission("MARKETING_CAMPAIGNS"), updateCampaignStatus);
router.delete("/campaigns/:id", checkPermission("MARKETING_CAMPAIGNS"), deleteCampaign);

// Segments Builder
router.get("/segments", checkPermission("CUSTOMERS_VIEW"), getSegments);
router.post("/segments", checkPermission("CUSTOMERS_VIEW"), createSegment);
router.delete("/segments/:id", checkPermission("CUSTOMERS_VIEW"), deleteSegment);

// Alerts Panel
router.get("/alerts", getAlerts); // Checked dynamically in controller based on role assignments
router.put("/alerts/:id/resolve", checkPermission("CUSTOMERS_EDIT"), resolveAlert);
router.delete("/alerts/:id", checkPermission("CUSTOMERS_EDIT"), deleteAlert);

// Shopper Specific CRM Endpoints
router.get("/customers/:id/timeline", checkPermission("CUSTOMERS_VIEW"), getCustomerTimeline);
router.get("/customers/:id/coupons", checkPermission("CUSTOMERS_VIEW"), getCustomerCoupons);
router.post("/customers/:id/assign-coupon", checkPermission(["COUPONS_MANAGE", "COUPONS_PUSH"]), assignCouponToCustomer);
router.get("/customers/:id/communication-history", checkPermission("CUSTOMERS_VIEW"), getCustomerCommunicationHistory);
router.post("/customers/:id/send-message", checkPermission("CUSTOMERS_NOTIFY"), sendIndividualMessage);
router.delete("/notifications/:id", checkPermission("CUSTOMERS_NOTIFY"), deleteNotification);

module.exports = router;
