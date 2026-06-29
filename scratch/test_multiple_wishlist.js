const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });
const connectDB = require("../config/db");
const Wishlist = require("../models/Wishlist");
const User = require("../models/User");
const Product = require("../models/Product");

async function verifyMultiple() {
  try {
    await connectDB();

    const user = await User.findOne();
    if (!user) {
      console.log("No users found.");
      process.exit(1);
    }
    console.log(`User: ${user.name}`);

    const products = await Product.find().limit(2);
    if (products.length < 2) {
      console.log("Need at least 2 products in DB to run this check.");
      process.exit(1);
    }
    console.log(`Product 1: ${products[0].name} (${products[0]._id})`);
    console.log(`Product 2: ${products[1].name} (${products[1]._id})`);

    // Clean up
    await Wishlist.deleteMany({ user_id: user._id });

    // Add first product
    const item1 = await Wishlist.create({
      user_id: user._id,
      product_id: products[0]._id
    });
    console.log("✅ Successfully added product 1 to wishlist.");

    // Add second product
    const item2 = await Wishlist.create({
      user_id: user._id,
      product_id: products[1]._id
    });
    console.log("✅ Successfully added product 2 to wishlist.");

    // Verify count is 2
    const count = await Wishlist.countDocuments({ user_id: user._id });
    console.log(`Total items in wishlist: ${count}`);

    if (count === 2) {
      console.log("🎉 SUCCESS: Multiple products can be added to the wishlist!");
    } else {
      console.error("❌ FAILURE: Wishlist count is incorrect.");
    }

    // Clean up
    await Wishlist.deleteMany({ user_id: user._id });
    console.log("Cleaned up database records.");
    process.exit(0);
  } catch (err) {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  }
}

verifyMultiple();
