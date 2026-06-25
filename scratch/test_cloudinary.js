require("dotenv").config();
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("Cloudinary config:", cloudinary.config());
    // Use an existing image in the directory
    const testImagePath = path.join(process.cwd(), "frontend", "public", "vite.svg");
    if (!fs.existsSync(testImagePath)) {
      console.error("Vite.svg not found, creating dummy file.");
      fs.writeFileSync("test.txt", "dummy");
    }
    
    console.log("Uploading file to Cloudinary...");
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "test", resource_type: "auto" },
        (error, uploaded) => {
          if (error) reject(error);
          else resolve(uploaded);
        }
      );
      stream.end(fs.readFileSync(fs.existsSync(testImagePath) ? testImagePath : "test.txt"));
    });

    console.log("Upload Success:", result.secure_url);
  } catch (err) {
    console.error("Upload Failed:", err);
  }
}

main();
