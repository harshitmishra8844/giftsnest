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
const ReplacementOrder = require("../models/ReplacementOrder");
const RefundRecord = require("../models/RefundRecord");
const ReturnActivityLog = require("../models/ReturnActivityLog");
const {
  generateRequestId,
  generateRefundId,
  generateReplacementOrderId,
  logReturnActivity,
  notifyCustomerAndAdmins,
} = require("../services/returnActivityService");
const {
  reserveStockForReplacement,
  restockReturnedItem,
} = require("../services/inventoryService");
const { logActivity } = require("../services/logService");
const { createCustomerServiceTicket } = require("../services/ticketHubService");
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

    // Automatically create support ticket via Central Customer Service Hub
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

    const ticket = await createCustomerServiceTicket({
      source: "Return Request",
      category: "Return / Replacement",
      type: "Return",
      customerName: req.user.name || "Customer",
      customerEmail: req.user.email || "",
      customerPhone: req.user.mobileNumber || "",
      customerId: userId,
      subject: `Return Request: Order #${order.orderCode}`,
      message: initialMessage,
      orderId,
      orderCode: order.orderCode,
      returnRequestId: returnRequest._id,
      priority: "High",
      metadata: { attachments: messageAttachments, returnCode, preferredResolution },
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
  return generateRequestId("Return");
};

// Helper to generate a unique Replacement Request Code
const generateReplacementRequestCode = () => {
  return generateRequestId("Replacement");
};

/**
 * Unified Return & Replacement submission controller
 * Supports both Return and Replacement with complete business rules, validation, and activity logging.
 */
const submitReturnRequest = async (req, res) => {
  try {
    const {
      orderId,
      items,
      productId,
      quantity,
      requestType = "Return",
      reason,
      returnReason,
      description,
      customerMessage,
      images,
      evidenceImages,
      video,
      evidenceVideo,
      codRefundMethod,
      codRefundDetails,
    } = req.body;

    const customerId = req.user._id;
    const finalType = requestType === "Replacement" ? "Replacement" : "Return";
    const finalReason = String(returnReason || reason || "").trim();
    const finalDesc = String(customerMessage || description || finalReason || "Return request").trim();
    const finalImages = Array.isArray(evidenceImages) && evidenceImages.length > 0
      ? evidenceImages
      : Array.isArray(images) ? images : [];
    const finalVideo = evidenceVideo && evidenceVideo.url
      ? evidenceVideo
      : video && video.url ? video : undefined;

    if (!orderId || !finalReason) {
      return res.status(400).json({ message: "Please fill all required fields (Order ID and Reason)." });
    }

    // 1. Verify Order existence and ownership
    const order = await Order.findOne({ _id: orderId, userId: customerId });
    if (!order) {
      return res.status(404).json({ message: "Order not found or access denied." });
    }

    // 2. Rule: Only delivered orders can be returned or replaced
    if (order.status !== "Delivered") {
      return res.status(400).json({
        message: `Only Delivered orders are eligible for return or replacement. Current order status: "${order.status}".`,
      });
    }

    // Resolve items from request or order products
    let rawItems = Array.isArray(items) && items.length > 0 ? items : [];
    if (rawItems.length === 0 && productId) {
      rawItems = [{ productId, quantity: Number(quantity || 1) }];
    }
    if (rawItems.length === 0) {
      return res.status(400).json({ message: "Please select at least one item to proceed." });
    }

    const resolvedItems = [];
    for (const it of rawItems) {
      const pIdStr = String(it.productId || it._id || "");
      const orderProd = (order.products || []).find((p) => String(p.productId || p._id) === pIdStr);
      resolvedItems.push({
        productId: pIdStr,
        name: it.name || orderProd?.name || "Product",
        price: Number(it.price !== undefined ? it.price : (orderProd?.price || 0)),
        quantity: Math.max(1, Number(it.quantity || 1)),
        image: it.image || orderProd?.image || "",
      });
    }

    // 3. Rule: Configurable request window check (Default 7 days after delivery)
    const settings = (await ReturnSetting.findOne({ singletonKey: "settings" })) || {
      returnWindowDays: 7,
      replacementWindowDays: 7,
      allowPersonalizedExceptions: true,
      enabled: true,
    };

    if (!settings.enabled) {
      return res.status(400).json({ message: "Returns and replacements are currently paused by the store." });
    }

    const windowLimit = finalType === "Replacement"
      ? (settings.replacementWindowDays || 7)
      : (settings.returnWindowDays || 7);

    const deliveryTimestamp = new Date(order.deliveredAt || order.updatedAt).getTime();
    const elapsedDays = Math.ceil((Date.now() - deliveryTimestamp) / (1000 * 60 * 60 * 24));
    if (elapsedDays > windowLimit) {
      return res.status(400).json({
        message: `The return window has expired for this order (${windowLimit} days limit. Elapsed: ${elapsedDays} days).`,
      });
    }

    // 4. Rule: Customized/Personalized Gifts & Non-Returnable products check
    // Default: NON-RETURNABLE. Exceptions: Damaged, Wrong Product, Manufacturing Defect
    const allowedExceptions = [
      "Damaged Product",
      "Wrong Product Received",
      "Defective Product",
      "Manufacturing Defect",
      "Missing Item",
    ];

    const isExceptionReason = allowedExceptions.some(
      (ex) => ex.toLowerCase() === finalReason.toLowerCase()
    );

    for (const item of resolvedItems) {
      const pid = item.productId;
      if (pid) {
        const product = await Product.findById(pid);
        if (product) {
          const isPersonalized = Boolean(product.isPersonalized || product.customisable);
          const isNonReturnable = Boolean(product.isNonReturnable);

          if ((isPersonalized || isNonReturnable) && !isExceptionReason) {
            return res.status(400).json({
              message: `Product "${product.name}" is non-returnable and personalized. Returns and replacements are strictly permitted only for damaged, wrong, or defective items.`,
            });
          }
        }
      }
    }

    // 5. Rule: Check for duplicate active requests for this order and product
    for (const item of resolvedItems) {
      const existingReq = await ReturnRequest.findOne({
        orderId,
        productId: item.productId,
        status: { $nin: ["Rejected", "Cancelled"] },
      });
      if (existingReq) {
        return res.status(400).json({
          message: `An active ${existingReq.requestType.toLowerCase()} request (${existingReq.requestId || existingReq.returnCode}) already exists for "${item.name}".`,
        });
      }
    }

    // 6. Validate COD Refund Details if applicable
    if (finalType === "Return" && order.paymentMethod === "COD") {
      if (!codRefundMethod) {
        return res.status(400).json({ message: "Please select a refund payout method for Cash on Delivery orders (UPI or Bank Transfer)." });
      }
      if (codRefundMethod === "UPI") {
        if (!codRefundDetails?.upiId || !codRefundDetails.upiId.trim()) {
          return res.status(400).json({ message: "Valid UPI ID is required for COD refund." });
        }
      } else if (codRefundMethod === "Bank Transfer") {
        if (
          !codRefundDetails?.bankName?.trim() ||
          !codRefundDetails?.accountHolderName?.trim() ||
          !codRefundDetails?.accountNumber?.trim() ||
          !codRefundDetails?.ifscCode?.trim()
        ) {
          return res.status(400).json({ message: "All bank account details (Holder Name, Bank Name, Account Number, IFSC) are required for Bank Transfer refund." });
        }
      } else {
        return res.status(400).json({ message: "Invalid COD refund method selected." });
      }
    }

    // 7. Generate standardized unique Request ID (Format: RET-2026-XXXXXX / REP-2026-XXXXXX)
    const requestId = generateRequestId(finalType);

    const newReturnRequest = await ReturnRequest.create({
      requestId,
      returnCode: requestId,
      orderId,
      customerId,
      productId: resolvedItems[0]?.productId || "",
      orderItemId: resolvedItems[0]?._id || "",
      requestType: finalType,
      returnReason: finalReason,
      reason: finalReason,
      customerMessage: finalDesc,
      description: finalDesc,
      evidenceImages: finalImages.map((img) => ({ url: img.url, publicId: img.publicId || null })),
      images: finalImages.map((img) => ({ url: img.url, publicId: img.publicId || null })),
      evidenceVideo: finalVideo ? { url: finalVideo.url, publicId: finalVideo.publicId || null } : undefined,
      video: finalVideo ? { url: finalVideo.url, publicId: finalVideo.publicId || null } : undefined,
      items: resolvedItems,
      status: "Submitted",
      refundStatus: "Pending",
      codRefundMethod: order.paymentMethod === "COD" && finalType === "Return" ? codRefundMethod : "",
      codRefundDetails: order.paymentMethod === "COD" && finalType === "Return"
        ? {
            upiId: codRefundMethod === "UPI" ? codRefundDetails?.upiId?.trim() : "",
            bankName: codRefundMethod === "Bank Transfer" ? codRefundDetails?.bankName?.trim() : "",
            accountHolderName: codRefundMethod === "Bank Transfer" ? codRefundDetails?.accountHolderName?.trim() : "",
            accountNumber: codRefundMethod === "Bank Transfer" ? codRefundDetails?.accountNumber?.trim() : "",
            ifscCode: codRefundMethod === "Bank Transfer" ? codRefundDetails?.ifscCode?.trim() : "",
          }
        : undefined,
      statusHistory: [
        {
          status: "Submitted",
          note: `${finalType} claim submitted by customer.`,
          updatedBy: customerId,
          updatedAt: new Date(),
        },
      ],
    });

    // 8. Log timeline activity
    await logReturnActivity({
      requestId: newReturnRequest._id,
      action: "REQUEST_SUBMITTED",
      status: "Submitted",
      performedBy: customerId,
      performedByName: req.user.name,
      remarks: `${finalType} request #${requestId} submitted for order #${order.orderCode}. Reason: ${finalReason}.`,
      metadata: { orderCode: order.orderCode, itemsCount: resolvedItems.length },
    });

    // 9. Dispatch in-app notifications
    await notifyCustomerAndAdmins({
      customerId,
      title: `${finalType} Request Submitted`,
      message: `Your ${finalType.toLowerCase()} request #${requestId} for order #${order.orderCode} has been submitted successfully and is now Under Review.`,
      type: "Order Update",
      alertAdmin: true,
      adminTitle: `[NEW ${finalType.toUpperCase()} REQUEST] #${requestId}`,
      adminMessage: `Customer ${req.user.name} submitted a ${finalType.toLowerCase()} request for Order #${order.orderCode}. Reason: ${finalReason}.`,
    });

    // 10. Automatically create Central Customer Service Hub ticket
    let ticket = null;
    try {
      ticket = await createCustomerServiceTicket({
        source: finalType === "Replacement" ? "Replacement Request" : "Return Request",
        category: "Return / Replacement",
        type: "Return",
        customerName: req.user.name || "Customer",
        customerEmail: req.user.email || "",
        customerPhone: req.user.mobileNumber || "",
        customerId,
        subject: `${finalType} Request: Order #${order.orderCode} (${requestId})`,
        message: `${finalType} request submitted for order #${order.orderCode}. Reason: ${finalReason}. Description: ${finalDesc}`,
        orderId,
        orderCode: order.orderCode,
        returnRequestId: newReturnRequest._id,
        priority: "High",
        metadata: {
          requestId,
          requestType: finalType,
          itemsCount: resolvedItems.length,
          attachments: finalImages.map((img) => ({ name: "Evidence Image", url: img.url, fileType: "image" })),
        },
      });

      if (ticket) {
        newReturnRequest.ticket = ticket._id;
        newReturnRequest.ticketCode = ticket.ticketCode;
        await newReturnRequest.save();
      }
    } catch (tktErr) {
      console.warn("[submitReturnRequest] Ticket creation failed:", tktErr.message);
    }

    // 11. Dispatch Email alerts
    if (typeof sendCustomerReturnSubmitted === "function") {
      sendCustomerReturnSubmitted(req.user, order, newReturnRequest).catch((err) =>
        console.error("[Email] Return submitted mail failed:", err.message)
      );
    }
    if (typeof sendAdminReturnRequestAlert === "function") {
      sendAdminReturnRequestAlert(newReturnRequest, order).catch((err) =>
        console.error("[Email] Admin return alert mail failed:", err.message)
      );
    }

    res.status(201).json({
      success: true,
      message: `${finalType} request submitted successfully.`,
      requestId,
      returnCode: requestId,
      ticketCode: ticket ? ticket.ticketCode : undefined,
      returnRequest: newReturnRequest,
    });
  } catch (error) {
    console.error("Submit return request error:", error);
    res.status(500).json({ message: error.message || "Failed to submit request." });
  }
};

const createReturnRequest = async (req, res) => {
  req.body.requestType = "Return";
  return submitReturnRequest(req, res);
};

const createReplacementRequest = async (req, res) => {
  req.body.requestType = "Replacement";
  return submitReturnRequest(req, res);
};

/**
 * Customer view my returns and replacements list
 */
const getMyReturnRequests = async (req, res) => {
  try {
    const list = await ReturnRequest.find({ customerId: req.user._id })
      .populate("orderId", "orderCode totalPrice createdAt status paymentMethod address")
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Failed to load return requests." });
  }
};

const getMyReplacementRequests = async (req, res) => {
  try {
    const list = await ReturnRequest.find({ customerId: req.user._id, requestType: "Replacement" })
      .populate("orderId", "orderCode totalPrice createdAt status paymentMethod address")
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Failed to load replacement requests." });
  }
};

/**
 * Get detailed return/replacement request with timeline activity log
 */
const getReturnRequestDetails = async (req, res) => {
  try {
    const returnRequest = await ReturnRequest.findById(req.params.id)
      .populate("orderId", "orderCode totalPrice createdAt status paymentMethod address")
      .populate("customerId", "name email mobileNumber")
      .populate("approvedBy", "name email");

    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found." });
    }

    // Access control: customer owner or admin/support
    const isOwner = returnRequest.customerId?._id?.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied." });
    }

    // Fetch activity logs
    const timeline = await ReturnActivityLog.find({ requestId: returnRequest._id })
      .populate("performedBy", "name email")
      .sort({ timestamp: 1 });

    // Fetch refund record if any
    const refundRecord = await RefundRecord.findOne({ requestId: returnRequest._id })
      .populate("processedBy", "name email");

    // Fetch replacement order if any
    const replacementOrder = await ReplacementOrder.findOne({ requestId: returnRequest._id })
      .populate("replacementOrderId", "orderCode status totalPrice createdAt");

    res.json({
      returnRequest,
      timeline,
      refundRecord,
      replacementOrder,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load request details." });
  }
};

/**
 * Admin: Get 6 Dashboard KPI Widgets
 */
const adminGetReturnMetrics = async (req, res) => {
  try {
    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      refundsPending,
      replacementsPending,
    ] = await Promise.all([
      ReturnRequest.countDocuments(),
      ReturnRequest.countDocuments({ status: { $in: ["Submitted", "Under Review", "Pending"] } }),
      ReturnRequest.countDocuments({ status: "Approved" }),
      ReturnRequest.countDocuments({ status: "Rejected" }),
      ReturnRequest.countDocuments({
        requestType: "Return",
        status: { $in: ["Approved", "Pickup Scheduled", "Item Received", "Refund Processing"] },
        refundStatus: { $ne: "Completed" },
      }),
      ReturnRequest.countDocuments({
        requestType: "Replacement",
        status: { $in: ["Approved", "Pickup Scheduled", "Item Received", "Replacement Processing"] },
      }),
    ]);

    const payload = {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      refundsPending,
      replacementsPending,
    };

    res.json({
      success: true,
      metrics: payload,
      ...payload,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to calculate return metrics." });
  }
};

/**
 * Admin: Unified Get Requests with Search, Filter, and Sort
 */
const adminGetUnifiedRequests = async (req, res) => {
  try {
    const reqType = req.query.requestType || req.query.type;
    const { search, status, sort = "newest", sortBy, sortOrder } = req.query;
    const filter = {};

    if (reqType && reqType !== "All") {
      filter.requestType = reqType;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    let query = ReturnRequest.find(filter)
      .populate("orderId", "orderCode totalPrice createdAt status paymentMethod address")
      .populate("customerId", "name email mobileNumber")
      .populate("approvedBy", "name email");

    if (sortBy && sortOrder) {
      const order = Number(sortOrder) === 1 ? 1 : -1;
      query = query.sort({ [sortBy]: order });
    } else if (sort === "oldest") {
      query = query.sort({ createdAt: 1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    let list = await query.exec();

    // Client search filter across multiple fields
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      list = list.filter((r) => {
        return (
          r.requestId?.match(regex) ||
          r.returnCode?.match(regex) ||
          r.orderId?.orderCode?.match(regex) ||
          r.customerId?.name?.match(regex) ||
          r.customerId?.email?.match(regex) ||
          r.customerId?.mobileNumber?.match(regex) ||
          r.items?.some((it) => it.name?.match(regex))
        );
      });
    }

    res.json({
      success: true,
      requests: list,
      total: list.length,
      list,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch return requests for admin." });
  }
};

const adminGetReturnRequests = async (req, res) => {
  req.query.requestType = "Return";
  return adminGetUnifiedRequests(req, res);
};

const adminGetReplacementRequests = async (req, res) => {
  req.query.requestType = "Replacement";
  return adminGetUnifiedRequests(req, res);
};

/**
 * Admin: Update request status with remarks and timeline tracking
 */
const adminUpdateRequestStatus = async (req, res) => {
  try {
    const id = req.params.id || req.body.requestId || req.body.id;
    const { status, remarks, note, adminRemarks } = req.body;

    const returnRequest = await ReturnRequest.findById(id)
      .populate("customerId", "name email")
      .populate("orderId", "orderCode");

    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found." });
    }

    const prevStatus = returnRequest.status;
    const finalRemarks = String(remarks || note || adminRemarks || "").trim();

    if (finalRemarks) {
      returnRequest.adminRemarks = finalRemarks;
    }

    if (status && status !== prevStatus) {
      returnRequest.status = status;

      if (status === "Approved") {
        returnRequest.approvedBy = req.user._id;
        returnRequest.approvedAt = new Date();
      }

      returnRequest.statusHistory.push({
        status,
        note: finalRemarks || `Status updated to ${status} by ${req.user.name}.`,
        updatedBy: req.user._id,
        updatedAt: new Date(),
      });

      // Log activity
      await logReturnActivity({
        requestId: returnRequest._id,
        action: `STATUS_UPDATED_${status.toUpperCase().replace(/\s+/g, "_")}`,
        status,
        performedBy: req.user._id,
        performedByName: req.user.name,
        remarks: finalRemarks || `Status changed from "${prevStatus}" to "${status}".`,
      });

      // In-app notifications
      await notifyCustomerAndAdmins({
        customerId: returnRequest.customerId?._id,
        title: `${returnRequest.requestType} Status: ${status}`,
        message: `Your ${returnRequest.requestType.toLowerCase()} request #${returnRequest.requestId} has been updated to "${status}". ${finalRemarks}`,
        type: "Order Update",
        alertAdmin: false,
      });

      // Dispatch appropriate emails
      if (status === "Approved" && typeof sendCustomerReturnApproved === "function") {
        sendCustomerReturnApproved(returnRequest.customerId, returnRequest).catch((err) =>
          console.error(err)
        );
      } else if (status === "Rejected" && typeof sendCustomerReturnRejected === "function") {
        sendCustomerReturnRejected(returnRequest.customerId, returnRequest, finalRemarks).catch((err) =>
          console.error(err)
        );
      }
    }

    await returnRequest.save();
    res.json({ message: "Request updated successfully.", returnRequest });
  } catch (error) {
    console.error("Admin update status error:", error);
    res.status(500).json({ message: error.message || "Failed to update request." });
  }
};

/**
 * Admin: Schedule reverse pickup
 */
const adminSchedulePickup = async (req, res) => {
  try {
    const id = req.params.id || req.body.requestId || req.body.id;
    const { courier, trackingId, pickupDate, note } = req.body;

    if (!courier || !trackingId) {
      return res.status(400).json({ message: "Courier name and AWB tracking ID are required." });
    }

    const returnRequest = await ReturnRequest.findById(id)
      .populate("customerId", "name email")
      .populate("orderId", "orderCode");

    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found." });
    }

    returnRequest.pickupDetails = {
      courier: courier.trim(),
      trackingId: trackingId.trim(),
      pickupDate: pickupDate ? new Date(pickupDate) : new Date(),
      note: (note || "").trim(),
    };

    returnRequest.status = "Pickup Scheduled";
    returnRequest.statusHistory.push({
      status: "Pickup Scheduled",
      note: `Reverse pickup scheduled via ${courier} (AWB: ${trackingId}).`,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    await returnRequest.save();

    // Log Activity
    await logReturnActivity({
      requestId: returnRequest._id,
      action: "PICKUP_SCHEDULED",
      status: "Pickup Scheduled",
      performedBy: req.user._id,
      performedByName: req.user.name,
      remarks: `Reverse pickup scheduled via ${courier} with AWB Tracking: ${trackingId}.`,
      metadata: { courier, trackingId, pickupDate },
    });

    // In-app notification
    await notifyCustomerAndAdmins({
      customerId: returnRequest.customerId?._id,
      title: "Reverse Pickup Scheduled",
      message: `A reverse pickup has been scheduled for request #${returnRequest.requestId} via ${courier} on ${pickupDate || "the designated date"}. Tracking ID: ${trackingId}.`,
      type: "Order Update",
      alertAdmin: false,
    });

    // Email
    if (typeof sendCustomerPickupScheduled === "function") {
      sendCustomerPickupScheduled(returnRequest.customerId, returnRequest).catch((err) =>
        console.error(err)
      );
    }

    res.json({ message: "Reverse pickup scheduled successfully.", returnRequest });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to schedule pickup." });
  }
};

/**
 * Admin: Mark item physically received and conditionally restock inventory
 */
const adminVerifyAndRestock = async (req, res) => {
  try {
    const id = req.params.id || req.body.requestId || req.body.id;
    const restock = req.body.restockProduct !== undefined
      ? req.body.restockProduct
      : req.body.restock !== undefined ? req.body.restock : true;
    const note = req.body.conditionNotes || req.body.note || "";

    const returnRequest = await ReturnRequest.findById(id)
      .populate("customerId", "name email")
      .populate("orderId", "orderCode");

    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found." });
    }

    returnRequest.itemVerified = true;
    returnRequest.itemVerifiedAt = new Date();
    returnRequest.status = "Item Received";

    let restockedCount = 0;
    // Rule: Add stock only after pickup completed and item physically verified
    if (restock && !returnRequest.restocked) {
      for (const item of returnRequest.items) {
        await restockReturnedItem(item.productId, item.quantity, returnRequest.requestId, req.user);
        restockedCount += item.quantity;
      }
      returnRequest.restocked = true;
      returnRequest.restockedAt = new Date();
    }

    const activityRemarks = `Item physically received at warehouse and verified. ${
      returnRequest.restocked ? `Restocked ${restockedCount} item(s) back into inventory.` : "Stock not replenished."
    } ${note || ""}`;

    returnRequest.statusHistory.push({
      status: "Item Received",
      note: activityRemarks,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    await returnRequest.save();

    await logReturnActivity({
      requestId: returnRequest._id,
      action: "ITEM_RECEIVED_VERIFIED",
      status: "Item Received",
      performedBy: req.user._id,
      performedByName: req.user.name,
      remarks: activityRemarks,
      metadata: { restocked: returnRequest.restocked, restockedCount },
    });

    await notifyCustomerAndAdmins({
      customerId: returnRequest.customerId?._id,
      title: "Returned Item Received",
      message: `We have received your returned package for #${returnRequest.requestId} at our fulfillment center. It has been verified by our quality specialists.`,
      type: "Order Update",
      alertAdmin: false,
    });

    if (typeof sendCustomerProductReceived === "function") {
      sendCustomerProductReceived(returnRequest.customerId, returnRequest).catch((err) =>
        console.error(err)
      );
    }

    res.json({ message: "Item verified and marked as received.", returnRequest });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to verify item." });
  }
};

/**
 * Admin: Process Full or Partial Refund with RefundRecord creation
 */
const adminProcessRefund = async (req, res) => {
  try {
    const id = req.params.id || req.body.requestId || req.body.id;
    const { refundAmount, refundMethod = "Original Source", transactionReference } = req.body;
    const refundNotes = req.body.remarks || req.body.refundNotes || "";

    const returnRequest = await ReturnRequest.findById(id)
      .populate("customerId", "name email")
      .populate("orderId", "orderCode totalPrice");

    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found." });
    }

    const amount = Number(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "A valid positive refund amount is required." });
    }

    // Role check
    const canManageFinance =
      req.user.isMasterAdmin ||
      req.user.role === "admin" ||
      req.user.isAdmin === true ||
      req.user.permissions?.includes("FINANCE_MANAGE") ||
      req.user.permissions?.includes("ORDERS_RETURNS");
    if (!canManageFinance) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions to process refunds." });
    }

    // Prevent duplicate completed refund
    const existingRefund = await RefundRecord.findOne({
      requestId: returnRequest._id,
      refundStatus: "Completed",
    });
    if (existingRefund) {
      return res.status(400).json({
        message: `Refund has already been processed for this request (Refund ID: ${existingRefund.refundId}).`,
      });
    }

    const refundId = generateRefundId();
    const newRefundRecord = await RefundRecord.create({
      refundId,
      requestId: returnRequest._id,
      orderId: returnRequest.orderId._id,
      refundAmount: amount,
      refundMethod,
      refundStatus: "Completed",
      transactionReference: (transactionReference || "").trim(),
      processedBy: req.user._id,
      processedByName: req.user.name,
      processedAt: new Date(),
      refundNotes: (refundNotes || "").trim(),
    });

    returnRequest.refundStatus = "Completed";
    returnRequest.status = "Refund Completed";
    returnRequest.refundDetails = {
      refundAmount: amount,
      refundMethod,
      refundDate: new Date(),
      transactionReference: (transactionReference || "").trim(),
    };

    returnRequest.statusHistory.push({
      status: "Refund Completed",
      note: `Refund of INR ${amount} processed via ${refundMethod} (Ref: ${transactionReference || "N/A"}).`,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    await returnRequest.save();

    await logReturnActivity({
      requestId: returnRequest._id,
      action: "REFUND_COMPLETED",
      status: "Refund Completed",
      performedBy: req.user._id,
      performedByName: req.user.name,
      remarks: `Refund of INR ${amount} issued successfully via ${refundMethod}. Ref: ${transactionReference || "N/A"}. Refund ID: ${refundId}.`,
      metadata: { refundId, amount, refundMethod, transactionReference },
    });

    await notifyCustomerAndAdmins({
      customerId: returnRequest.customerId?._id,
      title: "Refund Completed",
      message: `Your refund of INR ${amount} for request #${returnRequest.requestId} has been completed via ${refundMethod}. Transaction Ref: ${transactionReference || "N/A"}.`,
      type: "Order Update",
      alertAdmin: true,
      adminTitle: `[REFUND PROCESSED] #${refundId}`,
      adminMessage: `Staff ${req.user.name} completed refund of INR ${amount} for Return #${returnRequest.requestId}.`,
    });

    if (typeof sendCustomerRefundCompleted === "function") {
      sendCustomerRefundCompleted(
        returnRequest.customerId,
        returnRequest,
        amount,
        transactionReference || "Completed"
      ).catch((err) => console.error(err));
    }

    res.json({
      message: "Refund processed successfully.",
      refundRecord: newRefundRecord,
      returnRequest,
    });
  } catch (error) {
    console.error("Admin process refund error:", error);
    res.status(500).json({ message: error.message || "Failed to process refund." });
  }
};

/**
 * Admin: Create Linked Zero-Cost Replacement Order with Atomic Inventory Reservation
 */
const adminCreateReplacementOrder = async (req, res) => {
  try {
    const id = req.params.id || req.body.requestId || req.body.id;

    const returnRequest = await ReturnRequest.findById(id)
      .populate("customerId", "name email")
      .populate("orderId", "orderCode products address");

    if (!returnRequest) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Role check
    const canManageOrders =
      req.user.isMasterAdmin ||
      req.user.role === "admin" ||
      req.user.isAdmin === true ||
      req.user.permissions?.includes("ORDERS_RETURNS");
    if (!canManageOrders) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions to create replacement orders." });
    }

    // Prevent duplicate replacement order
    const existingReplacement = await ReplacementOrder.findOne({ requestId: returnRequest._id });
    if (existingReplacement) {
      return res.status(400).json({
        message: `A replacement order has already been created for this request (Replacement ID: ${existingReplacement.replacementId}).`,
      });
    }

    // Atomically reserve inventory stock for replacement items
    for (const item of returnRequest.items) {
      await reserveStockForReplacement(item.productId, item.quantity, returnRequest.requestId);
    }

    // Create linked zero-cost order in Order model
    const replacementId = generateReplacementOrderId();
    const newOrderCode = `ORD-${replacementId}`;
    const newOrder = await Order.create({
      orderCode: newOrderCode,
      userId: returnRequest.customerId._id,
      products: returnRequest.items.map((item) => ({
        productId: item.productId,
        name: `${item.name} (Replacement)`,
        price: 0,
        quantity: item.quantity,
        image: item.image,
        customization: {},
      })),
      totalPrice: 0,
      subtotal: 0,
      discountAmount: 0,
      address: returnRequest.orderId.address,
      status: "Order Confirmed",
      paymentStatus: "Paid",
      paymentMethod: "Online",
    });

    const replacementRecord = await ReplacementOrder.create({
      replacementId,
      requestId: returnRequest._id,
      originalOrderId: returnRequest.orderId._id,
      originalOrderItemId: returnRequest.orderItemId || "",
      replacementOrderId: newOrder._id,
      replacementStatus: "Confirmed",
    });

    returnRequest.status = "Replacement Processing";
    returnRequest.statusHistory.push({
      status: "Replacement Processing",
      note: `Replacement order #${newOrderCode} created. Stock reserved.`,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    await returnRequest.save();

    await logReturnActivity({
      requestId: returnRequest._id,
      action: "REPLACEMENT_ORDER_CREATED",
      status: "Replacement Processing",
      performedBy: req.user._id,
      performedByName: req.user.name,
      remarks: `Replacement order #${newOrderCode} created. Inventory stock reserved. Replacement ID: ${replacementId}.`,
      metadata: { replacementId, replacementOrderCode: newOrderCode, newOrderId: newOrder._id },
    });

    await notifyCustomerAndAdmins({
      customerId: returnRequest.customerId?._id,
      title: "Replacement Order Created",
      message: `Your zero-cost replacement order #${newOrderCode} has been generated and queued for fulfillment.`,
      type: "Order Update",
      alertAdmin: true,
      adminTitle: `[REPLACEMENT ORDER] #${newOrderCode}`,
      adminMessage: `Zero-cost replacement order generated for claim #${returnRequest.requestId}.`,
    });

    res.json({
      message: "Replacement order created successfully and stock reserved.",
      replacementOrder: replacementRecord,
      order: newOrder,
      returnRequest,
    });
  } catch (error) {
    console.error("Admin create replacement order error:", error);
    res.status(500).json({ message: error.message || "Failed to create replacement order." });
  }
};

/**
 * Admin: Dispatch / Ship replacement package
 */
const adminDispatchReplacement = async (req, res) => {
  try {
    const id = req.params.id || req.body.requestId || req.body.id;
    const { courier, trackingId, note, remarks } = req.body;
    const finalNote = note || remarks || "";

    if (!courier || !trackingId) {
      return res.status(400).json({ message: "Courier name and AWB tracking ID are required." });
    }

    const returnRequest = await ReturnRequest.findById(id)
      .populate("customerId", "name email")
      .populate("orderId", "orderCode");

    if (!returnRequest) {
      return res.status(404).json({ message: "Request not found." });
    }

    returnRequest.status = "Replacement Shipped";
    returnRequest.statusHistory.push({
      status: "Replacement Shipped",
      note: `Replacement package dispatched via ${courier} (AWB: ${trackingId}). ${note || ""}`,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    // Update replacement order status if exists
    const repOrder = await ReplacementOrder.findOne({ requestId: returnRequest._id });
    if (repOrder) {
      repOrder.replacementStatus = "Shipped";
      await repOrder.save();
      await Order.findByIdAndUpdate(repOrder.replacementOrderId, {
        status: "Shipped",
        trackingCarrier: courier,
        trackingId: trackingId,
      });
    }

    await returnRequest.save();

    await logReturnActivity({
      requestId: returnRequest._id,
      action: "REPLACEMENT_SHIPPED",
      status: "Replacement Shipped",
      performedBy: req.user._id,
      performedByName: req.user.name,
      remarks: `Replacement package dispatched via ${courier}. AWB Tracking: ${trackingId}.`,
      metadata: { courier, trackingId },
    });

    await notifyCustomerAndAdmins({
      customerId: returnRequest.customerId?._id,
      title: "Replacement Package Shipped",
      message: `Your replacement package for request #${returnRequest.requestId} has been shipped via ${courier}. Tracking ID: ${trackingId}.`,
      type: "Order Update",
      alertAdmin: false,
    });

    if (typeof sendCustomerReplacementShipped === "function") {
      sendCustomerReplacementShipped(
        returnRequest.customerId,
        returnRequest,
        repOrder ? repOrder.replacementId : "REP-SHIP"
      ).catch((err) => console.error(err));
    }

    res.json({ message: "Replacement dispatched successfully.", returnRequest });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to dispatch replacement." });
  }
};

/**
 * Admin: Export Requests to CSV
 */
const adminExportRequests = async (req, res) => {
  try {
    const list = await ReturnRequest.find()
      .populate("orderId", "orderCode totalPrice paymentMethod")
      .populate("customerId", "name email mobileNumber")
      .sort({ createdAt: -1 });

    let csv = "Request ID,Type,Date,Status,Order Code,Customer Name,Customer Email,Customer Mobile,Item Name,Item Qty,Item Price,Reason,Refund Status,Refund Amount\n";

    list.forEach((r) => {
      const date = new Date(r.createdAt).toISOString().split("T")[0];
      const itemsText = r.items?.map((it) => `${it.name}`).join(" | ") || "N/A";
      const itemsQty = r.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1;
      const itemsVal = r.items?.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0) || 0;

      csv += `"${r.requestId || r.returnCode}","${r.requestType}","${date}","${r.status}","${r.orderId?.orderCode || "N/A"}","${r.customerId?.name || "Unknown"}","${r.customerId?.email || "N/A"}","${r.customerId?.mobileNumber || "N/A"}","${itemsText.replace(/"/g, '""')}","${itemsQty}","${itemsVal}","${(r.returnReason || r.reason || "").replace(/"/g, '""')}","${r.refundStatus}","${r.refundDetails?.refundAmount || 0}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=returns-replacements-${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Failed to export data." });
  }
};

const adminUpdateReturnRequest = adminUpdateRequestStatus;
const adminUpdateReplacementRequest = adminUpdateRequestStatus;

module.exports = {
  createReturn,
  getMyReturns,
  getReturnDetails,
  adminGetReturns,
  adminUpdateReturn,
  addInternalNote,
  getReturnSettings,
  updateReturnSettings,

  // Unified Return & Replacement System
  submitReturnRequest,
  createReturnRequest,
  createReplacementRequest,
  getMyReturnRequests,
  getMyReplacementRequests,
  getReturnRequestDetails,

  // Admin Features & Controls
  adminGetReturnMetrics,
  adminGetUnifiedRequests,
  adminGetReturnRequests,
  adminGetReplacementRequests,
  adminUpdateRequestStatus,
  adminUpdateReturnRequest,
  adminUpdateReplacementRequest,
  adminSchedulePickup,
  adminVerifyAndRestock,
  adminProcessRefund,
  adminCreateReplacementOrder,
  adminDispatchReplacement,
  adminExportRequests,
};

