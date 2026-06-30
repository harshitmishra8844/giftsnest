const mongoose = require("mongoose");

const couponAssignmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    assignedBy: {
      type: String,
      default: "System", // Can be Admin User ID or name, or System (auto-birthday, segment, etc.)
    },
    assignmentType: {
      type: String,
      enum: ["manual", "segment", "purchase_history", "birthday", "anniversary", "location", "loyalty", "custom"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["Unused", "Redeemed", "Expired"],
      default: "Unused",
    },
    timesUsed: {
      type: Number,
      default: 0,
    },
    remainingUses: {
      type: Number,
      default: 1, // Default to 1-time coupon
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    redeemedDates: [
      {
        type: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("CouponAssignment", couponAssignmentSchema);
