const mongoose = require("mongoose");

const storeCreditAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, "Store credit balance cannot be negative"],
      required: true,
    },
    reservedBalance: {
      type: Number,
      default: 0,
      min: [0, "Reserved credit balance cannot be negative"],
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Frozen", "Suspended"],
      default: "Active",
      index: true,
    },
    frozenReason: {
      type: String,
      default: "",
      trim: true,
    },
    frozenAt: {
      type: Date,
      default: null,
    },
    frozenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    totalCredited: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDebited: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalExpired: {
      type: Number,
      default: 0,
      min: 0,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index for querying active accounts
storeCreditAccountSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("StoreCreditAccount", storeCreditAccountSchema);
