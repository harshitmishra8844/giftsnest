const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });
const connectDB = require("../config/db");

async function dropIndexes() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("wishlists");
    
    console.log("Dropping old indexes...");
    
    try {
      await collection.dropIndex("userId_1_productId_1");
      console.log("Dropped userId_1_productId_1 successfully.");
    } catch (e) {
      console.log("userId_1_productId_1 did not exist or could not be dropped.");
    }

    try {
      await collection.dropIndex("userId_1");
      console.log("Dropped userId_1 successfully.");
    } catch (e) {
      console.log("userId_1 did not exist or could not be dropped.");
    }

    try {
      await collection.dropIndex("productId_1");
      console.log("Dropped productId_1 successfully.");
    } catch (e) {
      console.log("productId_1 did not exist or could not be dropped.");
    }

    const indexes = await collection.indexes();
    console.log("Remaining indexes:", JSON.stringify(indexes, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dropIndexes();
