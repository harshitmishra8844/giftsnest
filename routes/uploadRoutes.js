const express = require("express");
const multer = require("multer");
const { uploadImage } = require("../controllers/uploadController");
const { imageUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/", (req, res, next) => {
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
}, uploadImage);

module.exports = router;
