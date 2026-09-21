import { useState, useEffect } from "react";
import api from "../services/api";
import CallbackRemarksSection from "./CallbackRemarksSection";
import EnterpriseTaskTransferModal from "./EnterpriseTaskTransferModal";
import Customer360Drawer from "./Customer360Drawer";

const STATUS_COLORS = {
  New: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
  Open: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
  Assigned: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30",
  "In Progress": "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
  "Waiting for Customer": "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30",
  "Waiting Customer": "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30",
  Escalated: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold animate-pulse",
  Resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  Closed: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border border-gray-500/30",
};

const PRIORITY_COLORS = {
  Critical: "bg-red-600 text-white border border-red-700 animate-pulse font-bold",
  Urgent: "bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse font-bold",
  High: "bg-amber-500/15 text-amber-500 border border-amber-500/30 font-semibold",
  Medium: "bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium",
  Low: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
};

const CATEGORY_FILTERS = [
  { id: "All", label: "All Queries" },
  { id: "Contact Us", label: "Contact Form" },
  { id: "Complaint", label: "Complaints" },
  { id: "Product Inquiry", label: "Product Inquiries" },
  { id: "Order Issue", label: "Order Issues" },
  { id: "Return / Replacement", label: "Return / Replacement" },
];

const PRESET_REPLIES = [
  {
    title: "Order Status Update",
    text: "Dear Customer, thank you for reaching out. We have checked your order status with our logistics team. Your package is currently in transit and scheduled for timely delivery.",
  },
  {
    title: "Return Process Initiated",
    text: "Dear Customer, we have approved your return request. Our courier partner has been assigned to coordinate the doorstep inspection and pickup within 24-48 hours.",
  },
  {
    title: "Refund Approved",
    text: "Dear Customer, your refund has been processed from our end to your original payment method. Depending on your bank, it should reflect within 3-5 business days.",
  },
  {
    title: "Apology & Investigation",
    text: "Dear Customer, we sincerely apologize for the inconvenience caused. Our priority support team is currently reviewing the issue with the respective department and will get back to you shortly.",
  },
];

const CustomerSupportTab = ({ authHeader, adminAuth, employees = [] }) => {
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState({
    totalCount: 0,
    openCount: 0,
    inProgressCount: 0,
    waitingCustomerCount: 0,
    resolvedCount: 0,
    closedCount: 0,
    urgentCount: 0,
    complaintsCount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Ticket Drawer
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [drawerTab, setDrawerTab] = useState("chat"); // 'chat' or 'notes'
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [targetStatus, setTargetStatus] = useState("Waiting for Customer");
  const [internalNoteText, setInternalNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [assigningAgent, setAssigningAgent] = useState(false);
  const [linkedCallbackId, setLinkedCallbackId] = useState(null);
  const [loadingLinkedCallback, setLoadingLinkedCallback] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Check or load linked callback when drawer opens
  const checkLinkedCallback = async (ticket) => {
    if (!ticket) return;
    try {
      setLoadingLinkedCallback(true);
      const res = await api.get(`/callbacks?search=${ticket.ticketCode}`, {
        headers: authHeader?.headers,
      });
      if (res.data?.success && res.data.callbacks?.length > 0) {
        setLinkedCallbackId(res.data.callbacks[0]._id);
      } else {
        setLinkedCallbackId(null);
      }
    } catch (err) {
      console.warn("Could not load linked callback:", err.message);
    } finally {
      setLoadingLinkedCallback(false);
    }
  };

  const handleCreateTicketCallback = async () => {
    if (!selectedTicket) return;
    try {
      setLoadingLinkedCallback(true);
      const res = await api.post(
        "/callbacks",
        {
          customerName: selectedTicket.customerName || selectedTicket.user?.name || "Customer",
          customerPhone: selectedTicket.customerPhone || "N/A",
          customerEmail: selectedTicket.customerEmail || selectedTicket.user?.email || "",
          ticketId: selectedTicket._id,
          ticketCode: selectedTicket.ticketCode,
          orderId: selectedTicket.order?._id || selectedTicket.order || null,
          orderCode: selectedTicket.orderCode || "",
          subject: `Support Callback: ${selectedTicket.subject}`,
          initialNotes: `Callback initiated from support ticket ${selectedTicket.ticketCode}.`,
          priority: selectedTicket.priority || "Medium",
          assignedTo: selectedTicket.assignedAgent?._id || selectedTicket.assignedAgent || null,
        },
        { headers: authHeader?.headers }
      );
      if (res.data?.success && res.data.callback) {
        setLinkedCallbackId(res.data.callback._id);
      }
    } catch (err) {
      alert("Failed to create callback: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingLinkedCallback(false);
    }
  };

  // Fetch KPI Metrics
  const fetchMetrics = async () => {
    try {
      const res = await api.get("/tickets/admin/metrics", { headers: authHeader?.headers });
      if (res.data?.success && res.data.metrics) {
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error("Failed to load support metrics:", err);
    }
  };

  // Fetch Tickets List
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 25,
      };
      if (activeCategory !== "All") params.category = activeCategory;
      if (statusFilter !== "All") params.status = statusFilter;
      if (priorityFilter !== "All") params.priority = priorityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get("/tickets/admin", {
        params,
        headers: authHeader?.headers,
      });

      if (res.data?.success) {
        setTickets(res.data.tickets || []);
        setTotalPages(res.data.pages || 1);
      } else if (Array.isArray(res.data)) {
        setTickets(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchTickets();
  }, [activeCategory, statusFilter, priorityFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  // Select Ticket and open drawer
  const handleOpenTicket = async (ticketId) => {
    try {
      const res = await api.get(`/tickets/admin/${ticketId}`, { headers: authHeader?.headers });
      setSelectedTicket(res.data);
      setDrawerTab("chat");
      setReplyMessage("");
      setInternalNoteText("");
    } catch (err) {
      setError("Failed to load ticket conversation details.");
    }
  };

  // Send Reply to Customer
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      setSendingReply(true);
      setError("");
      const res = await api.post(
        `/tickets/admin/${selectedTicket._id}/messages`,
        {
          message: replyMessage.trim(),
          status: targetStatus,
        },
        { headers: authHeader?.headers }
      );

      setSelectedTicket(res.data);
      setReplyMessage("");
      setSuccess("Reply sent to customer successfully.");
      setTimeout(() => setSuccess(""), 4000);

      // Refresh list & metrics
      fetchTickets();
      fetchMetrics();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send customer reply.");
    } finally {
      setSendingReply(false);
    }
  };

  // Update Ticket Status Directly
  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket || !newStatus) return;
    try {
      const res = await api.patch(
        `/tickets/admin/${selectedTicket._id}/status`,
        { status: newStatus },
        { headers: authHeader?.headers }
      );
      setSelectedTicket(res.data.ticket || res.data);
      setSuccess(`Ticket status marked as ${newStatus}.`);
      setTimeout(() => setSuccess(""), 4000);
      fetchTickets();
      fetchMetrics();
    } catch (err) {
      setError("Failed to update status.");
    }
  };

  // Update Priority
  const handlePriorityChange = async (newPriority) => {
    if (!selectedTicket || !newPriority) return;
    try {
      const res = await api.patch(
        `/tickets/admin/${selectedTicket._id}/priority`,
        { priority: newPriority },
        { headers: authHeader?.headers }
      );
      setSelectedTicket((prev) => ({ ...prev, priority: newPriority }));
      setSuccess(`Priority updated to ${newPriority}.`);
      setTimeout(() => setSuccess(""), 3000);
      fetchTickets();
    } catch (err) {
      setError("Failed to update priority.");
    }
  };

  // Assign Ticket to Staff
  const handleAssignTicket = async (agentId) => {
    if (!selectedTicket) return;
    try {
      setAssigningAgent(true);
      const res = await api.patch(
        `/tickets/admin/${selectedTicket._id}/assign`,
        { assignedAgentId: agentId },
        { headers: authHeader?.headers }
      );
      setSelectedTicket(res.data.ticket || res.data);
      setSuccess(res.data.message || "Ticket assigned successfully.");
      setTimeout(() => setSuccess(""), 3000);
      fetchTickets();
    } catch (err) {
      setError("Failed to assign ticket.");
    } finally {
      setAssigningAgent(false);
    }
  };

  // Add Internal Staff Note
  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!internalNoteText.trim() || !selectedTicket) return;

    try {
      setSavingNote(true);
      const res = await api.post(
        `/tickets/admin/${selectedTicket._id}/notes`,
        { note: internalNoteText.trim() },
        { headers: authHeader?.headers }
      );

      setSelectedTicket((prev) => ({
        ...prev,
        internalNotes: res.data.internalNotes || [
          ...(prev.internalNotes || []),
          {
            note: internalNoteText.trim(),
            authorName: adminAuth?.name || "Staff",
            createdAt: new Date(),
          },
        ],
      }));
      setInternalNoteText("");
      setSuccess("Internal note added.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save internal note.");
    } finally {
      setSavingNote(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Title & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-serif font-bold text-luxury-black dark:text-white flex items-center gap-2">
            <span>🎧</span> Customer Support Command Center
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-light mt-0.5">
            Centralized management for customer inquiries, complaints, order issues, and contact requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchMetrics();
              fetchTickets();
            }}
            className="px-3.5 py-1.5 rounded-full border border-gold-300/40 dark:border-gold-900/40 text-xs font-semibold text-luxury-black dark:text-white hover:bg-gold-50 dark:hover:bg-white/5 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* 6 KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-200/40 dark:border-gold-900/20 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Queries</p>
          <p className="text-xl font-bold font-serif text-luxury-black dark:text-white mt-1">
            {metrics.totalCount}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-amber-500/30 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Open</p>
          <p className="text-xl font-bold font-serif text-amber-600 dark:text-amber-400 mt-1">
            {metrics.openCount}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-blue-500/30 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">In Progress</p>
          <p className="text-xl font-bold font-serif text-blue-600 dark:text-blue-400 mt-1">
            {metrics.inProgressCount}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-purple-500/30 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-purple-500 tracking-wider">Waiting Customer</p>
          <p className="text-xl font-bold font-serif text-purple-600 dark:text-purple-400 mt-1">
            {metrics.waitingCustomerCount}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-emerald-500/30 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Resolved / Closed</p>
          <p className="text-xl font-bold font-serif text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.resolvedCount + metrics.closedCount}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-red-500/30 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Urgent / Complaints</p>
          <p className="text-xl font-bold font-serif text-red-500 mt-1">
            {metrics.urgentCount + metrics.complaintsCount}
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-200 dark:border-white/10 pb-2 no-scrollbar">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setActiveCategory(cat.id);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat.id
                ? "bg-gold-500 text-white shadow-md shadow-gold-500/20"
                : "bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-300 hover:bg-gold-50 dark:hover:bg-white/5 border border-gray-200 dark:border-white/5"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-200/30 dark:border-gold-900/20 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket ID, customer name, email, phone, or order #..."
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 pl-9 pr-20 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500"
          />
          <button
            type="submit"
            className="absolute inset-y-1 right-1 px-3 bg-gold-500 hover:bg-gold-600 text-white text-[11px] font-bold rounded-lg transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2.5 py-1.5 text-xs text-luxury-black dark:text-white outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Customer">Waiting for Customer</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2.5 py-1.5 text-xs text-luxury-black dark:text-white outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table / List */}
      <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-200/30 dark:border-gold-900/20 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-xs text-gray-400">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full mb-3" />
            <p>Loading support requests...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-sm font-semibold text-luxury-black dark:text-white">
              No tickets found
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              There are no support inquiries matching your active filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 dark:bg-[#252525]/70 border-b border-gray-200 dark:border-white/5 uppercase text-[10px] font-bold text-gray-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Customer Details</th>
                  <th className="px-4 py-3">Subject & Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-gold-50/30 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handleOpenTicket(ticket._id)}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-gold-600 dark:text-gold-400 whitespace-nowrap">
                      {ticket.ticketCode}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-luxury-black dark:text-white">
                        {ticket.customerName || ticket.user?.name || "Customer"}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">
                        {ticket.customerEmail || ticket.user?.email || "N/A"}
                      </div>
                      {ticket.customerPhone && (
                        <div className="text-[10px] text-gray-400">
                          📞 {ticket.customerPhone}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-luxury-black dark:text-white truncate">
                        {ticket.subject}
                      </div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-semibold bg-gray-100 dark:bg-white/5 text-gray-500">
                        {ticket.category}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.Medium
                        }`}
                      >
                        {ticket.priority || "Medium"}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          STATUS_COLORS[ticket.status] || STATUS_COLORS.Open
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {ticket.orderCode || ticket.order?.orderCode || "—"}
                    </td>

                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-[11px]">
                      {formatDateTime(ticket.createdAt)}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTicket(ticket._id);
                        }}
                        className="px-3 py-1 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-gray-200 dark:border-white/10 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-gray-200 dark:border-white/10 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Ticket Details & Conversation Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setSelectedTicket(null)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#1A1A1A] border-l border-gold-300/40 dark:border-gold-900/30 h-full flex flex-col shadow-2xl z-10 animate-slide-left">
            {/* Top Drawer Header */}
            <div className="p-5 border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-gray-50/70 to-white dark:from-[#222] dark:to-[#1A1A1A]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gold-600 dark:text-gold-400">
                      {selectedTicket.ticketCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                        PRIORITY_COLORS[selectedTicket.priority] || PRIORITY_COLORS.Medium
                      }`}
                    >
                      {selectedTicket.priority}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        STATUS_COLORS[selectedTicket.status] || STATUS_COLORS.Open
                      }`}
                    >
                      {selectedTicket.status}
                    </span>
                  </div>
                  <h2 className="text-base font-serif font-bold text-luxury-black dark:text-white mt-1">
                    {selectedTicket.subject}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Customer Snapshot */}
              <div className="mt-3.5 p-3 rounded-xl bg-white dark:bg-[#242424] border border-gold-200/30 dark:border-gold-900/20 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Customer</span>
                  <span className="font-medium text-luxury-black dark:text-white">
                    {selectedTicket.customerName || selectedTicket.user?.name || "Customer"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(selectedTicket.user?._id || selectedTicket.user || selectedTicket._id)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-gold-600 dark:text-gold-400 hover:underline cursor-pointer"
                  >
                    <span>👤</span> 360° Profile
                  </button>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Contact</span>
                  <span className="text-gray-500 dark:text-gray-300 font-mono text-[11px] truncate block">
                    {selectedTicket.customerEmail || selectedTicket.user?.email || "N/A"}
                  </span>
                  {selectedTicket.customerPhone && (
                    <span className="text-[10px] text-gray-400 block">{selectedTicket.customerPhone}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Order Reference</span>
                  <span className="font-mono text-gold-600 dark:text-gold-400 font-semibold block">
                    {selectedTicket.orderCode || selectedTicket.order?.orderCode || "None Linked"}
                  </span>
                </div>
              </div>

              {/* SLA Breached Alert Banner */}
              {selectedTicket.slaBreached && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2 animate-pulse">
                  <span>🚨</span>
                  <span>SLA Target Breached! This ticket is automatically escalated to Critical priority.</span>
                </div>
              )}

              {/* Quick Admin Actions Row */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/5 text-xs">
                {/* Status Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">Status:</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2 py-1 text-xs text-luxury-black dark:text-white font-medium outline-none cursor-pointer"
                  >
                    <option value="New">New</option>
                    <option value="Open">Open</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for Customer">Waiting for Customer</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {/* Priority Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">Priority:</span>
                  <select
                    value={selectedTicket.priority || "Medium"}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2 py-1 text-xs text-luxury-black dark:text-white font-medium outline-none cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                {/* Staff Assignment */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">Assign:</span>
                  <select
                    value={selectedTicket.assignedAgent?._id || selectedTicket.assignedAgent || ""}
                    onChange={(e) => handleAssignTicket(e.target.value)}
                    disabled={assigningAgent}
                    className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2 py-1 text-xs text-luxury-black dark:text-white font-medium outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.designation || "Staff"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transfer Task Action */}
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-sky-400/50 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-100 transition cursor-pointer flex items-center gap-1"
                >
                  <span>🔄</span> Transfer Task
                </button>
              </div>

              {/* Drawer View Tabs */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setDrawerTab("chat")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    drawerTab === "chat"
                      ? "bg-gold-500 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  💬 Conversation ({selectedTicket.messages?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("notes")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    drawerTab === "notes"
                      ? "bg-gold-500 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  🔒 Internal Notes ({selectedTicket.internalNotes?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerTab("callback");
                    checkLinkedCallback(selectedTicket);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    drawerTab === "callback"
                      ? "bg-gold-500 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  <span>📞 Call Remarks</span>
                  {linkedCallbackId && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Conversation Tab View */}
            {drawerTab === "chat" && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Messages Thread Container */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {selectedTicket.messages?.map((msg, index) => {
                    const isAdmin = Boolean(msg.isAdmin);
                    return (
                      <div
                        key={index}
                        className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1 px-1">
                          <span className="font-semibold text-luxury-black dark:text-gray-300">
                            {msg.senderName || (isAdmin ? "Support Concierge" : "Customer")}
                          </span>
                          {isAdmin && (
                            <span className="px-1 py-0.2 rounded bg-gold-500/20 text-gold-600 dark:text-gold-400 text-[8px] font-bold uppercase">
                              Admin
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatDateTime(msg.createdAt)}</span>
                        </div>

                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isAdmin
                              ? "bg-gradient-to-br from-gold-500 to-gold-600 text-white rounded-br-xs shadow-md shadow-gold-500/10"
                              : "bg-gray-100 dark:bg-[#252525] text-luxury-black dark:text-white rounded-bl-xs border border-gray-200/50 dark:border-white/5"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Presets & Reply Box */}
                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-[#202020]">
                  {/* Preset Responses Pills */}
                  <div className="mb-2.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Quick Responses:
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {PRESET_REPLIES.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReplyMessage(p.text)}
                          className="px-2.5 py-1 rounded-full text-[10px] bg-white dark:bg-[#2a2a2a] border border-gold-200/40 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gold-500 hover:text-gold-600 whitespace-nowrap transition cursor-pointer"
                        >
                          {p.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleSendReply} className="space-y-2.5">
                    <textarea
                      rows={3}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Write your response to the customer..."
                      className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 resize-none transition-colors"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[11px] text-gray-400">Next status:</span>
                        <select
                          value={targetStatus}
                          onChange={(e) => setTargetStatus(e.target.value)}
                          className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2 py-1 text-[11px] text-luxury-black dark:text-white outline-none"
                        >
                          <option value="Waiting for Customer">Waiting for Customer</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={sendingReply || !replyMessage.trim()}
                        className="px-5 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs shadow-md shadow-gold-500/20 transition cursor-pointer disabled:opacity-50"
                      >
                        {sendingReply ? "Sending..." : "Send Reply"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Internal Staff Notes Tab View */}
            {drawerTab === "notes" && (
              <div className="flex-1 flex flex-col min-h-0 p-5">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2 mb-4">
                  <span>🔒</span>
                  <span>Internal notes are private and never visible to the customer.</span>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {selectedTicket.internalNotes?.length === 0 ? (
                    <div className="text-center py-10 text-xs text-gray-400">
                      No internal notes recorded yet for this inquiry.
                    </div>
                  ) : (
                    selectedTicket.internalNotes?.map((n, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#252525] border border-gray-200/50 dark:border-white/5"
                      >
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span className="font-semibold text-luxury-black dark:text-gray-200">
                            👤 {n.authorName || n.author?.name || "Staff Member"}
                          </span>
                          <span>{formatDateTime(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {n.note}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddInternalNote} className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
                  <textarea
                    rows={2}
                    value={internalNoteText}
                    onChange={(e) => setInternalNoteText(e.target.value)}
                    placeholder="Add an internal observation, investigation findings, or staff note..."
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingNote || !internalNoteText.trim()}
                      className="px-4 py-1.5 rounded-lg bg-luxury-black dark:bg-gold-500 hover:bg-gray-800 dark:hover:bg-gold-600 text-white dark:text-black font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {savingNote ? "Saving..." : "Add Note"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Callback & Remarks Tab View */}
            {drawerTab === "callback" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                {loadingLinkedCallback ? (
                  <div className="p-8 text-center text-xs text-gray-500 animate-pulse">
                    Connecting to callback records...
                  </div>
                ) : linkedCallbackId ? (
                  <CallbackRemarksSection
                    callbackId={linkedCallbackId}
                    authHeader={authHeader}
                    adminAuth={adminAuth}
                    onCallbackUpdated={() => {
                      fetchTickets();
                      fetchMetrics();
                    }}
                  />
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <span className="text-4xl">📞</span>
                    <h3 className="text-sm font-bold text-luxury-black dark:text-white">
                      No Callback Logged for this Ticket Yet
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                      Initiate a callback to track call outcomes, conversation summary, customer requirements, follow-up dates, and auto-reminders.
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateTicketCallback}
                      className="px-5 py-2.5 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs shadow-md shadow-gold-500/20 transition cursor-pointer"
                    >
                      + Initiate Customer Callback for Ticket {selectedTicket.ticketCode}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Universal Enterprise Task Transfer Modal */}
      <EnterpriseTaskTransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        taskData={
          selectedTicket
            ? {
                taskId: selectedTicket._id,
                taskType: "Ticket",
                taskCode: selectedTicket.ticketCode,
                customerName: selectedTicket.customerName,
              }
            : null
        }
        authHeader={authHeader}
        employees={employees}
        onTransferSuccess={() => {
          setTransferModalOpen(false);
          fetchTickets();
          if (selectedTicket) handleOpenTicket(selectedTicket._id);
        }}
      />

      {/* 360° Customer Profile View Drawer */}
      <Customer360Drawer
        customerId={selectedCustomerId}
        isOpen={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        authHeader={authHeader}
      />
    </div>
  );
};

export default CustomerSupportTab;
