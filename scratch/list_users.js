const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });
const User = require("../models/User");

const run = async () => {
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gift-store";
  await mongoose.connect(mongoURI);
  const users = await User.find({ isAdmin: { $ne: true } }).limit(5);
  console.log("CUSTOMERS:", users.map(u => ({ id: u._id, name: u.name, email: u.email })));
  process.exit(0);
};
run();
