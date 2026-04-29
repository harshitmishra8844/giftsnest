const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    products: [
      {
        productId: {
          type: String,
          required: true,
          trim: true,
        },
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
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        image: {
          type: String,
          default: "",
        },
        customization: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    address: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      line1: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
    },
    status: {
      type: String,
      enum: ["Pending", "Order Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    trackingId: {
      type: String,
      default: "",
      trim: true,
    },
    trackingCarrier: {
      type: String,
      enum: ["generic", "delhivery", "bluedart", "xpressbees"],
      default: "generic",
      lowercase: true,
      trim: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    razorpayOrderId: {
      type: String,
      default: "",
    },
    razorpayPaymentId: {
      type: String,
      default: "",
    },
    cancellationRequest: {
      status: {
        type: String,
        enum: ["None", "Pending", "Approved", "Rejected"],
        default: "None",
      },
      reason: {
        type: String,
        default: "",
        trim: true,
        maxlength: 400,
      },
      details: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      adminNote: {
        type: String,
        default: "",
        trim: true,
        maxlength: 800,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
