const Notification = require("../models/Notification");
const NotificationLog = require("../models/NotificationLog");

// In-memory registry of active SSE clients
const sseClients = new Map();

/**
 * Register an active SSE response client for admin notifications
 */
const addSseClient = (clientId, res, user = null) => {
  if (typeof res.writeHead === "function") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
  }

  // Initial handshake
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", clientId, timestamp: Date.now() })}\n\n`);

  sseClients.set(clientId, { res, user, connectedAt: new Date() });

  // 25-second heartbeat to keep connection alive across proxies
  const heartbeat = setInterval(() => {
    if (sseClients.has(clientId)) {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (err) {
        clearInterval(heartbeat);
        removeSseClient(clientId);
      }
    } else {
      clearInterval(heartbeat);
    }
  }, 25000);

  if (typeof res.on === "function") {
    res.on("close", () => {
      clearInterval(heartbeat);
      removeSseClient(clientId);
    });
  }
};

/**
 * Unregister an SSE client
 */
const removeSseClient = (clientId) => {
  if (sseClients.has(clientId)) {
    const client = sseClients.get(clientId);
    try {
      client.res.end();
    } catch {}
    sseClients.delete(clientId);
  }
};

/**
 * Broadcast event payload to all connected admin SSE clients
 */
const broadcastToAdmins = (payload) => {
  const dataString = `data: ${JSON.stringify(payload)}\n\n`;
  for (const [clientId, client] of sseClients.entries()) {
    try {
      client.res.write(dataString);
    } catch (err) {
      console.warn(`[SSE] Failed writing to client ${clientId}, dropping:`, err.message);
      removeSseClient(clientId);
    }
  }
};

/**
 * Core notification creation, persistence, audit logging, and real-time dispatch
 */
const createAndDispatchNotification = async ({
  recipient = null,
  userId = null,
  role = "admin",
  category = "SYSTEM",
  event = "GENERAL_ALERT",
  title,
  message,
  priority = "Medium",
  link = "",
  metadata = {},
}) => {
  try {
    const doc = await Notification.create({
      recipient: recipient || userId,
      userId: userId || recipient,
      role,
      category,
      event,
      title: title.trim(),
      message: message.trim(),
      priority,
      link,
      metadata,
      isRead: false,
    });

    // Audit log in NotificationLog
    await NotificationLog.create({
      notificationId: doc._id,
      channel: "IN_APP",
      recipient: recipient ? recipient.toString() : (role === "admin" ? "ADMIN_GROUP" : "BROADCAST"),
      event,
      category,
      status: "SUCCESS",
      metadata,
    }).catch((logErr) => console.error("[NotificationLog] Save error:", logErr.message));

    // Real-time broadcast if targeted at admins or all
    if (role === "admin" || role === "all") {
      broadcastToAdmins({
        type: "NOTIFICATION",
        notification: doc,
        timestamp: Date.now(),
      });

      await NotificationLog.create({
        notificationId: doc._id,
        channel: "SSE",
        recipient: "ADMIN_SSE_CLIENTS",
        event,
        category,
        status: "SUCCESS",
        metadata: { clientCount: sseClients.size },
      }).catch(() => {});
    }

    return doc;
  } catch (error) {
    console.error("[notificationService] Create error:", error.message);
    return null;
  }
};

// ==========================================
// SPECIALIZED DOMAIN NOTIFICATION TRIGGERS
// ==========================================

/**
 * Order Events
 */
const notifyOrderCreated = async (order, user = null) => {
  const customerName = order.address?.fullName || user?.name || "Guest Customer";
  const amount = Number(order.totalPrice || 0);

  // 1. New Order alert
  const notif = await createAndDispatchNotification({
    role: "admin",
    category: "ORDER",
    event: "ORDER_CREATED",
    title: `New Order #${order.orderCode}`,
    message: `Order for ₹${amount.toLocaleString("en-IN")} placed by ${customerName}.`,
    priority: "High",
    link: "orders",
    metadata: {
      orderId: order._id,
      orderCode: order.orderCode,
      amount,
      customerName,
      paymentMethod: order.paymentMethod,
    },
  });

  // 2. High-value order alert (>= ₹5,000)
  if (amount >= 5000) {
    await createAndDispatchNotification({
      role: "admin",
      category: "ORDER",
      event: "ORDER_HIGH_VALUE",
      title: `💎 High-Value Order #${order.orderCode}`,
      message: `High-value purchase of ₹${amount.toLocaleString("en-IN")} received from ${customerName}.`,
      priority: "Urgent",
      link: "orders",
      metadata: { orderId: order._id, orderCode: order.orderCode, amount },
    });
  }

  return notif;
};

const notifyOrderCancelled = async (order, user = null, reason = "") => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "ORDER",
    event: "ORDER_CANCELLED",
    title: `Order Cancelled #${order.orderCode}`,
    message: `Order #${order.orderCode} was cancelled. ${reason ? `Reason: "${reason}"` : ""}`,
    priority: "High",
    link: "orders",
    metadata: { orderId: order._id, orderCode: order.orderCode, reason },
  });
};

const notifyOrderShipped = async (order) => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "ORDER",
    event: "ORDER_SHIPPED",
    title: `Order Shipped #${order.orderCode}`,
    message: `Parcel dispatched via ${order.trackingCarrier || "courier"} (AWB: ${order.trackingId || "Assigned"}).`,
    priority: "Medium",
    link: "orders",
    metadata: { orderId: order._id, orderCode: order.orderCode, trackingId: order.trackingId },
  });
};

const notifyOrderDelivered = async (order) => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "ORDER",
    event: "ORDER_DELIVERED",
    title: `Order Delivered #${order.orderCode}`,
    message: `Order #${order.orderCode} was successfully delivered to ${order.address?.fullName || "customer"}.`,
    priority: "Low",
    link: "orders",
    metadata: { orderId: order._id, orderCode: order.orderCode },
  });
};

/**
 * Payment Events
 */
const notifyPaymentSuccess = async (orderOrPayment, maybeOrder = null) => {
  const order = maybeOrder || orderOrPayment;
  const amount = Number(order?.totalPrice || orderOrPayment?.amount || 0);
  return await createAndDispatchNotification({
    role: "admin",
    category: "PAYMENT",
    event: "PAYMENT_SUCCESS",
    title: `Payment Successful #${order?.orderCode || "ONLINE"}`,
    message: `Payment of ₹${amount.toLocaleString("en-IN")} verified successfully.`,
    priority: "Medium",
    link: "orders",
    metadata: {
      orderId: order?._id,
      orderCode: order?.orderCode,
      amount,
      paymentId: order?.razorpayPaymentId || orderOrPayment?.id,
    },
  });
};

const notifyPaymentFailed = async (orderOrPayment, errorOrOrder = "", errorMsg = "") => {
  const order = typeof errorOrOrder === "object" ? errorOrOrder : orderOrPayment;
  const msg = typeof errorOrOrder === "string" ? errorOrOrder : errorMsg;
  return await createAndDispatchNotification({
    role: "admin",
    category: "PAYMENT",
    event: "PAYMENT_FAILED",
    title: `Payment Failed #${order?.orderCode || "TRANSACTION"}`,
    message: `Online checkout transaction failed: ${msg || "Gateway timeout / verification error"}.`,
    priority: "Urgent",
    link: "orders",
    metadata: { orderId: order?._id, orderCode: order?.orderCode, error: msg },
  });
};

const notifyRefundProcessed = async (refund, returnReq) => {
  const amount = Number(refund?.refundAmount || 0);
  return await createAndDispatchNotification({
    role: "admin",
    category: "PAYMENT",
    event: "REFUND_PROCESSED",
    title: `Refund Completed #${refund?.refundId || "REFUND"}`,
    message: `Refund of ₹${amount.toLocaleString("en-IN")} issued via ${refund?.refundMethod || "Original Source"} for claim ${returnReq?.requestId || ""}.`,
    priority: "Medium",
    link: "returns-replacements",
    metadata: { refundId: refund?.refundId, requestId: returnReq?.requestId, amount },
  });
};

/**
 * Customer Events
 */
const notifyNewCustomerRegistered = async (user) => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "CUSTOMER",
    event: "CUSTOMER_REGISTERED",
    title: `New Customer Registration`,
    message: `${user.name} (${user.email || user.mobileNumber || "Registered"}) joined the store.`,
    priority: "Low",
    link: "customers",
    metadata: { userId: user._id, name: user.name, email: user.email },
  });
};

const notifyProfileUpdated = async (user) => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "CUSTOMER",
    event: "CUSTOMER_PROFILE_UPDATED",
    title: `Customer Profile Updated`,
    message: `${user.name} updated their customer account details.`,
    priority: "Low",
    link: "customers",
    metadata: { userId: user._id, name: user.name },
  });
};

/**
 * Support Events
 */
const notifySupportTicketCreated = async (ticket) => {
  const isComplaint = ticket.category === "Complaint";
  const priority = isComplaint ? "Urgent" : (ticket.priority || "Medium");

  return await createAndDispatchNotification({
    role: "admin",
    category: "SUPPORT",
    event: isComplaint ? "COMPLAINT_SUBMITTED" : "TICKET_CREATED",
    title: isComplaint ? `🚨 Complaint Filed #${ticket.ticketCode}` : `Support Query #${ticket.ticketCode}`,
    message: `[${ticket.category}] ${ticket.subject} - from ${ticket.customerName || "Customer"} (${ticket.customerEmail || "N/A"}).`,
    priority,
    link: "support",
    metadata: {
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      category: ticket.category,
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      subject: ticket.subject,
    },
  });
};

const notifyContactSubmission = async (ticket) => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "SUPPORT",
    event: "CONTACT_SUBMISSION",
    title: `Contact Us Message #${ticket.ticketCode}`,
    message: `Message from ${ticket.customerName} (${ticket.customerEmail}): "${ticket.subject}".`,
    priority: "Medium",
    link: "support",
    metadata: {
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      subject: ticket.subject,
    },
  });
};

const notifyComplaintSubmitted = async (ticket) => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "SUPPORT",
    event: "COMPLAINT_SUBMITTED",
    title: `🚨 Customer Complaint Filed #${ticket.ticketCode}`,
    message: `Complaint from ${ticket.customerName || "Customer"} (${ticket.customerEmail || "N/A"}): "${ticket.subject}". Priority: Urgent.`,
    priority: "Urgent",
    link: "support",
    metadata: {
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      subject: ticket.subject,
    },
  });
};

const notifyUnansweredQueryAlert = async (ticket, hoursElapsed = 24) => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "SUPPORT",
    event: "UNANSWERED_QUERY_ALERT",
    title: `⏰ Unanswered Query Alert: #${ticket.ticketCode}`,
    message: `Support ticket #${ticket.ticketCode} ("${ticket.subject}") has been pending response for over ${hoursElapsed} hours!`,
    priority: "High",
    link: "support",
    metadata: {
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      hoursElapsed,
    },
  });
};

/**
 * Return & Replacement Events
 */
const notifyReturnRequested = async (returnRequest, order = null) => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "RETURN",
    event: "RETURN_REQUESTED",
    title: `Return Claim Submitted #${returnRequest.requestId}`,
    message: `Return claim filed for Order #${order?.orderCode || "Order"}. Reason: ${returnRequest.returnReason}.`,
    priority: "High",
    link: "returns-replacements",
    metadata: {
      requestId: returnRequest.requestId,
      orderCode: order?.orderCode,
      reason: returnRequest.returnReason,
    },
  });
};

const notifyReplacementRequested = async (returnRequest, order = null) => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "RETURN",
    event: "REPLACEMENT_REQUESTED",
    title: `Replacement Claim #${returnRequest.requestId}`,
    message: `Replacement claim filed for Order #${order?.orderCode || "Order"}. Reason: ${returnRequest.returnReason}.`,
    priority: "High",
    link: "returns-replacements",
    metadata: {
      requestId: returnRequest.requestId,
      orderCode: order?.orderCode,
      reason: returnRequest.returnReason,
    },
  });
};

const notifyReturnStatusUpdated = async (returnRequest, status) => {
  return await createAndDispatchNotification({
    role: "admin",
    category: "RETURN",
    event: "RETURN_STATUS_UPDATED",
    title: `Claim #${returnRequest.requestId} ${status}`,
    message: `Request status updated to "${status}".`,
    priority: "Medium",
    link: "returns-replacements",
    metadata: { requestId: returnRequest.requestId, status },
  });
};

module.exports = {
  addSseClient,
  removeSseClient,
  broadcastToAdmins,
  createAndDispatchNotification,
  // Order triggers
  notifyOrderCreated,
  notifyOrderCancelled,
  notifyOrderShipped,
  notifyOrderDelivered,
  // Payment triggers
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifyRefundProcessed,
  // Customer triggers
  notifyNewCustomerRegistered,
  notifyProfileUpdated,
  // Support triggers
  notifySupportTicketCreated,
  notifyContactSubmission,
  notifyComplaintSubmitted,
  notifyUnansweredQueryAlert,
  // Return triggers
  notifyReturnRequested,
  notifyReplacementRequested,
  notifyReturnStatusUpdated,
};
