const mongoose = require("mongoose");

const storeCreditCounterSchema = new mongoose.Schema(
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
 * Generate sequential formatted Store Credit Transaction code: TXN-SC-YYYY-000001
 * Example: TXN-SC-2026-000001
 */
storeCreditCounterSchema.statics.getNextTransactionCode = async function () {
  const currentYear = new Date().getFullYear();
  const counter = await this.findOneAndUpdate(
    { year: currentYear },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(6, "0");
  return `TXN-SC-${currentYear}-${paddedSeq}`;
};

module.exports = mongoose.model("StoreCreditCounter", storeCreditCounterSchema);
