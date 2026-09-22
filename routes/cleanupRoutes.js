const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getPreview,
  triggerBackup,
  executeCleanup,
  getBackups,
  rollback,
  downloadExport
} = require("../controllers/cleanupController");

const router = express.Router();

// Middleware: Strictly require Master Admin access
const masterAdminOnly = (req, res, next) => {
  if (!req.user || req.user.isMasterAdmin !== true) {
    return res.status(403).json({
      message: "Access denied. Production Cleanup operations require Master Admin credentials."
    });
  }
  next();
};

router.use(protect);
router.use(adminOnly);
router.use(masterAdminOnly);

router.get("/preview", getPreview);
router.post("/backup", triggerBackup);
router.post("/execute", executeCleanup);
router.get("/backups", getBackups);
router.post("/rollback", rollback);
router.get("/download-export", downloadExport);

module.exports = router;
