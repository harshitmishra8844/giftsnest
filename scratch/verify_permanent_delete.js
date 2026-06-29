const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load backend .env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Notification = require("../models/Notification");
const LoginActivityLog = require("../models/LoginActivityLog");

const runVerify = async () => {
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gift-store";
  console.log("Connecting to MongoDB:", mongoURI);
  
  await mongoose.connect(mongoURI);
  console.log("Connected successfully.");

  try {
    console.log("\n--- Checking Permanent Delete Controller logic ---");
    const testEmail = "purge_verify_customer_999@niyora.in";
    
    // Clean up if exists
    await User.deleteMany({ email: testEmail });

    // Create user
    const user = await User.create({
      name: "Temporary Purge Shopper",
      email: testEmail,
      password: "securepassword123",
      status: "Active",
    });

    console.log("Created user:", user.name, "with ID:", user._id);

    // Create related items
    const notif = await Notification.create({
      recipient: user._id,
      title: "Temporary test notif",
      message: "Message details",
      type: "Information",
    });

    const loginLog = await LoginActivityLog.create({
      userId: user._id,
      userName: user.name,
      email: testEmail,
      loginTime: new Date(),
      status: "Success",
      ipAddress: "127.0.0.1",
    });

    console.log("Created related logs: notification ID =", notif._id, ", loginLog ID =", loginLog._id);

    // Assert exist in DB
    const assertExistsUser = await User.findById(user._id);
    const assertExistsNotif = await Notification.findById(notif._id);
    const assertExistsLoginLog = await LoginActivityLog.findById(loginLog._id);

    if (!assertExistsUser || !assertExistsNotif || !assertExistsLoginLog) {
      throw new Error("Setup assertion failed: Test records were not created correctly.");
    }
    console.log("Setup assertions PASSED: Test records exist in DB.");

    // Perform permanent delete operations
    console.log("\nTriggering database purge...");
    await User.findByIdAndDelete(user._id);
    await Promise.all([
      LoginActivityLog.deleteMany({ userId: user._id }),
      Notification.deleteMany({ recipient: user._id })
    ]);
    console.log("Purge complete.");

    // Verify deletion
    const verifyUser = await User.findById(user._id);
    const verifyNotif = await Notification.findById(notif._id);
    const verifyLoginLog = await LoginActivityLog.findById(loginLog._id);

    console.log("\nVerification Results:");
    console.log(" - User exists?", !!verifyUser);
    console.log(" - Notification exists?", !!verifyNotif);
    console.log(" - Login Log exists?", !!verifyLoginLog);

    if (verifyUser || verifyNotif || verifyLoginLog) {
      throw new Error("Purge assertion failed: Related records were not fully cleaned up.");
    }

    console.log("\nALL PERMANENT DELETE ASSERTIONS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

runVerify();
