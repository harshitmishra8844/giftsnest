const express = require("express");
const {
  getCmsContent,
  getShellContent,
  getCmsContentDraft,
  saveDraft,
  publishDraft,
  revertDraft,
  getHistory,
  restoreVersion,
  uploadMedia,
  getMedia,
  deleteMedia,
} = require("../controllers/cmsController");
const { protect } = require("../middleware/authMiddleware");
const { imageUpload } = require("../middleware/uploadMiddleware");
const multer = require("multer");

const router = express.Router();

// Dynamic permission checker for sections
const checkCmsPermission = (req, res, next) => {
  if (req.user.isMasterAdmin) return next();

  const section = req.params.section;
  let requiredCode = "CONTENT_HOMEPAGE";
  
  if (section === "blog") {
    requiredCode = "CONTENT_BLOGS";
  } else if (section === "seo") {
    requiredCode = "CONTENT_SEO";
  }

  const hasPerm = req.user.permissions && (req.user.permissions.includes(requiredCode) || req.user.permissions.includes("ALL"));
  if (!hasPerm) {
    return res.status(403).json({
      message: `Access denied. Insufficient permissions (Requires: ${requiredCode} for ${section} content).`
    });
  }
  next();
};

// General media permissions check
const checkMediaPermission = (req, res, next) => {
  if (req.user.isMasterAdmin) return next();

  const requiredCode = "CONTENT_HOMEPAGE";
  const hasPerm = req.user.permissions && (req.user.permissions.includes(requiredCode) || req.user.permissions.includes("ALL"));
  if (!hasPerm) {
    return res.status(403).json({
      message: `Access denied. Insufficient permissions (Requires: ${requiredCode} to manage media).`
    });
  }
  next();
};

// --- PUBLIC ROUTES ---
router.get("/shell", getShellContent);
router.get("/content/:section", getCmsContent);

// --- PROTECTED ADMIN ROUTES ---

// Media Library Management
router.get("/media", protect, checkMediaPermission, getMedia);
router.post(
  "/media/upload",
  protect,
  checkMediaPermission,
  (req, res, next) => {
    imageUpload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "Image size must be 10MB or less" });
        }
        return res.status(400).json({ message: err.message || "Image upload failed" });
      }
      if (err) {
        return res.status(400).json({ message: err.message || "Image upload failed" });
      }
      return next();
    });
  },
  uploadMedia
);
router.delete("/media/:id", protect, checkMediaPermission, deleteMedia);

// Content Section & Revisions Management
router.get("/draft/:section", protect, checkCmsPermission, getCmsContentDraft);
router.post("/draft/:section", protect, checkCmsPermission, saveDraft);
router.post("/publish/:section", protect, checkCmsPermission, publishDraft);
router.post("/revert/:section", protect, checkCmsPermission, revertDraft);
router.get("/history/:section", protect, checkCmsPermission, getHistory);
router.post("/restore/:section", protect, checkCmsPermission, restoreVersion);

module.exports = router;
