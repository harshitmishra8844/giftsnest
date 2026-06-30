const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    designation: {
      type: String,
      trim: true,
      default: "",
    },
    employeeId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    profileImage: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended", "Deleted", "Pending Verification"],
      default: "Active",
    },
    loginMethod: {
      type: String,
      enum: ["Email", "OTP"],
      default: "OTP",
    },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Verified"],
      default: "Verified",
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    suspension: {
      reason: { type: String, default: "" },
      suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      date: { type: Date, default: null },
      notes: { type: String, default: "" },
    },
    notes: [
      {
        text: { type: String, required: true },
        adminName: { type: String, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        customization: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    recentlyViewed: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastLogin: {
      type: Date,
      default: null,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    isMasterAdmin: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: "",
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    addresses: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
        fullName: {
          type: String,
          required: true,
          trim: true,
        },
        phone: {
          type: String,
          required: true,
          trim: true,
        },
        line1: {
          type: String,
          required: true,
          trim: true,
        },
        city: {
          type: String,
          required: true,
          trim: true,
        },
        state: {
          type: String,
          required: true,
          trim: true,
        },
        postalCode: {
          type: String,
          required: true,
          trim: true,
        },
        country: {
          type: String,
          default: "India",
          trim: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    birthday: {
      type: Date,
      default: null,
    },
    anniversary: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      trim: true,
      default: "",
    },
    age: {
      type: Number,
      default: null,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referralCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
