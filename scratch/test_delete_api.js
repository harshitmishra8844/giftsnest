const axios = require("axios");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Order = require("../models/Order");

async function run() {
  try {
    // 1. Connect to MongoDB to find the pending order ID
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest");
    const order = await Order.findOne({ orderCode: "ORD-TEST-PENDING" });
    if (!order) {
      console.log("No pending test order found. Run seed_mock_order.js first.");
      await mongoose.disconnect();
      return;
    }
    const orderId = order._id.toString();
    console.log(`Found pending order ID: ${orderId}`);
    await mongoose.disconnect();

    // 2. Login to get token
    const loginRes = await axios.post("http://localhost:5000/api/admin/login", {
      email: "niyoragifts@gmail.com",
      password: "harshit@123"
    });
    const token = loginRes.data.token;
    console.log("Logged in successfully. Token obtained.");

    // 3. Try to delete the order via admin routes
    console.log(`Attempting to delete order ${orderId}...`);
    const deleteRes = await axios.delete(`http://localhost:5000/api/admin/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Server Response:", deleteRes.data);

    // 4. Verify in DB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest");
    const orderAfter = await Order.findById(orderId);
    if (!orderAfter) {
      console.log("SUCCESS: Order was successfully deleted from the database!");
    } else {
      console.log("FAILURE: Order still exists in the database.");
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error("API Call Failed:", error.response ? error.response.data : error.message);
  }
}

run();
