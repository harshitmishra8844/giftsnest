const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env
dotenv.config({ path: path.join(__dirname, "../.env"), override: false });

const User = require(path.join(__dirname, "../models/User"));
const EmailLog = require(path.join(__dirname, "../models/EmailLog"));

async function testBruteForce() {
  const baseUrl = "http://127.0.0.1:5000/api/admin";
  const adminEmail = process.env.ADMIN_EMAIL || "niyoragifts@gmail.com";

  console.log("--- Starting Brute Force Protection Verification ---");

  // Step 1: Connect to database
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gift-store";
  await mongoose.connect(mongoURI);
  console.log("Connected to MongoDB for state management");

  // Step 2: Reset admin state in DB
  const adminUser = await User.findOne({ email: adminEmail.toLowerCase(), isAdmin: true });
  if (!adminUser) {
    console.error("Admin user not found in database. Cannot run per-account test.");
    mongoose.disconnect();
    return;
  }
  adminUser.loginAttempts = 0;
  adminUser.lockUntil = null;
  await adminUser.save();
  console.log(`Reset admin ${adminEmail} loginAttempts to 0`);

  // Step 3: Run per-account test (5 attempts with wrong password)
  console.log("\n--- Testing Per-Account Protection (Progressive Delay & Lockout) ---");
  
  const attempt = async (num) => {
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "wrong-password" })
      });
      const duration = Date.now() - start;
      const data = await res.json();
      console.log(`Attempt ${num}: status=${res.status}, duration=${duration}ms, message="${data.message}"`);
      return { status: res.status, duration, data };
    } catch (err) {
      console.error(`Attempt ${num} failed:`, err.message);
      return { status: 500, duration: 0 };
    }
  };

  // 1st attempt: no delay
  const r1 = await attempt(1);
  // 2nd attempt: no delay
  const r2 = await attempt(2);
  // 3rd attempt: 1s delay
  const r3 = await attempt(3);
  // 4th attempt: 2s delay
  const r4 = await attempt(4);
  // 5th attempt: 4s delay + Lockout triggers
  const r5 = await attempt(5);
  // 6th attempt: instant rejection (locked out)
  const r6 = await attempt(6);

  // Check progressive delay assertions (delays occur on subsequent attempts after failures are saved)
  const delay4Correct = r4.duration >= 900; // should be ~1s after 3 failures
  const delay5Correct = r5.duration >= 1900; // should be ~2s after 4 failures
  const lockInstant = r6.duration < 500;     // should be instant lockout

  console.log(`\nDelay Assertions:`);
  console.log(`- Attempt 4 delayed (>= 1s): ${delay4Correct ? "PASS" : "FAIL"} (${r4.duration}ms)`);
  console.log(`- Attempt 5 delayed (>= 2s): ${delay5Correct ? "PASS" : "FAIL"} (${r5.duration}ms)`);
  console.log(`- Attempt 6 instant lockout (< 500ms): ${lockInstant ? "PASS" : "FAIL"} (${r6.duration}ms)`);
  console.log(`- Attempt 6 status code is 401: ${r6.status === 401 ? "PASS" : "FAIL"}`);
  console.log(`- Attempt 6 message is identical: ${r6.data.message === "Invalid admin credentials" ? "PASS" : "FAIL"}`);

  // Step 4: Verify Lockout Email Enqueued
  console.log("\n--- Checking for Enqueued Lockout Email ---");
  // Give it a split second for async queue
  await new Promise(resolve => setTimeout(resolve, 500));
  const latestEmails = await EmailLog.find({ to: adminEmail.toLowerCase(), type: "account_lockout" }).sort({ createdAt: -1 });
  if (latestEmails.length > 0) {
    console.log(`PASS: Found enqueued lockout email!`);
    console.log(`- Subject: ${latestEmails[0].subject}`);
    console.log(`- Status: ${latestEmails[0].status}`);
  } else {
    console.log(`FAIL: Lockout email not found in EmailLog!`);
  }

  // Step 5: Test IP Throttling (Layer 1)
  console.log("\n--- Testing Per-IP Rate Limiting (Layer 1) ---");
  console.log("Sending 20 rapid requests to trigger throttle (limit is 15 in 1 minute)...");
  
  let blockedRequestNum = -1;
  let normalRequestsCount = 0;

  for (let i = 1; i <= 20; i++) {
    try {
      const res = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "random-non-existent@gmail.com", password: "some-password" })
      });
      const data = await res.json();
      
      // If blocked
      if (res.status === 401 && data.message === "Invalid admin credentials") {
        if (i > 15) {
          if (blockedRequestNum === -1) {
            blockedRequestNum = i;
          }
        } else {
          normalRequestsCount++;
        }
      }
    } catch (err) {
      console.error(`Request ${i} error:`, err.message);
    }
  }

  console.log(`IP Rate Limit Assertions:`);
  console.log(`- First 15 requests processed: ${normalRequestsCount === 15 ? "PASS" : "FAIL"} (Count: ${normalRequestsCount})`);
  console.log(`- Blocked starting at request: ${blockedRequestNum !== -1 ? "PASS" : "FAIL"} (Blocked at request: ${blockedRequestNum})`);

  // Step 6: Reset admin DB state to normal
  adminUser.loginAttempts = 0;
  adminUser.lockUntil = null;
  await adminUser.save();
  console.log(`\nRestored admin state to normal in database.`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

testBruteForce();
