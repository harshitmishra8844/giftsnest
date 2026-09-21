const mongoose = require("mongoose");

const refundCounterSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/**
 * Generate sequential formatted refund code: REF-YYYY-000001
 * Example: REF-2026-000001
 */
refundCounterSchema.statics.getNextRefundCode = async function () {
  const currentYear = new Date().getFullYear();
  const counter = await this.findOneAndUpdate(
    { year: currentYear },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(6, "0");
  return `REF-${currentYear}-${paddedSeq}`;
};

module.exports = mongoose.model("RefundCounter", refundCounterSchema);
