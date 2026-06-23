const crypto = require("crypto");
const Ticket = require("../models/Ticket");
const Order = require("../models/Order");

// Helper to generate a unique ticket code
const generateTicketCode = () => {
  return "TKT-" + crypto.randomBytes(3).toString("hex").toUpperCase();
};

/**
 * @desc    Create a new support ticket
 * @route   POST /api/tickets
 * @access  Private (Customer)
 */
const createTicket = async (req, res) => {
  try {
    const { subject, message, orderId } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: "Please provide a subject." });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Please provide an initial message." });
    }

    // Verify order belongs to user if orderId is provided
    let order = null;
    if (orderId) {
      order = await Order.findOne({ _id: orderId, userId: req.user._id });
      if (!order) {
        return res.status(404).json({ message: "Order not found or access denied." });
      }
    }

    const ticketCode = generateTicketCode();
    const ticket = await Ticket.create({
      ticketCode,
      user: req.user._id,
      subject: subject.trim(),
      order: order ? order._id : null,
      status: "Open",
      messages: [
        {
          sender: req.user._id,
          senderName: req.user.name,
          isAdmin: false,
          message: message.trim(),
        },
      ],
    });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create ticket" });
  }
};

/**
 * @desc    Get all tickets for the logged-in customer
 * @route   GET /api/tickets/my
 * @access  Private (Customer)
 */
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id })
      .populate("order", "orderCode totalPrice createdAt")
      .sort({ updatedAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to retrieve tickets" });
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
      .populate("user", "name email")
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("messages.sender", "name email");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Access check: must be owner or admin
    if (ticket.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to retrieve ticket details" });
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

    // Access check: must be owner
    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    // If Resolved, reopen it
    if (ticket.status === "Resolved") {
      ticket.status = "Open";
    }

    ticket.messages.push({
      sender: req.user._id,
      senderName: req.user.name,
      isAdmin: false,
      message: message.trim(),
      attachments: attachments || [],
    });

    await ticket.save();
    
    // Populate sender details for returned ticket
    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("user", "name email")
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("messages.sender", "name email");

    // Trigger email notification to assigned agent or admins
    try {
      const { sendCustomerReplyNotificationToAgentOrAdmin } = require("../services/returnEmailService");
      if (ticket.assignedAgent) {
        const User = require("../models/User");
        const agent = await User.findById(ticket.assignedAgent).select("email name");
        if (agent) {
          await sendCustomerReplyNotificationToAgentOrAdmin(agent.email, agent.name, ticket, message);
        }
      } else {
        const admins = await User.find({ isAdmin: true }).select("email name");
        for (const admin of admins) {
          await sendCustomerReplyNotificationToAgentOrAdmin(admin.email, admin.name, ticket, message);
        }
      }
    } catch (mailErr) {
      console.error("[email] Failed to send customer reply ticket alert:", mailErr.message);
    }

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to send message" });
  }
};

/**
 * @desc    Get all tickets in the system
 * @route   GET /api/tickets/admin
 * @access  Private (Admin)
 */
const adminGetTickets = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && ["Open", "In Progress", "Resolved"].includes(status)) {
      filter.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { subject: regex },
        { ticketCode: regex },
      ];
    }

    // Execute tickets fetch and populate user details
    let tickets = await Ticket.find(filter)
      .populate("user", "name email")
      .populate("order", "orderCode totalPrice createdAt")
      .sort({ updatedAt: -1 });

    // Filter by customer name/email regex if search didn't match code/subject directly
    if (search && search.trim() && tickets.length === 0) {
      // Find matching users first
      const regex = new RegExp(search.trim(), "i");
      const matchedUsers = await require("../models/User").find({
        $or: [{ name: regex }, { email: regex }],
      });
      const userIds = matchedUsers.map((u) => u._id);
      
      tickets = await Ticket.find({ user: { $in: userIds }, ...filter })
        .populate("user", "name email")
        .populate("order", "orderCode totalPrice createdAt")
        .sort({ updatedAt: -1 });
    }

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to retrieve tickets" });
  }
};

/**
 * @desc    Admin reply to ticket
 * @route   POST /api/tickets/admin/:id/messages
 * @access  Private (Admin)
 */
const adminReplyToTicket = async (req, res) => {
  try {
    const { message, attachments } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Auto-update status to In Progress if currently Open
    if (ticket.status === "Open") {
      ticket.status = "In Progress";
    }

    ticket.messages.push({
      sender: req.user._id,
      senderName: req.user.name,
      isAdmin: true,
      message: message.trim(),
      attachments: attachments || [],
    });

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("user", "name email")
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("messages.sender", "name email");

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to reply to ticket" });
  }
};

/**
 * @desc    Admin update ticket status manually
 * @route   PATCH /api/tickets/admin/:id/status
 * @access  Private (Admin)
 */
const adminUpdateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["Open", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const oldStatus = ticket.status;
    ticket.status = status;

    // Append a system note in messages
    ticket.messages.push({
      sender: req.user._id,
      senderName: "System Note",
      isAdmin: true,
      message: `Ticket status changed from "${oldStatus}" to "${status}" by admin.`,
    });

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("user", "name email")
      .populate("order", "orderCode totalPrice createdAt status")
      .populate("messages.sender", "name email");

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update status" });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketDetails,
  replyToTicket,
  adminGetTickets,
  adminReplyToTicket,
  adminUpdateTicketStatus,
};
