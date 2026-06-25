const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cloudinary = require("../config/cloudinary");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");
const {
  returnUpload,
  ticketAttachmentUpload,
} = require("../middleware/fileUploadMiddleware");
const {
  createReturn,
  getMyReturns,
  getReturnDetails,
  adminGetReturns,
  adminUpdateReturn,
  addInternalNote,
  getReturnSettings,
  updateReturnSettings,
  createReturnRequest,
  createReplacementRequest,
  getMyReturnRequests,
  getMyReplacementRequests,
  adminGetReturnRequests,
  adminGetReplacementRequests,
  adminUpdateReturnRequest,
  adminUpdateReplacementRequest,
} = require("../controllers/returnController");

const router = express.Router();

// Simple in-memory rate limiting map
const ipRateLimits = {};

/**
 * Custom rate limiter middleware
 */
const rateLimiter = (maxRequests = 15, windowMs = 10 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const now = Date.now();

    if (!ipRateLimits[ip]) {
      ipRateLimits[ip] = [];
    }

    // Clean expired entries
    ipRateLimits[ip] = ipRateLimits[ip].filter(timestamp => now - timestamp < windowMs);

    if (ipRateLimits[ip].length >= maxRequests) {
      return res.status(429).json({
        message: "Too many requests from this device. Please try again in a few minutes.",
      });
    }

    ipRateLimits[ip].push(now);
    next();
  };
};

// Local storage directory helper
const ensureDirectoryExists = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

const extensionMap = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/x-matroska": "mkv",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "video/webm": "webm",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
};

const getExtension = (mimeType, originalName) => {
  const ext = extensionMap[String(mimeType || "").toLowerCase()];
  if (ext) return ext;
  const match = String(originalName || "").match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "bin";
};

const isCloudinaryConfigured = () => {
  const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  
  const isPlaceholder = (val) => !val || ["replace_me", "demo-cloud", "demo-key", "demo-secret"].includes(val.toLowerCase());
  return cloudinaryUrl !== "" || (!isPlaceholder(cloudName) && !isPlaceholder(apiKey) && !isPlaceholder(apiSecret));
};

/**
 * Handle returns file uploads (customer uploading photos/videos)
 */
router.post("/upload", protect, rateLimiter(25, 5 * 60 * 1000), (req, res) => {
  returnUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "File upload failed." });
    }

    try {
      const files = req.files;
      const responseData = { images: [], video: null };
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;

      // Handle images
      if (files.images && files.images.length > 0) {
        for (const file of files.images) {
          // Limit image size to 10MB each
          if (file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ message: "Image files must be 10MB or less." });
          }

          if (isCloudinaryConfigured()) {
            // Upload to Cloudinary with local fallback on error
            try {
              const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                  { folder: "gift-store/returns", resource_type: "image" },
                  (error, uploaded) => {
                    if (error) reject(error);
                    else resolve(uploaded);
                  }
                );
                stream.end(file.buffer);
              });
              responseData.images.push({ url: result.secure_url, publicId: result.public_id });
            } catch (cloudErr) {
              console.error("Cloudinary return image upload failed, falling back to local:", cloudErr.message);
              const localDir = path.join(process.cwd(), "uploads", "returns");
              await ensureDirectoryExists(localDir);
              const ext = getExtension(file.mimetype, file.originalname);
              const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
              await fs.promises.writeFile(path.join(localDir, fileName), file.buffer);
              const fileUrl = `${protocol}://${req.get("host")}/uploads/returns/${fileName}`;
              responseData.images.push({ url: fileUrl, publicId: null });
            }
          } else {
            // Local fallback
            const localDir = path.join(process.cwd(), "uploads", "returns");
            await ensureDirectoryExists(localDir);
            const ext = getExtension(file.mimetype, file.originalname);
            const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
            await fs.promises.writeFile(path.join(localDir, fileName), file.buffer);
            const fileUrl = `${protocol}://${req.get("host")}/uploads/returns/${fileName}`;
            responseData.images.push({ url: fileUrl, publicId: null });
          }
        }
      }

      // Handle video
      if (files.video && files.video.length > 0) {
        const file = files.video[0];
        // Limit video size to 50MB
        if (file.size > 50 * 1024 * 1024) {
          return res.status(400).json({ message: "Unboxing video must be 50MB or less." });
        }

        if (isCloudinaryConfigured()) {
          try {
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                { folder: "gift-store/returns", resource_type: "video" },
                (error, uploaded) => {
                  if (error) reject(error);
                  else resolve(uploaded);
                }
              );
              stream.end(file.buffer);
            });
            responseData.video = { url: result.secure_url, publicId: result.public_id };
          } catch (cloudErr) {
            console.error("Cloudinary return video upload failed, falling back to local:", cloudErr.message);
            const localDir = path.join(process.cwd(), "uploads", "returns");
            await ensureDirectoryExists(localDir);
            const ext = getExtension(file.mimetype, file.originalname);
            const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
            await fs.promises.writeFile(path.join(localDir, fileName), file.buffer);
            const fileUrl = `${protocol}://${req.get("host")}/uploads/returns/${fileName}`;
            responseData.video = { url: fileUrl, publicId: null };
          }
        } else {
          const localDir = path.join(process.cwd(), "uploads", "returns");
          await ensureDirectoryExists(localDir);
          const ext = getExtension(file.mimetype, file.originalname);
          const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
          await fs.promises.writeFile(path.join(localDir, fileName), file.buffer);
          const fileUrl = `${protocol}://${req.get("host")}/uploads/returns/${fileName}`;
          responseData.video = { url: fileUrl, publicId: null };
        }
      }

      res.status(201).json({
        message: "Files uploaded successfully.",
        ...responseData,
      });
    } catch (uploadError) {
      console.error("Return upload logic error:", uploadError.message);
      res.status(500).json({ message: `Upload failed: ${uploadError.message}` });
    }
  });
});

/**
 * Handle support ticket attachments
 */
router.post("/upload-attachment", protect, rateLimiter(20, 5 * 60 * 1000), (req, res) => {
  ticketAttachmentUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Attachment upload failed." });
    }

    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Attachment file is required." });
      }

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      let url = "";

      if (isCloudinaryConfigured()) {
        try {
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "gift-store/tickets", resource_type: "auto" },
              (error, uploaded) => {
                if (error) reject(error);
                else resolve(uploaded);
              }
            );
            stream.end(file.buffer);
          });
          url = result.secure_url;
        } catch (cloudErr) {
          console.error("Cloudinary ticket attachment upload failed, falling back to local:", cloudErr.message);
          const localDir = path.join(process.cwd(), "uploads", "tickets");
          await ensureDirectoryExists(localDir);
          const ext = getExtension(file.mimetype, file.originalname);
          const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
          await fs.promises.writeFile(path.join(localDir, fileName), file.buffer);
          url = `${protocol}://${req.get("host")}/uploads/tickets/${fileName}`;
        }
      } else {
        const localDir = path.join(process.cwd(), "uploads", "tickets");
        await ensureDirectoryExists(localDir);
        const ext = getExtension(file.mimetype, file.originalname);
        const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
        await fs.promises.writeFile(path.join(localDir, fileName), file.buffer);
        url = `${protocol}://${req.get("host")}/uploads/tickets/${fileName}`;
      }

      res.status(201).json({
        message: "Attachment uploaded successfully.",
        name: file.originalname,
        url,
        fileType: file.mimetype.startsWith("image/") ? "image" : "document",
      });
    } catch (attachmentError) {
      console.error("Attachment upload error:", attachmentError.message);
      res.status(500).json({ message: `Attachment upload failed: ${attachmentError.message}` });
    }
  });
});

// Customer returns endpoints
router.post("/", protect, rateLimiter(5, 5 * 60 * 1000), createReturn);
router.get("/my", protect, getMyReturns);
router.get("/my/:id", protect, getReturnDetails);
router.get("/settings", getReturnSettings);

// New Return & Replacement endpoints
router.post("/requests", protect, rateLimiter(10, 5 * 60 * 1000), createReturnRequest);
router.post("/replacements", protect, rateLimiter(10, 5 * 60 * 1000), createReplacementRequest);
router.get("/my-requests", protect, getMyReturnRequests);
router.get("/my-replacements", protect, getMyReplacementRequests);

// Admin returns endpoints (superadmin and employee support roles check)
router.get("/admin", protect, checkPermission(["ORDERS_RETURNS", "TICKETS_MANAGE"]), adminGetReturns);
router.get("/admin-requests", protect, checkPermission(["ORDERS_RETURNS"]), adminGetReturnRequests);
router.get("/admin-replacements", protect, checkPermission(["ORDERS_RETURNS"]), adminGetReplacementRequests);
router.get("/admin/:id", protect, checkPermission(["ORDERS_RETURNS", "TICKETS_MANAGE"]), getReturnDetails);
router.put("/admin/:id", protect, checkPermission("ORDERS_RETURNS"), adminUpdateReturn);
router.put("/admin-requests/:id", protect, checkPermission("ORDERS_RETURNS"), adminUpdateReturnRequest);
router.put("/admin-replacements/:id", protect, checkPermission("ORDERS_RETURNS"), adminUpdateReplacementRequest);
router.post("/admin/:id/notes", protect, checkPermission("ORDERS_RETURNS"), addInternalNote);
router.put("/settings", protect, adminOnly, checkPermission("ORDERS_RETURNS"), updateReturnSettings);

module.exports = router;
