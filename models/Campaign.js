const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: ["Email", "SMS", "WhatsApp", "Push", "Website Notification"],
      required: true,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    segmentId: {
      type: String, // Can be "All", "VIP", or references to CustomerSegment ID
      default: "All",
    },
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "Running", "Completed", "Cancelled"],
      default: "Draft",
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    metrics: {
      sentCount: { type: Number, default: 0 },
      openCount: { type: Number, default: 0 },
      clickCount: { type: Number, default: 0 },
      bounceCount: { type: Number, default: 0 },
      revenueGenerated: { type: Number, default: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", campaignSchema);
