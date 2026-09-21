const mongoose = require("mongoose");

const ticketMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: [true, "Ticket ID is required"],
      index: true,
    },
    ticketCode: {
      type: String,
      required: [true, "Ticket code is required"],
      trim: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    senderName: {
      type: String,
      required: [true, "Sender name is required"],
      trim: true,
    },
    senderRole: {
      type: String,
      default: "Customer",
      trim: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    message: {
      type: String,
      required: [true, "Message content cannot be empty"],
      trim: true,
    },
    attachments: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        fileType: { type: String, trim: true },
        size: { type: Number, default: 0 },
      },
    ],
    isInternalNote: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "ticket_messages",
  }
);

ticketMessageSchema.index({ ticketId: 1, createdAt: 1 });
ticketMessageSchema.index({ ticketCode: 1, createdAt: 1 });
ticketMessageSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model("TicketMessage", ticketMessageSchema);
