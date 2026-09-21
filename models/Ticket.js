const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  attachments: [
    {
      name: { type: String, required: true },
      url: { type: String, required: true },
      fileType: { type: String },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const internalNoteSchema = new mongoose.Schema({
  note: {
    type: String,
    required: true,
    trim: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  authorName: {
    type: String,
    default: "Staff Member",
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ticketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    user: {
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
      lowercase: true,
      index: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
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
    category: {
      type: String,
      enum: [
        "General Query",
        "Contact Us",
        "Complaint",
        "Product Inquiry",
        "Order Issue",
        "Return / Replacement",
        "Account",
      ],
      default: "General Query",
      index: true,
    },
    source: {
      type: String,
      enum: [
        "Callback Request",
        "Contact Form",
        "Product Inquiry",
        "Order Issue",
        "Payment Issue",
        "Complaint",
        "Return Request",
        "Replacement Request",
        "Refund Request",
        "WhatsApp Inquiry",
        "Email Inquiry",
        "Direct Support",
      ],
      default: "Contact Form",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical", "Urgent"],
      default: "Medium",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "New",
        "Open",
        "Assigned",
        "In Progress",
        "Waiting Customer",
        "Waiting for Customer",
        "Escalated",
        "Resolved",
        "Closed",
      ],
      default: "New",
      index: true,
    },
    type: {
      type: String,
      enum: ["Support", "Return"],
      default: "Support",
    },
    returnRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Return",
      default: null,
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedRole: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    assignedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    // SLA Management Fields
    firstResponseDue: {
      type: Date,
      default: null,
      index: true,
    },
    firstResponseAt: {
      type: Date,
      default: null,
    },
    resolutionDue: {
      type: Date,
      default: null,
      index: true,
    },
    isOverdue: {
      type: Boolean,
      default: false,
      index: true,
    },
    slaBreached: {
      type: Boolean,
      default: false,
      index: true,
    },
    escalatedAt: {
      type: Date,
      default: null,
    },
    escalatedReason: {
      type: String,
      default: "",
      trim: true,
    },
    // Task Transfer History
    transferHistory: [
      {
        fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        fromUserName: { type: String, default: "Staff" },
        fromRole: { type: String, default: "" },
        toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        toUserName: { type: String, default: "Unassigned" },
        toRole: { type: String, default: "" },
        reason: { type: String, required: true },
        priority: { type: String, default: "Medium" },
        notes: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    internalNotes: [internalNoteSchema],
    messages: [messageSchema],
    closedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "tickets",
  }
);

ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });
ticketSchema.index({ category: 1, createdAt: -1 });
ticketSchema.index({ source: 1, createdAt: -1 });
ticketSchema.index({ user: 1, createdAt: -1 });
ticketSchema.index({ assignedAgent: 1, status: 1 });
ticketSchema.index({ isOverdue: 1, status: 1 });
ticketSchema.index({ slaBreached: 1, status: 1 });
ticketSchema.index({ customerPhone: 1 });
ticketSchema.index({ orderCode: 1 });

module.exports = mongoose.model("Ticket", ticketSchema);
