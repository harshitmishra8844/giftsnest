const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
  {
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
      index: true,
    },
    channel: {
      type: String,
      enum: ["IN_APP", "SSE", "EMAIL", "SMS", "WHATSAPP"],
      required: true,
      index: true,
    },
    recipient: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    event: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    category: {
      type: String,
      default: "SYSTEM",
      trim: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PENDING", "DELIVERED", "SENT"],
      default: "SUCCESS",
      index: true,
    },
    error: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

notificationLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("NotificationLog", notificationLogSchema);
