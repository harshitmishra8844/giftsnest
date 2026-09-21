const mongoose = require("mongoose");

const ticketCounterSchema = new mongoose.Schema(
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
 * Generate sequential formatted ticket code: NG-TKT-YYYY-000001
 */
ticketCounterSchema.statics.getNextTicketCode = async function () {
  const currentYear = new Date().getFullYear();
  const counter = await this.findOneAndUpdate(
    { year: currentYear },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(6, "0");
  return `NG-TKT-${currentYear}-${paddedSeq}`;
};

module.exports = mongoose.model("TicketCounter", ticketCounterSchema);
