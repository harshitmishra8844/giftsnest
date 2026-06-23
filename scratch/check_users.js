const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/User");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest");
    console.log("Connected to MongoDB.");
    
    const users = await User.find();
    console.log(`Found ${users.length} users:`);
    users.forEach((u, i) => {
      console.log(`\n--- User #${i+1} ---`);
      console.log(`Name: ${u.name}`);
      console.log(`Email: ${u.email}`);
      console.log(`isAdmin: ${u.isAdmin}`);
      console.log(`isMasterAdmin: ${u.isMasterAdmin}`);
      console.log(`employeeId: ${u.employeeId}`);
      console.log(`designation: ${u.designation}`);
      console.log(`status: ${u.status}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

check();
