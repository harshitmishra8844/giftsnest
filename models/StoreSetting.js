const mongoose = require("mongoose");

const storeSettingSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "store",
      unique: true,
      trim: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storePhone: {
      type: String,
      required: true,
      trim: true,
    },
    storeAddress: {
      type: String,
      required: true,
      trim: true,
    },
    storeLogoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    codEnabled: {
      type: Boolean,
      default: true,
    },

    specialOffer: {
      title: { type: String, trim: true, maxlength: 90 },
      subtitle: { type: String, trim: true, maxlength: 180 },
      eventName: { type: String, trim: true, maxlength: 40 },
      code: { type: String, trim: true, maxlength: 30 },
      ctaText: { type: String, trim: true, maxlength: 30 },
      startDate: { type: Date },
      endDate: { type: Date },
      active: { type: Boolean, default: false },
    },
    offers: [
      {
        title: { type: String, trim: true, maxlength: 90 },
        subtitle: { type: String, trim: true, maxlength: 180 },
        code: { type: String, trim: true, maxlength: 30 },
        ctaText: { type: String, trim: true, maxlength: 30 },
        active: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoreSetting", storeSettingSchema);
