const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/User");
const Order = require("../models/Order");
const Return = require("../models/Return");
const RefundTransaction = require("../models/RefundTransaction");
const Ticket = require("../models/Ticket");
const Coupon = require("../models/Coupon");
const ActivityLog = require("../models/ActivityLog");
const Newsletter = require("../models/Newsletter");
const Product = require("../models/Product");
const Department = require("../models/Department");
const Role = require("../models/Role");
const StoreSetting = require("../models/StoreSetting");
const ReturnSetting = require("../models/ReturnSetting");

async function checkStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest");
    console.log("Connected to MongoDB.");

    const stats = {
      users: await User.countDocuments(),
      masterAdmins: await User.countDocuments({ isMasterAdmin: true }),
      otherAdmins: await User.countDocuments({ isAdmin: true, isMasterAdmin: { $ne: true } }),
      customers: await User.countDocuments({ isAdmin: false, isMasterAdmin: false }),
      orders: await Order.countDocuments(),
      returns: await Return.countDocuments(),
      refunds: await RefundTransaction.countDocuments(),
      tickets: await Ticket.countDocuments(),
      coupons: await Coupon.countDocuments(),
      activityLogs: await ActivityLog.countDocuments(),
      newsletters: await Newsletter.countDocuments(),
      products: await Product.countDocuments(),
      departments: await Department.countDocuments(),
      roles: await Role.countDocuments(),
      storeSettings: await StoreSetting.countDocuments(),
      returnSettings: await ReturnSetting.countDocuments()
    };

    console.log("Database Collection Counts:");
    console.log(JSON.stringify(stats, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error inspecting database:", err);
  }
}

checkStatus();
