const mongoose = require("mongoose");

const customerVerificationLogSchema = new mongoose.Schema(
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
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    verifiedByName: {
      type: String,
      required: true,
      trim: true,
    },
    verifiedByRole: {
      type: String,
      default: "Customer Support Agent",
      trim: true,
    },
    verificationMethod: {
      type: String,
      enum: [
        "Registered Mobile Number",
        "Registered Email",
        "Order Number",
        "OTP Verification",
        "Last Order Verification",
      ],
      required: true,
      index: true,
    },
    confirmationStatus: {
      type: String,
      enum: ["Confirmed", "Failed", "Pending"],
      default: "Confirmed",
      index: true,
    },
    notes: {
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
    verifiedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "customer_verification_logs",
  }
);

customerVerificationLogSchema.index({ customerId: 1, verifiedAt: -1 });
customerVerificationLogSchema.index({ verifiedBy: 1, verifiedAt: -1 });

module.exports = mongoose.model("CustomerVerificationLog", customerVerificationLogSchema);
