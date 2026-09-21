const mongoose = require("mongoose");

const supportNoteSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["Ticket", "Customer", "Callback", "Return", "Refund", "Order"],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetCode: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    authorRole: {
      type: String,
      default: "Staff",
      trim: true,
    },
    note: {
      type: String,
      required: [true, "Note text is required"],
      trim: true,
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "support_notes",
  }
);

supportNoteSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
supportNoteSchema.index({ customerId: 1, createdAt: -1 });
supportNoteSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model("SupportNote", supportNoteSchema);
