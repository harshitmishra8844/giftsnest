const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["percent", "flat"],
      required: true,
      default: "percent",
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minCartValue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    /** System-generated retention / VIP codes; hidden from public “active coupons” list */
    isSpecial: {
      type: Boolean,
      default: false,
    },
    /** Max successful (paid) redemptions globally; omit or null = unlimited */
    maxRedemptions: {
      type: Number,
      default: null,
    },
    /** Max paid uses per customer account; omit or null = unlimited */
    maxRedemptionsPerUser: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
