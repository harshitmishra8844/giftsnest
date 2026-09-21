const mongoose = require("mongoose");

const customerInteractionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      default: "Customer",
      trim: true,
    },
    customerEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    interactionType: {
      type: String,
      required: true,
      enum: [
        "Callback Request",
        "Contact Form",
        "Product Inquiry",
        "Order Issue",
        "Payment Issue",
        "Complaint",
        "Return Request",
        "Replacement Request",
        "Refund Request",
        "WhatsApp Inquiry",
        "Email Inquiry",
        "Direct Support",
        "Support Message",
        "Order Placed",
        "Call Logged",
      ],
      index: true,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
      index: true,
    },
    ticketCode: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    referenceId: {
      type: String,
      default: "",
      trim: true,
    },
    channel: {
      type: String,
      enum: ["Web", "WhatsApp", "Email", "Phone", "Admin Console", "System"],
      default: "Web",
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    handledByName: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: "customer_interactions",
  }
);

customerInteractionSchema.index({ customerId: 1, timestamp: -1 });
customerInteractionSchema.index({ customerEmail: 1, timestamp: -1 });
customerInteractionSchema.index({ customerPhone: 1, timestamp: -1 });
customerInteractionSchema.index({ interactionType: 1, timestamp: -1 });

module.exports = mongoose.model("CustomerInteraction", customerInteractionSchema);
