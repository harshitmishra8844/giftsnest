const mongoose = require("mongoose");

const failedOrderRecordSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    orderCode: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    paymentAttemptId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      default: "Online",
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failureReason: {
      type: String,
      required: true,
      trim: true,
    },
    failureType: {
      type: String,
      enum: [
        "PAYMENT_FAILED",
        "PAYMENT_CANCELLED",
        "PAYMENT_TIMEOUT",
        "PAYMENT_VERIFICATION_FAILED",
        "GATEWAY_ERROR",
        "USER_CLOSED_WINDOW",
        "NETWORK_FAILURE",
        "OTHER",
      ],
      default: "PAYMENT_FAILED",
    },
    failureTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
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
    orderStatus: {
      type: String,
      default: "FAILED_PAYMENT",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

failedOrderRecordSchema.index({ customerId: 1, failureTimestamp: -1 });

module.exports = mongoose.model("FailedOrderRecord", failedOrderRecordSchema);
