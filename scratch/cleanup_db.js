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
const Department = require("../models/Department");

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest");
    console.log("Connected to MongoDB.");

    // 1. Check existing counts
    console.log("\n--- Current DB Counts ---");
    console.log(`Orders: ${await Order.countDocuments()}`);
    console.log(`Returns: ${await Return.countDocuments()}`);
    console.log(`Refund Transactions: ${await RefundTransaction.countDocuments()}`);
    console.log(`Support Tickets: ${await Ticket.countDocuments()}`);
    console.log(`Coupons: ${await Coupon.countDocuments()}`);
    console.log(`Activity Logs: ${await ActivityLog.countDocuments()}`);
    console.log(`Newsletter Signups: ${await Newsletter.countDocuments()}`);
    console.log(`All Users: ${await User.countDocuments()}`);

    // 2. Perform deletion of transactional records
    console.log("\n--- Cleaning up records ---");
    
    const delOrders = await Order.deleteMany({});
    console.log(`Deleted ${delOrders.deletedCount} orders.`);

    const delReturns = await Return.deleteMany({});
    console.log(`Deleted ${delReturns.deletedCount} returns.`);

    const delRefunds = await RefundTransaction.deleteMany({});
    console.log(`Deleted ${delRefunds.deletedCount} refund transactions.`);

    const delTickets = await Ticket.deleteMany({});
    console.log(`Deleted ${delTickets.deletedCount} support tickets.`);

    const delCoupons = await Coupon.deleteMany({});
    console.log(`Deleted ${delCoupons.deletedCount} coupons.`);

    const delActivityLogs = await ActivityLog.deleteMany({});
    console.log(`Deleted ${delActivityLogs.deletedCount} activity logs.`);

    const delNewsletters = await Newsletter.deleteMany({});
    console.log(`Deleted ${delNewsletters.deletedCount} newsletter signups.`);

    // 3. Clean up user accounts
    console.log("\n--- Cleaning up user accounts ---");
    
    const targetEmail = "niyoragifts@gmail.com";
    
    // First, delete all other users to release unique indexes (like employeeId)
    const delUsers = await User.deleteMany({ email: { $ne: targetEmail } });
    console.log(`Deleted ${delUsers.deletedCount} other user/admin accounts.`);

    // Now, find the Master Admin with target email and update its fields
    let masterAdmin = await User.findOne({ email: targetEmail });
    
    if (masterAdmin) {
      console.log(`Found Master Admin with email ${targetEmail}. Updating fields...`);
      const itDept = await Department.findOne({ name: "IT" });
      masterAdmin.employeeId = "EMP-MASTER-001";
      masterAdmin.designation = "Chief Technical Officer";
      masterAdmin.isAdmin = true;
      masterAdmin.isMasterAdmin = true;
      masterAdmin.status = "Active";
      if (itDept) {
        masterAdmin.department = itDept._id;
      }
      await masterAdmin.save();
      console.log("Master Admin account updated successfully.");
    } else {
      console.log(`WARNING: Master Admin account with email ${targetEmail} not found!`);
      console.log("We will seed a new one if it is missing, or let the seed service create it on next startup.");
    }

    console.log("\n--- Cleanup Finished Successfully ---");
    
    // Check counts again
    console.log("\n--- Verify Final DB Counts ---");
    console.log(`Orders: ${await Order.countDocuments()}`);
    console.log(`Returns: ${await Return.countDocuments()}`);
    console.log(`Refund Transactions: ${await RefundTransaction.countDocuments()}`);
    console.log(`Support Tickets: ${await Ticket.countDocuments()}`);
    console.log(`Coupons: ${await Coupon.countDocuments()}`);
    console.log(`Activity Logs: ${await ActivityLog.countDocuments()}`);
    console.log(`Newsletter Signups: ${await Newsletter.countDocuments()}`);
    console.log(`Users remaining: ${await User.countDocuments()}`);
    
    const remainingUsers = await User.find();
    remainingUsers.forEach(u => {
      console.log(`Remaining User - Name: ${u.name}, Email: ${u.email}, isMasterAdmin: ${u.isMasterAdmin}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
}

cleanup();
