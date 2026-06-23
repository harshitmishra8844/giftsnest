const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Product = require("../models/Product");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest");
    console.log("Connected to MongoDB.");
    
    const products = await Product.find();
    console.log(`Found ${products.length} products:`);
    products.forEach((p, i) => {
      console.log(`\n--- Product #${i+1} ---`);
      console.log(`Name: ${p.name}`);
      console.log(`Primary Image: ${p.image}`);
      console.log(`Gallery Images:`, JSON.stringify(p.images, null, 2));
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

check();
