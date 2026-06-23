const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

// Allowed file types
const ALLOWED_IMAGE_EXTS = /\.(jpg|jpeg|png|webp|gif|bmp|svg|avif|heic|heif)$/i;
const ALLOWED_VIDEO_EXTS = /\.(mp4|mkv|mov|avi|webm|3gp)$/i;
const ALLOWED_DOC_EXTS = /\.(pdf|doc|docx|txt|csv|xls|xlsx)$/i;

const returnUpload = multer({
  storage,
  limits: {
    // We will do field-specific limit checks inside the route handler or set a high limit here and validate
    fileSize: 50 * 1024 * 1024, // 50MB overall max (unboxing video limit)
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const mime = file.mimetype || "";

    if (file.fieldname === "images") {
      const isImage = mime.startsWith("image/") || ALLOWED_IMAGE_EXTS.test(file.originalname);
      if (isImage) {
        cb(null, true);
      } else {
        cb(new Error("Only images are allowed in the images field."));
      }
    } else if (file.fieldname === "video") {
      const isVideo = mime.startsWith("video/") || ALLOWED_VIDEO_EXTS.test(file.originalname);
      if (isVideo) {
        cb(null, true);
      } else {
        cb(new Error("Only video files are allowed in the video field."));
      }
    } else {
      cb(new Error(`Unexpected field: ${file.fieldname}`));
    }
  },
}).fields([
  { name: "images", maxCount: 5 },
  { name: "video", maxCount: 1 },
]);

const ticketAttachmentUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file attachment
  fileFilter: (req, file, cb) => {
    const ext = file.originalname || "";
    const mime = file.mimetype || "";

    const isImage = mime.startsWith("image/") || ALLOWED_IMAGE_EXTS.test(ext);
    const isDoc = ALLOWED_DOC_EXTS.test(ext) || [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ].includes(mime);

    if (isImage || isDoc) {
      cb(null, true);
    } else {
      cb(new Error("Invalid attachment type. Allowed: Images, PDF, Word, Excel, CSV, Text files."));
    }
  },
}).single("attachment");

module.exports = {
  returnUpload,
  ticketAttachmentUpload,
};
