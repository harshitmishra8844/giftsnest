const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const CmsContent = require("../models/CmsContent");

/**
 * Ensure database indexes exist for critical query paths.
 * Safe to run multiple times (idempotent).
 */
async function ensureIndexes() {
  try {
    // Product indexes
    await Product.collection.createIndex({ category: 1, createdAt: -1 }, { background: true });
    await Product.collection.createIndex({ price: 1 }, { background: true });
    await Product.collection.createIndex({ price: -1 }, { background: true });
    await Product.collection.createIndex({ isFeatured: 1, createdAt: -1 }, { background: true });
    
    // Order indexes
    await Order.collection.createIndex({ orderCode: 1 }, { background: true });
    await Order.collection.createIndex({ status: 1, createdAt: -1 }, { background: true });

    // CMS & Setting indexes
    await CmsContent.collection.createIndex({ pageKey: 1 }, { background: true });

    console.log("[db] Performance indexes verified successfully.");
  } catch (error) {
    // Do not crash startup if an index already exists with different options or similar
    console.warn("[db] ensureIndexes note:", error.message);
  }
}

module.exports = ensureIndexes;
