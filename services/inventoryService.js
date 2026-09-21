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
      { returnDocument: "after" }
    );
    if (!updated) {
      console.warn(
        `[inventory] Could not decrement ${qty} for product ${pid} (insufficient stock or missing product)`
      );
    }
  }
};

const incrementStockForCancelledOrder = async (order) => {
  // Only restore stock if the order was paid or was a COD order
  const wasStockDecremented = order.paymentStatus === "Paid" || order.paymentMethod === "COD";
  if (!wasStockDecremented) return;

  if (!order?.products?.length) return;
  for (const line of order.products) {
    const pid = line.productId;
    if (!pid || !mongoose.Types.ObjectId.isValid(String(pid))) continue;
    const qty = Math.max(0, Math.floor(Number(line.quantity || 1)));
    if (qty === 0) continue;
    await Product.findOneAndUpdate(
      { _id: pid },
      { $inc: { stock: qty } },
      { returnDocument: "after" }
    );
  }
};

/**
 * Atomically reserve stock for a replacement order.
 * Prevents negative inventory and ensures product has sufficient stock.
 */
const reserveStockForReplacement = async (productId, quantity, replacementRef = "") => {
  if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) {
    // If not a valid ObjectId (e.g. mock or slug), attempt find by slug or return
    const prod = await Product.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(productId) ? productId : null }, { slug: productId }],
    });
    if (!prod) {
      throw new Error(`Product reference "${productId}" not found in inventory.`);
    }
    productId = prod._id;
  }

  const qty = Math.max(1, Math.floor(Number(quantity || 1)));
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error(`Product not found.`);
  }

  if (product.stock < qty) {
    throw new Error(
      `Insufficient inventory to dispatch replacement: Available stock is ${product.stock}, required is ${qty}.`
    );
  }

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { returnDocument: "after" }
  );

  if (!updatedProduct) {
    throw new Error(
      `Stock reservation conflict: Unable to decrement ${qty} units. Please re-check inventory levels.`
    );
  }

  console.log(
    `[inventory] Successfully reserved ${qty} unit(s) of "${updatedProduct.name}" for replacement ${replacementRef}. Remaining stock: ${updatedProduct.stock}`
  );
  return updatedProduct;
};

/**
 * Atomically restock returned item into active inventory ONLY after physical receipt and verification.
 */
const restockReturnedItem = async (productId, quantity, returnRequestId = "", adminUser = null) => {
  if (!productId) return null;

  let targetId = productId;
  if (!mongoose.Types.ObjectId.isValid(String(productId))) {
    const prod = await Product.findOne({ slug: productId });
    if (!prod) {
      console.warn(`[inventory] Restock failed: Product reference "${productId}" not found.`);
      return null;
    }
    targetId = prod._id;
  }

  const qty = Math.max(1, Math.floor(Number(quantity || 1)));
  const updatedProduct = await Product.findByIdAndUpdate(
    targetId,
    { $inc: { stock: qty } },
    { returnDocument: "after" }
  );

  if (updatedProduct) {
    console.log(
      `[inventory] Restocked ${qty} unit(s) of "${updatedProduct.name}" from return claim ${returnRequestId}. New stock: ${updatedProduct.stock}`
    );
  }
  return updatedProduct;
};

module.exports = {
  decrementStockForPaidOrder,
  incrementStockForCancelledOrder,
  reserveStockForReplacement,
  restockReturnedItem,
};
