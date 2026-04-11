const mongoose = require("mongoose");
const Product = require("../models/Product");

/**
 * Decrements product stock for each line item (only valid Mongo ObjectIds).
 * Called once when an order transitions to Paid. Idempotent if order was already Paid.
 */
const decrementStockForPaidOrder = async (order) => {
  if (!order?.products?.length) return;
  for (const line of order.products) {
    const pid = line.productId;
    if (!pid || !mongoose.Types.ObjectId.isValid(String(pid))) continue;
    const qty = Math.max(0, Math.floor(Number(line.quantity || 1)));
    if (qty === 0) continue;
    const updated = await Product.findOneAndUpdate(
      { _id: pid, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    );
    if (!updated) {
      console.warn(
        `[inventory] Could not decrement ${qty} for product ${pid} (insufficient stock or missing product)`
      );
    }
  }
};

module.exports = { decrementStockForPaidOrder };
