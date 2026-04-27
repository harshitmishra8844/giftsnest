const mongoose = require("mongoose");
const dns = require("dns");

const connectDB = async () => {
  // Helps avoid SRV DNS resolution issues on some Windows/network setups.
  dns.setDefaultResultOrder("ipv4first");
  const mongoURI = process.env.MONGO_URI;
  const fallbackMongoURI =
    process.env.MONGO_URI_FALLBACK || "mongodb://127.0.0.1:27017/gift-store";

  if (!mongoURI) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  try {
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected successfully");
    return;
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV !== "production";
    const isSrvDnsError = error.message.includes("querySrv");

    if (!isDevelopment || !isSrvDnsError) {
      throw error;
    }

    console.warn(
      "Primary MongoDB SRV connection failed. Retrying with fallback URI..."
    );
    await mongoose.connect(fallbackMongoURI, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected successfully (fallback URI)");
  }
};

module.exports = connectDB;
