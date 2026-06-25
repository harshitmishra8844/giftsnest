const mongoose = require("mongoose");

const replacementRequestSchema = new mongoose.Schema(
  {
    replacementCode: {
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
    status: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Investigation In Progress",
        "Evidence Verified",
        "Approved",
        "Pickup Scheduled",
        "Item Picked Up",
        "Item Received & Verified",
        "Replacement Packed",
        "Shipped",
        "Delivered",
        "Rejected",
      ],
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
    shippingDetails: {
      courier: { type: String, default: "" },
      trackingId: { type: String, default: "" },
      shippedDate: { type: Date, default: null },
      deliveredDate: { type: Date, default: null },
      note: { type: String, default: "" },
    },
    replacementOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReplacementRequest", replacementRequestSchema);
