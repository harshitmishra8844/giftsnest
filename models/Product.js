const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const productSpecSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    slug: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    highlights: {
      type: [String],
      default: [],
    },
    specifications: {
      type: [productSpecSchema],
      default: [],
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    stock: {
      type: Number,
      default: 1,
      min: 0,
    },
    customisable: {
      type: Boolean,
      default: true,
    },
    isPersonalized: {
      type: Boolean,
      default: false,
    },
    codEnabled: {
      type: Boolean,
      default: true,
    },
    personalizationTextLabel: {
      type: String,
      default: "",
      trim: true,
    },
    personalizationTextLimit: {
      type: Number,
      default: 20,
    },
    personalizationImageRequired: {
      type: Boolean,
      default: false,
    },
    personalizationImageLabel: {
      type: String,
      default: "",
      trim: true,
    },
    personalizationInputTypes: {
      type: [String],
      default: ["Text"],
    },
    sku: {
      type: String,
      default: "",
      trim: true,
    },
    brand: {
      type: String,
      default: "Niyora Gifts",
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    productType: {
      type: String,
      default: "",
      trim: true,
    },
    originalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    gst: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    returnShipping: {
      type: String,
      default: "Customer Pays",
      trim: true,
    },
    replacementShipping: {
      type: String,
      default: "Customer Pays",
      trim: true,
    },
    lowStockAlert: {
      type: Number,
      default: 5,
      min: 0,
    },
    stockStatus: {
      type: String,
      default: "In Stock",
      trim: true,
    },
    outOfStockNotification: {
      type: Boolean,
      default: false,
    },
    weight: {
      type: String,
      default: "",
      trim: true,
    },
    length: {
      type: String,
      default: "",
      trim: true,
    },
    width: {
      type: String,
      default: "",
      trim: true,
    },
    height: {
      type: String,
      default: "",
      trim: true,
    },
    deliveryTime: {
      type: String,
      default: "",
      trim: true,
    },
    returnAvailable: {
      type: Boolean,
      default: false,
    },
    replacementAvailable: {
      type: Boolean,
      default: false,
    },
    returnWindow: {
      type: String,
      default: "No Return",
      trim: true,
    },
    replacementWindow: {
      type: String,
      default: "No Replacement",
      trim: true,
    },
    returnConditions: {
      type: [String],
      default: [],
    },
    replacementConditions: {
      type: [String],
      default: [],
    },
    nonReturnableConditions: {
      type: [String],
      default: [],
    },
    returnInstructions: {
      type: String,
      default: "",
      trim: true,
    },
    replacementInstructions: {
      type: String,
      default: "",
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
