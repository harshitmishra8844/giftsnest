const mongoose = require("mongoose");

const pushLogSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null means broadcast to all
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    icon: {
      type: String,
      default: "",
      trim: true,
    },
    ctaButtonLabel: {
      type: String,
      default: "",
      trim: true,
    },
    deepLink: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Sent", "Clicked", "Failed"],
      default: "Sent",
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
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PushLog", pushLogSchema);
