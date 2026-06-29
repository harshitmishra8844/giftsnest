const mongoose = require("mongoose");

const cmsContentSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    draftContent: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    publishedContent: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    seo: {
      title: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      keywords: { type: String, trim: true, default: "" },
      canonical: { type: String, trim: true, default: "" },
      ogImage: { type: String, trim: true, default: "" },
      ogTitle: { type: String, trim: true, default: "" },
      ogDescription: { type: String, trim: true, default: "" },
      schemaJson: { type: String, trim: true, default: "" },
    },
    draftSeo: {
      title: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      keywords: { type: String, trim: true, default: "" },
      canonical: { type: String, trim: true, default: "" },
      ogImage: { type: String, trim: true, default: "" },
      ogTitle: { type: String, trim: true, default: "" },
      ogDescription: { type: String, trim: true, default: "" },
      schemaJson: { type: String, trim: true, default: "" },
    },
    hasDraftChanges: {
      type: Boolean,
      default: false,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastUpdatedByName: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CmsContent", cmsContentSchema);
