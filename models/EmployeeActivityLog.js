const mongoose = require("mongoose");

const employeeActivityLogSchema = new mongoose.Schema(
  {
    employeeId: {
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
    role: {
      type: String,
      default: "Staff",
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["Ticket", "Callback", "Return", "Refund", "Order", "Customer", "Product", "Auth", "System", "StoreCredit"],
      default: "System",
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetCode: {
      type: String,
      default: "",
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    details: {
      type: String,
      default: "",
      trim: true,
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
  {
    timestamps: false,
    collection: "employee_activity_logs",
  }
);

employeeActivityLogSchema.index({ employeeId: 1, timestamp: -1 });
employeeActivityLogSchema.index({ action: 1, timestamp: -1 });
employeeActivityLogSchema.index({ targetType: 1, timestamp: -1 });

module.exports = mongoose.model("EmployeeActivityLog", employeeActivityLogSchema);
