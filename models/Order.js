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
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
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
      line2: { type: String, trim: true, default: "" },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Order Confirmed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "FAILED_PAYMENT",
        "CUSTOMER_CANCELLED",
      ],
      default: "Pending",
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: ["Online", "COD", "Store Credit", "Store Credit + Online"],
      default: "Online",
    },
    storeCreditAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    onlinePaymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    storeCreditReservationId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    storeCreditStatus: {
      type: String,
      enum: ["NONE", "RESERVED", "COMMITTED", "RELEASED", "REFUNDED"],
      default: "NONE",
      index: true,
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
    refundStatus: {
      type: String,
      enum: [
        "NONE",
        "PENDING_REFUND_REVIEW",
        "REFUND_APPROVED",
        "REFUND_PROCESSING",
        "REFUNDED",
        "REJECTED",
        "None",
        "Pending",
        "Processing",
        "Completed",
        "Failed",
      ],
      default: "NONE",
      index: true,
    },
    refundDetails: {
      refundId: { type: String, default: "" },
      paymentId: { type: String, default: "" },
      gatewayRefundId: { type: String, default: "" },
      refundAmount: { type: Number, default: 0 },
      refundDate: { type: Date, default: null },
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      processedByName: { type: String, default: "" },
      processingTimeMs: { type: Number, default: 0 },
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
    orderStatus: {
      type: String,
      default: null,
      index: true,
    },
    cancelledBy: {
      type: String,
      enum: ["CUSTOMER", "ADMIN", "STAFF", null],
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },
    cancellationIpAddress: {
      type: String,
      default: "",
      trim: true,
    },
    paymentAttemptId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    failureReason: {
      type: String,
      default: "",
      trim: true,
    },
    failureTimestamp: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
