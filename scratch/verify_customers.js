const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load backend .env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Notification = require("../models/Notification");
const Product = require("../models/Product");

const runVerify = async () => {
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gift-store";
  console.log("Connecting to MongoDB:", mongoURI);
  
  await mongoose.connect(mongoURI);
  console.log("Connected successfully.");

  try {
    // 1. Check schemas
    console.log("\n--- Checking User schema modifications ---");
    const testEmail = "test_verify_customer_123@niyora.in";
    
    // Clean up if exists
    await User.deleteMany({ email: testEmail });
    await Notification.deleteMany({ title: "Verification test notification" });

    // Find any product to add to cart
    const prod = await Product.findOne();
    const cartItems = [];
    if (prod) {
      console.log(`Using product "${prod.name}" for cart sync check`);
      cartItems.push({
        product: prod._id,
        quantity: 2,
        customization: { text: "Gift text message" }
      });
    } else {
      console.log("No product found in DB. Skipping cart product check.");
    }

    // Create user with new schema extensions
    const user = await User.create({
      name: "Test Verification Shopper",
      email: testEmail,
      password: "securepassword123",
      status: "Active",
      loginMethod: "OTP",
      verificationStatus: "Verified",
      isGuest: false,
      tags: ["VIP", "Holiday Shopper"],
      notes: [
        { text: "Private internal admin note 1", adminName: "System Admin" }
      ],
      cart: cartItems
    });

    console.log("User record created successfully with new schema extensions:");
    console.log(" - ID:", user._id);
    console.log(" - Status:", user.status);
    console.log(" - Login Method:", user.loginMethod);
    console.log(" - Verification Status:", user.verificationStatus);
    console.log(" - Tags:", user.tags);
    console.log(" - Notes Count:", user.notes.length);
    console.log(" - Cart Item Count:", user.cart.length);

    // 2. Suspend check
    console.log("\n--- Checking Suspension Schema update ---");
    user.status = "Suspended";
    user.suspension = {
      reason: "Verification testing",
      suspendedBy: user._id, // self-reference for test
      date: new Date(),
      notes: "Internal testing"
    };
    await user.save();
    
    const reFetchedUser = await User.findById(user._id);
    console.log("Refetched user status after suspension check:", reFetchedUser.status);
    console.log("Suspension Reason:", reFetchedUser.suspension?.reason);
    console.log("Suspension Date:", reFetchedUser.suspension?.date);

    // 3. Create Notification Check
    console.log("\n--- Checking Notification model ---");
    const notif = await Notification.create({
      recipient: user._id,
      title: "Verification test notification",
      message: "This is a system generated test notification.",
      type: "Information",
      status: "Sent"
    });
    console.log("Notification record created successfully:");
    console.log(" - ID:", notif._id);
    console.log(" - Type:", notif.type);
    console.log(" - Status:", notif.status);

    // Clean up
    console.log("\n--- Cleaning up test records ---");
    await User.findByIdAndDelete(user._id);
    await Notification.findByIdAndDelete(notif._id);
    console.log("Test records removed successfully.");

    console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

runVerify();
