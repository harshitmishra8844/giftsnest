const mongoose = require("mongoose");

const customerAlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "low_activity",
        "inactive",
        "cod_abuse",
        "failed_payments",
        "large_purchase",
        "suspicious_activity",
        "vip_activity",
        "birthday",
        "anniversary",
        "custom",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Resolved", "Dismissed"],
      default: "Active",
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Low",
    },
    assignedRoles: [
      {
        type: String, // e.g. "Master Admin", "Marketing", "Sales", "Support"
      },
    ],
    notes: {
      type: String,
      default: "",
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerAlert", customerAlertSchema);
