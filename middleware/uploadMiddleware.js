const multer = require("multer");

const storage = multer.memoryStorage();

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isImageMime = typeof file.mimetype === "string" && file.mimetype.startsWith("image/");
    const hasImageExtension = /\.(jpg|jpeg|png|webp|gif|bmp|svg|avif|heic|heif)$/i.test(file.originalname || "");
    if (isImageMime || hasImageExtension) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (jpg, jpeg, png, webp, gif, bmp, svg, avif, heic, heif)"));
    }
  },
});

module.exports = { imageUpload };
