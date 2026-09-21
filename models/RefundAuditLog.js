const mongoose = require("mongoose");

const refundAuditLogSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    role: {
      type: String,
      default: "Customer Support Agent",
      trim: true,
    },
    actionPerformed: {
      type: String,
      required: true,
      index: true,
    },
    refundId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
    },
    device: {
      type: String,
      default: "Desktop / Browser",
    },
    userAgent: {
      type: String,
      default: "",
    },
    details: {
      type: String,
      default: "",
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

// Prevent updating or deleting audit logs (immutable security requirement)
refundAuditLogSchema.pre("updateOne", function () {
  throw new Error("Refund audit logs are immutable and cannot be updated.");
});
refundAuditLogSchema.pre("updateMany", function () {
  throw new Error("Refund audit logs are immutable and cannot be updated.");
});
refundAuditLogSchema.pre("findOneAndUpdate", function () {
  throw new Error("Refund audit logs are immutable and cannot be updated.");
});
refundAuditLogSchema.pre("deleteOne", function () {
  throw new Error("Refund audit logs are immutable and cannot be deleted.");
});
refundAuditLogSchema.pre("deleteMany", function () {
  throw new Error("Refund audit logs are immutable and cannot be deleted.");
});
refundAuditLogSchema.pre("findOneAndDelete", function () {
  throw new Error("Refund audit logs are immutable and cannot be deleted.");
});

module.exports = mongoose.model("RefundAuditLog", refundAuditLogSchema);
