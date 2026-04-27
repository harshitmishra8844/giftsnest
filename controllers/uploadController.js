const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const localUploadsDir = path.join(process.cwd(), "uploads", "products");

const ensureLocalUploadsDir = async () => {
  await fs.promises.mkdir(localUploadsDir, { recursive: true });
};

const extensionFromMime = (mimeType) => {
  const map = {
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
  };
  return map[String(mimeType || "").toLowerCase()] || "jpg";
};

const uploadImage = async (req, res) => {
  try {
    const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const hasCloudinaryUrl = Boolean(cloudinaryUrl);
    const hasDiscreteCreds = Boolean(cloudName && apiKey && apiSecret);

    const missingConfig =
      (!hasCloudinaryUrl && !hasDiscreteCreds) ||
      cloudName === "replace_me" ||
      apiKey === "replace_me" ||
      apiSecret === "replace_me" ||
      cloudName === "demo-cloud" ||
      apiKey === "demo-key" ||
      apiSecret === "demo-secret";

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    if (missingConfig) {
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        return res.status(503).json({
          message:
            "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server .env, then restart backend.",
        });
      }

      await ensureLocalUploadsDir();
      const fileExt = extensionFromMime(req.file.mimetype);
      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${fileExt}`;
      const absolutePath = path.join(localUploadsDir, fileName);
      await fs.promises.writeFile(absolutePath, req.file.buffer);
      const imageUrl = `${req.protocol}://${req.get("host")}/uploads/products/${fileName}`;

      return res.status(201).json({
        message:
          "Cloudinary is not configured. Uploaded image is stored locally in development mode.",
        imageUrl,
        publicId: null,
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "gift-store/products", resource_type: "image" },
        (error, uploaded) => {
          if (error) reject(error);
          else resolve(uploaded);
        }
      );

      stream.end(req.file.buffer);
    });

    return res.status(201).json({
      message: "Image uploaded successfully",
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Image upload error:", error.message);
    return res.status(500).json({ message: "Failed to upload image" });
  }
};

module.exports = { uploadImage };
