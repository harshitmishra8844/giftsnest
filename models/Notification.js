const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "customer", "staff", "all"],
      default: "admin",
      index: true,
    },
    category: {
      type: String,
      enum: ["ORDER", "PAYMENT", "CUSTOMER", "SUPPORT", "RETURN", "SYSTEM", "CALLBACK"],
      default: "SYSTEM",
      index: true,
    },
    event: {
      type: String,
      default: "",
      trim: true,
      index: true,
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
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical", "Urgent"],
      default: "Medium",
      index: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Backward compatibility with legacy fields
    type: {
      type: String,
      default: "Information",
    },
    status: {
      type: String,
      enum: ["Sent", "Delivered", "Read"],
      default: "Sent",
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Sync recipient, userId, and read status
notificationSchema.pre("save", function () {
  if (!this.userId && this.recipient) {
    this.userId = this.recipient;
  } else if (!this.recipient && this.userId) {
    this.recipient = this.userId;
  }

  if (this.isRead && this.status !== "Read") {
    this.status = "Read";
    if (!this.readAt) this.readAt = new Date();
  } else if (this.status === "Read" && !this.isRead) {
    this.isRead = true;
    if (!this.readAt) this.readAt = new Date();
  }
});

notificationSchema.index({ role: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
