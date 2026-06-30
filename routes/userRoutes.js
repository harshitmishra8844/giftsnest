const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

// Get user addresses
router.get("/addresses", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("addresses");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user.addresses || []);
  } catch (error) {
    console.error("Get addresses error:", error.message);
    return res.status(500).json({ message: "Failed to fetch addresses" });
  }
});

// Add new address
router.post("/addresses", protect, async (req, res) => {
  try {
    const { label, fullName, phone, line1, city, state, postalCode, country, isDefault } = req.body;

    if (!label || !fullName || !phone || !line1 || !city || !state || !postalCode) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    const newAddress = {
      label: label.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      line1: line1.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country || "India",
      isDefault: Boolean(isDefault),
    };

    user.addresses.push(newAddress);
    await user.save();

    return res.status(201).json({
      message: "Address added successfully",
      address: newAddress
    });
  } catch (error) {
    console.error("Add address error:", error.message);
    return res.status(500).json({ message: "Failed to add address" });
  }
});

// Update address
router.put("/addresses/:addressId", protect, async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, fullName, phone, line1, city, state, postalCode, country, isDefault } = req.body;

    if (!label || !fullName || !phone || !line1 || !city || !state || !postalCode) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ message: "Address not found" });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    const address = user.addresses[addressIndex];
    address.label = label.trim();
    address.fullName = fullName.trim();
    address.phone = phone.trim();
    address.line1 = line1.trim();
    address.city = city.trim();
    address.state = state.trim();
    address.postalCode = postalCode.trim();
    address.country = country || "India";
    address.isDefault = Boolean(isDefault);

    await user.save();

    return res.status(200).json({
      message: "Address updated successfully",
      address: user.addresses[addressIndex]
    });
  } catch (error) {
    console.error("Update address error:", error.message);
    return res.status(500).json({ message: "Failed to update address" });
  }
});

// Delete address
router.delete("/addresses/:addressId", protect, async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ message: "Address not found" });
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    return res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Delete address error:", error.message);
    return res.status(500).json({ message: "Failed to delete address" });
  }
});

// Set default address
router.patch("/addresses/:addressId/default", protect, async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Unset all defaults
    user.addresses.forEach(addr => addr.isDefault = false);

    // Set the specified address as default
    const address = user.addresses.find(addr => addr._id.toString() === addressId);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    address.isDefault = true;
    await user.save();

    return res.status(200).json({ message: "Default address updated successfully" });
  } catch (error) {
    console.error("Set default address error:", error.message);
    return res.status(500).json({ message: "Failed to set default address" });
  }
});

// Update user profile settings
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, email, password, newPassword, mobileNumber } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) {
        return res.status(400).json({ message: "Email is already in use" });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) {
      user.name = name.trim();
    }

    if (mobileNumber !== undefined) {
      user.mobileNumber = mobileNumber.trim();
    }

    if (password && newPassword) {
      const bcrypt = require("bcryptjs");
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    const { generateToken } = require("../controllers/authController");

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber || "",
      isAdmin: Boolean(user.isAdmin),
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    return res.status(500).json({ message: "Failed to update profile settings" });
  }
});

// Get user cart
router.get("/cart", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("cart.product");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user.cart || []);
  } catch (error) {
    console.error("Get cart error:", error.message);
    return res.status(500).json({ message: "Failed to fetch cart" });
  }
});

// Sync user cart
router.put("/cart", protect, async (req, res) => {
  try {
    const { cartItems } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.cart = cartItems.map((item) => ({
      product: item.product,
      quantity: item.quantity || 1,
      customization: item.customization || {},
    }));

    await user.save();
    return res.status(200).json({ message: "Cart synced successfully", cart: user.cart });
  } catch (error) {
    console.error("Sync cart error:", error.message);
    return res.status(500).json({ message: "Failed to sync cart" });
  }
});

// Log client activity timeline events
router.post("/activity", protect, async (req, res) => {
  try {
    const { action, details } = req.body;
    if (!action) {
      return res.status(400).json({ message: "Action is required" });
    }

    const { logActivity } = require("../services/logService");
    await logActivity(req.user._id, req.user.name, action, details || "", req);

    return res.status(201).json({ message: "Activity logged successfully" });
  } catch (error) {
    console.error("Log user activity error:", error.message);
    return res.status(500).json({ message: "Failed to record activity" });
  }
});

// Get notifications for logged-in user
router.get("/notifications", protect, async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Get user notifications error:", error.message);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.put("/notifications/:id/read", protect, async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { status: "Read" } },
      { new: true }
    );
    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json(notif);
  } catch (error) {
    console.error("Mark notification read error:", error.message);
    return res.status(500).json({ message: "Failed to update notification" });
  }
});

// Get coupons for logged-in user (both assigned and public)
router.get("/coupons", protect, async (req, res) => {
  try {
    const CouponAssignment = require("../models/CouponAssignment");
    const Coupon = require("../models/Coupon");

    // 1. Get assigned coupons
    const rawAssignments = await CouponAssignment.find({ userId: req.user._id })
      .populate("couponId")
      .sort({ createdAt: -1 })
      .lean();

    const activeAssignments = rawAssignments.filter((as) => {
      if (as.status !== "Unused") return false;
      const cp = as.couponId;
      if (!cp) return false;
      if (cp.active === false) return false;
      
      const now = new Date();
      if (cp.startDate) {
        const start = new Date(cp.startDate);
        if (!Number.isNaN(start.getTime()) && now < start) return false;
      }
      if (cp.endDate) {
        const end = new Date(cp.endDate);
        if (!Number.isNaN(end.getTime()) && now > end) return false;
      }
      return true;
    });

    // 2. Get active public coupons
    const now = new Date();
    const publicCoupons = await Coupon.find({ active: true, isSpecial: false })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out public coupons that have expired or not yet started
    const activePublic = publicCoupons.filter((c) => {
      const now = new Date();
      if (c.startDate) {
        const start = new Date(c.startDate);
        if (!Number.isNaN(start.getTime()) && now < start) return false;
      }
      if (c.endDate) {
        const end = new Date(c.endDate);
        if (!Number.isNaN(end.getTime()) && now > end) return false;
      }
      return true;
    });

    return res.status(200).json({
      assigned: activeAssignments,
      public: activePublic,
    });
  } catch (error) {
    console.error("Get user coupons error:", error.message);
    return res.status(500).json({ message: "Failed to fetch user coupons" });
  }
});

module.exports = router;