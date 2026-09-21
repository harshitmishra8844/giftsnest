const express = require("express");
const { getEnterpriseReports } = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");

const router = express.Router();

router.use(protect);

router.get("/analytics", checkPermission(["BUSINESS_ANALYTICS_VIEW", "REPORTS_EXPORT", "CUSTOMERS_VIEW"]), getEnterpriseReports);

module.exports = router;
