const mongoose = require("mongoose");
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const Product = require("../models/Product");

const calculateSubtotal = (products = []) =>
  products.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

const generateOrderCode = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${y}${m}${d}-${randomPart}`;
};

const getCouponSummary = async (couponCode, subtotal, userId = null) => {
  const code = String(couponCode || "").trim().toUpperCase();
  if (!code) {
    return {
      valid: true,
      code: "",
      discountAmount: 0,
      finalTotal: subtotal,
      message: "No coupon applied",
      couponEndDate: null,
    };
  }

  const coupon = await Coupon.findOne({ code, active: true });
  if (!coupon) {
    return { valid: false, code, discountAmount: 0, finalTotal: subtotal, message: "Invalid coupon code" };
  }

  if (coupon.endDate) {
    const end = new Date(coupon.endDate);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      if (new Date() > end) {
        return {
          valid: false,
          code,
          discountAmount: 0,
          finalTotal: subtotal,
          message: "This coupon has expired",
        };
      }
    }
  }

  if (subtotal < Number(coupon.minCartValue || 0)) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      finalTotal: subtotal,
      message: `Minimum cart value INR ${coupon.minCartValue} required for ${code}`,
    };
  }

  const maxGlobal = coupon.maxRedemptions != null ? Number(coupon.maxRedemptions) : null;
  const maxPerUser = coupon.maxRedemptionsPerUser != null ? Number(coupon.maxRedemptionsPerUser) : null;
  if (Number.isFinite(maxGlobal) && maxGlobal > 0) {
    const used = await Order.countDocuments({ couponCode: code, paymentStatus: "Paid" });
    if (used >= maxGlobal) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalTotal: subtotal,
        message: "This coupon is no longer available (usage limit reached)",
      };
    }
  }
  if (Number.isFinite(maxPerUser) && maxPerUser > 0) {
    if (!userId) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalTotal: subtotal,
        message: "Please log in to use this coupon",
      };
    }
    const userUses = await Order.countDocuments({ couponCode: code, userId, paymentStatus: "Paid" });
    if (userUses >= maxPerUser) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalTotal: subtotal,
        message: "You have already used this coupon the maximum number of times",
      };
    }
  }

  let discountAmount = 0;
  if (coupon.type === "percent") {
    discountAmount = (subtotal * coupon.value) / 100;
    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  } else {
    discountAmount = coupon.value;
  }

  discountAmount = Math.min(discountAmount, subtotal);
  const finalTotal = Number((subtotal - discountAmount).toFixed(2));

  return {
    valid: true,
    code,
    discountAmount: Number(discountAmount.toFixed(2)),
    finalTotal,
    message: `${code} applied successfully`,
    couponEndDate: coupon.endDate ? new Date(coupon.endDate).toISOString() : null,
  };
};

const listActiveCouponsPublic = async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({ active: true }).sort({ createdAt: -1 }).lean();
    const active = coupons.filter((c) => {
      if (c.isSpecial) return false;
      if (!c.endDate) return true;
      const end = new Date(c.endDate);
      if (Number.isNaN(end.getTime())) return true;
      end.setHours(23, 59, 59, 999);
      return now <= end;
    });
    const payload = active.map((c) => ({
      code: c.code,
      type: c.type,
      value: c.value,
      minCartValue: Number(c.minCartValue || 0),
      maxDiscount: Number(c.maxDiscount || 0),
      endDate: c.endDate ? new Date(c.endDate).toISOString() : null,
    }));
    return res.status(200).json(payload);
  } catch (error) {
    console.error("List active coupons error:", error.message);
    return res.status(500).json({ message: "Failed to load coupons" });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { couponCode, products } = req.body;
    const userId = req.user?._id;
    const subtotal = calculateSubtotal(products);

    if (!Array.isArray(products) || products.length === 0 || subtotal <= 0) {
      return res.status(400).json({ message: "Products are required to apply coupon" });
    }

    const summary = await getCouponSummary(couponCode, subtotal, userId);
    if (!summary.valid) {
      return res.status(400).json(summary);
    }

    return res.status(200).json({
      ...summary,
      subtotal: Number(subtotal.toFixed(2)),
    });
  } catch (error) {
    console.error("Apply coupon error:", error.message);
    return res.status(500).json({ message: "Failed to apply coupon" });
  }
};

const createOrder = async (req, res) => {
  try {
    const { products, address, couponCode, paymentMethod = "Online" } = req.body;
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Login required to place order" });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "At least one product is required" });
    }

    if (!address || !address.fullName || !address.phone || !address.line1) {
      return res.status(400).json({ message: "Complete shipping address is required" });
    }

    const subtotal = calculateSubtotal(products);
    if (!subtotal || Number(subtotal) <= 0) {
      return res.status(400).json({ message: "Subtotal must be greater than zero" });
    }

    const couponSummary = await getCouponSummary(couponCode, subtotal, userId);
    if (!couponSummary.valid) {
      return res.status(400).json({ message: couponSummary.message });
    }

    for (const item of products) {
      const pid = item.productId || item._id;
      const pidStr = pid != null ? String(pid) : "";
      if (!pidStr || !mongoose.Types.ObjectId.isValid(pidStr)) {
        continue;
      }
      const prod = await Product.findById(pidStr).select("name stock");
      if (!prod) {
        return res.status(400).json({ message: "One or more products in your cart are no longer available." });
      }
      const qty = Math.max(1, Math.floor(Number(item.quantity || 1)));
      if (prod.stock < qty) {
        return res.status(400).json({
          message: `Insufficient stock for "${prod.name}". Available: ${prod.stock}, you have ${qty} in cart.`,
        });
      }
    }

    let order;
    let attempts = 0;
    while (!order && attempts < 5) {
      attempts += 1;
      try {
        order = await Order.create({
          orderCode: generateOrderCode(),
          userId,
          products: products.map((item) => ({
            productId: item.productId || item._id || "",
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity || 1),
            image: item.image || "",
            customization: item.customization || {},
          })),
          subtotal: Number(subtotal.toFixed(2)),
          discountAmount: couponSummary.discountAmount,
          couponCode: couponSummary.code,
          totalPrice: couponSummary.finalTotal,
          address,
          status: paymentMethod === "COD" ? "Order Confirmed" : "Pending",
          paymentMethod,
        });
      } catch (dbError) {
        // Retry only if orderCode uniqueness collides.
        if (dbError?.code !== 11000 || !dbError?.keyPattern?.orderCode) {
          throw dbError;
        }
      }
    }

    if (!order) {
      return res.status(500).json({ message: "Failed to generate a unique order ID" });
    }

    if (paymentMethod === "COD") {
      const { decrementStockForPaidOrder } = require("../services/inventoryService");
      const { sendOrderNotificationToAdmin } = require("../services/orderEmail");
      
      await decrementStockForPaidOrder(order);
      sendOrderNotificationToAdmin(order).catch((mailErr) => {
        console.error("[email] Failed to send admin order notification email for COD order:", mailErr);
      });
    }

    return res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error.message);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ archived: { $ne: true } }).sort({ createdAt: -1 });
    return res.status(200).json(orders);
  } catch (error) {
    console.error("Get orders error:", error.message);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};

const getArchivedOrders = async (req, res) => {
  try {
    const orders = await Order.find({ archived: true }).sort({ updatedAt: -1, createdAt: -1 });
    return res.status(200).json(orders);
  } catch (error) {
    console.error("Get archived orders error:", error.message);
    return res.status(500).json({ message: "Failed to fetch archived orders" });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(orders);
  } catch (error) {
    console.error("Get my orders error:", error.message);
    return res.status(500).json({ message: "Failed to fetch your orders" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Order status is required" });
    }

    const order = await Order.findByIdAndUpdate(id, { status }, { returnDocument: 'after', runValidators: true });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    console.error("Update order status error:", error.message);
    return res.status(500).json({ message: "Failed to update order status" });
  }
};

const updateTrackingId = async (req, res) => {
  try {
    const { id } = req.params;
    const trackingId = String(req.body?.trackingId || "").trim();
    const allowedCarriers = ["generic", "delhivery", "bluedart", "xpressbees"];
    const trackingCarrier = String(req.body?.trackingCarrier || "generic").toLowerCase().trim();
    if (!trackingId) {
      return res.status(400).json({ message: "Tracking ID is required" });
    }
    if (!allowedCarriers.includes(trackingCarrier)) {
      return res.status(400).json({ message: "Invalid tracking carrier" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!["Shipped", "Delivered"].includes(order.status)) {
      return res.status(400).json({ message: "Tracking ID can be set only for shipped or delivered orders" });
    }

    order.trackingId = trackingId;
    order.trackingCarrier = trackingCarrier;
    await order.save();
    return res.status(200).json({ message: "Tracking ID updated successfully", order });
  } catch (error) {
    console.error("Update tracking ID error:", error.message);
    return res.status(500).json({ message: "Failed to update tracking ID" });
  }
};

const requestOrderCancellation = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const reason = String(req.body?.reason || "").trim();
    const details = String(req.body?.details || "").trim();

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!reason) return res.status(400).json({ message: "Cancellation reason is required" });

    const order = await Order.findOne({ _id: id, userId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (["Shipped", "Delivered"].includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled after it is shipped." });
    }
    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Order is already cancelled." });
    }
    if (order.cancellationRequest?.status === "Pending") {
      return res.status(400).json({ message: "Cancellation request already submitted. Please wait for approval." });
    }
    if (order.cancellationRequest?.status === "Approved") {
      return res.status(400).json({ message: "Cancellation request already approved." });
    }

    order.cancellationRequest = {
      status: "Pending",
      reason,
      details,
      requestedAt: new Date(),
      reviewedAt: null,
      adminNote: "",
    };
    await order.save();

    return res.status(200).json({ message: "Cancellation request submitted.", order });
  } catch (error) {
    console.error("Request cancellation error:", error.message);
    return res.status(500).json({ message: "Failed to submit cancellation request" });
  }
};

const reviewOrderCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const action = String(req.body?.action || "").trim().toLowerCase();
    const adminNote = String(req.body?.adminNote || "").trim();

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be approve or reject" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Order is already cancelled." });
    }

    if (order.cancellationRequest?.status !== "Pending") {
      return res.status(400).json({ message: "No pending cancellation request for this order." });
    }

    const reviewedAt = new Date();

    if (action === "approve") {
      order.status = "Cancelled";
      order.cancellationRequest.status = "Approved";
      order.cancellationRequest.reviewedAt = reviewedAt;
      order.cancellationRequest.adminNote = adminNote;
      await order.save();
      return res.status(200).json({ message: "Cancellation approved and order cancelled.", order });
    }

    order.cancellationRequest.status = "Rejected";
    order.cancellationRequest.reviewedAt = reviewedAt;
    order.cancellationRequest.adminNote = adminNote;
    await order.save();
    return res.status(200).json({ message: "Cancellation request rejected.", order });
  } catch (error) {
    console.error("Review cancellation error:", error.message);
    return res.status(500).json({ message: "Failed to review cancellation request" });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "Cancelled") {
      return res.status(400).json({ message: "Only cancelled orders can be deleted" });
    }
    await Order.findByIdAndDelete(id);
    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error.message);
    return res.status(500).json({ message: "Failed to delete order" });
  }
};

const archiveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndUpdate(
      id,
      { archived: true },
      { returnDocument: 'after' }
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.status(200).json({ message: "Order archived successfully", order });
  } catch (error) {
    console.error("Archive order error:", error.message);
    return res.status(500).json({ message: "Failed to archive order" });
  }
};

const unarchiveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndUpdate(
      id,
      { archived: false },
      { returnDocument: 'after' }
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.status(200).json({ message: "Order restored successfully", order });
  } catch (error) {
    console.error("Unarchive order error:", error.message);
    return res.status(500).json({ message: "Failed to restore order" });
  }
};

const trackOrder = async (req, res) => {
  try {
    const { orderId, email } = req.body;

    if (!orderId || !email) {
      return res.status(400).json({ message: "Order ID and email are required" });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "No order found with this email address" });
    }

    // Find order by orderCode and userId
    const order = await Order.findOne({
      orderCode: orderId.trim().toUpperCase(),
      userId: user._id
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found. Please check your Order ID and email address." });
    }

    // Return order tracking information
    return res.status(200).json({
      order: {
        orderCode: order.orderCode,
        status: order.status,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        products: order.products,
        address: {
          fullName: order.address.fullName,
          city: order.address.city,
          state: order.address.state,
          postalCode: order.address.postalCode,
        },
        trackingId: order.trackingId,
        trackingCarrier: order.trackingCarrier,
      }
    });
  } catch (error) {
    console.error("Track order error:", error.message);
    return res.status(500).json({ message: "Failed to track order" });
  }
};

module.exports = {
  listActiveCouponsPublic,
  applyCoupon,
  createOrder,
  getMyOrders,
  getOrders,
  getArchivedOrders,
  updateOrderStatus,
  updateTrackingId,
  requestOrderCancellation,
  reviewOrderCancellation,
  deleteOrder,
  archiveOrder,
  unarchiveOrder,
  trackOrder,
};
