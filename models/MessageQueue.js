const mongoose = require("mongoose");

const messageQueueSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["Email", "SMS", "WhatsApp", "Push", "Website Notification"],
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    to: {
      type: String, // email address or phone number
      required: true,
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Sent", "Failed"],
      default: "Pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: "",
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MessageQueue", messageQueueSchema);
