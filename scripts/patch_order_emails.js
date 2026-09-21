const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Order = require("../models/Order");
const User = require("../models/User");

async function patchOrderEmails() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gift-store";
  console.log("Connecting to MongoDB:", uri);
  await mongoose.connect(uri);

  const ordersWithoutEmail = await Order.find({
    $or: [{ email: { $exists: false } }, { email: "" }, { email: null }],
    userId: { $ne: null },
  });

  console.log(`Found ${ordersWithoutEmail.length} orders needing email backfill.`);

  let updatedCount = 0;
  for (const order of ordersWithoutEmail) {
    if (!order.userId) continue;
    const user = await User.findById(order.userId).select("email").lean();
    if (user && user.email) {
      order.email = user.email.toLowerCase().trim();
      await order.save();
      updatedCount++;
    }
  }

  console.log(`Successfully backfilled email on ${updatedCount} orders!`);
  await mongoose.disconnect();
}

patchOrderEmails().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
