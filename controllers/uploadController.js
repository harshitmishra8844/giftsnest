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

const isPlaceholder = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "replace_me" ||
    normalized === "demo-cloud" ||
    normalized === "demo-key" ||
    normalized === "demo-secret"
  );
};

const uploadImage = async (req, res) => {
  try {
    const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();
    const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
    const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
    const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
    const hasCloudinaryUrl = Boolean(cloudinaryUrl);
    const hasValidDiscreteCreds = !isPlaceholder(cloudName) && !isPlaceholder(apiKey) && !isPlaceholder(apiSecret);
    const canUploadToCloudinary = hasCloudinaryUrl || hasValidDiscreteCreds;

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;

    if (!canUploadToCloudinary) {
      // Fallback to local disk when Cloudinary credentials are unavailable.
      await ensureLocalUploadsDir();
      const fileExt = extensionFromMime(req.file.mimetype);
      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${fileExt}`;
      const absolutePath = path.join(localUploadsDir, fileName);
      await fs.promises.writeFile(absolutePath, req.file.buffer);
      const imageUrl = `${protocol}://${req.get("host")}/uploads/products/${fileName}`;

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
    
    // Fallback to local disk if Cloudinary fails (e.g. account is disabled or network error)
    try {
      await ensureLocalUploadsDir();
      const fileExt = extensionFromMime(req.file.mimetype);
      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${fileExt}`;
      const absolutePath = path.join(localUploadsDir, fileName);
      await fs.promises.writeFile(absolutePath, req.file.buffer);
      
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const imageUrl = `${protocol}://${req.get("host")}/uploads/products/${fileName}`;

      return res.status(201).json({
        message: `Cloudinary upload failed (${error.message || "unknown error"}). Uploaded image is stored locally in development mode.`,
        imageUrl,
        publicId: null,
      });
    } catch (fallbackError) {
      console.error("Local fallback upload error:", fallbackError.message);
      return res.status(500).json({ message: `Failed to upload image: ${error.message}` });
    }
  }
};

module.exports = { uploadImage };
