const mongoose = require("mongoose");

// Sub-schema for Remark Audit Edits
const remarkEditAuditSchema = new mongoose.Schema({
  editedAt: {
    type: Date,
    default: Date.now,
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  editedByName: {
    type: String,
    required: true,
    trim: true,
  },
  previousOutcome: {
    type: String,
    trim: true,
  },
  previousSummary: {
    type: String,
    trim: true,
  },
  reason: {
    type: String,
    default: "Updated within allowable 15-minute window",
    trim: true,
  },
});

// Sub-schema for Call Remarks (Append-only)
const callRemarkSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
    trim: true,
  },
  employeeId: {
    type: String,
    required: true,
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
  },
  nextCallbackDate: {
    type: Date,
    default: null,
  },
  followUpPriority: {
    type: String,
    enum: ["Low", "Medium", "High", "Urgent"],
    default: "Medium",
  },
  internalNotes: {
    type: String,
    default: "",
    trim: true,
  },
  statusChange: {
    type: String,
    default: "",
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  editHistory: [remarkEditAuditSchema],
});

// Sub-schema for Full Activity Timeline
const timelineEventSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
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
  performedByEmployeeId: {
    type: String,
    default: "",
    trim: true,
  },
  callOutcome: {
    type: String,
    default: "",
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const callbackRequestSchema = new mongoose.Schema(
  {
    callbackCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
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
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
      index: true,
    },
    ticketCode: {
      type: String,
      default: "",
      trim: true,
    },
    subject: {
      type: String,
      default: "Callback Request",
      trim: true,
    },
    initialNotes: {
      type: String,
      default: "",
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedToName: {
      type: String,
      default: "Unassigned",
      trim: true,
    },
    assignedToEmployeeId: {
      type: String,
      default: "",
      trim: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Assigned",
        "Attempted",
        "Follow-up Scheduled",
        "Completed",
        "Escalated",
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
      index: true,
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
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    reminderBeforeMinutes: {
      type: Number,
      default: 15,
    },
    reminderSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    totalCallsMade: {
      type: Number,
      default: 0,
    },
    lastCallOutcome: {
      type: String,
      default: "",
    },
    lastCallAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    callRemarks: [callRemarkSchema],
    timeline: [timelineEventSchema],
  },
  {
    timestamps: true,
    collection: "callback_requests",
  }
);

// Indexes for fast searching and report querying
callbackRequestSchema.index({ status: 1, nextCallbackDate: 1 });
callbackRequestSchema.index({ assignedTo: 1, status: 1 });
callbackRequestSchema.index({ customerPhone: 1 });
callbackRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("CallbackRequest", callbackRequestSchema);
