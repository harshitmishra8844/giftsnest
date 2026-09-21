const mongoose = require("mongoose");

const slaPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "All",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical", "All"],
      default: "All",
    },
    firstResponseMinutes: {
      type: Number,
      required: true,
      default: 60, // 1 hour
    },
    resolutionMinutes: {
      type: Number,
      required: true,
      default: 1440, // 24 hours
    },
    autoEscalate: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SlaPolicy", slaPolicySchema);
