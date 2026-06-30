const mongoose = require("mongoose");

const customerSegmentSchema = new mongoose.Schema(
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
      trim: true,
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isDynamic: {
      type: Boolean,
      default: true,
    },
    memberCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerSegment", customerSegmentSchema);
