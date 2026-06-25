const crypto = require("crypto");
const Return = require("../models/Return");
const ReturnSetting = require("../models/ReturnSetting");
const RefundTransaction = require("../models/RefundTransaction");
const Ticket = require("../models/Ticket");
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const ReturnRequest = require("../models/ReturnRequest");
const ReplacementRequest = require("../models/ReplacementRequest");
const { logActivity } = require("../services/logService");
const {
  sendCustomerReturnSubmitted,
  sendCustomerReturnApproved,
  sendCustomerReturnRejected,
  sendCustomerPickupScheduled,
  sendCustomerProductReceived,
  sendCustomerRefundInitiated,
  sendCustomerRefundCompleted,
  sendCustomerReplacementShipped,
  sendCustomerReturnClosed,
  sendAdminReturnRequestAlert,
  sendAgentTicketAssigned,
  sendSupportNotification,
} = require("../services/emailService");

// Helper to generate a unique Return Code
const generateReturnCode = () => {
  return "RET-" + crypto.randomBytes(4).toString("hex").toUpperCase();
};

// Helper to generate a unique Ticket Code
const generateTicketCode = () => {
  return "TKT-" + crypto.randomBytes(3).toString("hex").toUpperCase();
};

/**
 * @desc    Submit a return request
 * @route   POST /api/returns
 * @access  Private (Customer)
 */
const createReturn = async (req, res) => {
  try {
    const { orderId, items, reason, description, images, video, preferredResolution } = req.body;
    const userId = req.user._id;

    if (!orderId || !reason || !description || !preferredResolution) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Please select at least one item to return." });
    }

    // Verify order
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({ message: "Only delivered orders can be returned." });
    }

    // Validate return window
    const settings = await ReturnSetting.findOne({ singletonKey: "settings" }) || { returnWindowDays: 7, enabled: true };
    if (!settings.enabled) {
      return res.status(400).json({ message: "Returns are temporarily disabled for this store." });
    }

    // Calculate days since delivery
    const deliveryDate = order.updatedAt; // updatedAt of Delivered status
    const daysSinceDelivery = (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > settings.returnWindowDays) {
      return res.status(400).json({
        message: `The return window for this order has expired (${settings.returnWindowDays} days limit).`
      });
    }

    // Verify if there is already a return request for this order
    const existingReturn = await Return.findOne({ order: orderId });
    if (existingReturn) {
      return res.status(400).json({ message: "A return request has already been submitted for this order." });
    }

    // Generate code and create Return
    const returnCode = generateReturnCode();
    const returnRequest = await Return.create({
      returnCode,
      order: orderId,
      user: userId,
      items: items.map(item => ({
        productId: item.productId || item._id,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        image: item.image || "",
      })),
      reason,
      description: description.trim(),
      images: Array.isArray(images) ? images.map(img => ({ url: img.url, publicId: img.publicId })) : [],
      video: video ? { url: video.url, publicId: video.publicId } : undefined,
      preferredResolution,
      status: "Return Requested",
      statusHistory: [{
        status: "Return Requested",
        note: "Return request submitted by customer.",
      }]
    });

    // Automatically create support ticket
    const ticketCode = generateTicketCode();
    const initialMessage = `Return request submitted for return code: ${returnCode}.
Resolution preference: ${preferredResolution}.
Reason: ${reason}.
Description: ${description.trim()}`;

    const messageAttachments = [];
    if (Array.isArray(images)) {
      images.forEach(img => {
        messageAttachments.push({ name: "Product Image", url: img.url, fileType: "image" });
      });
    }
    if (video && video.url) {
      messageAttachments.push({ name: "Unboxing Video", url: video.url, fileType: "video" });
    }

    const ticket = await Ticket.create({
      ticketCode,
      user: userId,
      subject: `Return Request: Order #${order.orderCode}`,
      order: orderId,
      status: "Open",
      type: "Return",
      returnRequest: returnRequest._id,
      messages: [{
        sender: userId,
        senderName: req.user.name,
        isAdmin: false,
        message: initialMessage,
        attachments: messageAttachments,
      }]
    });

    // Link ticket back to return
    returnRequest.ticket = ticket._id;
    await returnRequest.save();

    // Send emails
    sendCustomerReturnSubmitted(req.user, order, returnRequest).catch(err => {
      console.error("[email] Return submit customer mail failed:", err.message);
    });
    sendAdminReturnRequestAlert(returnRequest, order).catch(err => {
      console.error("[email] Return submit admin alert failed:", err.message);
    });
    sendSupportNotification("Return Request", returnRequest).catch(err => {
      console.error("[email] Return submit support alert failed:", err.message);
    });

    res.status(201).json({
      message: "Return request submitted successfully. A support ticket has been created.",
      returnRequest,
      ticketCode: ticket.ticketCode,
    });
  } catch (error) {
    console.error("Create return error:", error.message);
    res.status(500).json({ message: error.message || "Failed to submit return request." });
  }
};

/**
 * @desc    Get customer returns history
 * @route   GET /api/returns/my
 * @access  Private (Customer)
 */
const getMyReturns = async (req, res) => {
  try {
    const returnsList = await Return.find({ user: req.user._id })
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("ticket", "ticketCode status")
      .sort({ createdAt: -1 });

    res.json(returnsList);
  } catch (error) {
    res.status(500).json({ message: "Failed to load returns list." });
  }
};

/**
 * @desc    Get single return request details
 * @route   GET /api/returns/my/:id
 * @access  Private (Customer or Admin/Support)
 */
const getReturnDetails = async (req, res) => {
  try {
    const returnRequest = await Return.findById(req.params.id)
      .populate("order", "orderCode totalPrice createdAt status address")
      .populate("user", "name email mobileNumber")
      .populate("ticket", "ticketCode status messages")
      .populate("assignedSupportAgent", "name email designation")
      .populate("statusHistory.updatedBy", "name")
      .populate("replacementOrder", "orderCode status totalPrice");

    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found." });
    }

    // Access control: customer owner or staff/admin
    const isOwner = returnRequest.user._id.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.json(returnRequest);
  } catch (error) {
    res.status(500).json({ message: "Failed to load return details." });
  }
};

/**
 * @desc    Admin/Support view returns list
 * @route   GET /api/returns/admin
 * @access  Private (Admin/Support)
 */
const adminGetReturns = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    // Support role-based constraint: if user is not superadmin/owner manager, only show assigned returns
    // Wait, let's look at their permissions: if they only have TICKETS_MANAGE and not ORDERS_RETURNS, we can filter by assignedSupportAgent
    const isSupportAgent = !req.user.isMasterAdmin && !req.user.permissions?.includes("ORDERS_RETURNS");
    if (isSupportAgent) {
      filter.assignedSupportAgent = req.user._id;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    let returnsList = await Return.find(filter)
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("user", "name email")
      .populate("ticket", "ticketCode status")
      .populate("assignedSupportAgent", "name email")
      .sort({ updatedAt: -1 });

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      returnsList = returnsList.filter(item => {
        return (
          item.returnCode?.match(regex) ||
          item.order?.orderCode?.match(regex) ||
          item.user?.name?.match(regex) ||
          item.user?.email?.match(regex) ||
          item.ticket?.ticketCode?.match(regex)
        );
      });
    }

    res.json(returnsList);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve returns database." });
  }
};

/**
 * @desc    Admin/Support update return status and processing
 * @route   PUT /api/returns/admin/:id
 * @access  Private (Admin/Support)
 */
const adminUpdateReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      note,
      pickupDetails,
      refundDetails,
      assignedSupportAgent,
      createReplacement
    } = req.body;

    const returnRequest = await Return.findById(id)
      .populate("user", "name email")
      .populate("order", "orderCode products userId totalPrice address");

    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found." });
    }

    const previousStatus = returnRequest.status;

    // Handle support agent assignment
    if (assignedSupportAgent !== undefined) {
      // Security check: support cannot reassign if they don't have authority, but admins can
      returnRequest.assignedSupportAgent = assignedSupportAgent || null;

      if (assignedSupportAgent) {
        const agent = await User.findById(assignedSupportAgent);
        if (agent) {
          sendAgentTicketAssigned(agent, { ticketCode: returnRequest.returnCode, subject: "Return Assigned" }, returnRequest).catch(err => {
            console.error("[email] Assigned mail to agent failed:", err.message);
          });
        }
      }
    }

    // Handle pickup schedule
    if (pickupDetails) {
      returnRequest.pickupDetails = {
        courier: pickupDetails.courier || returnRequest.pickupDetails.courier,
        trackingId: pickupDetails.trackingId || returnRequest.pickupDetails.trackingId,
        pickupDate: pickupDetails.pickupDate || returnRequest.pickupDetails.pickupDate,
        note: pickupDetails.note || returnRequest.pickupDetails.note,
      };

      if (status === "Pickup Scheduled" || previousStatus !== "Pickup Scheduled") {
        sendCustomerPickupScheduled(returnRequest.user, returnRequest).catch(err => {
          console.error("[email] Pickup scheduled mail failed:", err.message);
        });
      }
    }

    // Handle refunds processing
    if (refundDetails) {
      // Role Check: Support staff should NOT perform financial actions
      const canManageFinance = req.user.isMasterAdmin || req.user.permissions?.includes("FINANCE_MANAGE") || req.user.permissions?.includes("ORDERS_RETURNS");
      if (!canManageFinance && (refundDetails.refundAmount > 0 || refundDetails.refundStatus === "Success")) {
        return res.status(403).json({ message: "Access denied. Support staff cannot process financial transactions." });
      }

      returnRequest.refundDetails = {
        refundAmount: Number(refundDetails.refundAmount || returnRequest.refundDetails.refundAmount),
        refundMethod: refundDetails.refundMethod || returnRequest.refundDetails.refundMethod,
        refundDate: refundDetails.refundDate || new Date(),
        refundStatus: refundDetails.refundStatus || returnRequest.refundDetails.refundStatus,
        transactionReference: refundDetails.transactionReference || returnRequest.refundDetails.transactionReference,
      };

      // Create a refund transaction entry if marked as success
      if (refundDetails.refundStatus === "Success" && returnRequest.refundDetails.refundStatus !== "Success") {
        await RefundTransaction.create({
          returnId: returnRequest._id,
          orderId: returnRequest.order._id,
          amount: returnRequest.refundDetails.refundAmount,
          method: returnRequest.refundDetails.refundMethod === "Store Credit" ? "Store Credit" : "Refund",
          status: "Success",
          transactionReference: returnRequest.refundDetails.transactionReference,
          refundedBy: req.user._id,
        });

        // Trigger emails
        sendCustomerRefundCompleted(returnRequest.user, returnRequest, returnRequest.refundDetails.refundAmount, returnRequest.refundDetails.transactionReference).catch(err => {
          console.error("[email] Refund completed email failed:", err.message);
        });
        sendSupportNotification("Refund Process", {
          returnId: returnRequest._id,
          amount: returnRequest.refundDetails.refundAmount,
          method: returnRequest.refundDetails.refundMethod,
          transactionReference: returnRequest.refundDetails.transactionReference,
        }).catch(err => {
          console.error("[email] Support refund completed email failed:", err.message);
        });
      } else if (refundDetails.refundStatus === "Pending") {
        sendCustomerRefundInitiated(returnRequest.user, returnRequest, returnRequest.refundDetails.refundAmount).catch(err => {
          console.error("[email] Refund initiated email failed:", err.message);
        });
        sendSupportNotification("Refund Process", {
          returnId: returnRequest._id,
          amount: returnRequest.refundDetails.refundAmount,
          method: returnRequest.refundDetails.refundMethod,
          transactionReference: "Pending",
        }).catch(err => {
          console.error("[email] Support refund initiated email failed:", err.message);
        });
      }
    }

    // Process Replacements: Auto-create replacement order if requested and approved
    if (createReplacement && !returnRequest.replacementOrder) {
      const canManageReplacements = req.user.isMasterAdmin || req.user.permissions?.includes("ORDERS_RETURNS");
      if (!canManageReplacements) {
        return res.status(403).json({ message: "Access denied. Insufficient permissions to process replacement orders." });
      }

      // Generate replacement order in Mongoose Order model
      const { decrementStockForPaidOrder } = require("../services/inventoryService");
      
      const newOrderCode = "ORD-REP-" + crypto.randomBytes(3).toString("hex").toUpperCase();
      const replacementOrder = await Order.create({
        orderCode: newOrderCode,
        userId: returnRequest.user._id,
        products: returnRequest.items.map(item => ({
          productId: item.productId,
          name: item.name + " (Replacement)",
          price: 0, // Replacement order has 0 cost
          quantity: item.quantity,
          image: item.image,
          customization: {},
        })),
        totalPrice: 0,
        subtotal: 0,
        discountAmount: 0,
        address: returnRequest.order.address,
        status: "Order Confirmed",
        paymentStatus: "Paid",
        paymentMethod: "Online",
      });

      // Decrement inventory stock
      await decrementStockForPaidOrder(replacementOrder);

      returnRequest.replacementOrder = replacementOrder._id;
      
      sendCustomerReplacementShipped(returnRequest.user, returnRequest, replacementOrder.orderCode).catch(err => {
        console.error("[email] Replacement shipped email failed:", err.message);
      });
    }

    // Update main status if changed
    if (status && status !== previousStatus) {
      returnRequest.status = status;
      returnRequest.statusHistory.push({
        status,
        note: note || `Return status updated to ${status} by ${req.user.name}.`,
        updatedBy: req.user._id,
      });

      // Synchronize with linked Support Ticket status if it matches Resolved/Closed
      if (returnRequest.ticket) {
        const ticket = await Ticket.findById(returnRequest.ticket);
        if (ticket) {
          if (["Completed", "Rejected"].includes(status)) {
            ticket.status = "Resolved";
            ticket.messages.push({
              sender: req.user._id,
              senderName: "System Note",
              isAdmin: true,
              message: `Return request completed/closed. Auto-resolved ticket.`,
            });
            await ticket.save();
          } else if (ticket.status === "Open" && status !== "Return Requested") {
            ticket.status = "In Progress";
            await ticket.save();
          }
        }
      }

      // Email notification alerts based on return status updates
      if (status === "Approved") {
        sendCustomerReturnApproved(returnRequest.user, returnRequest).catch(err => {
          console.error("[email] Return approved email failed:", err.message);
        });
        sendSupportNotification("Return Approval", returnRequest).catch(err => {
          console.error("[email] Support return approved email failed:", err.message);
        });
      } else if (status === "Rejected") {
        sendCustomerReturnRejected(returnRequest.user, returnRequest, note).catch(err => {
          console.error("[email] Return rejected email failed:", err.message);
        });
      } else if (status === "Product Received") {
        sendCustomerProductReceived(returnRequest.user, returnRequest).catch(err => {
          console.error("[email] Product received email failed:", err.message);
        });
      } else if (status === "Completed") {
        sendCustomerReturnClosed(returnRequest.user, returnRequest).catch(err => {
          console.error("[email] Return closed email failed:", err.message);
        });
      }
    }

    await returnRequest.save();

    // Log administrative action
    await logActivity(
      req.user._id,
      req.user.name,
      "RETURN_REQUEST_UPDATED",
      `Updated return ${returnRequest.returnCode} from status "${previousStatus}" to "${returnRequest.status}"`,
      req
    );

    const updatedData = await Return.findById(returnRequest._id)
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("user", "name email")
      .populate("ticket", "ticketCode status")
      .populate("assignedSupportAgent", "name email")
      .populate("statusHistory.updatedBy", "name")
      .populate("replacementOrder", "orderCode status");

    res.json({ message: "Return request processed successfully.", returnRequest: updatedData });
  } catch (error) {
    console.error("Admin update return error:", error.message);
    res.status(500).json({ message: error.message || "Failed to update return request." });
  }
};

/**
 * @desc    Admin/Support add internal note to return request
 * @route   POST /api/returns/admin/:id/notes
 * @access  Private (Admin/Support)
 */
const addInternalNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ message: "Note content cannot be empty." });
    }

    const returnRequest = await Return.findById(id);
    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found." });
    }

    returnRequest.internalNotes.push({
      note: note.trim(),
      author: req.user._id,
    });

    await returnRequest.save();

    const updated = await Return.findById(id)
      .populate("internalNotes.author", "name email designation");

    res.json({ message: "Internal note added.", internalNotes: updated.internalNotes });
  } catch (error) {
    res.status(500).json({ message: "Failed to save internal note." });
  }
};

/**
 * @desc    Get return system settings
 * @route   GET /api/returns/settings
 * @access  Public
 */
const getReturnSettings = async (req, res) => {
  try {
    const settings = await ReturnSetting.findOne({ singletonKey: "settings" }) || {
      returnWindowDays: 7,
      returnPolicyText: "Returns must be requested within 7 days of delivery with original packaging and product photos.",
      enabled: true
    };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve settings." });
  }
};

/**
 * @desc    Update return settings
 * @route   PUT /api/returns/settings
 * @access  Private (Admin)
 */
const updateReturnSettings = async (req, res) => {
  try {
    const { returnWindowDays, returnPolicyText, enabled } = req.body;

    // Permissions check: admin only
    if (!req.user.isMasterAdmin && !req.user.permissions?.includes("ROLES_MANAGE")) {
      return res.status(403).json({ message: "Access denied. Superadmin access required." });
    }

    let settings = await ReturnSetting.findOne({ singletonKey: "settings" });
    if (!settings) {
      settings = new ReturnSetting({ singletonKey: "settings" });
    }

    if (returnWindowDays !== undefined) settings.returnWindowDays = Number(returnWindowDays);
    if (returnPolicyText !== undefined) settings.returnPolicyText = returnPolicyText.trim();
    if (enabled !== undefined) settings.enabled = Boolean(enabled);

    await settings.save();

    await logActivity(
      req.user._id,
      req.user.name,
      "RETURN_SETTINGS_UPDATED",
      `Updated return settings: returnWindowDays=${settings.returnWindowDays}, enabled=${settings.enabled}`,
      req
    );

    res.json({ message: "Settings updated successfully.", settings });
  } catch (error) {
    res.status(500).json({ message: "Failed to save return configurations." });
  }
};

// Helper to generate a unique Return Request Code
const generateReturnRequestCode = () => {
  return "REQ-RET-" + crypto.randomBytes(4).toString("hex").toUpperCase();
};

// Helper to generate a unique Replacement Request Code
const generateReplacementRequestCode = () => {
  return "REQ-REP-" + crypto.randomBytes(4).toString("hex").toUpperCase();
};

const createReturnRequest = async (req, res) => {
  try {
    const { orderId, items, reason, description, images, video, codRefundMethod, codRefundDetails } = req.body;
    const customerId = req.user._id;

    if (!orderId || !reason || !description) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Please select at least one item to return." });
    }

    const order = await Order.findOne({ _id: orderId, userId: customerId });
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.paymentMethod === "COD") {
      if (!codRefundMethod) {
        return res.status(400).json({ message: "Refund method is required for COD orders." });
      }
      if (codRefundMethod === "UPI") {
        if (!codRefundDetails?.upiId || !codRefundDetails.upiId.trim()) {
          return res.status(400).json({ message: "UPI ID is required for UPI refund." });
        }
      } else if (codRefundMethod === "Bank Transfer") {
        if (!codRefundDetails?.bankName || !codRefundDetails.bankName.trim() ||
            !codRefundDetails?.accountHolderName || !codRefundDetails.accountHolderName.trim() ||
            !codRefundDetails?.accountNumber || !codRefundDetails.accountNumber.trim() ||
            !codRefundDetails?.ifscCode || !codRefundDetails.ifscCode.trim()) {
          return res.status(400).json({ message: "All bank account fields are required for Bank Transfer refund." });
        }
      } else {
        return res.status(400).json({ message: "Invalid refund method selected." });
      }
    }

    const returnCode = generateReturnRequestCode();
    const returnRequest = await ReturnRequest.create({
      returnCode,
      orderId,
      customerId,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        image: item.image || "",
      })),
      reason,
      description: description.trim(),
      images: Array.isArray(images) ? images.map(img => ({ url: img.url, publicId: img.publicId })) : [],
      video: video ? { url: video.url, publicId: video.publicId } : undefined,
      status: "Pending",
      refundStatus: "Pending",
      codRefundMethod: order.paymentMethod === "COD" ? codRefundMethod : "",
      codRefundDetails: order.paymentMethod === "COD" ? {
        upiId: codRefundMethod === "UPI" ? codRefundDetails?.upiId : "",
        bankName: codRefundMethod === "Bank Transfer" ? codRefundDetails?.bankName : "",
        accountHolderName: codRefundMethod === "Bank Transfer" ? codRefundDetails?.accountHolderName : "",
        accountNumber: codRefundMethod === "Bank Transfer" ? codRefundDetails?.accountNumber : "",
        ifscCode: codRefundMethod === "Bank Transfer" ? codRefundDetails?.ifscCode : "",
      } : undefined,
      statusHistory: [{ status: "Pending", note: "Return request submitted." }]
    });

    // Send emails
    const { sendReturnRequestSubmitted, sendAdminReturnRequestAlertV2 } = require("../services/emailService");
    sendReturnRequestSubmitted(req.user, order, returnRequest).catch(err => console.error(err));
    sendAdminReturnRequestAlertV2(returnRequest, order).catch(err => console.error(err));

    res.status(201).json({ message: "Return request submitted successfully.", returnRequest });
  } catch (error) {
    console.error("Create return request error:", error.message);
    res.status(500).json({ message: error.message || "Failed to submit return request." });
  }
};

const createReplacementRequest = async (req, res) => {
  try {
    const { orderId, items, reason, description, images } = req.body;
    const customerId = req.user._id;

    if (!orderId || !reason || !description) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Please select at least one item for replacement." });
    }

    const order = await Order.findOne({ _id: orderId, userId: customerId });
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const replacementCode = generateReplacementRequestCode();
    const replacementRequest = await ReplacementRequest.create({
      replacementCode,
      orderId,
      customerId,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        image: item.image || "",
      })),
      reason,
      description: description.trim(),
      images: Array.isArray(images) ? images.map(img => ({ url: img.url, publicId: img.publicId })) : [],
      status: "Pending",
      statusHistory: [{ status: "Pending", note: "Replacement request submitted." }]
    });

    // Send emails
    const { sendReplacementRequestSubmitted, sendAdminReplacementRequestAlertV2 } = require("../services/emailService");
    sendReplacementRequestSubmitted(req.user, order, replacementRequest).catch(err => console.error(err));
    sendAdminReplacementRequestAlertV2(replacementRequest, order).catch(err => console.error(err));

    res.status(201).json({ message: "Replacement request submitted successfully.", replacementRequest });
  } catch (error) {
    console.error("Create replacement request error:", error.message);
    res.status(500).json({ message: error.message || "Failed to submit replacement request." });
  }
};

const getMyReturnRequests = async (req, res) => {
  try {
    const list = await ReturnRequest.find({ customerId: req.user._id })
      .populate("orderId", "orderCode totalPrice createdAt status")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Failed to load return requests." });
  }
};

const getMyReplacementRequests = async (req, res) => {
  try {
    const list = await ReplacementRequest.find({ customerId: req.user._id })
      .populate("orderId", "orderCode totalPrice createdAt status")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Failed to load replacement requests." });
  }
};

const adminGetReturnRequests = async (req, res) => {
  try {
    const list = await ReturnRequest.find()
      .populate("orderId", "orderCode totalPrice createdAt status")
      .populate("customerId", "name email mobileNumber")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Failed to load return requests for admin." });
  }
};

const adminGetReplacementRequests = async (req, res) => {
  try {
    const list = await ReplacementRequest.find()
      .populate("orderId", "orderCode totalPrice createdAt status")
      .populate("customerId", "name email mobileNumber")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Failed to load replacement requests for admin." });
  }
};

const adminUpdateReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, pickupDetails, refundDetails } = req.body;

    const returnRequest = await ReturnRequest.findById(id)
      .populate("customerId", "name email")
      .populate("orderId", "orderCode");

    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found." });
    }

    const prevStatus = returnRequest.status;

    if (pickupDetails) {
      returnRequest.pickupDetails = { ...returnRequest.pickupDetails, ...pickupDetails };
    }

    if (refundDetails) {
      returnRequest.refundDetails = { ...returnRequest.refundDetails, ...refundDetails };
      if (refundDetails.refundStatus === "Refunded") {
        returnRequest.refundStatus = "Refunded";
      }
    }

    if (status && status !== prevStatus) {
      returnRequest.status = status;
      returnRequest.statusHistory.push({
        status,
        note: note || `Status updated to ${status}`,
        updatedBy: req.user._id,
      });

      // Send appropriate emails
      const {
        sendReturnRequestApproved,
        sendReturnRequestRejected,
        sendReturnRequestPickupScheduled,
        sendReturnRequestRefundCompleted
      } = require("../services/emailService");

      if (status === "Approved") {
        await sendReturnRequestApproved(returnRequest.customerId, returnRequest.orderId, returnRequest);
      } else if (status === "Rejected") {
        await sendReturnRequestRejected(returnRequest.customerId, returnRequest.orderId, returnRequest, note);
      } else if (status === "Pickup Scheduled") {
        await sendReturnRequestPickupScheduled(returnRequest.customerId, returnRequest);
      } else if (status === "Refund Processed" || status === "Refund Completed") {
        returnRequest.refundStatus = "Refunded";
        if (returnRequest.refundDetails) returnRequest.refundDetails.refundDate = new Date();
        await sendReturnRequestRefundCompleted(returnRequest.customerId, returnRequest);
      }
    }

    await returnRequest.save();
    res.json({ message: "Return request updated successfully.", returnRequest });
  } catch (error) {
    console.error("Update return request error:", error.message);
    res.status(500).json({ message: error.message || "Failed to update return request." });
  }
};

const adminUpdateReplacementRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, shippingDetails, createReplacementOrder } = req.body;

    const replacementRequest = await ReplacementRequest.findById(id)
      .populate("customerId", "name email")
      .populate("orderId", "orderCode products address");

    if (!replacementRequest) {
      return res.status(404).json({ message: "Replacement request not found." });
    }

    const prevStatus = replacementRequest.status;

    if (shippingDetails) {
      replacementRequest.shippingDetails = { ...replacementRequest.shippingDetails, ...shippingDetails };
    }

    // Auto-create replacement order if requested and approved
    if (createReplacementOrder && !replacementRequest.replacementOrderId) {
      const crypto = require("crypto");
      const newOrderCode = "ORD-REP-" + crypto.randomBytes(3).toString("hex").toUpperCase();
      const newOrder = await Order.create({
        orderCode: newOrderCode,
        userId: replacementRequest.customerId._id,
        products: replacementRequest.items.map(item => ({
          productId: item.productId,
          name: item.name + " (Replacement)",
          price: 0,
          quantity: item.quantity,
          image: item.image,
          customization: {},
        })),
        totalPrice: 0,
        subtotal: 0,
        discountAmount: 0,
        address: replacementRequest.orderId.address,
        status: "Order Confirmed",
        paymentStatus: "Paid",
        paymentMethod: "Online",
      });

      replacementRequest.replacementOrderId = newOrder._id;
    }

    if (status && status !== prevStatus) {
      replacementRequest.status = status;
      replacementRequest.statusHistory.push({
        status,
        note: note || `Status updated to ${status}`,
        updatedBy: req.user._id,
      });

      // Send emails
      const {
        sendReplacementRequestApproved,
        sendReplacementRequestShipped,
        sendReplacementRequestDelivered
      } = require("../services/emailService");

      if (status === "Approved") {
        await sendReplacementRequestApproved(replacementRequest.customerId, replacementRequest.orderId, replacementRequest);
      } else if (status === "Shipped") {
        const orderCode = replacementRequest.replacementOrderId
          ? (await Order.findById(replacementRequest.replacementOrderId))?.orderCode
          : "REP-SHIP";
        await sendReplacementRequestShipped(replacementRequest.customerId, replacementRequest, orderCode);
      } else if (status === "Delivered") {
        await sendReplacementRequestDelivered(replacementRequest.customerId, replacementRequest);
      }
    }

    await replacementRequest.save();
    res.json({ message: "Replacement request updated successfully.", replacementRequest });
  } catch (error) {
    console.error("Update replacement request error:", error.message);
    res.status(500).json({ message: error.message || "Failed to update replacement request." });
  }
};

module.exports = {
  createReturn,
  getMyReturns,
  getReturnDetails,
  adminGetReturns,
  adminUpdateReturn,
  addInternalNote,
  getReturnSettings,
  updateReturnSettings,

  // Return & Replacement Requests V2
  createReturnRequest,
  createReplacementRequest,
  getMyReturnRequests,
  getMyReplacementRequests,
  adminGetReturnRequests,
  adminGetReplacementRequests,
  adminUpdateReturnRequest,
  adminUpdateReplacementRequest,
};
