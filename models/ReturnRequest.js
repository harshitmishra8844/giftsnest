const mongoose = require("mongoose");

const returnRequestSchema = new mongoose.Schema(
  {
    returnCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        productId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        image: {
          type: String,
          default: "",
        },
      },
    ],
    reason: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: null },
      },
    ],
    video: {
      url: { type: String, default: "" },
      publicId: { type: String, default: null },
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Approved",
        "Rejected",
        "Pickup Scheduled",
        "Item Received",
        "Refund Processed",
      ],
      default: "Pending",
    },
    refundStatus: {
      type: String,
      enum: ["Pending", "Refunded", "None"],
      default: "Pending",
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String, default: "" },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    pickupDetails: {
      courier: { type: String, default: "" },
      trackingId: { type: String, default: "" },
      pickupDate: { type: Date, default: null },
      note: { type: String, default: "" },
    },
    refundDetails: {
      refundAmount: { type: Number, default: 0 },
      refundMethod: { type: String, default: "Original Source" },
      refundDate: { type: Date, default: null },
      transactionReference: { type: String, default: "" },
    },
    codRefundMethod: {
      type: String,
      enum: ["", "Bank Transfer", "UPI"],
      default: "",
    },
    codRefundDetails: {
      upiId: { type: String, default: "" },
      bankName: { type: String, default: "" },
      accountHolderName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReturnRequest", returnRequestSchema);
