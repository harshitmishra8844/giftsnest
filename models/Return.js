const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema(
  {
    returnCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: {
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
          min: 0,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        image: {
          type: String,
          default: "",
        },
      },
    ],
    reason: {
      type: String,
      enum: [
        "Damaged Product",
        "Wrong Product Received",
        "Product Not As Expected",
        "Missing Item",
        "Quality Issue",
        "Other",
      ],
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
    preferredResolution: {
      type: String,
      enum: ["Refund", "Replacement", "Store Credit"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Return Requested",
        "Under Review",
        "Approved",
        "Pickup Scheduled",
        "Product Received",
        "Refund Processing",
        "Refunded",
        "Replacement Shipped",
        "Completed",
        "Rejected",
      ],
      default: "Return Requested",
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        note: {
          type: String,
          default: "",
          trim: true,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
    assignedSupportAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    internalNotes: [
      {
        note: {
          type: String,
          required: true,
          trim: true,
        },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
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
      refundMethod: {
        type: String,
        enum: ["Refund", "Store Credit", "Replacement Order", "None"],
        default: "None",
      },
      refundDate: { type: Date, default: null },
      refundStatus: {
        type: String,
        enum: ["Pending", "Success", "Failed", "None"],
        default: "None",
      },
      transactionReference: { type: String, default: "" },
    },
    replacementOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Return", returnSchema);
