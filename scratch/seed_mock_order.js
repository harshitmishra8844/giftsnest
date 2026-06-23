const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Order = require("../models/Order");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest");
    console.log("Connected to MongoDB.");

    // Delete existing orders to start clean
    await Order.deleteMany({});
    console.log("Deleted old orders.");

    // Order 1: Pending (Active)
    const pendingOrder = await Order.create({
      orderCode: "ORD-TEST-PENDING",
      products: [
        {
          productId: "1",
          name: "Luxury Gold Watch Box",
          price: 2499,
          quantity: 1,
          image: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
        }
      ],
      totalPrice: 2499,
      subtotal: 2499,
      address: {
        fullName: "Jane Doe",
        phone: "+91-98765-43210",
        line1: "456 Royal Palace, Marine Drive",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400021",
        country: "India"
      },
      status: "Pending",
      paymentStatus: "Pending",
      paymentMethod: "COD"
    });
    console.log("Created Pending Order:", pendingOrder.orderCode);

    // Order 2: Cancelled
    const cancelledOrder = await Order.create({
      orderCode: "ORD-TEST-CANCELLED",
      products: [
        {
          productId: "2",
          name: "Ivory Premium Mug Set",
          price: 1299,
          quantity: 2,
          image: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
        }
      ],
      totalPrice: 2598,
      subtotal: 2598,
      address: {
        fullName: "John Smith",
        phone: "+91-99999-88888",
        line1: "789 Gold Avenue, Sector 5",
        city: "Kolkata",
        state: "West Bengal",
        postalCode: "700091",
        country: "India"
      },
      status: "Cancelled",
      paymentStatus: "Pending",
      paymentMethod: "Online"
    });
    console.log("Created Cancelled Order:", cancelledOrder.orderCode);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (error) {
    console.error("Error seeding mock orders:", error);
  }
}

run();
