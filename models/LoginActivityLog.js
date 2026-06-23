const mongoose = require("mongoose");

const loginActivityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    loginTime: {
      type: Date,
      default: Date.now,
    },
    logoutTime: {
      type: Date,
      default: null,
    },
    browser: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    device: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    ipAddress: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    status: {
      type: String,
      enum: ["Success", "Failed", "Logged Out", "Session Expired"],
      default: "Success",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoginActivityLog", loginActivityLogSchema);
