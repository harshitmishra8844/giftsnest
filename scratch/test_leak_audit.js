const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env"), override: false });

const User = require(path.join(__dirname, "../models/User"));

async function runAuditTests() {
  const baseUrl = "http://127.0.0.1:5000/api";
  const adminEmail = process.env.ADMIN_EMAIL || "niyoragifts@gmail.com";

  console.log("--- Starting Information Leak Audit Tests ---");

  // Connect to DB
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gift-store";
  await mongoose.connect(mongoURI);

  // Helper to report status
  const assertMessage = (name, status, expectedMsg, expectedStatus, actualMsg, actualStatus) => {
    const isPass = expectedMsg === actualMsg && expectedStatus === actualStatus;
    console.log(`[${isPass ? "PASS" : "FAIL"}] ${name}`);
    console.log(`  Expected: ${expectedStatus} "${expectedMsg}"`);
    console.log(`  Actual:   ${actualStatus} "${actualMsg}"`);
  };

  // Test 1: check-email unregistered email response
  try {
    const res = await fetch(`${baseUrl}/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "unregistered-email-test-abc@gmail.com" })
    });
    const data = await res.json();
    assertMessage("checkEmail unregistered", true, "Incorrect email or password", 200, data.message, res.status);
    console.log(`  exists: ${data.exists} (expected: false)`);
  } catch (err) {
    console.error("Test 1 error:", err.message);
  }

  // Test 2: register-send-otp for already registered email
  try {
    const res = await fetch(`${baseUrl}/register-send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: adminEmail, // already registered
        mobileNumber: "9876543210"
      })
    });
    const data = await res.json();
    assertMessage("registerSendOtp taken email check", true, "A 6-digit verification code has been sent to your email.", 200, data.message, res.status);
  } catch (err) {
    console.error("Test 2 error:", err.message);
  }

  // Test 3: verify-otp (login mode) unregistered email check
  const Otp = require(path.join(__dirname, "../models/Otp"));
  const bcrypt = require("bcryptjs");
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash("123456", salt);
  await Otp.create({
    email: "unregistered-email-test-abc@gmail.com",
    otpHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  });

  try {
    const res = await fetch(`${baseUrl}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "unregistered-email-test-abc@gmail.com",
        otp: "123456",
        register: false
      })
    });
    const data = await res.json();
    assertMessage("verifyOtp unregistered (login mode)", true, "Incorrect email or password", 401, data.message, res.status);
  } catch (err) {
    console.error("Test 3 error:", err.message);
  } finally {
    await Otp.deleteMany({ email: "unregistered-email-test-abc@gmail.com" });
  }

  // Test 4: admin login failure
  try {
    const res = await fetch(`${baseUrl}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: "wrong-password-value"
      })
    });
    const data = await res.json();
    assertMessage("adminLogin wrong password check", true, "Incorrect email or password", 401, data.message, res.status);
  } catch (err) {
    console.error("Test 4 error:", err.message);
  }

  // Test 5: admin login lockout check (by manually locking and requesting)
  const adminUser = await User.findOne({ email: adminEmail.toLowerCase(), isAdmin: true });
  if (adminUser) {
    adminUser.lockUntil = new Date(Date.now() + 10 * 60 * 1000); // lock for 10 mins
    await adminUser.save();

    try {
      const res = await fetch(`${baseUrl}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: "any-password"
        })
      });
      const data = await res.json();
      assertMessage("adminLogin locked account check", true, "Incorrect email or password", 401, data.message, res.status);
    } catch (err) {
      console.error("Test 5 error:", err.message);
    }

    // Clean up
    adminUser.loginAttempts = 0;
    adminUser.lockUntil = null;
    await adminUser.save();
  }

  await mongoose.disconnect();
}

runAuditTests();
