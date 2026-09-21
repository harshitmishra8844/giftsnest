const mongoose = require("mongoose");

const refundRemarkSchema = new mongoose.Schema(
  {
    remarkId: {
      type: String,
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    authorName: {
      type: String,
      default: "Staff",
    },
    authorRole: {
      type: String,
      default: "Refund Executive",
    },
    remarkType: {
      type: String,
      enum: [
        "Verification Notes",
        "Refund Reason",
        "Investigation Summary",
        "Final Decision",
        "Internal Notes",
        "Customer Communication",
      ],
      default: "Internal Notes",
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const refundTimelineEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorName: {
      type: String,
      default: "System",
    },
    actorRole: {
      type: String,
      default: "System",
    },
    note: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const refundRecordSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReturnRequest",
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderCode: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      default: "",
      trim: true,
    },
    customerEmail: {
      type: String,
      default: "",
      trim: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    approvedAmount: {
      type: Number,
      default: null,
    },
    refundType: {
      type: String,
      enum: ["Full", "Partial"],
      default: "Full",
    },
    refundReason: {
      type: String,
      default: "",
      trim: true,
    },
    customerExplanation: {
      type: String,
      default: "",
      trim: true,
    },
    executiveRemarks: {
      type: String,
      default: "",
      trim: true,
    },
    supportingEvidence: [
      {
        url: { type: String, default: "" },
        name: { type: String, default: "" },
      },
    ],
    source: {
      type: String,
      enum: [
        "Phone Call",
        "Callback Request",
        "Support Ticket",
        "Email",
        "WhatsApp Inquiry",
        "Complaint",
        "Return Request",
        "Order Cancellation",
        "Other",
      ],
      default: "Phone Call",
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    raisedByName: {
      type: String,
      default: "",
    },
    raisedByRole: {
      type: String,
      default: "Customer Service Executive",
    },
    raisedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Step 2 & Workflow Status
    status: {
      type: String,
      enum: [
        "PENDING_REFUND_REVIEW",
        "REFUND_APPROVED",
        "REFUND_PROCESSING",
        "REFUNDED",
        "REJECTED",
        "MORE_INFO_REQUESTED",
        "ESCALATED_TO_MANAGER",
        "FAILED",
        // Legacy fallbacks
        "Pending",
        "Processing",
        "Completed",
        "Failed",
      ],
      default: "PENDING_REFUND_REVIEW",
      index: true,
    },
    refundStatus: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Completed",
        "Failed",
        "PENDING_REFUND_REVIEW",
        "REFUND_APPROVED",
        "REFUND_PROCESSING",
        "REFUNDED",
        "REJECTED",
        "MORE_INFO_REQUESTED",
        "ESCALATED_TO_MANAGER",
      ],
      default: "Pending",
      index: true,
    },
    refundMethod: {
      type: String,
      enum: ["Original Source", "UPI", "Bank Transfer", "Store Credit"],
      default: "Original Source",
    },

    // Step 3 - Payment Verification fields (by Refund Team)
    paymentVerified: {
      type: Boolean,
      default: false,
    },
    paymentVerificationNotes: {
      type: String,
      default: "",
    },
    orderEligibilityVerified: {
      type: Boolean,
      default: false,
    },
    fraudCheckPassed: {
      type: Boolean,
      default: false,
    },
    duplicateCheckPassed: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedByName: {
      type: String,
      default: "",
    },
    verifiedByRole: {
      type: String,
      default: "",
    },
    verifiedAt: {
      type: Date,
      default: null,
    },

    // Step 4 - Approval / Rejection fields
    approvalRemarks: {
      type: String,
      default: "",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedByName: {
      type: String,
      default: "",
    },
    approvedByRole: {
      type: String,
      default: "",
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedByName: {
      type: String,
      default: "",
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    moreInfoNotes: {
      type: String,
      default: "",
    },
    escalationNotes: {
      type: String,
      default: "",
    },

    // Step 5 & 6 - Gateway & Processing
    transactionReference: {
      type: String,
      default: "",
      trim: true,
    },
    gatewayRefundId: {
      type: String,
      default: "",
      trim: true,
    },
    gatewayTransactionId: {
      type: String,
      default: "",
      trim: true,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    processedByName: {
      type: String,
      default: "",
      trim: true,
    },
    processedByRole: {
      type: String,
      default: "",
    },
    processedAt: {
      type: Date,
      default: null,
    },
    processingTimeMs: {
      type: Number,
      default: 0,
    },
    refundNotes: {
      type: String,
      default: "",
      trim: true,
    },

    // Remarks System (Append-only)
    remarksHistory: {
      type: [refundRemarkSchema],
      default: [],
    },

    // Chronological Timeline
    timeline: {
      type: [refundTimelineEventSchema],
      default: [],
    },

    // Agent-Assisted Legacy Fields Compatibility
    isAgentCreated: {
      type: Boolean,
      default: false,
      index: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    agentName: {
      type: String,
      default: "",
      trim: true,
    },
    agentRole: {
      type: String,
      default: "",
      trim: true,
    },
    orderAmount: {
      type: Number,
      default: 0,
    },
    refundJustification: {
      type: String,
      default: "",
      trim: true,
    },
    approvalStage: {
      type: String,
      enum: [
        "Directly Approved",
        "Pending TL Approval",
        "Approved by TL",
        "Rejected by TL",
        "Refund Processing",
        "Completed",
        "Failed",
      ],
      default: "Directly Approved",
      index: true,
    },
    approvedByTL: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedByTLName: {
      type: String,
      default: "",
      trim: true,
    },
    approvedByTLAt: {
      type: Date,
      default: null,
    },
    tlRemarks: {
      type: String,
      default: "",
      trim: true,
    },
    customerConsent: {
      type: String,
      enum: ["Consent Received", "Consent Not Received"],
      default: "Consent Received",
    },
    callReferenceId: {
      type: String,
      default: "",
      trim: true,
    },
    internalCallId: {
      type: String,
      default: "",
      trim: true,
    },
    assignedTeam: {
      type: String,
      default: "Refund Team",
      trim: true,
    },
  },
  { timestamps: true }
);

refundRecordSchema.index({ status: 1, createdAt: -1 });
refundRecordSchema.index({ createdAt: -1 });

module.exports = mongoose.model("RefundRecord", refundRecordSchema);
