const express = require("express");
const { getActivityLogs } = require("../controllers/logController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/", checkPermission("ACTIVITY_LOGS_VIEW"), getActivityLogs);

module.exports = router;
