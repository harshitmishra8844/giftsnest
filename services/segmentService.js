const User = require("../models/User");
const Order = require("../models/Order");
const Wishlist = require("../models/Wishlist");

/**
 * Resolve User IDs matching dynamic segment filters.
 */
const resolveSegmentMembers = async (filters) => {
  try {
    const matchQuery = { isAdmin: { $ne: true }, status: { $ne: "Deleted" } };

    // 1. Geographic filters
    if (filters.city) {
      matchQuery["addresses.city"] = new RegExp(String(filters.city).trim(), "i");
    }
    if (filters.state) {
      matchQuery["addresses.state"] = new RegExp(String(filters.state).trim(), "i");
    }

    // 2. Demographic filters
    if (filters.gender) {
      matchQuery.gender = String(filters.gender).trim();
    }
    if (filters.ageMin !== undefined && filters.ageMin !== "") {
      matchQuery.age = { ...matchQuery.age, $gte: Number(filters.ageMin) };
    }
    if (filters.ageMax !== undefined && filters.ageMax !== "") {
      matchQuery.age = { ...matchQuery.age, $lte: Number(filters.ageMax) };
    }

    // 3. Cart & Wishlist indicators
    if (filters.cartAbandoned === true || filters.cartAbandoned === "true") {
      matchQuery.cart = { $exists: true, $not: { $size: 0 } };
    }
    if (filters.wishlistAbandoned === true || filters.wishlistAbandoned === "true") {
      const wishlistUsers = await Wishlist.find().distinct("user_id");
      matchQuery._id = { ...matchQuery._id, $in: wishlistUsers };
    }

    // 4. Temporal / Lifecycle events (Birthday/Anniversary)
    const currentMonth = new Date().getMonth() + 1; // 1-indexed for matching convenience
    if (filters.birthdayThisMonth === true || filters.birthdayThisMonth === "true") {
      matchQuery.$expr = {
        $eq: [{ $month: "$birthday" }, currentMonth],
      };
    }
    if (filters.anniversaryThisMonth === true || filters.anniversaryThisMonth === "true") {
      matchQuery.$expr = {
        $eq: [{ $month: "$anniversary" }, currentMonth],
      };
    }

    // 5. Inactivity/Login filters
    if (filters.lastLoginDays !== undefined && filters.lastLoginDays !== "") {
      const days = Number(filters.lastLoginDays);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      matchQuery.lastLogin = { $lte: cutoffDate };
    }

    // Assemble the Aggregation Pipeline to run post-lookup calculations (orders and spends)
    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "userId",
          as: "orders",
        },
      },
      {
        $addFields: {
          totalOrdersCount: { $size: "$orders" },
          totalAmountSpent: { $sum: "$orders.totalPrice" },
        },
      },
    ];

    const postMatch = {};
    if (filters.ordersMin !== undefined && filters.ordersMin !== "") {
      postMatch.totalOrdersCount = { $gte: Number(filters.ordersMin) };
    }
    if (filters.ordersMax !== undefined && filters.ordersMax !== "") {
      postMatch.totalOrdersCount = { ...postMatch.totalOrdersCount, $lte: Number(filters.ordersMax) };
    }
    if (filters.spentMin !== undefined && filters.spentMin !== "") {
      postMatch.totalAmountSpent = { $gte: Number(filters.spentMin) };
    }
    if (filters.spentMax !== undefined && filters.spentMax !== "") {
      postMatch.totalAmountSpent = { ...postMatch.totalAmountSpent, $lte: Number(filters.spentMax) };
    }

    if (Object.keys(postMatch).length > 0) {
      pipeline.push({ $match: postMatch });
    }

    // Execute matching
    const members = await User.aggregate(pipeline);
    return members.map((u) => u._id);
  } catch (error) {
    console.error("[segmentService] Error resolving members:", error.message);
    return [];
  }
};

module.exports = { resolveSegmentMembers };
