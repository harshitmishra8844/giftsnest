const mongoose = require("mongoose");

const slaTrackingSchema = new mongoose.Schema(
  {
    taskType: {
      type: String,
      enum: ["Ticket", "Callback", "Return", "Refund"],
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    taskCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      default: "Direct Support",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical", "Urgent"],
      default: "Medium",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedRole: {
      type: String,
      default: "",
    },
    firstResponseDue: {
      type: Date,
      default: null,
      index: true,
    },
    firstResponseAt: {
      type: Date,
      default: null,
    },
    firstResponseBreached: {
      type: Boolean,
      default: false,
    },
    resolutionDue: {
      type: Date,
      default: null,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionBreached: {
      type: Boolean,
      default: false,
    },
    callbackDue: {
      type: Date,
      default: null,
    },
    callbackAt: {
      type: Date,
      default: null,
    },
    callbackBreached: {
      type: Boolean,
      default: false,
    },
    refundDue: {
      type: Date,
      default: null,
    },
    refundAt: {
      type: Date,
      default: null,
    },
    refundBreached: {
      type: Boolean,
      default: false,
    },
    isOverdue: {
      type: Boolean,
      default: false,
      index: true,
    },
    escalatedAt: {
      type: Date,
      default: null,
    },
    escalationReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "sla_tracking",
  }
);

slaTrackingSchema.index({ isOverdue: 1, taskType: 1 });
slaTrackingSchema.index({ assignedTo: 1, isOverdue: 1 });
slaTrackingSchema.index({ taskId: 1, taskType: 1 });

module.exports = mongoose.model("SlaTracking", slaTrackingSchema);
