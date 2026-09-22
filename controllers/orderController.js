const mongoose = require("mongoose");
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const Product = require("../models/Product");
const storeCreditService = require("../services/storeCreditService");
const { logActivity } = require("../services/logService");
const { validateAddress } = require("../utils/validation");
const {
  notifyOrderCreated,
  notifyOrderCancelled,
  notifyOrderShipped,
  notifyOrderDelivered,
  createAndDispatchNotification,
} = require("../services/notificationService");

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

  const getCurrentDayInIST = () => {
    const options = { timeZone: "Asia/Kolkata", weekday: "long" };
    return new Intl.DateTimeFormat("en-US", options).format(new Date());
  };

  const now = new Date();

  if (coupon.startDate) {
    const start = new Date(coupon.startDate);
    if (!Number.isNaN(start.getTime()) && now < start) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalTotal: subtotal,
        message: `This coupon will be active starting ${start.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}`,
      };
    }
  }

  if (coupon.endDate) {
    const end = new Date(coupon.endDate);
    if (!Number.isNaN(end.getTime()) && now > end) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalTotal: subtotal,
        message: "This coupon has expired",
      };
    }
  }

  if (Array.isArray(coupon.activeDays) && coupon.activeDays.length > 0) {
    const currentDay = getCurrentDayInIST();
    if (!coupon.activeDays.includes(currentDay)) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalTotal: subtotal,
        message: `This coupon is only valid on: ${coupon.activeDays.join(", ")}`,
      };
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
    const payload = active.map((c) => ({
      code: c.code,
      type: c.type,
      value: c.value,
      minCartValue: Number(c.minCartValue || 0),
      maxDiscount: Number(c.maxDiscount || 0),
      startDate: c.startDate ? new Date(c.startDate).toISOString() : null,
      endDate: c.endDate ? new Date(c.endDate).toISOString() : null,
      activeDays: c.activeDays || [],
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
    const {
      products,
      address,
      couponCode,
      paymentMethod: rawPaymentMethod = "Online",
      useStoreCredit = false,
    } = req.body;
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Login required to place order" });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(401).json({ message: "User account not found" });
    }
    if (currentUser.status === "Suspended") {
      return res.status(403).json({ message: "Your account is suspended. Please contact customer support." });
    }
    if (currentUser.status === "Deleted") {
      return res.status(403).json({ message: "Your account has been deactivated." });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "At least one product is required" });
    }

    // Comprehensive Address Validation
    const addressValidation = validateAddress(address);
    if (!addressValidation.isValid) {
      const firstError = Object.values(addressValidation.errors)[0] || "Please provide complete and valid shipping address details.";
      return res.status(400).json({
        message: firstError,
        errors: addressValidation.errors,
      });
    }
    const sanitizedOrderAddress = addressValidation.sanitizedAddress;

    const productIds = products
      .map((item) => item.productId || item._id)
      .filter((pid) => pid != null && mongoose.Types.ObjectId.isValid(String(pid)));

    if (productIds.length !== products.length) {
      return res.status(400).json({ message: "One or more products in your cart are invalid." });
    }

    const dbProducts = await Product.find({ _id: { $in: productIds } }).select("name price stock codEnabled images");
    const productMap = new Map(dbProducts.map((p) => [String(p._id), p]));

    if (rawPaymentMethod === "COD") {
      const StoreSetting = require("../models/StoreSetting");
      const dbStoreInfo = await StoreSetting.findOne({ singletonKey: "store" });
      const isCodGloballyEnabled = dbStoreInfo?.codEnabled !== false;
      if (!isCodGloballyEnabled) {
        return res.status(400).json({ message: "Cash on Delivery (COD) is currently disabled for this store." });
      }

      for (const item of products) {
        const pid = item.productId || item._id;
        const pidStr = pid != null ? String(pid) : "";
        const prod = productMap.get(pidStr);
        if (prod && prod.codEnabled === false) {
          return res.status(400).json({ message: `Cash on Delivery (COD) is not available for product "${item.name}".` });
        }
      }
    }

    // Verify stock and compute subtotal strictly from authoritative DB prices
    let serverSubtotal = 0;
    const verifiedProducts = [];

    for (const item of products) {
      const pidStr = String(item.productId || item._id || "");
      const prod = productMap.get(pidStr);
      if (!prod) {
        return res.status(400).json({ message: `Product "${item.name || pidStr}" is no longer available.` });
      }
      const qty = Math.max(1, Math.floor(Number(item.quantity || 1)));
      if (prod.stock < qty) {
        return res.status(400).json({
          message: `Insufficient stock for "${prod.name}". Available: ${prod.stock}, you have ${qty} in cart.`,
        });
      }

      const authoritativePrice = Number(prod.price);
      serverSubtotal += authoritativePrice * qty;

      verifiedProducts.push({
        productId: String(prod._id),
        name: prod.name,
        price: authoritativePrice,
        quantity: qty,
        image: item.image || (prod.images && prod.images[0] ? prod.images[0].url : ""),
        customization: item.customization || {},
      });
    }

    if (serverSubtotal <= 0) {
      return res.status(400).json({ message: "Order subtotal must be greater than zero" });
    }

    // Recalculate coupon summary based on server-verified subtotal
    const couponSummary = await getCouponSummary(couponCode, serverSubtotal, userId);
    if (!couponSummary.valid) {
      return res.status(400).json({ message: couponSummary.message });
    }

    // Store Credit Calculation & Reservation Logic
    let finalPaymentMethod = rawPaymentMethod;
    let storeCreditAmount = 0;
    let onlinePaymentAmount = couponSummary.finalTotal;
    let storeCreditReservationId = "";
    let storeCreditStatus = "NONE";
    let initialStatus = finalPaymentMethod === "COD" ? "Order Confirmed" : "Pending";
    let initialOrderStatus = finalPaymentMethod === "COD" ? "CONFIRMED" : "PAYMENT_PENDING";
    let initialPaymentStatus = finalPaymentMethod === "COD" ? "Pending" : "Pending";

    if (useStoreCredit) {
      const balanceInfo = await storeCreditService.getAccountBalance(userId);
      const availableCredit = balanceInfo.status === "Active" ? Math.max(0, balanceInfo.balance) : 0;

      if (availableCredit > 0) {
        const appliedCredit = Math.min(availableCredit, couponSummary.finalTotal);
        const remainingOnline = Number((couponSummary.finalTotal - appliedCredit).toFixed(2));

        if (remainingOnline === 0) {
          // Scenario A: 100% Store Credit Payment
          finalPaymentMethod = "Store Credit";
          storeCreditAmount = appliedCredit;
          onlinePaymentAmount = 0;
          initialStatus = "Order Confirmed";
          initialOrderStatus = "CONFIRMED";
          initialPaymentStatus = "Paid";
        } else {
          // Scenario B: Split Payment (Store Credit + Online)
          finalPaymentMethod = "Store Credit + Online";
          storeCreditAmount = appliedCredit;
          onlinePaymentAmount = remainingOnline;
          const reservation = await storeCreditService.reserveCredit({
            userId,
            amount: appliedCredit,
            ttlMinutes: 15,
            req,
          });
          storeCreditReservationId = reservation.reservationId;
          storeCreditStatus = "RESERVED";
          initialStatus = "Pending";
          initialOrderStatus = "PAYMENT_PENDING";
          initialPaymentStatus = "Pending";
        }
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
          email: req.user?.email || currentUser.email || "",
          products: verifiedProducts,
          subtotal: Number(serverSubtotal.toFixed(2)),
          discountAmount: couponSummary.discountAmount,
          couponCode: couponSummary.code,
          totalPrice: couponSummary.finalTotal,
          address: sanitizedOrderAddress,
          status: initialStatus,
          orderStatus: initialOrderStatus,
          paymentStatus: initialPaymentStatus,
          paymentMethod: finalPaymentMethod,
          storeCreditAmount,
          onlinePaymentAmount,
          storeCreditReservationId,
          storeCreditStatus,
        });
      } catch (dbError) {
        // Retry only if orderCode uniqueness collides.
        if (dbError?.code !== 11000 || !dbError?.keyPattern?.orderCode) {
          throw dbError;
        }
      }
    }

    if (!order) {
      if (storeCreditReservationId) {
        await storeCreditService.releaseReservation({
          reservationId: storeCreditReservationId,
          reason: "Order generation collision failure",
          req,
        }).catch(() => {});
      }
      return res.status(500).json({ message: "Failed to generate a unique order ID" });
    }

    if (finalPaymentMethod === "Store Credit") {
      const { decrementStockForPaidOrder } = require("../services/inventoryService");
      const { sendCustomerOrderConfirmation, sendAdminNewOrderAlert, sendSupportNotification } = require("../services/emailService");

      await storeCreditService.deductCreditDirect({
        userId,
        amount: storeCreditAmount,
        referenceType: "ORDER",
        referenceId: order.orderCode,
        orderId: order._id,
        description: `100% Store Credit Payment for Order #${order.orderCode}`,
        performedBy: userId,
        performedByName: req.user?.name || "Customer",
        performedByRole: "Customer",
        req,
      });

      order.storeCreditStatus = "COMMITTED";
      await order.save();

      await decrementStockForPaidOrder(order);
      notifyOrderCreated(order).catch((err) => console.error("[notif] notifyOrderCreated failed:", err));
      sendCustomerOrderConfirmation(order).catch((mailErr) => {
        console.error("[email] Failed to send customer order confirmation email for Store Credit order:", mailErr);
      });
      sendAdminNewOrderAlert(order).catch((mailErr) => {
        console.error("[email] Failed to send admin new order alert for Store Credit order:", mailErr);
      });
      sendSupportNotification("New Order", order).catch((mailErr) => {
        console.error("[email] Failed to send support new order notification for Store Credit order:", mailErr);
      });
    } else if (finalPaymentMethod === "COD") {
      const { decrementStockForPaidOrder } = require("../services/inventoryService");
      const { sendCustomerOrderConfirmation, sendAdminNewOrderAlert, sendSupportNotification } = require("../services/emailService");
      
      await decrementStockForPaidOrder(order);
      notifyOrderCreated(order).catch((err) => console.error("[notif] notifyOrderCreated failed:", err));
      sendCustomerOrderConfirmation(order).catch((mailErr) => {
        console.error("[email] Failed to send customer order confirmation email for COD order:", mailErr);
      });
      sendAdminNewOrderAlert(order).catch((mailErr) => {
        console.error("[email] Failed to send admin new order alert for COD order:", mailErr);
      });
      sendSupportNotification("New Order", order).catch((mailErr) => {
        console.error("[email] Failed to send support new order notification for COD order:", mailErr);
      });
    } else {
      // Pending online payment order notification
      createAndDispatchNotification({
        recipient: null,
        role: "admin",
        category: "ORDER",
        event: "PENDING_ORDER",
        priority: order.totalPrice >= 5000 ? "Urgent" : "Low",
        title: `Pending Payment Order: #${order.orderCode}`,
        message: `Order #${order.orderCode} placed (₹${order.totalPrice}${storeCreditAmount > 0 ? `, ₹${storeCreditAmount} Credit, ₹${onlinePaymentAmount} Online` : ""}) awaiting online payment confirmation.`,
        link: `/orders?search=${order.orderCode}`,
        metadata: { orderId: order._id, orderCode: order.orderCode, amount: order.totalPrice },
      }).catch((err) => console.error("[notif] PENDING_ORDER error:", err));
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

    const previousOrder = await Order.findById(id);
    if (!previousOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Anti-fraud: prevent moving FAILED_PAYMENT orders into active fulfillment without verified payment
    if (
      previousOrder.status === "FAILED_PAYMENT" &&
      ["Order Confirmed", "Processing", "Shipped", "Delivered"].includes(status) &&
      previousOrder.paymentStatus !== "Paid"
    ) {
      return res.status(400).json({
        message: "Cannot move a failed payment order to active fulfillment without verified payment.",
      });
    }

    const updateFields = { status };
    if (status === "Cancelled") {
      updateFields.orderStatus = "CANCELLED";
      if (!previousOrder.cancelledBy) updateFields.cancelledBy = "ADMIN";
      if (!previousOrder.cancelledAt) updateFields.cancelledAt = new Date();
    } else if (status === "CUSTOMER_CANCELLED") {
      updateFields.orderStatus = "CUSTOMER_CANCELLED";
      if (!previousOrder.cancelledBy) updateFields.cancelledBy = "CUSTOMER";
      if (!previousOrder.cancelledAt) updateFields.cancelledAt = new Date();
    } else if (status === "Order Confirmed") {
      updateFields.orderStatus = "CONFIRMED";
    } else if (status === "Processing") {
      updateFields.orderStatus = "PROCESSING";
    } else if (status === "Shipped") {
      updateFields.orderStatus = "SHIPPED";
    } else if (status === "Delivered") {
      updateFields.orderStatus = "DELIVERED";
    }

    const order = await Order.findByIdAndUpdate(id, updateFields, { returnDocument: 'after', runValidators: true });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if ((status === "Cancelled" || status === "CUSTOMER_CANCELLED") && previousOrder.status !== "Cancelled" && previousOrder.status !== "CUSTOMER_CANCELLED") {
      const { incrementStockForCancelledOrder } = require("../services/inventoryService");
      const { sendCustomerOrderCancelled, sendSupportNotification } = require("../services/emailService");
      
      if (previousOrder.paymentMethod === "COD" || previousOrder.paymentStatus === "Paid") {
        await incrementStockForCancelledOrder(order);
      }
      notifyOrderCancelled(order, "Updated by administrator").catch((err) => console.error("[notif] Cancelled error:", err));
      sendCustomerOrderCancelled(order, "Updated by administrator").catch((mailErr) => {
        console.error("[email] Failed to send cancellation email to customer:", mailErr);
      });
      sendSupportNotification("Cancellation Request", order).catch((mailErr) => {
        console.error("[email] Failed to send support cancellation alert:", mailErr);
      });
    } else if (status === "Shipped" && previousOrder.status !== "Shipped") {
      const { sendCustomerOrderShipped } = require("../services/emailService");
      notifyOrderShipped(order).catch((err) => console.error("[notif] Shipped error:", err));
      sendCustomerOrderShipped(order).catch((mailErr) => {
        console.error("[email] Failed to send shipment email to customer:", mailErr);
      });
    } else if (status === "Delivered" && previousOrder.status !== "Delivered") {
      const { sendCustomerOrderDelivered } = require("../services/emailService");
      notifyOrderDelivered(order).catch((err) => console.error("[notif] Delivered error:", err));
      sendCustomerOrderDelivered(order).catch((mailErr) => {
        console.error("[email] Failed to send delivery email to customer:", mailErr);
      });
    }

    if (req.user) {
      await logActivity(
        req.user._id,
        req.user.name,
        "ORDER_STATUS_UPDATED",
        `Updated order status for ${order.orderCode || order._id} from "${previousOrder.status}" to "${status}"`,
        req
      );
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

    const { sendCustomerOrderShipped } = require("../services/emailService");
    sendCustomerOrderShipped(order).catch((mailErr) => {
      console.error("[email] Failed to send tracking shipment email:", mailErr);
    });

    return res.status(200).json({ message: "Tracking ID updated successfully", order });
  } catch (error) {
    console.error("Update tracking ID error:", error.message);
    return res.status(500).json({ message: "Failed to update tracking ID" });
  }
};

const customerCancelOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const reason = String(req.body?.reason || req.body?.cancellationReason || "").trim();
    const details = String(req.body?.details || "").trim();

    if (!userId) return res.status(401).json({ message: "Login required to cancel order" });
    if (!reason) return res.status(400).json({ message: "Cancellation reason is required" });

    const order = await Order.findOne({ _id: id, userId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (["Processing", "Shipped", "Delivered"].includes(order.status)) {
      return res.status(400).json({
        message: "This order is already being processed and can no longer be cancelled from your account. Please contact customer support for assistance.",
      });
    }

    if (order.status === "Cancelled" || order.status === "CUSTOMER_CANCELLED") {
      return res.status(400).json({ message: "Order is already cancelled." });
    }

    if (order.status === "FAILED_PAYMENT") {
      return res.status(400).json({ message: "This order has already failed payment and is not active." });
    }

    const allowedStatuses = [
      "Pending",
      "Payment Pending",
      "Payment Verification Pending",
      "Confirmed",
      "Order Confirmed",
    ];

    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({
        message: "This order is already being processed and can no longer be cancelled from your account. Please contact customer support for assistance.",
      });
    }

    const cancellationTime = new Date();
    const clientIp = req.ip || (req.headers && req.headers["x-forwarded-for"]) || "";
    const hadDecrementedStock = order.paymentMethod === "COD" || order.paymentStatus === "Paid";

    order.status = "CUSTOMER_CANCELLED";
    order.orderStatus = "CUSTOMER_CANCELLED";
    order.cancelledBy = "CUSTOMER";
    order.cancelledAt = cancellationTime;
    order.cancellationReason = reason;
    order.cancellationIpAddress = clientIp;
    order.cancellationRequest = {
      status: "Approved",
      reason,
      details,
      requestedAt: cancellationTime,
      reviewedAt: cancellationTime,
      adminNote: "Cancelled directly by customer before processing.",
    };

    // 1. Release reserved credit if order was in pending split state
    if (order.storeCreditReservationId && order.storeCreditStatus === "RESERVED") {
      await storeCreditService.releaseReservation({
        reservationId: order.storeCreditReservationId,
        reason: "Order cancelled by customer before payment completion",
        req,
      }).catch((e) => console.warn("[customerCancelOrder] releaseReservation warning:", e.message));
      order.storeCreditStatus = "RELEASED";
    }

    // 2. Restore debited Store Credit if order was paid with Store Credit
    if (order.storeCreditAmount > 0 && (order.paymentMethod === "Store Credit" || order.storeCreditStatus === "COMMITTED")) {
      await storeCreditService.addCredit({
        userId: order.userId,
        amount: order.storeCreditAmount,
        referenceType: "ORDER_CANCELLATION",
        referenceId: order.orderCode,
        orderId: order._id,
        description: `Restoration of ₹${order.storeCreditAmount} Store Credit for cancelled Order #${order.orderCode}`,
        performedBy: order.userId,
        performedByName: req.user?.name || "Customer",
        performedByRole: "Customer",
        req,
      }).catch((e) => console.warn("[customerCancelOrder] addCredit restoration warning:", e.message));
      order.storeCreditStatus = "REFUNDED";
    }

    // 3. Queue eligible refund for Refund Team if order had a verified paid online portion
    const paidOnlineAmount = order.paymentMethod === "Store Credit + Online" && order.paymentStatus === "Paid"
      ? (order.onlinePaymentAmount || 0)
      : (order.paymentMethod === "Online" && order.paymentStatus === "Paid" ? order.totalPrice : 0);

    if (paidOnlineAmount > 0) {
      try {
        const RefundCounter = require("../models/RefundCounter");
        const RefundRecord = require("../models/RefundRecord");
        const refundCode = await RefundCounter.getNextRefundCode();
        await RefundRecord.create({
          refundId: refundCode,
          orderId: order._id,
          orderCode: order.orderCode,
          customerId: order.userId,
          customerName: order.address?.fullName || req.user?.name || "Customer",
          customerEmail: order.email || req.user?.email || "",
          customerPhone: order.address?.phone || req.user?.mobileNumber || "",
          refundAmount: paidOnlineAmount,
          refundType: "Full",
          refundReason: `Order cancelled by customer before processing: ${reason}`,
          customerExplanation: details || reason,
          executiveRemarks: "System-generated refund request upon customer pre-processing cancellation.",
          source: "Support Ticket",
          status: "PENDING_REFUND_REVIEW",
          refundStatus: "PENDING_REFUND_REVIEW",
          refundMethod: "Original Source",
          isAgentCreated: false,
          assignedTeam: "Refund Team",
        });
        order.refundStatus = "PENDING_REFUND_REVIEW";
        order.refundDetails = {
          refundId: refundCode,
          paymentId: order.razorpayPaymentId || "N/A",
          gatewayRefundId: "",
          refundAmount: paidOnlineAmount,
          refundDate: null,
          processedBy: null,
          processedByName: "",
          processingTimeMs: 0,
        };
      } catch (refErr) {
        console.warn("[customerCancelOrder] RefundRecord creation warning:", refErr.message);
      }
    }

    await order.save();

    if (hadDecrementedStock) {
      const { incrementStockForCancelledOrder } = require("../services/inventoryService");
      await incrementStockForCancelledOrder(order);
    }

    createAndDispatchNotification({
      recipient: order.userId,
      role: "customer",
      category: "ORDER",
      event: "ORDER_CANCELLED",
      priority: "Medium",
      title: `Order Cancelled #${order.orderCode}`,
      message: `Your order #${order.orderCode} has been cancelled successfully.`,
      link: "/orders",
      metadata: { orderId: order._id, orderCode: order.orderCode, reason },
    }).catch((err) => console.error("[notif] Customer cancellation notification error:", err));

    createAndDispatchNotification({
      recipient: null,
      role: "admin",
      category: "ORDER",
      event: "ORDER_CANCELLED",
      priority: "High",
      title: `Customer Cancelled Order Alert: #${order.orderCode}`,
      message: `Customer ${req.user?.name || "User"} cancelled order #${order.orderCode}. Reason: "${reason}"`,
      link: `/orders?search=${order.orderCode}`,
      metadata: {
        orderId: order._id,
        orderCode: order.orderCode,
        cancelledBy: "CUSTOMER",
        reason,
        ipAddress: clientIp,
      },
    }).catch((err) => console.error("[notif] Admin cancellation notification error:", err));

    const { sendCustomerOrderCancelled, sendSupportNotification } = require("../services/emailService");
    sendCustomerOrderCancelled(order, reason).catch((mailErr) => {
      console.error("[email] Failed to send customer order cancelled email:", mailErr);
    });
    sendSupportNotification("Cancellation Request", order).catch((mailErr) => {
      console.error("[email] Failed to send support cancellation notification:", mailErr);
    });

    logActivity(
      req.user._id,
      req.user.name,
      "CUSTOMER_ORDER_CANCELLED",
      `Customer cancelled order ${order.orderCode || order._id}. Reason: "${reason}" (IP: ${clientIp})`,
      req
    ).catch((logErr) => console.error("[audit] Cancellation log error:", logErr));

    return res.status(200).json({
      message: "Order Cancelled Successfully",
      order,
    });
  } catch (error) {
    console.error("Customer cancel order error:", error.message);
    return res.status(500).json({ message: "Failed to cancel order" });
  }
};

const requestOrderCancellation = async (req, res) => {
  return customerCancelOrder(req, res);
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

      const { incrementStockForCancelledOrder } = require("../services/inventoryService");
      const { sendCustomerCancellationReview, sendSupportNotification } = require("../services/emailService");

      await incrementStockForCancelledOrder(order);
      notifyOrderCancelled(order, adminNote || "Cancellation request approved").catch((err) =>
        console.error("[notif] Cancellation approved error:", err)
      );
      sendCustomerCancellationReview(order, true, adminNote).catch((mailErr) => {
        console.error("[email] Failed to send cancellation approval email to customer:", mailErr);
      });
      sendSupportNotification("Refund Process", {
        returnId: order._id,
        amount: order.totalPrice,
        method: "Original Payment Source",
        transactionReference: order.razorpayPaymentId || "Refund Initiated",
      }).catch((mailErr) => {
        console.error("[email] Failed to send refund support notice:", mailErr);
      });

      if (req.user) {
        await logActivity(
          req.user._id,
          req.user.name,
          "ORDER_CANCELLATION_APPROVED",
          `Approved cancellation request for order ${order.orderCode || order._id}. Note: ${adminNote || "none"}`,
          req
        );
      }

      return res.status(200).json({ message: "Cancellation approved and order cancelled.", order });
    }

    order.cancellationRequest.status = "Rejected";
    order.cancellationRequest.reviewedAt = reviewedAt;
    order.cancellationRequest.adminNote = adminNote;
    await order.save();

    createAndDispatchNotification({
      recipient: order.userId,
      role: "CUSTOMER",
      category: "ORDER",
      event: "ORDER_ALERT",
      priority: "Medium",
      title: `Cancellation Request Update: #${order.orderCode}`,
      message: `Your cancellation request for order #${order.orderCode} was reviewed and rejected.${adminNote ? ` Note: ${adminNote}` : ""}`,
      link: "/orders",
      metadata: { orderId: order._id, orderCode: order.orderCode },
    }).catch((err) => console.error("[notif] Cancellation rejected error:", err));

    const { sendCustomerCancellationReview } = require("../services/emailService");
    sendCustomerCancellationReview(order, false, adminNote).catch((mailErr) => {
      console.error("[email] Failed to send cancellation rejection email to customer:", mailErr);
    });

    if (req.user) {
      await logActivity(
        req.user._id,
        req.user.name,
        "ORDER_CANCELLATION_REJECTED",
        `Rejected cancellation request for order ${order.orderCode || order._id}. Reason: ${adminNote || "none"}`,
        req
      );
    }

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
  customerCancelOrder,
  requestOrderCancellation,
  reviewOrderCancellation,
  deleteOrder,
  archiveOrder,
  unarchiveOrder,
  trackOrder,
};
