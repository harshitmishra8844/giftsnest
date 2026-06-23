const express = require("express");
const {
  createTicket,
  getMyTickets,
  getTicketDetails,
  replyToTicket,
  adminGetTickets,
  adminReplyToTicket,
  adminUpdateTicketStatus,
} = require("../controllers/ticketController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");

const router = express.Router();

// Customer endpoints
router.post("/", protect, createTicket);
router.get("/my", protect, getMyTickets);
router.get("/my/:id", protect, getTicketDetails);
router.post("/my/:id/messages", protect, replyToTicket);

// Admin endpoints
router.get("/admin", protect, adminOnly, checkPermission("TICKETS_MANAGE"), adminGetTickets);
router.get("/admin/:id", protect, adminOnly, checkPermission("TICKETS_MANAGE"), getTicketDetails);
router.post("/admin/:id/messages", protect, adminOnly, checkPermission("TICKETS_MANAGE"), adminReplyToTicket);
router.patch("/admin/:id/status", protect, adminOnly, checkPermission("TICKETS_MANAGE"), adminUpdateTicketStatus);

module.exports = router;
