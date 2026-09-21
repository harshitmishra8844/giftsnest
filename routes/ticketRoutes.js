const express = require("express");
const {
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
} = require("../controllers/ticketController");
const { protect, adminOnly, optionalAuth } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");

const router = express.Router();

// Inbound Customer Interaction Endpoints
router.post("/contact", optionalAuth, submitContactForm);
router.post("/inquiry", optionalAuth, submitProductInquiry);
router.post("/order-issue", optionalAuth, submitOrderIssue);
router.post("/payment-issue", optionalAuth, submitPaymentIssue);
router.post("/whatsapp-inquiry", optionalAuth, submitWhatsAppInquiry);
router.post("/email-inquiry", optionalAuth, submitEmailInquiry);

// Customer authenticated endpoints
router.post("/", protect, createTicket);
router.get("/my", protect, getMyTickets);
router.get("/my/:id", protect, getTicketDetails);
router.post("/my/:id/messages", protect, replyToTicket);

// Admin Support endpoints
router.get("/admin/metrics", protect, adminOnly, checkPermission("TICKETS_MANAGE"), adminGetSupportMetrics);
router.get("/admin", protect, adminOnly, checkPermission("TICKETS_MANAGE"), adminGetTickets);
router.get("/admin/:id", protect, adminOnly, getTicketDetails);
router.post("/admin/:id/messages", protect, adminOnly, adminReplyToTicket);
router.patch("/admin/:id/status", protect, adminOnly, adminUpdateTicketStatus);
router.put("/admin/:id/status", protect, adminOnly, adminUpdateTicketStatus);
router.patch("/admin/:id", protect, adminOnly, adminUpdateTicketStatus);
router.put("/admin/:id", protect, adminOnly, adminUpdateTicketStatus);
router.patch("/admin/:id/assign", protect, adminOnly, checkPermission("TICKETS_MANAGE"), adminAssignTicket);
router.post("/admin/:id/notes", protect, adminOnly, adminAddInternalNote);
router.patch("/admin/:id/priority", protect, adminOnly, checkPermission("TICKETS_MANAGE"), adminUpdatePriority);
router.post("/admin/:id/transfer", protect, adminOnly, checkPermission(["TASK_TRANSFER", "TICKETS_MANAGE"]), transferTicketTask);

// Employee Work Desk & Quick Action endpoints
router.put("/:id", protect, adminOnly, adminUpdateTicketStatus);
router.patch("/:id", protect, adminOnly, adminUpdateTicketStatus);
router.put("/:id/status", protect, adminOnly, adminUpdateTicketStatus);
router.patch("/:id/status", protect, adminOnly, adminUpdateTicketStatus);
router.post("/:id/transfer", protect, adminOnly, checkPermission(["TASK_TRANSFER", "TICKETS_MANAGE"]), transferTicketTask);

module.exports = router;
