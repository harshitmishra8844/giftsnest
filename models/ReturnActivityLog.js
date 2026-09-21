const mongoose = require("mongoose");

const returnActivityLogSchema = new mongoose.Schema(
  {
    activityId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReturnRequest",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      default: "",
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    performedByName: {
      type: String,
      default: "System",
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

returnActivityLogSchema.index({ requestId: 1, timestamp: 1 });

module.exports = mongoose.model("ReturnActivityLog", returnActivityLogSchema);
