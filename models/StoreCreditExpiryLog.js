const mongoose = require("mongoose");

const storeCreditExpiryLogSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreCreditTransaction",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    reminderSent7Days: {
      type: Boolean,
      default: false,
    },
    reminderSent3Days: {
      type: Boolean,
      default: false,
    },
    reminderSent1Day: {
      type: Boolean,
      default: false,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

storeCreditExpiryLogSchema.index({ expiresAt: 1, expiredAt: 1 });
storeCreditExpiryLogSchema.index({ userId: 1, reminderSent1Day: 1 });

module.exports = mongoose.model("StoreCreditExpiryLog", storeCreditExpiryLogSchema);
