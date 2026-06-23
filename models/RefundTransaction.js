const mongoose = require("mongoose");

const refundTransactionSchema = new mongoose.Schema(
  {
    returnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Return",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ["Refund", "Store Credit", "Replacement"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Success", "Failed"],
      default: "Pending",
    },
    transactionReference: {
      type: String,
      default: "",
      trim: true,
    },
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    refundedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RefundTransaction", refundTransactionSchema);
