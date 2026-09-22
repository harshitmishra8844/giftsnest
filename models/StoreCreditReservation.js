const mongoose = require("mongoose");

const storeCreditReservationSchema = new mongoose.Schema(
  {
    reservationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Reserved amount must be greater than 0"],
    },
    status: {
      type: String,
      enum: ["RESERVED", "COMMITTED", "RELEASED", "EXPIRED"],
      default: "RESERVED",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true, // Used for auto-cleanup of stale reservations (e.g. 15-minute checkout TTL)
    },
    committedAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    releaseReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

storeCreditReservationSchema.index({ userId: 1, status: 1 });
storeCreditReservationSchema.index({ expiresAt: 1, status: 1 });

module.exports = mongoose.model("StoreCreditReservation", storeCreditReservationSchema);
