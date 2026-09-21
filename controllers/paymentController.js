const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Order = require("../models/Order");
const FailedOrderRecord = require("../models/FailedOrderRecord");
const { decrementStockForPaidOrder } = require("../services/inventoryService");
const {
  sendCustomerOrderConfirmation,
  sendAdminNewOrderAlert,
  sendSupportNotification
} = require("../services/emailService");
const {
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifyOrderCreated,
} = require("../services/notificationService");

const isRazorpayDemoMode = () => {
  if (process.env.NODE_ENV === "production") return false;
  return String(process.env.RAZORPAY_DEMO_MODE || "").toLowerCase() === "true";
};

const createPaymentOrder = async (req, res) => {
  try {
    const { appOrderId } = req.body;

    if (!appOrderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const appOrder = await Order.findById(appOrderId);
    if (!appOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      appOrder.status === "FAILED_PAYMENT" ||
      appOrder.status === "CUSTOMER_CANCELLED" ||
      appOrder.status === "Cancelled"
    ) {
      return res.status(400).json({
        message: "Cannot initiate payment for a cancelled or failed order. Please start a new checkout attempt.",
      });
    }

    if (appOrder.paymentStatus === "Paid" || appOrder.status === "Order Confirmed") {
      return res.status(400).json({ message: "Order is already paid and confirmed." });
    }

    const amountPaise = Math.round(appOrder.totalPrice * 100);

    if (isRazorpayDemoMode()) {
      const demoOrderId = `demo_${appOrder._id}_${Date.now()}`;
      appOrder.razorpayOrderId = demoOrderId;
      await appOrder.save();

      return res.status(201).json({
        demoMode: true,
        razorpayOrderId: demoOrderId,
        amount: amountPaise,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID || "rzp_test_DemoMode",
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: "Razorpay keys are not configured" });
    }

    const receiptOrderRef = appOrder.orderCode || `order_${appOrder._id.toString().slice(-10)}`;
    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: receiptOrderRef.slice(0, 40),
      notes: {
        appOrderId: appOrder._id.toString(),
        orderCode: appOrder.orderCode || "",
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);
    appOrder.razorpayOrderId = razorpayOrder.id;
    await appOrder.save();

    return res.status(201).json({
      demoMode: false,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create payment order error:", error.message);
    return res.status(500).json({ message: "Failed to create payment order" });
  }
};

const completeDemoPayment = async (req, res) => {
  try {
    if (!isRazorpayDemoMode()) {
      return res.status(403).json({ message: "Demo payment is disabled" });
    }

    const { appOrderId } = req.body;
    if (!appOrderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const appOrder = await Order.findById(appOrderId);
    if (!appOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!appOrder.razorpayOrderId || !String(appOrder.razorpayOrderId).startsWith("demo_")) {
      return res.status(400).json({ message: "Order is not a demo checkout" });
    }

    const wasAlreadyPaid = appOrder.paymentStatus === "Paid";

    const updatedOrder = await Order.findByIdAndUpdate(
      appOrderId,
      {
        paymentStatus: "Paid",
        status: "Order Confirmed",
        razorpayPaymentId: `demo_pay_${appOrder._id}`,
      },
      { returnDocument: 'after' }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!wasAlreadyPaid) {
      await decrementStockForPaidOrder(updatedOrder);
      notifyPaymentSuccess(updatedOrder).catch((err) => console.error("[notif] notifyPaymentSuccess failed:", err));
      notifyOrderCreated(updatedOrder).catch((err) => console.error("[notif] notifyOrderCreated failed:", err));
      sendCustomerOrderConfirmation(updatedOrder).catch((mailErr) => {
        console.error("[email] Failed to send customer order confirmation email in completeDemoPayment:", mailErr);
      });
      sendAdminNewOrderAlert(updatedOrder).catch((mailErr) => {
        console.error("[email] Failed to send admin order alert email in completeDemoPayment:", mailErr);
      });
      sendSupportNotification("New Order", updatedOrder).catch((mailErr) => {
        console.error("[email] Failed to send support order alert email in completeDemoPayment:", mailErr);
      });
    }

    return res.status(200).json({ message: "Demo payment completed", order: updatedOrder });
  } catch (error) {
    console.error("Complete demo payment error:", error.message);
    return res.status(500).json({ message: "Demo payment failed" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { appOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!appOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: "Razorpay secret is not configured" });
    }

    const appOrder = await Order.findById(appOrderId);
    if (!appOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (appOrder.razorpayOrderId && appOrder.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: "Razorpay order mismatch" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      const failureTimestamp = new Date();
      await Order.findByIdAndUpdate(appOrderId, {
        paymentStatus: "Failed",
        status: "FAILED_PAYMENT",
        orderStatus: "FAILED_PAYMENT",
        failureReason: "Razorpay payment verification signature mismatch",
        failureTimestamp,
        paymentAttemptId: razorpay_payment_id || razorpay_order_id,
      });

      const clientIp = req.ip || (req.headers && req.headers["x-forwarded-for"]) || "";
      const userAgent = req.headers ? req.headers["user-agent"] : "";

      await FailedOrderRecord.create({
        orderId: appOrder._id,
        orderCode: appOrder.orderCode || "",
        customerId: appOrder.userId || null,
        customerEmail: appOrder.email || "",
        paymentAttemptId: razorpay_payment_id || razorpay_order_id || "",
        paymentMethod: "Online",
        amount: appOrder.totalPrice || 0,
        failureReason: "Razorpay payment verification signature mismatch",
        failureType: "PAYMENT_VERIFICATION_FAILED",
        failureTimestamp,
        ipAddress: clientIp,
        userAgent,
        orderStatus: "FAILED_PAYMENT",
      });

      notifyPaymentFailed(appOrder, "Razorpay payment verification signature mismatch").catch((err) =>
        console.error("[notif] Payment failed alert failed:", err)
      );

      return res.status(400).json({
        message: "Your payment was unsuccessful. No order has been placed. Please try again.",
        status: "FAILED_PAYMENT",
      });
    }

    const wasAlreadyPaid = appOrder.paymentStatus === "Paid";

    const updatedOrder = await Order.findByIdAndUpdate(
      appOrderId,
      {
        paymentStatus: "Paid",
        status: "Order Confirmed",
        orderStatus: "CONFIRMED",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
      { returnDocument: 'after' }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!wasAlreadyPaid) {
      await decrementStockForPaidOrder(updatedOrder);
      notifyPaymentSuccess(updatedOrder).catch((err) => console.error("[notif] notifyPaymentSuccess failed:", err));
      notifyOrderCreated(updatedOrder).catch((err) => console.error("[notif] notifyOrderCreated failed:", err));
      sendCustomerOrderConfirmation(updatedOrder).catch((mailErr) => {
        console.error("[email] Failed to send customer order confirmation email in verifyPayment:", mailErr);
      });
      sendAdminNewOrderAlert(updatedOrder).catch((mailErr) => {
        console.error("[email] Failed to send admin order alert email in verifyPayment:", mailErr);
      });
      sendSupportNotification("New Order", updatedOrder).catch((mailErr) => {
        console.error("[email] Failed to send support order alert email in verifyPayment:", mailErr);
      });
    }

    return res.status(200).json({ message: "Payment verified successfully", order: updatedOrder });
  } catch (error) {
    console.error("Verify payment error:", error.message);
    return res.status(500).json({ message: "Payment verification failed" });
  }
};

const recordPaymentFailure = async (req, res) => {
  try {
    const {
      appOrderId,
      paymentAttemptId = "",
      failureReason = "Payment failed or was cancelled",
      failureType = "PAYMENT_FAILED",
      errorDetails = {},
    } = req.body;

    if (!appOrderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const appOrder = await Order.findById(appOrderId);
    if (!appOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Anti-tamper: if order is already Paid or confirmed, do NOT mark as failed
    if (appOrder.paymentStatus === "Paid" || appOrder.status === "Order Confirmed") {
      return res.status(400).json({ message: "Order has already been confirmed and paid" });
    }

    const failureTimestamp = new Date();
    appOrder.status = "FAILED_PAYMENT";
    appOrder.orderStatus = "FAILED_PAYMENT";
    appOrder.paymentStatus = "Failed";
    appOrder.failureReason = failureReason;
    appOrder.failureTimestamp = failureTimestamp;
    if (paymentAttemptId) {
      appOrder.paymentAttemptId = paymentAttemptId;
    }
    await appOrder.save();

    const validFailureTypes = [
      "PAYMENT_FAILED",
      "PAYMENT_CANCELLED",
      "PAYMENT_TIMEOUT",
      "PAYMENT_VERIFICATION_FAILED",
      "GATEWAY_ERROR",
      "USER_CLOSED_WINDOW",
      "NETWORK_FAILURE",
      "OTHER",
    ];
    const mappedType = validFailureTypes.includes(failureType) ? failureType : "PAYMENT_FAILED";

    const clientIp = req.ip || (req.headers && req.headers["x-forwarded-for"]) || "";
    const userAgent = req.headers ? req.headers["user-agent"] : "";

    const failedRecord = await FailedOrderRecord.create({
      orderId: appOrder._id,
      orderCode: appOrder.orderCode || "",
      customerId: appOrder.userId || null,
      customerEmail: appOrder.email || "",
      paymentAttemptId: paymentAttemptId || appOrder.razorpayOrderId || "",
      paymentMethod: appOrder.paymentMethod || "Online",
      amount: appOrder.totalPrice || 0,
      failureReason,
      failureType: mappedType,
      failureTimestamp,
      ipAddress: clientIp,
      userAgent,
      orderStatus: "FAILED_PAYMENT",
      metadata: errorDetails,
    });

    notifyPaymentFailed(appOrder, failureReason).catch((err) =>
      console.error("[notif] Payment failed alert error:", err)
    );

    return res.status(200).json({
      success: false,
      message: "Your payment was unsuccessful. No order has been placed. Please try again.",
      status: "FAILED_PAYMENT",
      failedRecordId: failedRecord._id,
    });
  } catch (error) {
    console.error("Record payment failure error:", error.message);
    return res.status(500).json({
      message: "Failed to record payment failure",
      error: error.message,
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  completeDemoPayment,
  recordPaymentFailure,
};
