const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Order = require("../models/Order");
const { decrementStockForPaidOrder } = require("../services/inventoryService");
const {
  sendCustomerOrderConfirmation,
  sendAdminNewOrderAlert,
  sendSupportNotification
} = require("../services/emailService");

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
      await Order.findByIdAndUpdate(appOrderId, { paymentStatus: "Failed" });
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const wasAlreadyPaid = appOrder.paymentStatus === "Paid";

    const updatedOrder = await Order.findByIdAndUpdate(
      appOrderId,
      {
        paymentStatus: "Paid",
        status: "Order Confirmed",
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

module.exports = { createPaymentOrder, verifyPayment, completeDemoPayment };
