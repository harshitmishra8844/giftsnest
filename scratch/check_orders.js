const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

require("../models/User");
const Order = require("../models/Order");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest");
    console.log("Connected to MongoDB.");
    
    const orders = await Order.find();
    console.log(`Found ${orders.length} orders:`);
    orders.forEach((o, i) => {
      console.log(`\n--- Order #${i+1} ---`);
      console.log(`Code: ${o.orderCode || o._id}`);
      console.log(`Status: ${o.status}`);
      o.products.forEach((p, idx) => {
        console.log(`  Product #${idx+1}: ${p.name}`);
        console.log(`  Customization:`, JSON.stringify(p.customization, null, 2));
      });
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

check();
