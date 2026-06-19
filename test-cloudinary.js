const cloudinary = require("./config/cloudinary");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config({ path: "c:/gift/.env" });

console.log("Cloudinary configuration settings:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? "***" : "none",
  cloudinary_url: process.env.CLOUDINARY_URL || "none"
});

const sampleImagePath = path.join(__dirname, "tmp-test.jpg");
if (!fs.existsSync(sampleImagePath)) {
  fs.writeFileSync(sampleImagePath, "dummy data");
}

const fileBuffer = fs.readFileSync(sampleImagePath);

console.log("Starting upload test...");

const uploadTest = async () => {
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "gift-store/test-products", resource_type: "image" },
        (error, uploaded) => {
          if (error) reject(error);
          else resolve(uploaded);
        }
      );
      stream.end(fileBuffer);
    });

    console.log("Upload SUCCESS:", result);
    process.exit(0);
  } catch (error) {
    console.error("Upload FAILED with error:", error);
    process.exit(1);
  }
};

uploadTest();
