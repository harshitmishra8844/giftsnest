const mongoose = require("mongoose");

const storeCreditTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreCreditAccount",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "CREDIT",
        "DEBIT",
        "RESERVE",
        "RELEASE",
        "EXPIRE",
        "ADJUSTMENT_ADD",
        "ADJUSTMENT_DEDUCT",
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Transaction amount must be greater than 0"],
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceType: {
      type: String,
      enum: [
        "REFUND",
        "ORDER",
        "CHECKOUT_RESERVATION",
        "EXPIRY",
        "ADMIN_ADJUSTMENT",
        "ORDER_CANCELLATION",
        "MANUAL",
      ],
      required: true,
      index: true,
    },
    referenceId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefundRecord",
      default: null,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
      index: true,
    },
    remainingCreditAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: undefined,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    performedByName: {
      type: String,
      default: "System",
      trim: true,
    },
    performedByRole: {
      type: String,
      default: "System",
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes for ledger queries and FIFO consumption
storeCreditTransactionSchema.index({ userId: 1, createdAt: -1 });
storeCreditTransactionSchema.index({ userId: 1, remainingCreditAmount: 1, expiresAt: 1 });
storeCreditTransactionSchema.index({ expiresAt: 1, remainingCreditAmount: 1, isExpired: 1 });
storeCreditTransactionSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

module.exports = mongoose.model("StoreCreditTransaction", storeCreditTransactionSchema);
