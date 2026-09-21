const mongoose = require("mongoose");

const taskTransferSchema = new mongoose.Schema(
  {
    taskType: {
      type: String,
      enum: ["Ticket", "Callback", "Return", "Refund", "Order", "General"],
      default: "Ticket",
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
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromUserName: {
      type: String,
      required: true,
    },
    fromRole: {
      type: String,
      default: "",
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    toUserName: {
      type: String,
      default: "Unassigned",
    },
    toRole: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical", "Urgent"],
      default: "Medium",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Transferred", "Accepted", "Completed", "Re-transferred"],
      default: "Transferred",
    },
  },
  {
    timestamps: true,
    collection: "task_transfers",
  }
);

taskTransferSchema.index({ toRole: 1, createdAt: -1 });
taskTransferSchema.index({ fromUser: 1, createdAt: -1 });
taskTransferSchema.index({ toUser: 1, createdAt: -1 });
taskTransferSchema.index({ taskId: 1, createdAt: -1 });

module.exports = mongoose.model("TaskTransfer", taskTransferSchema);
