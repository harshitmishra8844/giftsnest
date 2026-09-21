const crypto = require("crypto");
const Ticket = require("../models/Ticket");
const SupportMessage = require("../models/SupportMessage");
const Order = require("../models/Order");
const User = require("../models/User");
const {
  notifySupportTicketCreated,
  notifyContactSubmission,
  notifyComplaintSubmitted,
  createAndDispatchNotification,
} = require("../services/notificationService");

const TicketCounter = require("../models/TicketCounter");
const { calculateSlaDeadlines, findAvailableExecutive, SOURCE_TO_ROLE_MAP, createCustomerServiceTicket } = require("../services/ticketHubService");
const SlaTracking = require("../models/SlaTracking");
const TaskAssignment = require("../models/TaskAssignment");
const EmployeeActivityLog = require("../models/EmployeeActivityLog");

// Helper to generate a sequential ticket code: NG-TKT-YYYY-000001
const generateTicketCode = async () => {
  try {
    return await TicketCounter.getNextTicketCode();
  } catch {
    const currentYear = new Date().getFullYear();
    return "NG-TKT-" + currentYear + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  }
};

/**
 * @desc    Create a new support ticket (Customer)
 * @route   POST /api/tickets
 * @access  Private (Customer)
 */
const createTicket = async (req, res) => {
  try {
    const { subject, message, orderId, category = "General Query", priority = "Medium" } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: "Please provide a subject." });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Please provide an initial message." });
    }

    // Verify order belongs to user if orderId is provided
    let order = null;
    let orderCode = "";
    if (orderId) {
      order = await Order.findOne({
        $or: [
          { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null, userId: req.user._id },
          { orderCode: orderId, userId: req.user._id },
        ],
      });
      if (order) {
        orderCode = order.orderCode;
      }
    }

    const isComplaint = category === "Complaint";
    const ticketCode = await generateTicketCode();

    let source = "Direct Support";
    if (isComplaint) source = "Complaint";
    else if (category === "Product Inquiry") source = "Product Inquiry";
    else if (category === "Order Issue") source = "Order Issue";
    else if (category === "Return / Replacement") source = "Return Request";
    else if (category === "Contact Us") source = "Contact Form";

    const targetPriority = isComplaint ? "Critical" : priority;
    const { firstResponseDue, resolutionDue } = await calculateSlaDeadlines(source, targetPriority);
    const targetRole = SOURCE_TO_ROLE_MAP[source] || "Support Executive";
    const autoExecutive = await findAvailableExecutive(targetRole);

    const ticket = await Ticket.create({
      ticketCode,
      source,
      user: req.user._id,
      customerName: req.user.name || "Customer",
      customerEmail: req.user.email || "",
      customerPhone: req.user.mobileNumber || "",
      subject: subject.trim(),
      order: order ? order._id : null,
      orderCode,
      category,
      priority: targetPriority,
      status: autoExecutive ? "Assigned" : "New",
      assignedAgent: autoExecutive ? autoExecutive._id : null,
      assignedRole: targetRole,
      assignedDepartment: autoExecutive ? autoExecutive.department : null,
      assignedAt: autoExecutive ? new Date() : null,
      firstResponseDue,
      resolutionDue,
      isOverdue: false,
      slaBreached: false,
      transferHistory: [],
      messages: [
        {
          sender: req.user._id,
          senderName: req.user.name || "Customer",
          isAdmin: false,
          message: message.trim(),
        },
      ],
    });

    SupportMessage.create({
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      sender: req.user._id,
      senderName: req.user.name || "Customer",
      isAdmin: false,
      message: message.trim(),
    }).catch((err) => console.error("[SupportMessage] Log error:", err.message));

    // Real-time admin notification
    if (isComplaint) {
      notifyComplaintSubmitted(ticket).catch((err) =>
        console.error("[Notification] Complaint alert failed:", err.message)
      );
    } else {
      notifySupportTicketCreated(ticket).catch((err) =>
        console.error("[Notification] Support ticket alert failed:", err.message)
      );
    }

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create ticket." });
  }
};

/**
 * @desc    Submit Public Contact Us Form / Inquiry
 * @route   POST /api/tickets/contact
 * @access  Public
 */
const submitContactForm = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      orderNumber,
      subject,
      message,
      category = "Contact Us",
      priority = "Medium",
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Please provide your name." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Please provide your email address." });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Please provide your message." });
    }

    // Attempt matching customer if registered
    let matchedUser = null;
    try {
      matchedUser = await User.findOne({ email: email.trim().toLowerCase() });
    } catch {}

    // Match order if provided
    let matchedOrder = null;
    let finalOrderCode = (orderNumber || "").trim();
    if (finalOrderCode) {
      try {
        matchedOrder = await Order.findOne({
          $or: [
            { orderCode: finalOrderCode },
            { _id: finalOrderCode.match(/^[0-9a-fA-F]{24}$/) ? finalOrderCode : null },
          ],
        });
        if (matchedOrder) {
          finalOrderCode = matchedOrder.orderCode;
        }
      } catch {}
    }

    const isComplaint = category === "Complaint";
    const ticketCode = await generateTicketCode();

    let source = isComplaint ? "Complaint" : (category === "Product Inquiry" ? "Product Inquiry" : "Contact Form");
    const targetPriority = isComplaint ? "Critical" : priority;
    const { firstResponseDue, resolutionDue } = await calculateSlaDeadlines(source, targetPriority);
    const targetRole = SOURCE_TO_ROLE_MAP[source] || "Support Executive";
    const autoExecutive = await findAvailableExecutive(targetRole);

    const ticket = await Ticket.create({
      ticketCode,
      source,
      user: matchedUser ? matchedUser._id : null,
      customerName: name.trim(),
      customerEmail: email.trim().toLowerCase(),
      customerPhone: (phone || "").trim(),
      subject: (subject || `Contact Inquiry from ${name}`).trim(),
      order: matchedOrder ? matchedOrder._id : null,
      orderCode: finalOrderCode,
      category: isComplaint ? "Complaint" : category,
      priority: targetPriority,
      status: autoExecutive ? "Assigned" : "New",
      assignedAgent: autoExecutive ? autoExecutive._id : null,
      assignedRole: targetRole,
      assignedDepartment: autoExecutive ? autoExecutive.department : null,
      assignedAt: autoExecutive ? new Date() : null,
      firstResponseDue,
      resolutionDue,
      isOverdue: false,
      slaBreached: false,
      transferHistory: [],
      messages: [
        {
          sender: matchedUser ? matchedUser._id : null,
          senderName: name.trim(),
          isAdmin: false,
          message: message.trim(),
        },
      ],
    });

    SupportMessage.create({
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      sender: matchedUser ? matchedUser._id : null,
      senderName: name.trim(),
      isAdmin: false,
      message: message.trim(),
    }).catch((err) => console.error("[SupportMessage] Contact log error:", err.message));

    // Real-time admin notification
    if (isComplaint) {
      notifyComplaintSubmitted(ticket).catch((err) =>
        console.error("[Notification] Complaint alert failed:", err.message)
      );
    } else {
      notifyContactSubmission(ticket).catch((err) =>
        console.error("[Notification] Contact submission alert failed:", err.message)
      );
    }

    res.status(201).json({
      success: true,
      message: "Thank you. Your message has been received and a support ticket has been created.",
      ticketCode: ticket.ticketCode,
      ticket,
    });
  } catch (error) {
    console.error("[submitContactForm] Error:", error);
    res.status(500).json({ message: error.message || "Failed to submit contact form." });
  }
};

/**
 * @desc    Get all tickets for the logged-in customer
 * @route   GET /api/tickets/my
 * @access  Private (Customer)
 */
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({
      $or: [
        { user: req.user._id },
        { customerEmail: req.user.email?.toLowerCase() },
      ],
    })
      .populate("order", "orderCode totalPrice createdAt")
      .sort({ updatedAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to retrieve tickets." });
  }
};

/**
 * @desc    Get ticket details
 * @route   GET /api/tickets/my/:id
 * @access  Private (Customer or Admin)
 */
const getTicketDetails = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("user", "name email mobileNumber")
      .populate("order", "orderCode totalPrice createdAt status paymentMethod")
      .populate("assignedAgent", "name email designation")
      .populate("messages.sender", "name email");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Access check: owner by user ID or customerEmail, or admin
    const isOwner =
      (ticket.user && ticket.user._id.toString() === req.user._id.toString()) ||
      (ticket.customerEmail && ticket.customerEmail.toLowerCase() === req.user.email?.toLowerCase());

    if (!isOwner && !req.user.isAdmin && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to retrieve ticket details." });
  }
};

/**
 * @desc    Customer reply to ticket
 * @route   POST /api/tickets/my/:id/messages
 * @access  Private (Customer)
 */
const replyToTicket = async (req, res) => {
  try {
    const { message, attachments } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Access check
    const isOwner =
      (ticket.user && ticket.user.toString() === req.user._id.toString()) ||
      (ticket.customerEmail && ticket.customerEmail.toLowerCase() === req.user.email?.toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ message: "Access denied." });
    }

    // If Closed or Resolved, automatically reopen to In Progress
    if (ticket.status === "Resolved" || ticket.status === "Closed" || ticket.status === "Waiting for Customer") {
      ticket.status = "In Progress";
    }

    ticket.messages.push({
      sender: req.user._id,
      senderName: req.user.name || "Customer",
      isAdmin: false,
      message: message.trim(),
      attachments: attachments || [],
    });

    await ticket.save();

    SupportMessage.create({
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      sender: req.user._id,
      senderName: req.user.name || "Customer",
      isAdmin: false,
      message: message.trim(),
      attachments: attachments || [],
    }).catch((err) => console.error("[SupportMessage] Reply log error:", err.message));

    // Alert admins of customer reply
    createAndDispatchNotification({
      role: "admin",
      category: "SUPPORT",
      event: "CUSTOMER_REPLIED",
      title: `Customer Reply #${ticket.ticketCode}`,
      message: `${req.user.name || "Customer"} replied to ticket #${ticket.ticketCode}: "${message.slice(0, 80)}..."`,
      priority: ticket.priority || "Medium",
      link: "support",
      metadata: { ticketId: ticket._id, ticketCode: ticket.ticketCode },
    }).catch(() => {});

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("user", "name email")
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("assignedAgent", "name email")
      .populate("messages.sender", "name email");

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to send message." });
  }
};

/**
 * @desc    Get all tickets with filters (Admin)
 * @route   GET /api/tickets/admin
 * @access  Private (Admin)
 */
const adminGetTickets = async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      assignedAgent,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (status && status !== "All") {
      filter.status = status;
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    if (priority && priority !== "All") {
      filter.priority = priority;
    }

    if (assignedAgent && assignedAgent !== "All") {
      filter.assignedAgent = assignedAgent;
    }

    let query = Ticket.find(filter)
      .populate("user", "name email mobileNumber")
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("assignedAgent", "name email designation")
      .sort({ updatedAt: -1 });

    let tickets = await query.exec();

    // In-memory client search across multiple fields
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      tickets = tickets.filter((t) => {
        return (
          t.ticketCode?.match(regex) ||
          t.subject?.match(regex) ||
          t.customerName?.match(regex) ||
          t.customerEmail?.match(regex) ||
          t.orderCode?.match(regex) ||
          t.user?.name?.match(regex) ||
          t.user?.email?.match(regex) ||
          t.messages?.some((m) => m.message?.match(regex))
        );
      });
    }

    const total = tickets.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const paginated = tickets.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      tickets: paginated,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to retrieve tickets." });
  }
};

/**
 * @desc    Get Support Dashboard KPI Metrics
 * @route   GET /api/tickets/admin/metrics
 * @access  Private (Admin)
 */
const adminGetSupportMetrics = async (req, res) => {
  try {
    const [
      totalCount,
      openCount,
      inProgressCount,
      waitingCustomerCount,
      resolvedCount,
      closedCount,
      urgentCount,
      complaintsCount,
    ] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: "Open" }),
      Ticket.countDocuments({ status: "In Progress" }),
      Ticket.countDocuments({ status: "Waiting for Customer" }),
      Ticket.countDocuments({ status: "Resolved" }),
      Ticket.countDocuments({ status: "Closed" }),
      Ticket.countDocuments({ priority: "Urgent", status: { $nin: ["Resolved", "Closed"] } }),
      Ticket.countDocuments({ category: "Complaint", status: { $nin: ["Resolved", "Closed"] } }),
    ]);

    res.json({
      success: true,
      metrics: {
        totalCount,
        openCount,
        inProgressCount,
        waitingCustomerCount,
        resolvedCount,
        closedCount,
        urgentCount,
        complaintsCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to calculate support metrics." });
  }
};

/**
 * @desc    Admin reply to ticket
 * @route   POST /api/tickets/admin/:id/messages
 * @access  Private (Admin)
 */
const adminReplyToTicket = async (req, res) => {
  try {
    const { message, attachments, status } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Transition status to Waiting for Customer unless specified
    ticket.status = status || "Waiting for Customer";

    ticket.messages.push({
      sender: req.user._id,
      senderName: req.user.name || "Niyora Concierge",
      isAdmin: true,
      message: message.trim(),
      attachments: attachments || [],
    });

    await ticket.save();

    SupportMessage.create({
      ticketId: ticket._id,
      ticketCode: ticket.ticketCode,
      sender: req.user._id,
      senderName: req.user.name || "Niyora Concierge",
      isAdmin: true,
      message: message.trim(),
      attachments: attachments || [],
    }).catch((err) => console.error("[SupportMessage] Admin reply log error:", err.message));

    // In-app customer notification if registered
    if (ticket.user) {
      createAndDispatchNotification({
        recipient: ticket.user,
        role: "customer",
        category: "SUPPORT",
        event: "AGENT_REPLIED",
        title: `Response to Ticket #${ticket.ticketCode}`,
        message: `Concierge staff replied: "${message.slice(0, 100)}..."`,
        priority: "Medium",
        link: "help",
        metadata: { ticketId: ticket._id, ticketCode: ticket.ticketCode },
      }).catch(() => {});
    }

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("user", "name email mobileNumber")
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("assignedAgent", "name email designation")
      .populate("messages.sender", "name email");

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to reply to ticket." });
  }
};

/**
 * @desc    Admin / Employee update ticket status
 * @route   PATCH /api/tickets/admin/:id/status
 * @route   PUT /api/tickets/:id
 * @access  Private (Staff / Admin)
 */
const adminUpdateTicketStatus = async (req, res) => {
  try {
    let { status, note } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required." });
    }

    const allowed = [
      "New",
      "Open",
      "Assigned",
      "In Progress",
      "Waiting Customer",
      "Waiting for Customer",
      "Escalated",
      "Resolved",
      "Closed",
    ];

    const matchedStatus = allowed.find(
      (s) => s.toLowerCase() === status.trim().toLowerCase()
    );
    if (!matchedStatus) {
      return res.status(400).json({
        message: `Invalid status value. Allowed: ${allowed.join(", ")}`,
      });
    }
    status = matchedStatus;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Role / Authorization check:
    // Allow if:
    // 1. Master Admin (isMasterAdmin === true)
    // 2. User has permissions (TICKETS_MANAGE or ALL, etc.)
    // 3. User is assignedAgent of this ticket
    // 4. Ticket assignedRole matches user's designation or roles
    // 5. Any staff/admin member handling work desk tasks
    const isAssignedAgent =
      ticket.assignedAgent &&
      ticket.assignedAgent.toString() === req.user._id.toString();

    const userRoles = (req.user.roles || []).map((r) =>
      typeof r === "string" ? r : r.name
    );
    const isRoleAssigned =
      ticket.assignedRole &&
      (ticket.assignedRole === req.user.designation ||
        userRoles.includes(ticket.assignedRole));

    const hasPermission =
      req.user.isMasterAdmin ||
      (req.user.permissions &&
        (req.user.permissions.includes("ALL") ||
          req.user.permissions.includes("TICKETS_MANAGE") ||
          req.user.permissions.includes("TASK_TRANSFER") ||
          req.user.permissions.includes("CUSTOMERS_VIEW") ||
          req.user.permissions.includes("ORDERS_RETURNS") ||
          req.user.permissions.includes("SUPPORT_CHAT")));

    if (!req.user.isMasterAdmin && !isAssignedAgent && !isRoleAssigned && !hasPermission && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Access denied. You do not have permission to update this ticket status.",
      });
    }

    const oldStatus = ticket.status;
    ticket.status = status;

    if (status === "Resolved") {
      ticket.resolvedAt = new Date();
    }
    if (status === "Closed") {
      ticket.closedAt = new Date();
    }

    // Append system note/message to ticket
    ticket.messages.push({
      sender: req.user._id,
      senderName: req.user.name || "Staff Member",
      isAdmin: true,
      message: `Status updated from "${oldStatus}" to "${status}" by ${req.user.name}.${note ? ` Note: ${note}` : ""}`,
    });

    await ticket.save();

    // Synchronize SLA Tracking
    if (status === "Resolved" || status === "Closed") {
      try {
        await SlaTracking.updateMany(
          { taskId: ticket._id },
          {
            $set: {
              resolvedAt: new Date(),
              isOverdue: false,
            },
          }
        );
      } catch (slaErr) {
        console.error("SlaTracking sync error on ticket resolve:", slaErr.message);
      }

      // Synchronize Task Assignment
      try {
        await TaskAssignment.updateMany(
          { taskId: ticket._id, status: "Active" },
          {
            $set: {
              status: "Completed",
              completedAt: new Date(),
              notes: note ? `Resolved with note: ${note}` : `Ticket marked as ${status} by ${req.user.name}`,
            },
          }
        );
      } catch (taskErr) {
        console.error("TaskAssignment sync error on ticket resolve:", taskErr.message);
      }

      // In-app customer notification if registered
      if (status === "Resolved" && ticket.user) {
        createAndDispatchNotification({
          recipient: ticket.user,
          role: "customer",
          category: "SUPPORT",
          event: "TICKET_RESOLVED",
          title: `Ticket #${ticket.ticketCode} Resolved`,
          message: `Your ticket regarding "${ticket.subject}" has been marked as resolved by our support team.${note ? ` Note: ${note}` : ""}`,
          priority: "Low",
          link: "help",
          metadata: { ticketId: ticket._id, ticketCode: ticket.ticketCode },
        }).catch(() => {});
      }
    }

    // Log to EmployeeActivityLog
    try {
      await EmployeeActivityLog.create({
        employeeId: req.user._id,
        employeeName: req.user.name || "Employee",
        role: req.user.designation || (req.user.roles && req.user.roles[0]?.name) || "Staff",
        action: status === "Resolved" ? "RESOLVE_TICKET" : "UPDATE_TICKET_STATUS",
        targetType: "Ticket",
        targetId: ticket._id,
        targetCode: ticket.ticketCode,
        details: `Ticket #${ticket.ticketCode} status updated from "${oldStatus}" to "${status}" by ${req.user.name}.${note ? ` Note: ${note}` : ""}`,
      });
    } catch (logErr) {
      console.error("EmployeeActivityLog error:", logErr.message);
    }

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("user", "name email mobileNumber")
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("assignedAgent", "name email designation")
      .populate("messages.sender", "name email");

    const responseData = updatedTicket.toObject();
    responseData.success = true;
    responseData.ticket = updatedTicket;

    return res.json(responseData);
  } catch (error) {
    console.error("adminUpdateTicketStatus error:", error);
    return res.status(500).json({ message: error.message || "Failed to update status." });
  }
};

/**
 * @desc    Assign ticket to support staff
 * @route   PATCH /api/tickets/admin/:id/assign
 * @access  Private (Admin)
 */
const adminAssignTicket = async (req, res) => {
  try {
    const { agentId } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    let agentName = "Unassigned";
    if (agentId) {
      const agent = await User.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Staff member not found." });
      }
      ticket.assignedAgent = agent._id;
      agentName = agent.name;
    } else {
      ticket.assignedAgent = null;
    }

    ticket.internalNotes.push({
      note: `Ticket assigned to ${agentName} by ${req.user.name}.`,
      author: req.user._id,
      authorName: req.user.name,
      createdAt: new Date(),
    });

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("user", "name email mobileNumber")
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("assignedAgent", "name email designation")
      .populate("messages.sender", "name email");

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to assign ticket." });
  }
};

/**
 * @desc    Add internal note to ticket
 * @route   POST /api/tickets/admin/:id/notes
 * @access  Private (Admin)
 */
const adminAddInternalNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ message: "Note content cannot be empty." });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    ticket.internalNotes.push({
      note: note.trim(),
      author: req.user._id,
      authorName: req.user.name,
      createdAt: new Date(),
    });

    await ticket.save();

    res.json({
      message: "Internal note added successfully.",
      internalNotes: ticket.internalNotes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add internal note." });
  }
};

/**
 * @desc    Update ticket priority
 * @route   PATCH /api/tickets/admin/:id/priority
 * @access  Private (Admin)
 */
const adminUpdatePriority = async (req, res) => {
  try {
    const { priority } = req.body;
    const allowed = ["Low", "Medium", "High", "Urgent"];
    if (!priority || !allowed.includes(priority)) {
      return res.status(400).json({ message: `Invalid priority. Allowed: ${allowed.join(", ")}` });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    ticket.priority = priority;
    await ticket.save();

    res.json({ message: `Priority set to ${priority}.`, ticket });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update priority." });
  }
};

/**
 * @desc    Transfer ticket task to another executive / role
 * @route   POST /api/tickets/:id/transfer
 * @access  Private (Staff / Admin)
 */
const transferTicketTask = async (req, res) => {
  req.body.taskType = "Ticket";
  req.body.taskId = req.params.id;
  return require("./taskController").transferTask(req, res);
};

/**
 * @desc    Product Inquiry submission
 * @route   POST /api/tickets/inquiry
 * @access  Public / Optional Auth
 */
const submitProductInquiry = async (req, res) => {
  try {
    const { name, email, phone, productId, productName = "", message, customizationQuery = "" } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email, and inquiry message are required." });
    }

    let customerId = req.user ? req.user._id : null;
    if (!customerId && email) {
      try {
        const found = await User.findOne({ email: email.trim().toLowerCase() });
        if (found) customerId = found._id;
      } catch {}
    }

    const fullSubject = productName ? `Product Inquiry: ${productName}` : `Product Inquiry from ${name}`;
    const fullMessage = `${message.trim()} ${customizationQuery ? `\n\nCustomization Details: ${customizationQuery.trim()}` : ""}`;

    const ticket = await createCustomerServiceTicket({
      source: "Product Inquiry",
      category: "Product Inquiry",
      customerName: name.trim(),
      customerEmail: email.trim().toLowerCase(),
      customerPhone: (phone || "").trim(),
      customerId,
      subject: fullSubject,
      message: fullMessage,
      priority: "Medium",
      metadata: { productId, productName, customizationQuery },
    });

    res.status(201).json({
      success: true,
      message: "Product inquiry received. Our concierge team will reach out to you shortly.",
      ticketCode: ticket.ticketCode,
      ticket,
    });
  } catch (error) {
    console.error("Submit product inquiry error:", error);
    res.status(500).json({ message: error.message || "Failed to submit product inquiry." });
  }
};

/**
 * @desc    Order Issue submission
 * @route   POST /api/tickets/order-issue
 * @access  Public / Optional Auth
 */
const submitOrderIssue = async (req, res) => {
  try {
    const { name, email, phone, orderCode, orderId, issueType = "Order Issue", message } = req.body;
    if (!orderCode && !orderId) {
      return res.status(400).json({ message: "Order Code or Order ID is required." });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Please describe the issue." });
    }

    let customerId = req.user ? req.user._id : null;
    let finalOrder = null;
    try {
      finalOrder = await Order.findOne({
        $or: [
          { orderCode: (orderCode || "").trim() },
          { _id: orderId && orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null },
        ],
      });
      if (finalOrder && !customerId) {
        customerId = finalOrder.userId;
      }
    } catch {}

    const ticket = await createCustomerServiceTicket({
      source: "Order Issue",
      category: "Order Issue",
      customerName: (name || (req.user && req.user.name) || (finalOrder && finalOrder.address?.fullName) || "Customer").trim(),
      customerEmail: (email || (req.user && req.user.email) || "").trim().toLowerCase(),
      customerPhone: (phone || (req.user && req.user.mobileNumber) || "").trim(),
      customerId,
      subject: `Order Issue: #${orderCode || finalOrder?.orderCode || "Order"} (${issueType})`,
      message: message.trim(),
      orderId: finalOrder ? finalOrder._id : (orderId || null),
      orderCode: orderCode || finalOrder?.orderCode || "",
      priority: "High",
      metadata: { issueType },
    });

    res.status(201).json({
      success: true,
      message: "Order issue report registered. Our order team has prioritized your request.",
      ticketCode: ticket.ticketCode,
      ticket,
    });
  } catch (error) {
    console.error("Submit order issue error:", error);
    res.status(500).json({ message: error.message || "Failed to submit order issue." });
  }
};

/**
 * @desc    Payment Issue submission
 * @route   POST /api/tickets/payment-issue
 * @access  Public / Optional Auth
 */
const submitPaymentIssue = async (req, res) => {
  try {
    const { name, email, phone, orderCode = "", paymentMethod = "", transactionId = "", amount = 0, message = "" } = req.body;
    let customerId = req.user ? req.user._id : null;

    const ticket = await createCustomerServiceTicket({
      source: "Payment Issue",
      category: "Order Issue",
      customerName: (name || (req.user && req.user.name) || "Customer").trim(),
      customerEmail: (email || (req.user && req.user.email) || "").trim().toLowerCase(),
      customerPhone: (phone || (req.user && req.user.mobileNumber) || "").trim(),
      customerId,
      subject: `Payment Verification Issue: Ref #${transactionId || orderCode || "Transaction"}`,
      message: (message || `Payment issue reported for amount INR ${amount}. Method: ${paymentMethod}. Transaction Ref: ${transactionId}`).trim(),
      orderCode: (orderCode || "").trim(),
      priority: "High",
      metadata: { paymentMethod, transactionId, amount },
    });

    res.status(201).json({
      success: true,
      message: "Payment issue logged. Our accounts team will verify the payment status immediately.",
      ticketCode: ticket.ticketCode,
      ticket,
    });
  } catch (error) {
    console.error("Submit payment issue error:", error);
    res.status(500).json({ message: error.message || "Failed to submit payment issue." });
  }
};

/**
 * @desc    WhatsApp Inquiry auto-registration
 * @route   POST /api/tickets/whatsapp-inquiry
 * @access  Public / Optional Auth
 */
const submitWhatsAppInquiry = async (req, res) => {
  try {
    const { name = "Shopper", phone = "", email = "", message = "Inquiring about gifting concierge", productName = "" } = req.body;
    let customerId = req.user ? req.user._id : null;

    const ticket = await createCustomerServiceTicket({
      source: "WhatsApp Inquiry",
      category: "Product Inquiry",
      customerName: (name || "WhatsApp Shopper").trim(),
      customerEmail: (email || "").trim().toLowerCase(),
      customerPhone: (phone || "").trim(),
      customerId,
      subject: productName ? `WhatsApp Inquiry: ${productName}` : `WhatsApp Concierge Chat (${ticketCode => ticketCode})`,
      message: message.trim(),
      priority: "Medium",
      metadata: { channel: "WhatsApp", productName },
    });

    const storePhone = process.env.STORE_PHONE || "919876543210";
    const cleanPhone = storePhone.replace(/[^0-9]/g, "");
    const encodedText = encodeURIComponent(`Hello Niyora Gifts! I have an inquiry [Ref: ${ticket.ticketCode}]: ${message.trim()}`);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

    res.status(201).json({
      success: true,
      ticketCode: ticket.ticketCode,
      whatsappUrl,
      ticket,
    });
  } catch (error) {
    console.error("Submit WhatsApp inquiry error:", error);
    res.status(500).json({ message: error.message || "Failed to register WhatsApp inquiry." });
  }
};

/**
 * @desc    Email Inquiry auto-registration
 * @route   POST /api/tickets/email-inquiry
 * @access  Public / Optional Auth
 */
const submitEmailInquiry = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!email || !message) {
      return res.status(400).json({ message: "Email and message are required." });
    }

    let customerId = req.user ? req.user._id : null;
    const ticket = await createCustomerServiceTicket({
      source: "Email Inquiry",
      category: "General Query",
      customerName: (name || "Email Sender").trim(),
      customerEmail: email.trim().toLowerCase(),
      customerId,
      subject: (subject || "Email Support Request").trim(),
      message: message.trim(),
      priority: "Medium",
    });

    res.status(201).json({
      success: true,
      ticketCode: ticket.ticketCode,
      message: "Email inquiry received and logged into customer support desk.",
      ticket,
    });
  } catch (error) {
    console.error("Submit email inquiry error:", error);
    res.status(500).json({ message: error.message || "Failed to submit email inquiry." });
  }
};

module.exports = {
  createTicket,
  submitContactForm,
  submitProductInquiry,
  submitOrderIssue,
  submitPaymentIssue,
  submitWhatsAppInquiry,
  submitEmailInquiry,
  getMyTickets,
  getTicketDetails,
  replyToTicket,
  adminGetTickets,
  adminGetSupportMetrics,
  adminReplyToTicket,
  adminUpdateTicketStatus,
  adminAssignTicket,
  adminAddInternalNote,
  adminUpdatePriority,
  transferTicketTask,
};
