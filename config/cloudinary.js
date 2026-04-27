const { v2: cloudinary } = require("cloudinary");

const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();

if (cloudinaryUrl) {
  cloudinary.config({
    cloudinary_url: cloudinaryUrl,
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
    api_key: process.env.CLOUDINARY_API_KEY || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || "",
  });
}

module.exports = cloudinary;
