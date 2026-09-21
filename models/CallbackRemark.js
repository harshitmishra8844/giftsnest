const mongoose = require("mongoose");

const callbackRemarkSchema = new mongoose.Schema(
  {
    callbackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CallbackRequest",
      required: true,
      index: true,
    },
    callbackCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeId: {
      type: String,
      default: "",
      trim: true,
    },
    callOutcome: {
      type: String,
      required: true,
      enum: [
        "Connected",
        "Not Answered",
        "Busy",
        "Switched Off",
        "Wrong Number",
        "Call Later Requested",
        "Call Back Later Requested",
        "Interested",
        "Not Interested",
        "Interested in Purchase",
        "Order Placed",
        "Complaint Registered",
        "Escalated",
        "Issue Resolved",
      ],
      index: true,
    },
    conversationSummary: {
      type: String,
      required: true,
      trim: true,
    },
    customerRequirement: {
      type: String,
      default: "",
      trim: true,
    },
    issueDiscussed: {
      type: String,
      default: "",
      trim: true,
    },
    resolutionProvided: {
      type: String,
      default: "",
      trim: true,
    },
    followUpRequired: {
      type: Boolean,
      default: false,
      index: true,
    },
    nextCallbackDate: {
      type: Date,
      default: null,
      index: true,
    },
    followUpPriority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical", "Urgent"],
      default: "Medium",
    },
    internalNotes: {
      type: String,
      default: "",
      trim: true,
    },
    editHistory: [
      {
        editedAt: { type: Date, default: Date.now },
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        editedByName: { type: String, default: "" },
        previousOutcome: { type: String, default: "" },
        previousSummary: { type: String, default: "" },
        reason: { type: String, default: "" },
      },
    ],
  },
  {
    timestamps: true,
    collection: "callback_remarks",
  }
);

callbackRemarkSchema.index({ callbackId: 1, createdAt: -1 });
callbackRemarkSchema.index({ employee: 1, createdAt: -1 });
callbackRemarkSchema.index({ callOutcome: 1, createdAt: -1 });

module.exports = mongoose.model("CallbackRemark", callbackRemarkSchema);
