const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Order = require("../models/Order");

dotenv.config();

const generateOrderCode = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${y}${m}${d}-${randomPart}`;
};

const getArgValue = (flag) => {
  const arg = process.argv.find((item) => item.startsWith(`${flag}=`));
  if (!arg) return null;
  return arg.split("=")[1] || null;
};

const isDryRun = process.argv.includes("--dry-run");
const batchSize = Number(getArgValue("--batch-size") || 200);

const run = async () => {
  try {
    await connectDB();

    const filter = {
      $or: [{ orderCode: { $exists: false } }, { orderCode: "" }, { orderCode: null }],
    };

    const totalMissing = await Order.countDocuments(filter);
    console.log(`Orders missing orderCode: ${totalMissing}`);
    if (totalMissing === 0) {
      console.log("No backfill required.");
      return;
    }

    const cursor = Order.find(filter).sort({ createdAt: 1 }).cursor();
    const generatedInRun = new Set();
    let processed = 0;
    let updated = 0;
    let skipped = 0;

    for await (const order of cursor) {
      processed += 1;

      if (order.orderCode) {
        skipped += 1;
        continue;
      }

      let code = "";
      let attempts = 0;
      while (!code && attempts < 10) {
        attempts += 1;
        const candidate = generateOrderCode();
        if (generatedInRun.has(candidate)) continue;
        const exists = await Order.exists({ orderCode: candidate });
        if (!exists) {
          code = candidate;
          generatedInRun.add(candidate);
        }
      }

      if (!code) {
        throw new Error(`Could not generate unique orderCode for order ${order._id}`);
      }

      if (isDryRun) {
        console.log(`[DRY-RUN] ${order._id} => ${code}`);
        continue;
      }

      await Order.updateOne({ _id: order._id }, { $set: { orderCode: code } });
      updated += 1;

      if (updated % batchSize === 0) {
        console.log(`Updated ${updated} orders so far...`);
      }
    }

    console.log(`Processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    if (isDryRun) {
      console.log("Dry run complete. No database changes were made.");
    } else {
      console.log("Backfill complete.");
    }
  } catch (error) {
    console.error("Backfill orderCode failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
