require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    const products = await Product.find().select("name image images");
    console.log("Total products:", products.length);
    products.forEach((p) => {
      console.log(`Product: ${p.name}`);
      console.log(`  image:  ${p.image}`);
      console.log(`  images: ${p.images}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
