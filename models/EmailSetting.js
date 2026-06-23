const mongoose = require("mongoose");

const emailSettingSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "email",
      unique: true,
      trim: true,
    },
    adminEmails: {
      type: [String],
      default: ["niyoragifts@gmail.com"],
    },
    supportEmails: {
      type: [String],
      default: ["niyoragifts@gmail.com"],
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    // Customer email toggles
    customerOrderConfirmation: {
      type: Boolean,
      default: true,
    },
    customerOrderShipped: {
      type: Boolean,
      default: true,
    },
    customerOrderDelivered: {
      type: Boolean,
      default: true,
    },
    customerOrderCancelled: {
      type: Boolean,
      default: true,
    },
    customerReturnRequest: {
      type: Boolean,
      default: true,
    },
    customerReturnApproved: {
      type: Boolean,
      default: true,
    },
    // Admin email toggles
    adminNewOrderAlert: {
      type: Boolean,
      default: true,
    },
    adminCancelRequestAlert: {
      type: Boolean,
      default: true,
    },
    adminReturnRequestAlert: {
      type: Boolean,
      default: true,
    },
    // Support email toggles
    supportNewOrderAlert: {
      type: Boolean,
      default: true,
    },
    supportCancelRequestAlert: {
      type: Boolean,
      default: true,
    },
    supportReturnRequestAlert: {
      type: Boolean,
      default: true,
    },
    supportReturnApprovedAlert: {
      type: Boolean,
      default: true,
    },
    supportRefundProcessAlert: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailSetting", emailSettingSchema);
