const crypto = require("crypto");
const CallbackRequest = require("../models/CallbackRequest");
const CallbackRemark = require("../models/CallbackRemark");
const Ticket = require("../models/Ticket");
const Order = require("../models/Order");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const EmployeeActivityLog = require("../models/EmployeeActivityLog");
const CustomerInteraction = require("../models/CustomerInteraction");
const SlaTracking = require("../models/SlaTracking");
const { createCustomerServiceTicket, findAvailableExecutive } = require("../services/ticketHubService");
const { createAndDispatchNotification } = require("../services/notificationService");
const { validateName, validatePhone, validateEmail } = require("../utils/validation");

const REMARK_EDIT_WINDOW_MINUTES = 15;

const generateCallbackCode = () => {
  return "CB-" + new Date().getFullYear() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
};

/**
 * @desc    Submit public callback request (Storefront / Customer)
 * @route   POST /api/callbacks/request
 * @access  Public
 */
const requestCallbackPublic = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail = "",
      subject = "Callback Request",
      notes = "",
      initialNotes = "",
      preferredTime = "",
      orderCode = "",
      productId = null,
      priority = "Medium",
    } = req.body;

    const nameRes = validateName(customerName);
    if (!nameRes.isValid) {
      return res.status(400).json({ message: nameRes.error });
    }

    const phoneRes = validatePhone(customerPhone);
    if (!phoneRes.isValid) {
      return res.status(400).json({ message: phoneRes.error });
    }

    let sanitizedEmail = "";
    if (customerEmail) {
      const emailRes = validateEmail(customerEmail);
      if (!emailRes.isValid) {
        return res.status(400).json({ message: emailRes.error });
      }
      sanitizedEmail = emailRes.sanitizedValue;
    }

    // Attempt matching customer if registered
    let matchedUser = null;
    if (sanitizedEmail) {
      try {
        matchedUser = await User.findOne({ email: sanitizedEmail });
      } catch {}
    }
    if (!matchedUser && req.user) {
      matchedUser = req.user;
    }

    // Match order if provided
    let matchedOrder = null;
    if (orderCode) {
      try {
        matchedOrder = await Order.findOne({ orderCode: orderCode.trim() });
      } catch {}
    }

    // 1. Automatically create central customer service ticket
    const ticket = await createCustomerServiceTicket({
      source: "Callback Request",
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : "",
      customerId: matchedUser ? matchedUser._id : null,
      subject: (subject || "Customer requested phone callback").trim(),
      message: (notes || initialNotes || `Customer requested a phone callback. Preferred time: ${preferredTime || "Earliest available"}`).trim(),
      orderId: matchedOrder ? matchedOrder._id : null,
      orderCode: orderCode ? orderCode.trim() : "",
      priority,
      category: "Contact Us",
      type: "Support",
      metadata: { preferredTime, productId },
    });

    // 2. Assign executive or use the executive assigned to ticket
    let assignedUser = null;
    if (ticket.assignedAgent) {
      assignedUser = await User.findById(ticket.assignedAgent).select("name employeeId department");
    } else {
      assignedUser = await findAvailableExecutive("Callback Executive");
    }

    const callbackCode = generateCallbackCode();

    const timeline = [
      {
        action: "CALLBACK_REQUEST_CREATED",
        title: "Callback Request Submitted",
        description: `Customer submitted callback request via storefront. Assigned Ticket: ${ticket.ticketCode}. Preferred Time: ${preferredTime || "Standard"}.`,
        performedBy: matchedUser ? matchedUser._id : null,
        performedByName: customerName.trim(),
        timestamp: new Date(),
      },
    ];

    if (assignedUser) {
      timeline.push({
        action: "ASSIGNED_TO_EXECUTIVE",
        title: "Assigned to Callback Executive",
        description: `Automatically routed to ${assignedUser.name} (${assignedUser.employeeId || "Executive"}).`,
        performedBy: null,
        performedByName: "System Auto-Router",
        timestamp: new Date(),
      });
    }

    // 15-minute SLA deadline for first callback attempt
    const callbackDue = new Date(Date.now() + 15 * 60 * 1000);

    const callback = await CallbackRequest.create({
      callbackCode,
      customer: matchedUser ? matchedUser._id : null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : "",
      order: matchedOrder ? matchedOrder._id : null,
      orderCode: orderCode ? orderCode.trim() : "",
      ticket: ticket._id,
      ticketCode: ticket.ticketCode,
      subject: (subject || "Storefront Callback Request").trim(),
      initialNotes: (notes || initialNotes || "").trim(),
      priority,
      status: assignedUser ? "Assigned" : "Pending",
      assignedTo: assignedUser ? assignedUser._id : null,
      assignedToName: assignedUser ? assignedUser.name : "Unassigned",
      assignedToEmployeeId: assignedUser ? (assignedUser.employeeId || "") : "",
      assignedBy: null,
      assignedAt: assignedUser ? new Date() : null,
      department: assignedUser ? assignedUser.department : null,
      nextCallbackDate: callbackDue,
      timeline,
      callRemarks: [],
    });

    // Notify assigned employee
    if (assignedUser) {
      await createAndDispatchNotification({
        recipient: assignedUser._id,
        userId: assignedUser._id,
        role: "staff",
        category: "CALLBACK",
        event: "CALLBACK_ASSIGNED",
        title: `📞 New Callback: ${customerName}`,
        message: `Callback scheduled for ${customerName} (${customerPhone}). Ticket: ${ticket.ticketCode}. Priority: ${priority}.`,
        priority,
        link: `/niyora-admin-portal-2026/dashboard?tab=callbacks&id=${callback._id}`,
        metadata: {
          callbackId: callback._id,
          callbackCode: callback.callbackCode,
          ticketCode: ticket.ticketCode,
          customerName,
          customerPhone,
        },
      });
    }

    // Broadcast to Master Admin
    await createAndDispatchNotification({
      role: "admin",
      category: "CALLBACK",
      event: "CALLBACK_REQUEST_CREATED",
      title: `📞 Inbound Callback Request #${callback.callbackCode}`,
      message: `Customer ${customerName} requested a callback (${customerPhone}). Ticket: ${ticket.ticketCode}. Assigned: ${assignedUser ? assignedUser.name : "Unassigned Queue"}.`,
      priority,
      link: `/niyora-admin-portal-2026/dashboard?tab=callbacks&id=${callback._id}`,
      metadata: { callbackId: callback._id, callbackCode: callback.callbackCode, ticketCode: ticket.ticketCode },
    });

    return res.status(201).json({
      success: true,
      message: "Your callback request has been received. Our concierge executive will contact you shortly.",
      callbackCode: callback.callbackCode,
      ticketCode: ticket.ticketCode,
      callback,
    });
  } catch (error) {
    console.error("[requestCallbackPublic] Error:", error);
    return res.status(500).json({ message: error.message || "Failed to schedule callback request." });
  }
};

/**
 * @desc    Create a new callback request
 * @route   POST /api/callbacks
 * @access  Private (Staff / Admin)
 */
const createCallbackRequest = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      customerId,
      orderId,
      orderCode,
      ticketId,
      ticketCode,
      subject = "Callback Request",
      initialNotes = "",
      priority = "Medium",
      assignedTo,
    } = req.body;

    if (!customerName || !customerPhone) {
      return res.status(400).json({ message: "Customer Name and Customer Phone are required." });
    }

    let assignedUser = null;
    if (assignedTo) {
      assignedUser = await User.findById(assignedTo).select("name employeeId department");
    }

    const callbackCode = generateCallbackCode();

    const timeline = [
      {
        action: "CALLBACK_REQUEST_CREATED",
        title: "Callback Request Created",
        description: `Callback scheduled for ${customerName} (${customerPhone}). Initial subject: ${subject}.`,
        performedBy: req.user._id,
        performedByName: req.user.name || "Staff",
        performedByEmployeeId: req.user.employeeId || "",
        timestamp: new Date(),
      },
    ];

    if (assignedUser) {
      timeline.push({
        action: "ASSIGNED_TO_EXECUTIVE",
        title: "Assigned to Support Executive",
        description: `Assigned to ${assignedUser.name} (${assignedUser.employeeId || "Staff"}).`,
        performedBy: req.user._id,
        performedByName: req.user.name || "Admin",
        performedByEmployeeId: req.user.employeeId || "",
        timestamp: new Date(),
      });
    }

    const callback = await CallbackRequest.create({
      callbackCode,
      customer: customerId || null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : "",
      order: orderId || null,
      orderCode: orderCode ? orderCode.trim() : "",
      ticket: ticketId || null,
      ticketCode: ticketCode ? ticketCode.trim() : "",
      subject: subject.trim(),
      initialNotes: initialNotes.trim(),
      priority,
      status: assignedUser ? "Assigned" : "Pending",
      assignedTo: assignedUser ? assignedUser._id : null,
      assignedToName: assignedUser ? assignedUser.name : "Unassigned",
      assignedToEmployeeId: assignedUser ? (assignedUser.employeeId || "") : "",
      assignedBy: assignedUser ? req.user._id : null,
      assignedAt: assignedUser ? new Date() : null,
      department: assignedUser ? assignedUser.department : null,
      timeline,
      callRemarks: [],
    });

    // Notify assigned employee if assigned on creation
    if (assignedUser) {
      await createAndDispatchNotification({
        recipient: assignedUser._id,
        userId: assignedUser._id,
        role: "staff",
        category: "CALLBACK",
        event: "CALLBACK_ASSIGNED",
        title: `📞 New Callback Assigned: ${customerName}`,
        message: `You have been assigned a callback with ${customerName} (${customerPhone}). Priority: ${priority}.`,
        priority,
        link: `/niyora-admin-portal-2026/dashboard?tab=callbacks&id=${callback._id}`,
        metadata: {
          callbackId: callback._id,
          callbackCode: callback.callbackCode,
          customerName,
          customerPhone,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Callback request created successfully.",
      callback,
    });
  } catch (error) {
    console.error("Error creating callback request:", error);
    return res.status(500).json({ message: "Failed to create callback request: " + error.message });
  }
};

/**
 * @desc    Get all callback requests with filters and pagination
 * @route   GET /api/callbacks
 * @access  Private (Staff / Admin)
 */
const getCallbacks = async (req, res) => {
  try {
    const {
      status,
      priority,
      callOutcome,
      assignedTo,
      followUpPending,
      search,
      dateRange,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (priority && priority !== "All") {
      query.priority = priority;
    }

    if (callOutcome && callOutcome !== "All") {
      query["lastCallOutcome"] = callOutcome;
    }

    if (assignedTo && assignedTo !== "All") {
      if (assignedTo === "unassigned") {
        query.assignedTo = null;
      } else {
        query.assignedTo = assignedTo;
      }
    }

    if (followUpPending === "true") {
      query.followUpRequired = true;
      query.status = { $nin: ["Completed", "Cancelled"] };
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { callbackCode: { $regex: term, $options: "i" } },
        { customerName: { $regex: term, $options: "i" } },
        { customerPhone: { $regex: term, $options: "i" } },
        { customerEmail: { $regex: term, $options: "i" } },
        { orderCode: { $regex: term, $options: "i" } },
        { ticketCode: { $regex: term, $options: "i" } },
        { assignedToName: { $regex: term, $options: "i" } },
      ];
    }

    if (dateRange) {
      const now = new Date();
      if (dateRange === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query.createdAt = { $gte: startOfDay };
      } else if (dateRange === "week") {
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: startOfWeek };
      } else if (dateRange === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query.createdAt = { $gte: startOfMonth };
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await CallbackRequest.countDocuments(query);
    const callbacks = await CallbackRequest.find(query)
      .sort({ nextCallbackDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("assignedTo", "name employeeId email designation")
      .populate("order", "orderCode totalAmount status")
      .populate("ticket", "ticketCode subject status");

    return res.json({
      success: true,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      callbacks,
    });
  } catch (error) {
    console.error("Error fetching callbacks:", error);
    return res.status(500).json({ message: "Failed to fetch callbacks: " + error.message });
  }
};

/**
 * @desc    Get single callback request by ID with full remark history & timeline
 * @route   GET /api/callbacks/:id
 * @access  Private (Staff / Admin)
 */
const getCallbackById = async (req, res) => {
  try {
    const callback = await CallbackRequest.findById(req.params.id)
      .populate("assignedTo", "name employeeId email designation")
      .populate("assignedBy", "name")
      .populate("order", "orderCode totalAmount status createdAt")
      .populate("ticket", "ticketCode subject status priority messages");

    if (!callback) {
      return res.status(404).json({ message: "Callback request not found." });
    }

    return res.json({
      success: true,
      callback,
      editWindowMinutes: REMARK_EDIT_WINDOW_MINUTES,
    });
  } catch (error) {
    console.error("Error getting callback:", error);
    return res.status(500).json({ message: "Failed to fetch callback details: " + error.message });
  }
};

/**
 * @desc    Assign callback to an employee
 * @route   PATCH /api/callbacks/:id/assign
 * @access  Private (Admin / Manager)
 */
const assignCallback = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const callback = await CallbackRequest.findById(req.params.id);

    if (!callback) {
      return res.status(404).json({ message: "Callback request not found." });
    }

    let assignedUser = null;
    if (employeeId) {
      assignedUser = await User.findById(employeeId).select("name employeeId department");
      if (!assignedUser) {
        return res.status(404).json({ message: "Employee not found." });
      }
    }

    const previousAssignee = callback.assignedToName || "Unassigned";

    if (assignedUser) {
      callback.assignedTo = assignedUser._id;
      callback.assignedToName = assignedUser.name;
      callback.assignedToEmployeeId = assignedUser.employeeId || "";
      callback.assignedBy = req.user._id;
      callback.assignedAt = new Date();
      callback.department = assignedUser.department || callback.department;
      if (callback.status === "Pending") {
        callback.status = "Assigned";
      }

      callback.timeline.push({
        action: "ASSIGNED_TO_EXECUTIVE",
        title: "Assigned to Support Executive",
        description: `Assigned to ${assignedUser.name} (${assignedUser.employeeId || "Staff"}). Previous: ${previousAssignee}.`,
        performedBy: req.user._id,
        performedByName: req.user.name || "Admin",
        performedByEmployeeId: req.user.employeeId || "",
        timestamp: new Date(),
      });

      // Dispatch alert
      await createAndDispatchNotification({
        recipient: assignedUser._id,
        userId: assignedUser._id,
        role: "staff",
        category: "CALLBACK",
        event: "CALLBACK_ASSIGNED",
        title: `📞 Callback Reassigned: ${callback.customerName}`,
        message: `You have been assigned callback ${callback.callbackCode} for ${callback.customerName} (${callback.customerPhone}).`,
        priority: callback.priority || "Medium",
        link: `/niyora-admin-portal-2026/dashboard?tab=callbacks&id=${callback._id}`,
      });
    } else {
      callback.assignedTo = null;
      callback.assignedToName = "Unassigned";
      callback.assignedToEmployeeId = "";
      callback.assignedBy = null;
      callback.assignedAt = null;

      callback.timeline.push({
        action: "UNASSIGNED",
        title: "Callback Unassigned",
        description: `Callback was unassigned from ${previousAssignee}.`,
        performedBy: req.user._id,
        performedByName: req.user.name || "Admin",
        performedByEmployeeId: req.user.employeeId || "",
        timestamp: new Date(),
      });
    }

    await callback.save();

    return res.json({
      success: true,
      message: "Assignment updated successfully.",
      callback,
    });
  } catch (error) {
    console.error("Error assigning callback:", error);
    return res.status(500).json({ message: "Failed to assign callback: " + error.message });
  }
};

/**
 * @desc    Add Call Remark to Callback Details (Append-only)
 * @route   POST /api/callbacks/:id/remarks
 * @access  Private (Staff / Admin)
 */
const addCallRemark = async (req, res) => {
  try {
    const {
      callOutcome,
      conversationSummary,
      customerRequirement = "",
      issueDiscussed = "",
      resolutionProvided = "",
      followUpRequired = false,
      nextCallbackDate = null,
      followUpPriority = "Medium",
      internalNotes = "",
    } = req.body;

    const validOutcomes = [
      "Connected",
      "Not Answered",
      "Busy",
      "Switched Off",
      "Wrong Number",
      "Call Later Requested",
      "Call Back Later Requested",
      "Interested",
      "Not Interested",
      "Interested in Purchase",
      "Order Placed",
      "Complaint Registered",
      "Escalated",
      "Issue Resolved",
    ];

    if (!callOutcome || !validOutcomes.includes(callOutcome)) {
      return res.status(400).json({
        message: `Invalid or missing Call Outcome. Must be one of: ${validOutcomes.join(", ")}`,
      });
    }

    if (!conversationSummary || !conversationSummary.trim()) {
      return res.status(400).json({ message: "Conversation Summary is required." });
    }

    const callback = await CallbackRequest.findById(req.params.id);
    if (!callback) {
      return res.status(404).json({ message: "Callback request not found." });
    }

    const employeeName = req.user.name || "Support Executive";
    const employeeId = req.user.employeeId || (req.user._id ? req.user._id.toString().slice(-6).toUpperCase() : "EMP");

    // Determine status transition
    let newStatus = callback.status;
    let statusChangeText = "";

    if (callOutcome === "Issue Resolved" || callOutcome === "Order Placed") {
      newStatus = "Completed";
      callback.resolvedAt = new Date();
      callback.completedAt = new Date();
      callback.followUpRequired = false;
      statusChangeText = `Status completed (${callOutcome})`;
    } else if (callOutcome === "Not Interested") {
      newStatus = "Completed";
      callback.completedAt = new Date();
      callback.followUpRequired = false;
      statusChangeText = "Status completed (Not Interested)";
    } else if (callOutcome === "Escalated" || callOutcome === "Complaint Registered") {
      newStatus = "Escalated";
      callback.priority = "Urgent";
      statusChangeText = `Status escalated to Management (${callOutcome})`;
    } else if (followUpRequired || callOutcome === "Call Later Requested" || callOutcome === "Call Back Later Requested") {
      newStatus = "Follow-up Scheduled";
      callback.followUpRequired = true;
      callback.nextCallbackDate = nextCallbackDate ? new Date(nextCallbackDate) : null;
      callback.followUpPriority = followUpPriority;
      callback.reminderSent = false;
      statusChangeText = `Follow-up scheduled for ${nextCallbackDate ? new Date(nextCallbackDate).toLocaleString() : "TBD"}`;
    } else if (callOutcome === "Interested" || callOutcome === "Interested in Purchase") {
      if (followUpRequired || nextCallbackDate) {
        newStatus = "Follow-up Scheduled";
        callback.followUpRequired = true;
        callback.nextCallbackDate = nextCallbackDate ? new Date(nextCallbackDate) : null;
        callback.followUpPriority = followUpPriority;
        statusChangeText = "Customer interested - Follow-up scheduled";
      } else {
        newStatus = "Completed";
        statusChangeText = "Customer interested - Logged";
      }
    } else if (callOutcome === "Connected") {
      newStatus = "Completed";
      callback.completedAt = new Date();
      callback.followUpRequired = false;
      statusChangeText = "Status completed (Call Connected)";
    } else if (["Not Answered", "Busy", "Switched Off", "Wrong Number"].includes(callOutcome)) {
      newStatus = "Attempted";
      statusChangeText = `Status changed to Attempted (${callOutcome})`;
    }

    callback.status = newStatus;
    callback.totalCallsMade = (callback.totalCallsMade || 0) + 1;
    callback.lastCallOutcome = callOutcome;
    callback.lastCallAt = new Date();

    // 1. Create append-only remark
    const remarkDoc = {
      employee: req.user._id,
      employeeName,
      employeeId,
      callOutcome,
      conversationSummary: conversationSummary.trim(),
      customerRequirement: customerRequirement.trim(),
      issueDiscussed: issueDiscussed.trim(),
      resolutionProvided: resolutionProvided.trim(),
      followUpRequired: Boolean(followUpRequired),
      nextCallbackDate: nextCallbackDate ? new Date(nextCallbackDate) : null,
      followUpPriority,
      internalNotes: internalNotes.trim(),
      statusChange: statusChangeText,
      createdAt: new Date(),
      updatedAt: new Date(),
      editHistory: [],
    };

    callback.callRemarks.push(remarkDoc);

    // 2. Generate activity timeline event matching user requirements
    let timelineTitle = `Call Attempted - ${callOutcome}`;
    let timelineDesc = conversationSummary.trim();

    if (callback.totalCallsMade === 1 && ["Not Answered", "Busy", "Switched Off", "Wrong Number"].includes(callOutcome)) {
      timelineTitle = "First Call Attempted";
      timelineDesc = `Attempted call to customer. Call outcome: ${callOutcome}.`;
    } else if (callOutcome === "Call Back Later Requested") {
      timelineTitle = "Customer Requested Callback Later";
      timelineDesc = `Customer requested callback on ${nextCallbackDate ? new Date(nextCallbackDate).toLocaleString() : "a later time"}. Note: ${conversationSummary}`;
    } else if (callOutcome === "Interested in Purchase") {
      timelineTitle = "Customer Interested in Product";
      timelineDesc = `Customer expressed purchase interest. Requirement: ${customerRequirement || conversationSummary}`;
    } else if (callOutcome === "Order Placed") {
      timelineTitle = "Order Placed Successfully";
      timelineDesc = `Customer placed an order following callback. Requirement: ${customerRequirement || conversationSummary}`;
    } else if (callOutcome === "Issue Resolved") {
      timelineTitle = "Ticket Resolved";
      timelineDesc = `Issue resolved satisfactorily. Resolution: ${resolutionProvided || conversationSummary}`;
    } else if (callOutcome === "Connected") {
      timelineTitle = "Callback Completed";
      timelineDesc = `Callback connected and completed. Summary: ${conversationSummary}`;
    } else if (callOutcome === "Escalated") {
      timelineTitle = "Callback Escalated";
      timelineDesc = `Issue marked as Escalated for senior review. Discussed: ${issueDiscussed || conversationSummary}`;
    } else if (callOutcome === "Complaint Registered") {
      timelineTitle = "Customer Complaint Registered";
      timelineDesc = `Formal complaint registered. Details: ${issueDiscussed || conversationSummary}`;
    }

    callback.timeline.push({
      action: `CALL_${callOutcome.toUpperCase().replace(/\s+/g, "_")}`,
      title: timelineTitle,
      description: timelineDesc,
      performedBy: req.user._id,
      performedByName: employeeName,
      performedByEmployeeId: employeeId,
      callOutcome,
      timestamp: new Date(),
    });

    // 3. Keep linked Support Ticket in sync if callback has ticket ref
    if (callback.ticket) {
      try {
        const linkedTicket = await Ticket.findById(callback.ticket);
        if (linkedTicket) {
          linkedTicket.internalNotes.push({
            note: `[Callback Log - Outcome: ${callOutcome}] ${conversationSummary} | Follow-up: ${followUpRequired ? "Yes (" + (nextCallbackDate || "") + ")" : "No"} | Staff: ${employeeName}`,
            author: req.user._id,
            authorName: employeeName,
            createdAt: new Date(),
          });
          if (callOutcome === "Issue Resolved") {
            linkedTicket.status = "Resolved";
            linkedTicket.resolvedAt = new Date();
          } else if (callOutcome === "Complaint Registered" || callOutcome === "Escalated") {
            linkedTicket.status = "Escalated";
            linkedTicket.priority = "Critical";
            linkedTicket.escalatedAt = new Date();
            linkedTicket.escalatedReason = `Callback outcome: ${callOutcome}`;
          } else if (newStatus === "Follow-up Scheduled") {
            linkedTicket.status = "In Progress";
          }
          await linkedTicket.save();
        }
      } catch (ticketErr) {
        console.warn("Could not sync linked ticket:", ticketErr.message);
      }
    }

    // 4. Record in dedicated callback_remarks collection
    try {
      await CallbackRemark.create({
        callbackId: callback._id,
        callbackCode: callback.callbackCode,
        employee: req.user._id,
        employeeName,
        employeeId,
        callOutcome,
        conversationSummary: conversationSummary.trim(),
        customerRequirement: customerRequirement.trim(),
        issueDiscussed: issueDiscussed.trim(),
        resolutionProvided: resolutionProvided.trim(),
        followUpRequired: Boolean(followUpRequired),
        nextCallbackDate: nextCallbackDate ? new Date(nextCallbackDate) : null,
        followUpPriority,
        internalNotes: internalNotes.trim(),
      });
    } catch (remarkErr) {
      console.warn("[CallbackController] CallbackRemark creation failed:", remarkErr.message);
    }

    // 5. Record Customer Interaction in customer_interactions collection
    try {
      await CustomerInteraction.create({
        customerId: callback.customer || null,
        customerName: callback.customerName,
        customerEmail: callback.customerEmail || "",
        customerPhone: callback.customerPhone || "",
        interactionType: "Call Logged",
        ticketId: callback.ticket || null,
        ticketCode: callback.ticketCode || "",
        referenceId: callback.callbackCode,
        channel: "Phone",
        summary: `Call Outcome: ${callOutcome}. ${conversationSummary.trim().slice(0, 120)}`,
        handledBy: req.user._id,
        handledByName: employeeName,
        metadata: { outcome: callOutcome, followUpRequired, nextCallbackDate },
        timestamp: new Date(),
      });
    } catch (interactErr) {
      console.warn("[CallbackController] CustomerInteraction creation failed:", interactErr.message);
    }

    // 6. Record in employee_activity_logs collection
    try {
      await EmployeeActivityLog.create({
        employeeId: req.user._id,
        employeeName,
        role: req.user.designation || req.user.role || "Callback Executive",
        action: "CALL_REMARK_ADDED",
        targetType: "Callback",
        targetId: callback._id,
        targetCode: callback.callbackCode,
        details: `Call remark added with outcome "${callOutcome}". Status: ${newStatus}`,
        metadata: { outcome: callOutcome, nextCallbackDate },
      });
    } catch (logErr) {
      console.warn("[CallbackController] EmployeeActivityLog creation failed:", logErr.message);
    }

    // 7. Update SLA Tracking milestone
    try {
      await SlaTracking.findOneAndUpdate(
        { $or: [{ taskId: callback._id }, { taskCode: callback.callbackCode }] },
        {
          $set: {
            callbackAt: new Date(),
            isOverdue: false,
          },
        }
      );
    } catch (slaErr) {
      console.warn("[CallbackController] SlaTracking update failed:", slaErr.message);
    }

    await callback.save();

    return res.status(201).json({
      success: true,
      message: "Call remark and activity timeline recorded successfully.",
      callback,
      addedRemarkId: callback.callRemarks[callback.callRemarks.length - 1]._id,
    });
  } catch (error) {
    console.error("Error adding call remark:", error);
    return res.status(500).json({ message: "Failed to add call remark: " + error.message });
  }
};

/**
 * @desc    Edit Latest Call Remark within 15-Minute Window
 * @route   PUT /api/callbacks/:id/remarks/:remarkId
 * @access  Private (Author Employee or Master Admin)
 */
const editLatestRemark = async (req, res) => {
  try {
    const { id, remarkId } = req.params;
    const {
      callOutcome,
      conversationSummary,
      customerRequirement,
      issueDiscussed,
      resolutionProvided,
      followUpRequired,
      nextCallbackDate,
      followUpPriority,
      internalNotes,
      editReason = "Updated within allowable 15-minute window",
    } = req.body;

    const callback = await CallbackRequest.findById(id);
    if (!callback) {
      return res.status(404).json({ message: "Callback request not found." });
    }

    if (!callback.callRemarks || callback.callRemarks.length === 0) {
      return res.status(400).json({ message: "No remarks exist on this callback request." });
    }

    // 1. Check if remark is the LATEST remark
    const latestRemark = callback.callRemarks[callback.callRemarks.length - 1];
    if (latestRemark._id.toString() !== String(remarkId)) {
      return res.status(403).json({
        message: "Security restriction: Only the latest remark can be edited. Previous remarks are permanently stored and immutable.",
      });
    }

    // 2. Check author authorization
    const isAuthor = latestRemark.employee.toString() === req.user._id.toString();
    const isMasterAdmin = req.user.isMasterAdmin === true;

    if (!isAuthor && !isMasterAdmin) {
      return res.status(403).json({
        message: "Access denied. Employees can only edit remarks created by themselves.",
      });
    }

    // 3. Check 15-Minute Time Limit Window
    const createdAtMs = new Date(latestRemark.createdAt).getTime();
    const elapsedMinutes = (Date.now() - createdAtMs) / (1000 * 60);

    if (elapsedMinutes > REMARK_EDIT_WINDOW_MINUTES && !isMasterAdmin) {
      return res.status(403).json({
        message: `Edit window expired. Employees can only edit their latest remark within ${REMARK_EDIT_WINDOW_MINUTES} minutes of creation. This remark is now permanently locked.`,
        elapsedMinutes: Math.round(elapsedMinutes),
        limitMinutes: REMARK_EDIT_WINDOW_MINUTES,
      });
    }

    // 4. Archive old values into editHistory audit trail
    latestRemark.editHistory.push({
      editedAt: new Date(),
      editedBy: req.user._id,
      editedByName: req.user.name || "Staff",
      previousOutcome: latestRemark.callOutcome,
      previousSummary: latestRemark.conversationSummary,
      reason: editReason.trim(),
    });

    // 5. Update permitted fields
    if (callOutcome) latestRemark.callOutcome = callOutcome;
    if (conversationSummary) latestRemark.conversationSummary = conversationSummary.trim();
    if (customerRequirement !== undefined) latestRemark.customerRequirement = customerRequirement.trim();
    if (issueDiscussed !== undefined) latestRemark.issueDiscussed = issueDiscussed.trim();
    if (resolutionProvided !== undefined) latestRemark.resolutionProvided = resolutionProvided.trim();
    if (followUpRequired !== undefined) latestRemark.followUpRequired = Boolean(followUpRequired);
    if (nextCallbackDate !== undefined) latestRemark.nextCallbackDate = nextCallbackDate ? new Date(nextCallbackDate) : null;
    if (followUpPriority !== undefined) latestRemark.followUpPriority = followUpPriority;
    if (internalNotes !== undefined) latestRemark.internalNotes = internalNotes.trim();
    latestRemark.updatedAt = new Date();

    // Update parent callback top-level cached outcome
    if (callOutcome) {
      callback.lastCallOutcome = callOutcome;
    }
    if (followUpRequired !== undefined) {
      callback.followUpRequired = Boolean(followUpRequired);
      if (nextCallbackDate) {
        callback.nextCallbackDate = new Date(nextCallbackDate);
        callback.reminderSent = false;
      }
    }

    // 6. Record edit to Activity Timeline
    callback.timeline.push({
      action: "REMARK_EDITED",
      title: "Call Remark Modified",
      description: `Latest remark updated within 15-minute window by ${req.user.name}. Reason: ${editReason}`,
      performedBy: req.user._id,
      performedByName: req.user.name || "Staff",
      performedByEmployeeId: req.user.employeeId || "",
      timestamp: new Date(),
    });

    await callback.save();

    // Log to system ActivityLog
    try {
      await ActivityLog.create({
        user: req.user._id,
        action: "CALLBACK_REMARK_EDITED",
        description: `User ${req.user.name} edited latest call remark for callback ${callback.callbackCode} within 15-min window.`,
        metadata: {
          callbackId: callback._id,
          remarkId,
          editReason,
        },
      });
    } catch {}

    return res.json({
      success: true,
      message: "Latest remark updated successfully within 15-minute window.",
      callback,
    });
  } catch (error) {
    console.error("Error editing call remark:", error);
    return res.status(500).json({ message: "Failed to edit remark: " + error.message });
  }
};

/**
 * @desc    Generate Complete Callback Reports & KPI Analytics
 * @route   GET /api/callbacks/reports/analytics
 * @access  Private (Admin / Master Admin)
 */
const getCallbackReports = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    const callbackQuery = {};
    if (startDate || endDate) {
      callbackQuery.createdAt = dateFilter;
    }
    if (employeeId && employeeId !== "All") {
      callbackQuery.assignedTo = employeeId;
    }

    const allCallbacks = await CallbackRequest.find(callbackQuery).populate(
      "assignedTo",
      "name employeeId designation department"
    );

    let totalCallsMade = 0;
    let connectedCalls = 0;
    let missedCalls = 0;
    let purchaseInterestedCalls = 0;
    let orderPlacedCalls = 0;
    let issueResolvedCalls = 0;
    let complaintRegisteredCalls = 0;
    let followUpPending = 0;

    const outcomeDistribution = {
      Connected: 0,
      "Not Answered": 0,
      Busy: 0,
      "Switched Off": 0,
      "Wrong Number": 0,
      "Call Back Later Requested": 0,
      "Issue Resolved": 0,
      Escalated: 0,
      "Interested in Purchase": 0,
      "Order Placed": 0,
      "Complaint Registered": 0,
    };

    const employeeMap = new Map();

    allCallbacks.forEach((cb) => {
      // Pending follow-ups
      if (cb.followUpRequired && !["Completed", "Cancelled"].includes(cb.status)) {
        followUpPending++;
      }

      // Process remarks
      if (cb.callRemarks && cb.callRemarks.length > 0) {
        cb.callRemarks.forEach((rm) => {
          totalCallsMade++;

          // Tally outcome
          if (outcomeDistribution[rm.callOutcome] !== undefined) {
            outcomeDistribution[rm.callOutcome]++;
          }

          // Connected vs Missed
          if (["Connected", "Issue Resolved", "Interested in Purchase", "Order Placed"].includes(rm.callOutcome)) {
            connectedCalls++;
          } else if (["Not Answered", "Busy", "Switched Off", "Wrong Number"].includes(rm.callOutcome)) {
            missedCalls++;
          }

          if (rm.callOutcome === "Interested in Purchase") purchaseInterestedCalls++;
          if (rm.callOutcome === "Order Placed") orderPlacedCalls++;
          if (rm.callOutcome === "Issue Resolved") issueResolvedCalls++;
          if (rm.callOutcome === "Complaint Registered") complaintRegisteredCalls++;

          // Employee Performance aggregation
          const empKey = rm.employee ? rm.employee.toString() : rm.employeeName || "Unassigned";
          if (!employeeMap.has(empKey)) {
            employeeMap.set(empKey, {
              employeeId: rm.employeeId || "EMP",
              employeeName: rm.employeeName || "Support Executive",
              totalCalls: 0,
              connectedCalls: 0,
              missedCalls: 0,
              conversions: 0,
              resolutions: 0,
              followUpsPending: 0,
            });
          }

          const empData = employeeMap.get(empKey);
          empData.totalCalls++;
          if (["Connected", "Issue Resolved", "Interested in Purchase", "Order Placed"].includes(rm.callOutcome)) {
            empData.connectedCalls++;
          } else if (["Not Answered", "Busy", "Switched Off", "Wrong Number"].includes(rm.callOutcome)) {
            empData.missedCalls++;
          }
          if (["Interested in Purchase", "Order Placed"].includes(rm.callOutcome)) {
            empData.conversions++;
          }
          if (rm.callOutcome === "Issue Resolved") {
            empData.resolutions++;
          }
        });
      }
    });

    // Compute conversion rate (Interested + Order Placed / Total calls * 100)
    const conversionCount = purchaseInterestedCalls + orderPlacedCalls;
    const conversionRate = totalCallsMade > 0 ? ((conversionCount / totalCallsMade) * 100).toFixed(1) : 0;
    const connectedRate = totalCallsMade > 0 ? ((connectedCalls / totalCallsMade) * 100).toFixed(1) : 0;
    const resolutionRate = allCallbacks.length > 0
      ? ((allCallbacks.filter((c) => c.status === "Completed").length / allCallbacks.length) * 100).toFixed(1)
      : 0;

    const employeePerformance = Array.from(employeeMap.values()).map((emp) => ({
      ...emp,
      connectedRate: emp.totalCalls > 0 ? ((emp.connectedCalls / emp.totalCalls) * 100).toFixed(1) : 0,
      conversionRate: emp.totalCalls > 0 ? ((emp.conversions / emp.totalCalls) * 100).toFixed(1) : 0,
      resolutionRate: emp.totalCalls > 0 ? ((emp.resolutions / emp.totalCalls) * 100).toFixed(1) : 0,
    }));

    return res.json({
      success: true,
      metrics: {
        totalCallbacks: allCallbacks.length,
        totalCallsMade,
        connectedCalls,
        connectedRate,
        missedCalls,
        conversionRate,
        conversionCount,
        followUpPending,
        resolutionRate,
        resolvedCount: issueResolvedCalls,
        complaintsCount: complaintRegisteredCalls,
      },
      outcomeDistribution,
      employeePerformance,
    });
  } catch (error) {
    console.error("Error generating callback reports:", error);
    return res.status(500).json({ message: "Failed to generate callback reports: " + error.message });
  }
};

/**
 * @desc    Export Raw Callbacks and Remarks Data for Excel/CSV
 * @route   GET /api/callbacks/reports/export
 * @access  Private (Admin / Master Admin)
 */
const exportCallbackData = async (req, res) => {
  try {
    const callbacks = await CallbackRequest.find()
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name employeeId email")
      .populate("order", "orderCode totalAmount")
      .populate("ticket", "ticketCode subject");

    // Flatten into rows for export
    const rows = [];
    callbacks.forEach((cb) => {
      if (cb.callRemarks && cb.callRemarks.length > 0) {
        cb.callRemarks.forEach((rm, idx) => {
          rows.push({
            callbackCode: cb.callbackCode,
            customerName: cb.customerName,
            customerPhone: cb.customerPhone,
            customerEmail: cb.customerEmail || "",
            orderCode: cb.orderCode || (cb.order ? cb.order.orderCode : ""),
            ticketCode: cb.ticketCode || (cb.ticket ? cb.ticket.ticketCode : ""),
            status: cb.status,
            priority: cb.priority,
            assignedExecutive: cb.assignedToName,
            remarkSequence: idx + 1,
            employeeName: rm.employeeName,
            employeeId: rm.employeeId,
            callOutcome: rm.callOutcome,
            conversationSummary: rm.conversationSummary,
            customerRequirement: rm.customerRequirement || "",
            issueDiscussed: rm.issueDiscussed || "",
            resolutionProvided: rm.resolutionProvided || "",
            followUpRequired: rm.followUpRequired ? "Yes" : "No",
            nextCallbackDate: rm.nextCallbackDate ? new Date(rm.nextCallbackDate).toLocaleString() : "",
            followUpPriority: rm.followUpPriority || "",
            internalNotes: rm.internalNotes || "",
            remarkCreatedAt: new Date(rm.createdAt).toLocaleString(),
            wasEdited: rm.editHistory && rm.editHistory.length > 0 ? "Yes" : "No",
            editCount: rm.editHistory ? rm.editHistory.length : 0,
          });
        });
      } else {
        rows.push({
          callbackCode: cb.callbackCode,
          customerName: cb.customerName,
          customerPhone: cb.customerPhone,
          customerEmail: cb.customerEmail || "",
          orderCode: cb.orderCode || "",
          ticketCode: cb.ticketCode || "",
          status: cb.status,
          priority: cb.priority,
          assignedExecutive: cb.assignedToName,
          remarkSequence: 0,
          employeeName: "",
          employeeId: "",
          callOutcome: "Pending First Attempt",
          conversationSummary: cb.initialNotes || "Awaiting call",
          customerRequirement: "",
          issueDiscussed: "",
          resolutionProvided: "",
          followUpRequired: cb.followUpRequired ? "Yes" : "No",
          nextCallbackDate: cb.nextCallbackDate ? new Date(cb.nextCallbackDate).toLocaleString() : "",
          followUpPriority: cb.followUpPriority || "",
          internalNotes: "",
          remarkCreatedAt: new Date(cb.createdAt).toLocaleString(),
          wasEdited: "No",
          editCount: 0,
        });
      }
    });

    return res.json({
      success: true,
      data: rows,
      totalRows: rows.length,
    });
  } catch (error) {
    console.error("Error exporting callback data:", error);
    return res.status(500).json({ message: "Failed to export callback data: " + error.message });
  }
};

/**
 * Customer Self-Service: Get logged-in customer's requested callbacks
 */
const getMyCallbacks = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userPhone = req.user?.mobileNumber;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const orClauses = [{ customerId: userId }];
    if (userPhone) orClauses.push({ customerPhone: userPhone });
    if (userEmail) orClauses.push({ customerEmail: userEmail });

    const callbacks = await CallbackRequest.find({ $or: orClauses })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email designation")
      .populate("remarks")
      .lean();

    return res.json({
      success: true,
      count: callbacks.length,
      callbacks,
    });
  } catch (error) {
    console.error("getMyCallbacks error:", error);
    return res.status(500).json({ message: "Failed to fetch callback requests: " + error.message });
  }
};

module.exports = {
  requestCallbackPublic,
  createCallbackRequest,
  getCallbacks,
  getCallbackById,
  assignCallback,
  addCallRemark,
  editLatestRemark,
  getCallbackReports,
  exportCallbackData,
  getMyCallbacks,
};

