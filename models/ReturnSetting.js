const mongoose = require("mongoose");

const returnSettingSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "settings",
      unique: true,
      trim: true,
    },
    returnWindowDays: {
      type: Number,
      default: 7,
      required: true,
    },
    returnPolicyText: {
      type: String,
      default: "Returns must be requested within 7 days of delivery with original packaging and product photos.",
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReturnSetting", returnSettingSchema);
