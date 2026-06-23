const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

require("../models/User");
require("../models/Order");
require("../models/Ticket");
const Return = require("../models/Return");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest");
    console.log("Connected to MongoDB.");
    
    const returns = await Return.find().populate("user", "name email");
    console.log(`Found ${returns.length} return requests:`);
    returns.forEach((r, i) => {
      console.log(`\n--- Return #${i+1} ---`);
      console.log(`Code: ${r.returnCode}`);
      console.log(`User: ${r.user?.name} (${r.user?.email})`);
      console.log(`Status: ${r.status}`);
      console.log(`Images:`, JSON.stringify(r.images, null, 2));
      console.log(`Video:`, JSON.stringify(r.video, null, 2));
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

check();
