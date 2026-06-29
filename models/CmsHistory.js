const mongoose = require("mongoose");

const cmsHistorySchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      trim: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminName: {
      type: String,
      required: true,
      trim: true,
    },
    previousContent: {
      type: mongoose.Schema.Types.Mixed,
    },
    newContent: {
      type: mongoose.Schema.Types.Mixed,
    },
    previousSeo: {
      type: mongoose.Schema.Types.Mixed,
    },
    newSeo: {
      type: mongoose.Schema.Types.Mixed,
    },
    action: {
      type: String, // 'save_draft', 'publish', 'revert'
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CmsHistory", cmsHistorySchema);
