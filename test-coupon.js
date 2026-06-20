const connectDB = require("./config/db");
const Coupon = require("./models/Coupon");
const dotenv = require("dotenv");
dotenv.config({ path: "c:/gift/.env" });

const run = async () => {
  try {
    await connectDB();
    const indexes = await Coupon.collection.indexes();
    console.log("Indexes on coupons collection:", JSON.stringify(indexes, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Failed to list indexes:", error);
    process.exit(1);
  }
};

run();
