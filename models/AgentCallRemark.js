const mongoose = require("mongoose");

const agentCallRemarkSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      default: "Customer",
      trim: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    customerEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    agentName: {
      type: String,
      required: true,
      trim: true,
    },
    agentRole: {
      type: String,
      default: "Customer Support Agent",
      trim: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    orderCode: {
      type: String,
      default: "",
      trim: true,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
    ticketCode: {
      type: String,
      default: "",
      trim: true,
    },
    returnRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReturnRequest",
      default: null,
    },
    callOutcome: {
      type: String,
      enum: [
        "Resolved on Call",
        "Action Initiated",
        "Follow-up Scheduled",
        "Callback Requested",
        "Escalated",
        "Customer Unreachable",
      ],
      required: true,
      index: true,
    },
    discussionSummary: {
      type: String,
      required: true,
      trim: true,
    },
    customerRequest: {
      type: String,
      default: "",
      trim: true,
    },
    actionTaken: {
      type: String,
      default: "",
      trim: true,
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
      index: true,
    },
    internalNotes: {
      type: String,
      default: "",
      trim: true,
    },
    customerConsent: {
      type: String,
      enum: ["Consent Received", "Consent Not Received"],
      default: "Consent Received",
    },
    callRecordingReference: {
      type: String,
      default: "",
      trim: true,
    },
    internalCallId: {
      type: String,
      default: "",
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "agent_call_remarks",
  }
);

agentCallRemarkSchema.index({ customerId: 1, createdAt: -1 });
agentCallRemarkSchema.index({ agentId: 1, createdAt: -1 });
agentCallRemarkSchema.index({ callOutcome: 1, createdAt: -1 });

module.exports = mongoose.model("AgentCallRemark", agentCallRemarkSchema);
