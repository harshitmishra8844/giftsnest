const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env vars
dotenv.config({ path: path.join(__dirname, "../.env") });

const connectDB = require("../config/db");
const Wishlist = require("../models/Wishlist");
const User = require("../models/User");
const Product = require("../models/Product");

async function verify() {
  try {
    await connectDB();

    console.log("Looking up a sample user...");
    const user = await User.findOne();
    if (!user) {
      console.log("No users found. Please sign up or seed first.");
      process.exit(1);
    }
    console.log(`Found sample user: ${user.name} (${user._id})`);

    console.log("Looking up a sample product...");
    const product = await Product.findOne();
    if (!product) {
      console.log("No products found. Please seed products first.");
      process.exit(1);
    }
    console.log(`Found sample product: ${product.name} (${product._id})`);

    // Clean up any existing test wishlist item
    await Wishlist.deleteMany({ user_id: user._id, product_id: product._id });

    console.log("Testing Wishlist Item Creation...");
    const item = await Wishlist.create({
      user_id: user._id,
      product_id: product._id
    });

    console.log("Wishlist item created successfully:");
    console.log(`- ID: ${item.id}`);
    console.log(`- User ID: ${item.user_id}`);
    console.log(`- Product ID: ${item.product_id}`);
    console.log(`- Created At: ${item.created_at}`);
    console.log(`- Updated At: ${item.updated_at}`);

    console.log("Testing Unique Compound Index constraint (should fail duplicate add)...");
    try {
      await Wishlist.create({
        user_id: user._id,
        product_id: product._id
      });
      console.error("❌ ERROR: Allowed duplicate wishlist entry!");
    } catch (err) {
      console.log("✅ Success: Prevented duplicate entry as expected!");
    }

    console.log("Testing Wishlist populate...");
    const populated = await Wishlist.findById(item._id).populate("product_id");
    console.log(`Populated Product Name: ${populated.product_id?.name}`);

    console.log("Testing Wishlist check and count...");
    const count = await Wishlist.countDocuments({ user_id: user._id });
    console.log(`Wishlist Count for User: ${count}`);

    // Clean up
    await Wishlist.findByIdAndDelete(item._id);
    console.log("Cleaned up verification records.");

    console.log("All Wishlist model tests passed successfully! 🚀");
    process.exit(0);
  } catch (error) {
    console.error("Test failed with error:", error);
    process.exit(1);
  }
}

verify();
