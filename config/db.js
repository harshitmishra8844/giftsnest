const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  await mongoose.connect(mongoURI);
  console.log("MongoDB connected successfully");
};

module.exports = connectDB;
