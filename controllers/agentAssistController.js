const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Ticket = require("../models/Ticket");
const ReturnRequest = require("../models/ReturnRequest");
const ReplacementOrder = require("../models/ReplacementOrder");
const RefundRecord = require("../models/RefundRecord");
const CallbackRequest = require("../models/CallbackRequest");
const CustomerVerificationLog = require("../models/CustomerVerificationLog");
const AgentCallRemark = require("../models/AgentCallRemark");
const CustomerInteraction = require("../models/CustomerInteraction");
const CustomerTimeline = require("../models/CustomerTimeline");
const EmployeeActivityLog = require("../models/EmployeeActivityLog");
const ReturnActivityLog = require("../models/ReturnActivityLog");
const SlaTracking = require("../models/SlaTracking");
const TaskAssignment = require("../models/TaskAssignment");
const {
  generateRequestId,
  generateRefundId,
  generateReplacementOrderId,
  logReturnActivity,
  notifyCustomerAndAdmins,
} = require("../services/returnActivityService");
const { reserveStockForReplacement } = require("../services/inventoryService");
const { createCustomerServiceTicket, findAvailableExecutive } = require("../services/ticketHubService");
const { createAndDispatchNotification } = require("../services/notificationService");

const REFUND_APPROVAL_THRESHOLD = 2000; // In INR; refunds > 2000 require Team Lead approval

/**
 * 1. Universal Search (Customer, Order, Phone, Email, Ticket, Return Request)
 * GET /api/agent-assist/search?q=...
 */
const searchCustomerAndRecords = async (req, res) => {
  try {
    const rawQuery = (req.query.q || "").trim();
    if (!rawQuery || rawQuery.length < 2) {
      return res.json({ success: true, count: 0, customers: [] });
    }

    const regex = new RegExp(rawQuery, "i");
    const matchedCustomerIds = new Set();

    // 1. Search Users directly (non-admins)
    const matchedUsers = await User.find({
      isAdmin: { $ne: true },
      $or: [
        { name: regex },
        { email: regex },
        { mobileNumber: regex },
      ],
    })
      .select("_id name email mobileNumber status createdAt")
      .limit(10)
      .lean();

    matchedUsers.forEach((u) => matchedCustomerIds.add(u._id.toString()));

    // 2. Search Orders by Order Code
    const matchedOrders = await Order.find({ orderCode: regex })
      .select("userId orderCode totalPrice status createdAt")
      .limit(10)
      .lean();

    matchedOrders.forEach((o) => {
      if (o.userId) matchedCustomerIds.add(o.userId.toString());
    });

    // 3. Search Support Tickets by Ticket Code
    const matchedTickets = await Ticket.find({ ticketCode: regex })
      .select("user customerEmail customerPhone ticketCode subject")
      .limit(10)
      .lean();

    for (const t of matchedTickets) {
      if (t.user) {
        matchedCustomerIds.add(t.user.toString());
      } else if (t.customerEmail) {
        const found = await User.findOne({ email: t.customerEmail.toLowerCase(), isAdmin: { $ne: true } }).select("_id");
        if (found) matchedCustomerIds.add(found._id.toString());
      }
    }

    // 4. Search Return Requests by Request ID / Return Code
    const matchedReturns = await ReturnRequest.find({
      $or: [{ requestId: regex }, { returnCode: regex }],
    })
      .select("customerId requestId returnCode status")
      .limit(10)
      .lean();

    matchedReturns.forEach((r) => {
      if (r.customerId) matchedCustomerIds.add(r.customerId.toString());
    });

    // Consolidate customer summaries
    const customerIdsArray = Array.from(matchedCustomerIds).slice(0, 15);
    const customers = await User.find({ _id: { $in: customerIdsArray } })
      .select("_id name email mobileNumber status createdAt")
      .lean();

    // Enrich each customer with quick metrics (order count, latest order, active tickets)
    const enriched = await Promise.all(
      customers.map(async (cust) => {
        const [ordersCount, latestOrder, activeTicketsCount, lastVerification] = await Promise.all([
          Order.countDocuments({ userId: cust._id }),
          Order.findOne({ userId: cust._id }).sort({ createdAt: -1 }).select("orderCode status totalPrice createdAt").lean(),
          Ticket.countDocuments({
            $or: [{ user: cust._id }, { customerEmail: cust.email?.toLowerCase() }],
            status: { $nin: ["Resolved", "Closed"] },
          }),
          CustomerVerificationLog.findOne({ customerId: cust._id }).sort({ verifiedAt: -1 }).select("verifiedAt verifiedByName verificationMethod").lean(),
        ]);

        return {
          ...cust,
          ordersCount,
          latestOrder,
          activeTicketsCount,
          lastVerification,
        };
      })
    );

    return res.json({
      success: true,
      count: enriched.length,
      customers: enriched,
    });
  } catch (error) {
    console.error("Agent Assist search error:", error);
    return res.status(500).json({ message: "Search failed: " + error.message });
  }
};

/**
 * 2. Get Complete Customer 360 Profile
 * GET /api/agent-assist/customer/:id/360
 */
const getCustomer360Profile = async (req, res) => {
  try {
    const customerId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID." });
    }

    const customer = await User.findById(customerId).select("-password").lean();
    if (!customer || customer.isAdmin) {
      return res.status(404).json({ message: "Customer account not found." });
    }

    // Parallel fetch of all 360 dimensions
    const [
      orders,
      returnRequests,
      refundRecords,
      tickets,
      callbacks,
      callRemarks,
      verificationLogs,
    ] = await Promise.all([
      // 1. Orders with line items
      Order.find({ userId: customerId }).sort({ createdAt: -1 }).lean(),
      // 2. Returns & Replacements
      ReturnRequest.find({ customerId })
        .populate("orderId", "orderCode totalPrice createdAt status")
        .sort({ createdAt: -1 })
        .lean(),
      // 3. Refunds
      RefundRecord.find({
        $or: [
          { orderId: { $in: (await Order.find({ userId: customerId }).distinct("_id")) } },
          { requestId: { $in: (await ReturnRequest.find({ customerId }).distinct("_id")) } },
        ],
      })
        .populate("orderId", "orderCode totalPrice")
        .sort({ createdAt: -1 })
        .lean(),
      // 4. Tickets
      Ticket.find({
        $or: [{ user: customerId }, { customerEmail: customer.email?.toLowerCase() }],
      })
        .populate("assignedAgent", "name email designation")
        .sort({ createdAt: -1 })
        .lean(),
      // 5. Callbacks
      CallbackRequest.find({
        $or: [
          { customer: customerId },
          { customerEmail: customer.email?.toLowerCase() },
          { customerPhone: customer.mobileNumber || "NONE" },
        ],
      })
        .populate("assignedTo", "name designation")
        .sort({ createdAt: -1 })
        .lean(),
      // 6. Call Remarks History
      AgentCallRemark.find({ customerId }).sort({ createdAt: -1 }).lean(),
      // 7. Verification Logs
      CustomerVerificationLog.find({ customerId }).sort({ verifiedAt: -1 }).limit(20).lean(),
    ]);

    // Financial summaries
    const totalSpent = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const activeOrders = orders.filter((o) => !["Delivered", "Cancelled"].includes(o.status));
    const latestVerification = verificationLogs[0] || null;

    return res.json({
      success: true,
      customer: {
        ...customer,
        lifetimeValue: totalSpent,
        totalOrders: orders.length,
        activeOrdersCount: activeOrders.length,
        isVerifiedOnCall: !!(latestVerification && new Date() - new Date(latestVerification.verifiedAt) < 24 * 60 * 60 * 1000),
        latestVerification,
      },
      orders,
      returnRequests,
      refundRecords,
      tickets,
      callbacks,
      callRemarks,
      verificationLogs,
    });
  } catch (error) {
    console.error("Get Customer 360 error:", error);
    return res.status(500).json({ message: "Failed to load Customer 360: " + error.message });
  }
};

/**
 * 3. Verify Customer Identity Over Phone Call
 * POST /api/agent-assist/verify-customer
 */
const verifyCustomer = async (req, res) => {
  try {
    const {
      customerId,
      verificationMethod,
      confirmationStatus = "Confirmed",
      notes = "",
    } = req.body;

    if (!customerId || !verificationMethod) {
      return res.status(400).json({ message: "Customer ID and verification method are required." });
    }

    const customer = await User.findById(customerId).select("name email mobileNumber");
    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const logEntry = await CustomerVerificationLog.create({
      customerId: customer._id,
      customerName: customer.name || "Customer",
      customerEmail: customer.email || "",
      customerPhone: customer.mobileNumber || "",
      verifiedBy: req.user._id,
      verifiedByName: req.user.name,
      verifiedByRole: req.user.designation || (req.user.roles && req.user.roles[0]?.name) || "Customer Support Agent",
      verificationMethod,
      confirmationStatus,
      notes: notes.trim(),
      ipAddress: req.ip || (req.headers && req.headers["x-forwarded-for"]) || "",
      userAgent: (req.headers && req.headers["user-agent"]) || "",
      verifiedAt: new Date(),
    });

    // Record Employee Activity Log
    try {
      await EmployeeActivityLog.create({
        employeeId: req.user._id,
        employeeName: req.user.name,
        role: req.user.designation || "Support Agent",
        action: "CUSTOMER_VERIFIED",
        targetType: "Customer",
        targetId: customer._id,
        targetCode: customer.name,
        details: `Customer verified via ${verificationMethod}. Status: ${confirmationStatus}. Notes: ${notes}`,
      });
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: `Customer verified successfully via ${verificationMethod}.`,
      verification: logEntry,
    });
  } catch (error) {
    console.error("Verify customer error:", error);
    return res.status(500).json({ message: "Verification failed: " + error.message });
  }
};

/**
 * 4. Create Return Request on Customer's Behalf
 * POST /api/agent-assist/returns
 */
const createAgentReturnRequest = async (req, res) => {
  try {
    const {
      customerId,
      orderId,
      items,
      returnReason,
      description = "",
      evidenceImages = [],
      customerConsent,
      callReferenceId = "",
      internalCallId = "",
      assignedTeam = "Return Team",
      codRefundMethod = "",
      codRefundDetails = {},
    } = req.body;

    if (!customerId || !orderId || !items || items.length === 0 || !returnReason) {
      return res.status(400).json({ message: "Customer, Order, items, and return reason are required." });
    }

    // Consent Check
    if (customerConsent !== "Consent Received") {
      return res.status(400).json({
        message: "Customer consent must be explicitly recorded as 'Consent Received' before initiating a return request.",
      });
    }

    const [customer, order] = await Promise.all([
      User.findById(customerId).select("name email mobileNumber"),
      Order.findById(orderId),
    ]);

    if (!customer) return res.status(404).json({ message: "Customer not found." });
    if (!order) return res.status(404).json({ message: "Order not found." });

    // Anti-Fraud: Verify order belongs to customer
    if (order.userId && order.userId.toString() !== customerId.toString()) {
      return res.status(400).json({ message: "Order does not belong to the selected customer." });
    }

    // Anti-Fraud: Duplicate check for each selected product
    for (const it of items) {
      const existingReq = await ReturnRequest.findOne({
        orderId,
        productId: it.productId,
        status: { $nin: ["Rejected", "Cancelled"] },
      });
      if (existingReq) {
        return res.status(400).json({
          message: `An active ${existingReq.requestType.toLowerCase()} request (${existingReq.requestId || existingReq.returnCode}) already exists for item "${it.name}".`,
        });
      }
    }

    const requestId = generateRequestId("Return");

    const returnRequest = await ReturnRequest.create({
      requestId,
      returnCode: requestId,
      orderId,
      customerId,
      productId: items[0]?.productId || "",
      orderItemId: items[0]?._id || "",
      requestType: "Return",
      returnReason,
      reason: returnReason,
      customerMessage: description,
      description,
      evidenceImages: evidenceImages.map((img) => ({ url: typeof img === "string" ? img : img.url })),
      images: evidenceImages.map((img) => ({ url: typeof img === "string" ? img : img.url })),
      items,
      status: "Submitted",
      refundStatus: "Pending",
      codRefundMethod: order.paymentMethod === "COD" ? codRefundMethod : "",
      codRefundDetails: order.paymentMethod === "COD" ? codRefundDetails : undefined,
      isAgentCreated: true,
      createdAgentId: req.user._id,
      createdAgentName: req.user.name,
      createdAgentRole: req.user.designation || "Customer Support Agent",
      customerConsent,
      callReferenceId: callReferenceId.trim(),
      internalCallId: internalCallId.trim(),
      verificationMethod: req.body.verificationMethod || "Verified on Call",
      assignedTeam,
      statusHistory: [
        {
          status: "Submitted",
          note: `Agent-assisted return request initiated by ${req.user.name} after live customer call. Reason: ${returnReason}.`,
          updatedBy: req.user._id,
          updatedAt: new Date(),
        },
      ],
    });

    // Log Activity
    await logReturnActivity({
      requestId: returnRequest._id,
      action: "AGENT_CREATED_RETURN",
      status: "Submitted",
      performedBy: req.user._id,
      performedByName: req.user.name,
      remarks: `Agent ${req.user.name} created return #${requestId} on behalf of customer. Call Ref: ${callReferenceId || "None"}`,
      metadata: { orderCode: order.orderCode, itemsCount: items.length, assignedTeam },
    });

    try {
      await EmployeeActivityLog.create({
        employeeId: req.user._id,
        employeeName: req.user.name,
        role: req.user.designation || "Support Agent",
        action: "CREATE_AGENT_RETURN",
        targetType: "Return",
        targetId: returnRequest._id,
        targetCode: requestId,
        details: `Created Return #${requestId} for Order #${order.orderCode} (Customer: ${customer.name}). Reason: ${returnReason}`,
      });
    } catch (e) {}

    // Auto-create Central Customer Service Hub ticket
    let ticket = null;
    try {
      ticket = await createCustomerServiceTicket({
        source: "Return Request",
        category: "Return / Replacement",
        type: "Return",
        customerName: customer.name || "Customer",
        customerEmail: customer.email || "",
        customerPhone: customer.mobileNumber || "",
        customerId,
        subject: `Agent-Created Return: Order #${order.orderCode} (${requestId})`,
        message: `Support Agent ${req.user.name} initiated return on behalf of customer.\nReason: ${returnReason}\nDescription: ${description}\nCall Ref: ${callReferenceId || "N/A"}`,
        orderId,
        orderCode: order.orderCode,
        returnRequestId: returnRequest._id,
        priority: "Medium",
        metadata: { isAgentCreated: true, createdAgent: req.user.name, assignedTeam },
      });
    } catch (tickErr) {
      console.warn("Auto ticket creation warning:", tickErr.message);
    }

    // In-app Notification to customer & admin
    await notifyCustomerAndAdmins({
      customerId,
      title: "Return Request Initiated by Support",
      message: `Our concierge agent ${req.user.name} has initiated Return Request #${requestId} for Order #${order.orderCode} on your behalf.`,
      type: "Order Update",
      alertAdmin: true,
      adminTitle: `[AGENT-CREATED RETURN] #${requestId}`,
      adminMessage: `Agent ${req.user.name} created Return Request #${requestId} for Customer ${customer.name}. Team: ${assignedTeam}.`,
    });

    return res.status(201).json({
      success: true,
      message: `Return request #${requestId} created successfully on behalf of customer.`,
      returnRequest,
      ticketCode: ticket ? ticket.ticketCode : null,
    });
  } catch (error) {
    console.error("Create agent return error:", error);
    return res.status(500).json({ message: "Failed to create return: " + error.message });
  }
};

/**
 * 5. Create Replacement Request on Customer's Behalf
 * POST /api/agent-assist/replacements
 */
const createAgentReplacementRequest = async (req, res) => {
  try {
    const {
      customerId,
      orderId,
      items,
      returnReason,
      description = "",
      evidenceImages = [],
      customerConsent,
      callReferenceId = "",
      internalCallId = "",
      assignedTeam = "Return Team",
    } = req.body;

    if (!customerId || !orderId || !items || items.length === 0 || !returnReason) {
      return res.status(400).json({ message: "Customer, Order, items, and replacement reason are required." });
    }

    if (customerConsent !== "Consent Received") {
      return res.status(400).json({
        message: "Customer consent must be explicitly recorded as 'Consent Received' before initiating a replacement request.",
      });
    }

    const [customer, order] = await Promise.all([
      User.findById(customerId).select("name email mobileNumber"),
      Order.findById(orderId),
    ]);

    if (!customer) return res.status(404).json({ message: "Customer not found." });
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (order.userId && order.userId.toString() !== customerId.toString()) {
      return res.status(400).json({ message: "Order does not belong to the selected customer." });
    }

    // Anti-Fraud: Duplicate active request check
    for (const it of items) {
      const existingReq = await ReturnRequest.findOne({
        orderId,
        productId: it.productId,
        status: { $nin: ["Rejected", "Cancelled"] },
      });
      if (existingReq) {
        return res.status(400).json({
          message: `An active request (${existingReq.requestId || existingReq.returnCode}) already exists for item "${it.name}".`,
        });
      }
    }

    // Reserve inventory atomically
    for (const it of items) {
      try {
        await reserveStockForReplacement(it.productId, it.quantity || 1, `Agent-Replacement-Order-${order.orderCode}`);
      } catch (stockErr) {
        return res.status(400).json({
          message: `Stock reservation failed for item "${it.name}": ${stockErr.message}`,
        });
      }
    }

    const requestId = generateRequestId("Replacement");

    const returnRequest = await ReturnRequest.create({
      requestId,
      returnCode: requestId,
      orderId,
      customerId,
      productId: items[0]?.productId || "",
      orderItemId: items[0]?._id || "",
      requestType: "Replacement",
      returnReason,
      reason: returnReason,
      customerMessage: description,
      description,
      evidenceImages: evidenceImages.map((img) => ({ url: typeof img === "string" ? img : img.url })),
      images: evidenceImages.map((img) => ({ url: typeof img === "string" ? img : img.url })),
      items,
      status: "Approved", // Approved by agent, pending shipment/pickup
      refundStatus: "None",
      isAgentCreated: true,
      createdAgentId: req.user._id,
      createdAgentName: req.user.name,
      createdAgentRole: req.user.designation || "Customer Support Agent",
      customerConsent,
      callReferenceId: callReferenceId.trim(),
      internalCallId: internalCallId.trim(),
      verificationMethod: req.body.verificationMethod || "Verified on Call",
      assignedTeam,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      statusHistory: [
        {
          status: "Approved",
          note: `Agent-assisted replacement approved by ${req.user.name}. Inventory reserved. Reason: ${returnReason}.`,
          updatedBy: req.user._id,
          updatedAt: new Date(),
        },
      ],
    });

    // Create ReplacementOrder tracking record
    const replacementId = generateReplacementOrderId();
    const replacementOrderRecord = await ReplacementOrder.create({
      replacementId,
      requestId: returnRequest._id,
      originalOrderId: order._id,
      originalOrderItemId: items[0]?._id || "",
      replacementOrderId: order._id, // linked to original order context
      replacementStatus: "Processing",
    });

    await logReturnActivity({
      requestId: returnRequest._id,
      action: "AGENT_CREATED_REPLACEMENT",
      status: "Approved",
      performedBy: req.user._id,
      performedByName: req.user.name,
      remarks: `Agent ${req.user.name} created replacement #${requestId} (Tracking #${replacementId}). Stock reserved.`,
      metadata: { orderCode: order.orderCode, replacementId },
    });

    try {
      await EmployeeActivityLog.create({
        employeeId: req.user._id,
        employeeName: req.user.name,
        role: req.user.designation || "Support Agent",
        action: "CREATE_AGENT_REPLACEMENT",
        targetType: "Return",
        targetId: returnRequest._id,
        targetCode: requestId,
        details: `Created Replacement #${requestId} for Order #${order.orderCode} (Tracking: ${replacementId})`,
      });
    } catch (e) {}

    // Ticket Hub integration
    let ticket = null;
    try {
      ticket = await createCustomerServiceTicket({
        source: "Replacement Request",
        category: "Return / Replacement",
        type: "Return",
        customerName: customer.name || "Customer",
        customerEmail: customer.email || "",
        customerPhone: customer.mobileNumber || "",
        customerId,
        subject: `Agent Replacement: Order #${order.orderCode} (${requestId})`,
        message: `Agent ${req.user.name} approved replacement for order #${order.orderCode}.\nReason: ${returnReason}\nReplacement ID: ${replacementId}`,
        orderId,
        orderCode: order.orderCode,
        returnRequestId: returnRequest._id,
        priority: "High",
        metadata: { isAgentCreated: true, replacementId, assignedTeam },
      });
    } catch (e) {}

    await notifyCustomerAndAdmins({
      customerId,
      title: "Replacement Approved & Processing",
      message: `Your replacement request #${requestId} for order #${order.orderCode} has been approved by our concierge desk. Replacement tracking ID: ${replacementId}.`,
      type: "Order Update",
      alertAdmin: true,
      adminTitle: `[AGENT-CREATED REPLACEMENT] #${requestId}`,
      adminMessage: `Agent ${req.user.name} approved replacement #${requestId} for Order #${order.orderCode}. Stock reserved.`,
    });

    return res.status(201).json({
      success: true,
      message: `Replacement #${requestId} created and approved successfully.`,
      returnRequest,
      replacementOrder: replacementOrderRecord,
      ticketCode: ticket ? ticket.ticketCode : null,
    });
  } catch (error) {
    console.error("Create agent replacement error:", error);
    return res.status(500).json({ message: "Failed to create replacement: " + error.message });
  }
};

/**
 * 6. Create Refund Request on Customer's Behalf (Full or Partial)
 * POST /api/agent-assist/refunds
 */
const createAgentRefundRequest = async (req, res) => {
  try {
    const {
      customerId,
      orderId,
      requestId = null,
      refundType = "Full", // "Full" or "Partial"
      refundAmount,
      refundMethod = "Original Source",
      refundJustification = "",
      customerConsent,
      callReferenceId = "",
      internalCallId = "",
      assignedTeam = "Refund Team",
    } = req.body;

    if (!customerId || !orderId || !refundAmount || !refundJustification) {
      return res.status(400).json({
        message: "Customer, Order, refund amount, and justification are required.",
      });
    }

    if (customerConsent !== "Consent Received") {
      return res.status(400).json({
        message: "Customer consent must be explicitly recorded as 'Consent Received' before initiating a refund request.",
      });
    }

    const numAmount = Number(refundAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "Refund amount must be a positive number." });
    }

    const [customer, order] = await Promise.all([
      User.findById(customerId).select("name email mobileNumber"),
      Order.findById(orderId),
    ]);

    if (!customer) return res.status(404).json({ message: "Customer not found." });
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (order.userId && order.userId.toString() !== customerId.toString()) {
      return res.status(400).json({ message: "Order does not belong to the selected customer." });
    }

    // Anti-Fraud: Verify refund amount does not exceed remaining refundable balance
    const priorCompletedRefunds = await RefundRecord.find({
      orderId: order._id,
      refundStatus: "Completed",
    });
    const totalPriorRefunded = priorCompletedRefunds.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const maxRefundable = Math.max(0, (order.totalPrice || 0) - totalPriorRefunded);

    if (numAmount > maxRefundable) {
      return res.status(400).json({
        message: `Refund amount of ₹${numAmount} exceeds remaining refundable order balance of ₹${maxRefundable}.`,
      });
    }

    const refundId = generateRefundId();

    // Threshold Check: Exceeding REFUND_APPROVAL_THRESHOLD requires Team Lead approval
    const requiresTlApproval = numAmount > REFUND_APPROVAL_THRESHOLD && !req.user.isMasterAdmin;
    const approvalStage = requiresTlApproval ? "Pending TL Approval" : "Directly Approved";

    const refundRecord = await RefundRecord.create({
      refundId,
      requestId: requestId || new mongoose.Types.ObjectId(), // optional return link
      orderId: order._id,
      refundAmount: numAmount,
      refundMethod,
      refundStatus: requiresTlApproval ? "Pending" : "Processing",
      transactionReference: `TXN-REF-${Date.now()}`,
      processedBy: req.user._id,
      processedByName: req.user.name,
      processedAt: requiresTlApproval ? null : new Date(),
      refundNotes: refundJustification.trim(),
      isAgentCreated: true,
      agentId: req.user._id,
      agentName: req.user.name,
      agentRole: req.user.designation || "Customer Support Agent",
      refundType,
      orderAmount: order.totalPrice || 0,
      refundJustification: refundJustification.trim(),
      approvalStage,
      customerConsent,
      callReferenceId: callReferenceId.trim(),
      internalCallId: internalCallId.trim(),
      assignedTeam,
    });

    // Update ReturnRequest refundStatus if linked
    if (requestId && mongoose.Types.ObjectId.isValid(requestId)) {
      await ReturnRequest.findByIdAndUpdate(requestId, {
        $set: {
          refundStatus: requiresTlApproval ? "Pending" : "Processing",
          "refundDetails.refundAmount": numAmount,
          "refundDetails.refundMethod": refundMethod,
        },
      });
    }

    try {
      await EmployeeActivityLog.create({
        employeeId: req.user._id,
        employeeName: req.user.name,
        role: req.user.designation || "Support Agent",
        action: "CREATE_AGENT_REFUND",
        targetType: "Refund",
        targetId: refundRecord._id,
        targetCode: refundId,
        details: `Created ${refundType} Refund #${refundId} of ₹${numAmount} for Order #${order.orderCode}. Stage: ${approvalStage}. Justification: ${refundJustification}`,
      });
    } catch (e) {}

    // Notify Team Leads & Admins if approval is required
    if (requiresTlApproval) {
      await createAndDispatchNotification({
        role: "admin",
        category: "PAYMENT",
        event: "REFUND_APPROVAL_REQUESTED",
        title: `⚠️ Refund Approval Required: ₹${numAmount} (#${refundId})`,
        message: `Agent ${req.user.name} initiated refund exceeding ₹${REFUND_APPROVAL_THRESHOLD} for Order #${order.orderCode}. Justification: "${refundJustification}". Requires TL sign-off.`,
        priority: "High",
        link: `/niyora-admin-portal-2026/dashboard?tab=agent-desk&refundId=${refundRecord._id}`,
        metadata: { refundId: refundRecord._id, orderCode: order.orderCode, amount: numAmount },
      });
    } else {
      await createAndDispatchNotification({
        recipient: customerId,
        role: "customer",
        category: "SUPPORT",
        event: "REFUND_INITIATED",
        title: "Refund Initiated",
        message: `A ${refundType.toLowerCase()} refund of ₹${numAmount} for Order #${order.orderCode} has been initiated by our concierge desk.`,
        priority: "Medium",
        link: "orders",
        metadata: { orderId: order._id, refundId },
      });
    }

    return res.status(201).json({
      success: true,
      message: requiresTlApproval
        ? `Refund request #${refundId} created and submitted for Team Lead approval (Amount ₹${numAmount} > threshold ₹${REFUND_APPROVAL_THRESHOLD}).`
        : `Refund #${refundId} of ₹${numAmount} initiated directly to processing queue.`,
      refundRecord,
      requiresTlApproval,
    });
  } catch (error) {
    console.error("Create agent refund error:", error);
    return res.status(500).json({ message: "Failed to create refund: " + error.message });
  }
};

/**
 * 7. Get Pending Refund Approvals Queue (For Team Leads & Managers)
 * GET /api/agent-assist/refunds/pending-approval
 */
const getPendingRefundApprovals = async (req, res) => {
  try {
    const list = await RefundRecord.find({ approvalStage: "Pending TL Approval" })
      .populate("orderId", "orderCode totalPrice createdAt status paymentMethod")
      .populate("agentId", "name email designation")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: list.length,
      refunds: list,
    });
  } catch (error) {
    console.error("Get pending refund approvals error:", error);
    return res.status(500).json({ message: "Failed to load approval queue: " + error.message });
  }
};

/**
 * 8. Approve or Reject Refund (Team Lead / Manager Action)
 * PATCH /api/agent-assist/refunds/:id/approval
 */
const approveOrRejectRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks = "" } = req.body; // action: "Approve" or "Reject"

    if (!["Approve", "Reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be either 'Approve' or 'Reject'." });
    }

    const refund = await RefundRecord.findById(id).populate("orderId", "orderCode userId");
    if (!refund) {
      return res.status(404).json({ message: "Refund record not found." });
    }

    if (refund.approvalStage !== "Pending TL Approval") {
      return res.status(400).json({ message: `Refund is not pending approval (Current: ${refund.approvalStage}).` });
    }

    const isApproved = action === "Approve";
    refund.approvalStage = isApproved ? "Approved by TL" : "Rejected by TL";
    refund.refundStatus = isApproved ? "Processing" : "Failed";
    refund.approvedByTL = req.user._id;
    refund.approvedByTLName = req.user.name;
    refund.approvedByTLAt = new Date();
    refund.tlRemarks = remarks.trim();

    if (isApproved) {
      refund.processedAt = new Date();
    }

    await refund.save();

    // Log Activity
    try {
      await EmployeeActivityLog.create({
        employeeId: req.user._id,
        employeeName: req.user.name,
        role: req.user.designation || "Team Lead",
        action: isApproved ? "REFUND_APPROVED" : "REFUND_REJECTED",
        targetType: "Refund",
        targetId: refund._id,
        targetCode: refund.refundId,
        details: `Team Lead ${req.user.name} ${action.toLowerCase()}d Refund #${refund.refundId} of ₹${refund.refundAmount}. Remarks: ${remarks}`,
      });
    } catch (e) {}

    // Notify Agent who created the refund
    if (refund.agentId) {
      await createAndDispatchNotification({
        recipient: refund.agentId,
        role: "staff",
        category: "PAYMENT",
        event: isApproved ? "REFUND_APPROVED" : "REFUND_REJECTED",
        title: `Refund #${refund.refundId} ${action}d`,
        message: `Team Lead ${req.user.name} has ${action.toLowerCase()}d your refund request of ₹${refund.refundAmount}.${remarks ? ` Remarks: ${remarks}` : ""}`,
        priority: "Medium",
        link: `/niyora-admin-portal-2026/dashboard?tab=agent-desk`,
      });
    }

    return res.json({
      success: true,
      message: `Refund #${refund.refundId} successfully ${action.toLowerCase()}d.`,
      refund,
    });
  } catch (error) {
    console.error("Approve/Reject refund error:", error);
    return res.status(500).json({ message: "Failed to process approval: " + error.message });
  }
};

/**
 * 9. Create Support Ticket on Customer's Behalf
 * POST /api/agent-assist/tickets
 */
const createAgentTicket = async (req, res) => {
  try {
    const {
      customerId,
      subject,
      message,
      category = "General Query",
      priority = "Medium",
      orderId = null,
      customerConsent = "Consent Received",
      callReferenceId = "",
    } = req.body;

    if (!customerId || !subject || !message) {
      return res.status(400).json({ message: "Customer ID, subject, and message are required." });
    }

    const customer = await User.findById(customerId).select("name email mobileNumber");
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    let order = null;
    let orderCode = "";
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId).select("orderCode");
      if (order) orderCode = order.orderCode;
    }

    const ticket = await createCustomerServiceTicket({
      source: "Direct Support",
      category,
      type: "Support",
      customerName: customer.name || "Customer",
      customerEmail: customer.email || "",
      customerPhone: customer.mobileNumber || "",
      customerId,
      subject: subject.trim(),
      message: message.trim(),
      orderId: order ? order._id : null,
      orderCode,
      priority,
      metadata: {
        isAgentCreated: true,
        createdAgentId: req.user._id,
        createdAgentName: req.user.name,
        customerConsent,
        callReferenceId,
      },
    });

    try {
      await EmployeeActivityLog.create({
        employeeId: req.user._id,
        employeeName: req.user.name,
        role: req.user.designation || "Support Agent",
        action: "CREATE_AGENT_TICKET",
        targetType: "Ticket",
        targetId: ticket._id,
        targetCode: ticket.ticketCode,
        details: `Created Ticket #${ticket.ticketCode} for ${customer.name}. Subject: "${subject}"`,
      });
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: `Support ticket #${ticket.ticketCode} created successfully.`,
      ticket,
    });
  } catch (error) {
    console.error("Create agent ticket error:", error);
    return res.status(500).json({ message: "Failed to create ticket: " + error.message });
  }
};

/**
 * 10. Schedule Callback Follow-Up
 * POST /api/agent-assist/callbacks
 */
const createAgentCallback = async (req, res) => {
  try {
    const {
      customerId,
      scheduledDate,
      purpose = "",
      priority = "Medium",
      orderId = null,
    } = req.body;

    if (!customerId || !scheduledDate) {
      return res.status(400).json({ message: "Customer ID and scheduled date are required." });
    }

    const customer = await User.findById(customerId).select("name email mobileNumber");
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    const callbackCode = `CB-${Date.now()}`;
    const callbackRequest = await CallbackRequest.create({
      callbackCode,
      customer: customer._id,
      customerName: customer.name || "Customer",
      customerPhone: customer.mobileNumber || "N/A",
      customerEmail: customer.email || "",
      nextCallbackDate: new Date(scheduledDate),
      notes: purpose.trim(),
      priority,
      status: "Follow-up Scheduled",
      assignedTo: req.user._id,
      assignedToName: req.user.name,
      followUpRequired: true,
      source: "Agent Scheduled",
    });

    return res.status(201).json({
      success: true,
      message: `Callback scheduled for ${new Date(scheduledDate).toLocaleString()}.`,
      callback: callbackRequest,
    });
  } catch (error) {
    console.error("Create agent callback error:", error);
    return res.status(500).json({ message: "Failed to schedule callback: " + error.message });
  }
};

/**
 * 11. Add Agent Call Remark (Append-Only Live Call History)
 * POST /api/agent-assist/remarks
 */
const addAgentCallRemark = async (req, res) => {
  try {
    const {
      customerId,
      orderId = null,
      ticketId = null,
      returnRequestId = null,
      callOutcome,
      discussionSummary,
      customerRequest = "",
      actionTaken = "",
      nextFollowUpDate = null,
      internalNotes = "",
      customerConsent = "Consent Received",
      callRecordingReference = "",
      internalCallId = "",
    } = req.body;

    if (!customerId || !callOutcome || !discussionSummary) {
      return res.status(400).json({
        message: "Customer ID, call outcome, and discussion summary are required.",
      });
    }

    const customer = await User.findById(customerId).select("name email mobileNumber");
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    let orderCode = "";
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      const ord = await Order.findById(orderId).select("orderCode");
      if (ord) orderCode = ord.orderCode;
    }

    const remark = await AgentCallRemark.create({
      customerId: customer._id,
      customerName: customer.name || "Customer",
      customerPhone: customer.mobileNumber || "",
      customerEmail: customer.email || "",
      agentId: req.user._id,
      agentName: req.user.name,
      agentRole: req.user.designation || (req.user.roles && req.user.roles[0]?.name) || "Customer Support Agent",
      orderId: orderId && mongoose.Types.ObjectId.isValid(orderId) ? orderId : null,
      orderCode,
      ticketId: ticketId && mongoose.Types.ObjectId.isValid(ticketId) ? ticketId : null,
      returnRequestId: returnRequestId && mongoose.Types.ObjectId.isValid(returnRequestId) ? returnRequestId : null,
      callOutcome,
      discussionSummary: discussionSummary.trim(),
      customerRequest: customerRequest.trim(),
      actionTaken: actionTaken.trim(),
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      internalNotes: internalNotes.trim(),
      customerConsent,
      callRecordingReference: callRecordingReference.trim(),
      internalCallId: internalCallId.trim(),
      timestamp: new Date(),
    });

    // Record interaction in CustomerInteraction
    try {
      await CustomerInteraction.create({
        customerId: customer._id,
        customerName: customer.name || "Customer",
        customerEmail: customer.email || "",
        customerPhone: customer.mobileNumber || "",
        interactionType: "Call Logged",
        channel: "Phone",
        summary: `Call Outcome: ${callOutcome} — ${discussionSummary.slice(0, 120)}`,
        referenceId: callRecordingReference || internalCallId || "",
        handledBy: req.user._id,
        handledByName: req.user.name,
        metadata: {
          callOutcome,
          actionTaken,
          nextFollowUpDate,
          customerConsent,
        },
        timestamp: new Date(),
      });
    } catch (e) {}

    // Record in EmployeeActivityLog
    try {
      await EmployeeActivityLog.create({
        employeeId: req.user._id,
        employeeName: req.user.name,
        role: req.user.designation || "Support Agent",
        action: "LOG_CALL_REMARK",
        targetType: "Customer",
        targetId: customer._id,
        targetCode: customer.name,
        details: `Logged Call Remark for ${customer.name}. Outcome: ${callOutcome}. Summary: ${discussionSummary}`,
      });
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: "Call remark saved to customer timeline.",
      remark,
    });
  } catch (error) {
    console.error("Add agent call remark error:", error);
    return res.status(500).json({ message: "Failed to add remark: " + error.message });
  }
};

/**
 * 12. Agent-Assisted Metrics & Performance Reports
 * GET /api/agent-assist/reports
 */
const getAgentReports = async (req, res) => {
  try {
    const { startDate, endDate, agentId } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    const returnFilter = { isAgentCreated: true, ...dateFilter };
    const refundFilter = { isAgentCreated: true, ...dateFilter };
    const remarkFilter = { ...dateFilter };
    const verifyFilter = { ...dateFilter };

    if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
      returnFilter.createdAgentId = agentId;
      refundFilter.agentId = agentId;
      remarkFilter.agentId = agentId;
      verifyFilter.verifiedBy = agentId;
    }

    const [
      totalVerifications,
      agentReturnsCount,
      agentReplacementsCount,
      agentRefundsList,
      callRemarksCount,
      callOutcomesAgg,
      topAgentsAgg,
    ] = await Promise.all([
      CustomerVerificationLog.countDocuments(verifyFilter),
      ReturnRequest.countDocuments({ ...returnFilter, requestType: "Return" }),
      ReturnRequest.countDocuments({ ...returnFilter, requestType: "Replacement" }),
      RefundRecord.find(refundFilter).select("refundAmount approvalStage refundStatus").lean(),
      AgentCallRemark.countDocuments(remarkFilter),
      AgentCallRemark.aggregate([
        { $match: remarkFilter },
        { $group: { _id: "$callOutcome", count: { $sum: 1 } } },
      ]),
      AgentCallRemark.aggregate([
        { $match: remarkFilter },
        { $group: { _id: "$agentName", callsCount: { $sum: 1 } } },
        { $sort: { callsCount: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const totalRefundAmount = agentRefundsList.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const approvedRefunds = agentRefundsList.filter((r) => r.approvalStage === "Approved by TL" || r.approvalStage === "Directly Approved");
    const pendingRefunds = agentRefundsList.filter((r) => r.approvalStage === "Pending TL Approval");

    return res.json({
      success: true,
      metrics: {
        totalVerifications,
        agentReturnsCount,
        agentReplacementsCount,
        totalAgentActions: agentReturnsCount + agentReplacementsCount + agentRefundsList.length,
        agentRefundsCount: agentRefundsList.length,
        totalRefundAmount,
        approvedRefundsCount: approvedRefunds.length,
        pendingRefundsCount: pendingRefunds.length,
        callRemarksCount,
      },
      callOutcomes: callOutcomesAgg.map((o) => ({ outcome: o._id, count: o.count })),
      topAgents: topAgentsAgg.map((a) => ({ agentName: a._id, callsCount: a.callsCount })),
    });
  } catch (error) {
    console.error("Get agent reports error:", error);
    return res.status(500).json({ message: "Failed to generate reports: " + error.message });
  }
};

/**
 * 13. Export Agent-Assisted Activity as CSV
 * GET /api/agent-assist/reports/export
 */
const exportAgentReportsCsv = async (req, res) => {
  try {
    const remarks = await AgentCallRemark.find().sort({ createdAt: -1 }).limit(1000).lean();

    const headers = [
      "Date",
      "Customer Name",
      "Phone",
      "Email",
      "Agent Name",
      "Agent Role",
      "Call Outcome",
      "Discussion Summary",
      "Action Taken",
      "Next Follow-Up Date",
      "Consent",
      "Call Reference",
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = remarks.map((r) => [
      escapeCsv(new Date(r.createdAt).toISOString().split("T")[0]),
      escapeCsv(r.customerName),
      escapeCsv(r.customerPhone),
      escapeCsv(r.customerEmail),
      escapeCsv(r.agentName),
      escapeCsv(r.agentRole),
      escapeCsv(r.callOutcome),
      escapeCsv(r.discussionSummary),
      escapeCsv(r.actionTaken),
      escapeCsv(r.nextFollowUpDate ? new Date(r.nextFollowUpDate).toISOString().split("T")[0] : "None"),
      escapeCsv(r.customerConsent),
      escapeCsv(r.callRecordingReference || r.internalCallId || "N/A"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=agent_assisted_customer_service_${Date.now()}.csv`);
    return res.send(csvContent);
  } catch (error) {
    console.error("Export CSV error:", error);
    return res.status(500).json({ message: "CSV export failed: " + error.message });
  }
};

module.exports = {
  searchCustomerAndRecords,
  getCustomer360Profile,
  verifyCustomer,
  createAgentReturnRequest,
  createAgentReplacementRequest,
  createAgentRefundRequest,
  getPendingRefundApprovals,
  approveOrRejectRefund,
  createAgentTicket,
  createAgentCallback,
  addAgentCallRemark,
  getAgentReports,
  exportAgentReportsCsv,
};
