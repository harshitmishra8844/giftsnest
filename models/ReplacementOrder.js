const mongoose = require("mongoose");

const replacementOrderSchema = new mongoose.Schema(
  {
    replacementId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReturnRequest",
      required: true,
      unique: true, // Prevents duplicate replacement orders for the same request
    },
    originalOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    originalOrderItemId: {
      type: String,
      default: "",
      trim: true,
    },
    replacementOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    replacementStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Confirmed",
    },
  },
  { timestamps: true }
);

// Indexes
replacementOrderSchema.index({ originalOrderId: 1 });
replacementOrderSchema.index({ replacementOrderId: 1 });

module.exports = mongoose.model("ReplacementOrder", replacementOrderSchema);
