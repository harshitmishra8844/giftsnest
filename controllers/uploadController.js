const cloudinary = require("../config/cloudinary");

const uploadImage = async (req, res) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const missingConfig =
      !cloudName ||
      !apiKey ||
      !apiSecret ||
      cloudName === "replace_me" ||
      apiKey === "replace_me" ||
      apiSecret === "replace_me" ||
      cloudName === "demo-cloud" ||
      apiKey === "demo-key" ||
      apiSecret === "demo-secret";

    if (missingConfig) {
      // Development fallback: return a placeholder URL
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }

      // For development, return a placeholder image URL
      const placeholderUrls = [
        "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=400&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop&crop=center"
      ];

      const randomUrl = placeholderUrls[Math.floor(Math.random() * placeholderUrls.length)];

      return res.status(201).json({
        message: "Development mode: Using placeholder image",
        imageUrl: randomUrl,
        publicId: `dev-${Date.now()}`,
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
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
