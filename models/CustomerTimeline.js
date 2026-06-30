const mongoose = require("mongoose");

const customerTimelineSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    eventTitle: {
      type: String,
      required: true,
      trim: true,
    },
    eventDescription: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    device: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false } // We use custom timestamp for accuracy and indexing
);

module.exports = mongoose.model("CustomerTimeline", customerTimelineSchema);
