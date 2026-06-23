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

const router = express.Router();

// Customer endpoints
router.post("/", protect, createTicket);
router.get("/my", protect, getMyTickets);
router.get("/my/:id", protect, getTicketDetails);
router.post("/my/:id/messages", protect, replyToTicket);

// Admin endpoints
router.get("/admin", protect, adminOnly, adminGetTickets);
router.get("/admin/:id", protect, adminOnly, getTicketDetails);
router.post("/admin/:id/messages", protect, adminOnly, adminReplyToTicket);
router.patch("/admin/:id/status", protect, adminOnly, adminUpdateTicketStatus);

module.exports = router;
