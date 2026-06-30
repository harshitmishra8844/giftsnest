const mongoose = require("mongoose");

const whatsAppLogSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    templateName: {
      type: String,
      default: "",
      trim: true,
    },
    mediaUrl: {
      type: String,
      default: "",
      trim: true,
    },
    catalogProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Sent", "Delivered", "Failed"],
      default: "Pending",
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: "",
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WhatsAppLog", whatsAppLogSchema);
