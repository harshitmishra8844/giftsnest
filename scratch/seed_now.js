const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const { seedDB } = require("../services/seedService");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest");
    console.log("Connected to MongoDB for seeding.");
    await seedDB();
    console.log("Seeding complete.");
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (error) {
    console.error("Error during manual seeding:", error);
  }
}

run();
