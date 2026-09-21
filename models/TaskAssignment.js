const mongoose = require("mongoose");

const taskAssignmentSchema = new mongoose.Schema(
  {
    taskType: {
      type: String,
      enum: ["Ticket", "Callback", "Return", "Refund", "Order"],
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
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedToName: {
      type: String,
      default: "Unassigned Queue",
      trim: true,
    },
    assignedRole: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedByName: {
      type: String,
      default: "System Engine",
      trim: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Active", "Reassigned", "Transferred", "Completed"],
      default: "Active",
      index: true,
    },
    slaDeadline: {
      type: Date,
      default: null,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "task_assignments",
  }
);

taskAssignmentSchema.index({ taskId: 1, status: 1 });
taskAssignmentSchema.index({ assignedTo: 1, status: 1 });
taskAssignmentSchema.index({ assignedRole: 1, status: 1 });
taskAssignmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("TaskAssignment", taskAssignmentSchema);
