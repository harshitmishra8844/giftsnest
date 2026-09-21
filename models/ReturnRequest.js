const mongoose = require("mongoose");

const returnRequestSchema = new mongoose.Schema(
  {
    // Primary Request Identifier (e.g., RET-2026-000001)
    requestId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    // Backward-compatible identifier alias
    returnCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderItemId: {
      type: String,
      default: "",
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    requestType: {
      type: String,
      enum: ["Return", "Replacement"],
      default: "Return",
      index: true,
    },
    returnReason: {
      type: String,
      default: "",
      trim: true,
    },
    // Backward-compatible reason alias
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    customerMessage: {
      type: String,
      default: "",
      trim: true,
    },
    // Backward-compatible description alias
    description: {
      type: String,
      default: "",
      trim: true,
    },
    evidenceImages: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: null },
      },
    ],
    // Backward-compatible images alias
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: null },
      },
    ],
    evidenceVideo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: null },
    },
    // Backward-compatible video alias
    video: {
      url: { type: String, default: "" },
      publicId: { type: String, default: null },
    },
    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, default: 1 },
        image: { type: String, default: "" },
      },
    ],
    status: {
      type: String,
      enum: [
        // 10 Unified Standard Pipeline Statuses:
        "Submitted",
        "Under Review",
        "Approved",
        "Rejected",
        "Pickup Scheduled",
        "Item Received",
        "Replacement Processing",
        "Replacement Shipped",
        "Refund Processing",
        "Refund Completed",
        "More Information Requested",
        // Legacy fallbacks for historical records
        "Pending",
        "Refund Processed",
        "Delivered",
        "Completed",
      ],
      default: "Submitted",
      index: true,
    },
    adminRemarks: {
      type: String,
      default: "",
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    itemVerified: {
      type: Boolean,
      default: false,
    },
    itemVerifiedAt: {
      type: Date,
      default: null,
    },
    restocked: {
      type: Boolean,
      default: false,
    },
    restockedAt: {
      type: Date,
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ["Pending", "Processing", "Completed", "Refunded", "Failed", "None"],
      default: "Pending",
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String, default: "" },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    pickupDetails: {
      courier: { type: String, default: "" },
      trackingId: { type: String, default: "" },
      pickupDate: { type: Date, default: null },
      note: { type: String, default: "" },
    },
    refundDetails: {
      refundAmount: { type: Number, default: 0 },
      refundMethod: { type: String, default: "Original Source" },
      refundDate: { type: Date, default: null },
      transactionReference: { type: String, default: "" },
    },
    codRefundMethod: {
      type: String,
      enum: ["", "Bank Transfer", "UPI"],
      default: "",
    },
    codRefundDetails: {
      upiId: { type: String, default: "" },
      bankName: { type: String, default: "" },
      accountHolderName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
    },
    // Agent-Assisted Customer Service Fields
    isAgentCreated: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdAgentName: {
      type: String,
      default: "",
      trim: true,
    },
    createdAgentRole: {
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
    verificationMethod: {
      type: String,
      default: "",
      trim: true,
    },
    assignedTeam: {
      type: String,
      enum: [
        "Return Team",
        "Refund Team",
        "Logistics Team",
        "Inventory Team",
        "Technical Team",
        "Unassigned",
      ],
      default: "Return Team",
      index: true,
    },
  },
  { timestamps: true }
);

// Keep aliases synchronized on save
returnRequestSchema.pre("save", function () {
  // Sync ID
  if (!this.requestId && this.returnCode) {
    this.requestId = this.returnCode;
  } else if (!this.returnCode && this.requestId) {
    this.returnCode = this.requestId;
  }

  // Sync Reason
  if (!this.returnReason && this.reason) {
    this.returnReason = this.reason;
  } else if (!this.reason && this.returnReason) {
    this.reason = this.returnReason;
  }

  // Sync Message
  if (!this.customerMessage && this.description) {
    this.customerMessage = this.description;
  } else if (!this.description && this.customerMessage) {
    this.description = this.customerMessage;
  }

  // Sync Evidence Images
  if ((!this.evidenceImages || this.evidenceImages.length === 0) && this.images?.length > 0) {
    this.evidenceImages = this.images;
  } else if ((!this.images || this.images.length === 0) && this.evidenceImages?.length > 0) {
    this.images = this.evidenceImages;
  }

  // Sync Evidence Video
  if (!this.evidenceVideo?.url && this.video?.url) {
    this.evidenceVideo = this.video;
  } else if (!this.video?.url && this.evidenceVideo?.url) {
    this.video = this.evidenceVideo;
  }

  // Sync single productId if items present
  if (!this.productId && this.items?.length > 0) {
    this.productId = this.items[0].productId;
  }
});

returnRequestSchema.index({ orderId: 1, productId: 1 });
returnRequestSchema.index({ customerId: 1, createdAt: -1 });
returnRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ReturnRequest", returnRequestSchema);
