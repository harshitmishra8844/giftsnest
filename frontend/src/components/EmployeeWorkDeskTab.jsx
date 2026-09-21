import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import { getAdminAuth } from "../services/adminAuth";
import EnterpriseTaskTransferModal from "./EnterpriseTaskTransferModal";
import Customer360Drawer from "./Customer360Drawer";
import CallbackRemarksSection from "./CallbackRemarksSection";

const STATUS_COLORS = {
  New: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Open: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  Assigned: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "In Progress": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Waiting Customer": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Waiting for Customer": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Escalated: "bg-red-500/15 text-red-600 border-red-500/30 font-bold animate-pulse",
  Resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold",
  Closed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  Pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Attempted: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Follow-up Scheduled": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const PRIORITY_COLORS = {
  Critical: "bg-red-600 text-white font-bold animate-pulse",
  Urgent: "bg-rose-500 text-white font-bold",
  High: "bg-amber-500 text-white font-semibold",
  Medium: "bg-blue-500 text-white",
  Low: "bg-gray-500 text-white",
};

const EmployeeWorkDeskTab = ({ authHeader, adminAuth, employees = [] }) => {
  const currentAdmin = adminAuth || getAdminAuth();
  const isMasterOrManager = useMemo(() => {
    const role = currentAdmin?.role || "";
    const designation = currentAdmin?.designation || "";
    return (
      currentAdmin?.isAdmin === true ||
      role === "Master Admin" ||
      role === "admin" ||
      designation.toLowerCase().includes("manager") ||
      designation.toLowerCase().includes("lead")
    );
  }, [currentAdmin]);

  // Mode: "my-desk" or "manager-overview"
  const [deskMode, setDeskMode] = useState("my-desk");

  // My Desk State
  const [deskLoading, setDeskLoading] = useState(false);
  const [deskData, setDeskData] = useState(null);
  const [deskFilter, setDeskFilter] = useState("all"); // "all", "today", "followups", "overdue", "escalated"
  const [typeFilter, setTypeFilter] = useState("all"); // "all", "tickets", "callbacks"
  const [searchQuery, setSearchQuery] = useState("");

  // Manager Overview State
  const [mgrLoading, setMgrLoading] = useState(false);
  const [mgrData, setMgrData] = useState(null);
  const [reassigningId, setReassigningId] = useState(null);

  // Modals & Drawers
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTask, setTransferTask] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [activeCallbackForRemarks, setActiveCallbackForRemarks] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const getEffectiveAuthHeader = () => {
    if (authHeader && authHeader.headers) return authHeader;
    const admin = getAdminAuth();
    if (admin?.token) {
      return { headers: { Authorization: `Bearer ${admin.token}` } };
    }
    return {};
  };

  // Fetch My Work Desk
  const fetchMyDesk = async () => {
    setDeskLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.get("/tasks/my-desk", header);
      setDeskData(res.data);
    } catch (err) {
      console.error("Failed to load employee work desk:", err);
    } finally {
      setDeskLoading(false);
    }
  };

  // Fetch Manager Overview
  const fetchManagerOverview = async () => {
    setMgrLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.get("/tasks/manager-overview", header);
      setMgrData(res.data);
    } catch (err) {
      console.error("Failed to load manager overview:", err);
    } finally {
      setMgrLoading(false);
    }
  };

  useEffect(() => {
    if (deskMode === "my-desk") {
      fetchMyDesk();
    } else {
      fetchManagerOverview();
    }
  }, [deskMode]);

  // Handle Quick Reassign in Manager View
  const handleReassign = async (taskId, taskType, newAgentId) => {
    if (!newAgentId) return;
    setReassigningId(taskId);
    try {
      const header = getEffectiveAuthHeader();
      await api.post(`/tasks/${taskId}/reassign`, { taskType, newAgentId }, header);
      fetchManagerOverview();
    } catch (err) {
      console.error("Reassignment failed:", err);
      alert(err.response?.data?.message || "Failed to reassign task");
    } finally {
      setReassigningId(null);
    }
  };

  // Handle Status Quick Update
  const handleQuickStatusUpdate = async (ticketId, newStatus) => {
    try {
      setUpdatingStatusId(ticketId);
      const header = getEffectiveAuthHeader();
      try {
        await api.patch(`/tickets/admin/${ticketId}/status`, { status: newStatus }, header);
      } catch (patchErr) {
        await api.put(`/tickets/${ticketId}`, { status: newStatus }, header);
      }
      await fetchMyDesk();
    } catch (err) {
      console.error("Status update failed:", err);
      alert(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Filter Tasks for My Desk
  const filteredTasks = useMemo(() => {
    if (!deskData?.tasks) return [];
    const {
      assignedTickets = [],
      assignedCallbacks = [],
      todaysTickets = [],
      todaysCallbacks = [],
      followUps = [],
      overdueTickets = [],
      overdueCallbacks = [],
      escalatedTickets = [],
      escalatedCallbacks = [],
    } = deskData.tasks;

    let ticketPool = [];
    let callbackPool = [];

    switch (deskFilter) {
      case "today":
        ticketPool = todaysTickets;
        callbackPool = todaysCallbacks;
        break;
      case "followups":
        ticketPool = [];
        callbackPool = followUps;
        break;
      case "overdue":
        ticketPool = overdueTickets;
        callbackPool = overdueCallbacks;
        break;
      case "escalated":
        ticketPool = escalatedTickets;
        callbackPool = escalatedCallbacks;
        break;
      case "all":
      default:
        ticketPool = assignedTickets;
        callbackPool = assignedCallbacks;
        break;
    }

    const unified = [
      ...ticketPool.map((t) => ({ ...t, _taskType: "ticket" })),
      ...callbackPool.map((c) => ({ ...c, _taskType: "callback" })),
    ];

    return unified.filter((item) => {
      // Type Filter
      if (typeFilter === "tickets" && item._taskType !== "ticket") return false;
      if (typeFilter === "callbacks" && item._taskType !== "callback") return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = (item.ticketCode || item.callbackCode || "").toLowerCase();
        const name = (item.customerName || "").toLowerCase();
        const phone = (item.customerPhone || "").toLowerCase();
        const subject = (item.subject || item.customerRequirement || "").toLowerCase();
        return code.includes(q) || name.includes(q) || phone.includes(q) || subject.includes(q);
      }

      return true;
    });
  }, [deskData, deskFilter, typeFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in text-luxury-black dark:text-white">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-gold-200/40 dark:border-gold-900/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="text-xl font-serif font-bold text-gray-900 dark:text-white tracking-wide">
              {deskMode === "my-desk" ? "Employee Work Desk" : "Operations & Manager Control Center"}
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Logged in as <strong className="text-gold-600 dark:text-gold-400">{currentAdmin?.name}</strong> (
            {currentAdmin?.designation || currentAdmin?.role || "Executive"})
          </p>
        </div>

        {/* Mode Toggle for Managers/Admins */}
        {isMasterOrManager && (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gold-200/20">
            <button
              type="button"
              onClick={() => setDeskMode("my-desk")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                deskMode === "my-desk"
                  ? "bg-gold-500 text-white shadow-xs"
                  : "text-gray-500 dark:text-gray-400 hover:text-gold-600"
              }`}
            >
              💼 My Work Desk
            </button>
            <button
              type="button"
              onClick={() => setDeskMode("manager-overview")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                deskMode === "manager-overview"
                  ? "bg-gold-500 text-white shadow-xs"
                  : "text-gray-500 dark:text-gray-400 hover:text-gold-600"
              }`}
            >
              🛡️ Manager Oversight
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: MY WORK DESK */}
      {deskMode === "my-desk" && (
        <div className="space-y-6">
          {/* Work Desk Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <button
              type="button"
              onClick={() => setDeskFilter("all")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                deskFilter === "all"
                  ? "bg-gold-500 text-white border-gold-500 shadow-md ring-2 ring-gold-400/30"
                  : "bg-white dark:bg-[#1E1E1E] border-gold-200/30 dark:border-gold-900/30 hover:border-gold-500/50"
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                Assigned Tasks
              </span>
              <span className="text-2xl font-serif font-bold mt-1 block">
                {deskData?.counts?.totalAssigned || 0}
              </span>
              <span className="text-[10px] opacity-70">Active Queue</span>
            </button>

            <button
              type="button"
              onClick={() => setDeskFilter("today")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                deskFilter === "today"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30"
                  : "bg-white dark:bg-[#1E1E1E] border-gold-200/30 dark:border-gold-900/30 hover:border-blue-500/50"
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                Today&apos;s Tasks
              </span>
              <span className="text-2xl font-serif font-bold mt-1 block">
                {deskData?.counts?.today || 0}
              </span>
              <span className="text-[10px] opacity-70">Due / Scheduled Today</span>
            </button>

            <button
              type="button"
              onClick={() => setDeskFilter("followups")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                deskFilter === "followups"
                  ? "bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400/30"
                  : "bg-white dark:bg-[#1E1E1E] border-gold-200/30 dark:border-gold-900/30 hover:border-purple-500/50"
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                Follow-Ups
              </span>
              <span className="text-2xl font-serif font-bold mt-1 block">
                {deskData?.counts?.followUps || 0}
              </span>
              <span className="text-[10px] opacity-70">Callback Follow-ups</span>
            </button>

            <button
              type="button"
              onClick={() => setDeskFilter("overdue")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                deskFilter === "overdue"
                  ? "bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400/30"
                  : "bg-white dark:bg-[#1E1E1E] border-red-500/30 hover:border-red-500/50"
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 flex items-center gap-1">
                <span>🚨</span> Overdue Tasks
              </span>
              <span className="text-2xl font-serif font-bold text-red-600 dark:text-red-400 mt-1 block">
                {deskData?.counts?.overdue || 0}
              </span>
              <span className="text-[10px] opacity-70">SLA Breached / Overdue</span>
            </button>

            <button
              type="button"
              onClick={() => setDeskFilter("escalated")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                deskFilter === "escalated"
                  ? "bg-rose-700 text-white border-rose-700 shadow-md ring-2 ring-rose-400/30"
                  : "bg-white dark:bg-[#1E1E1E] border-rose-500/30 hover:border-rose-500/50"
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 flex items-center gap-1">
                <span>⚡</span> Escalated Tasks
              </span>
              <span className="text-2xl font-serif font-bold text-rose-600 dark:text-rose-400 mt-1 block">
                {deskData?.counts?.escalated || 0}
              </span>
              <span className="text-[10px] opacity-70">Critical Priority</span>
            </button>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type:</span>
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  typeFilter === "all"
                    ? "bg-gold-500 text-white"
                    : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
                }`}
              >
                All ({filteredTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("tickets")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  typeFilter === "tickets"
                    ? "bg-gold-500 text-white"
                    : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
                }`}
              >
                🎧 Tickets
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("callbacks")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  typeFilter === "callbacks"
                    ? "bg-gold-500 text-white"
                    : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
                }`}
              >
                📞 Callbacks
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assigned tasks..."
                className="w-full sm:w-64 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#252525] px-3 py-1.5 text-xs outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {/* Task Stream / Cards */}
          {deskLoading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Syncing personal queue...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-white/5 space-y-2">
              <span className="text-4xl block">🎉</span>
              <h3 className="text-base font-serif font-bold text-gray-900 dark:text-white">
                Queue Clear!
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                No active tasks match your current filter ({deskFilter}). You are up-to-date on your
                assignments.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredTasks.map((task) => {
                const isTicket = task._taskType === "ticket";
                const isOverdue =
                  task.isOverdue ||
                  task.slaBreached ||
                  (task.resolutionDue && new Date(task.resolutionDue) < new Date());

                return (
                  <div
                    key={task._id}
                    className={`p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border transition-all duration-200 shadow-xs hover:shadow-md ${
                      isOverdue
                        ? "border-red-500/40 dark:border-red-500/30 bg-red-50/10"
                        : "border-gold-200/30 dark:border-gold-900/20"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                            isTicket
                              ? "bg-gold-500/10 text-gold-700 dark:text-gold-400 border border-gold-500/20"
                              : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20"
                          }`}
                        >
                          {isTicket ? `🎧 ${task.ticketCode}` : `📞 ${task.callbackCode}`}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium
                          }`}
                        >
                          {task.priority || "Medium"}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            STATUS_COLORS[task.status] || STATUS_COLORS.Open
                          }`}
                        >
                          {task.status}
                        </span>

                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-600 text-white animate-pulse">
                            SLA Breached / Overdue
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Task Body */}
                    <div className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-serif font-bold text-gray-900 dark:text-white">
                            {isTicket ? task.subject : task.customerRequirement || "Callback Request"}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            Customer:{" "}
                            <strong className="text-gray-900 dark:text-white">
                              {task.customerName}
                            </strong>{" "}
                            • 📱 {task.customerPhone || "N/A"}{" "}
                            {task.customerEmail && `• 📧 ${task.customerEmail}`}
                          </p>
                        </div>

                        {/* SLA Deadlines */}
                        {isTicket && (
                          <div className="text-right text-[11px] text-gray-500 shrink-0 hidden sm:block">
                            {task.resolutionDue && (
                              <p>
                                Resolution Due:{" "}
                                <strong
                                  className={
                                    new Date(task.resolutionDue) < new Date()
                                      ? "text-red-500 font-bold"
                                      : "text-gray-700 dark:text-gray-300"
                                  }
                                >
                                  {new Date(task.resolutionDue).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </strong>
                              </p>
                            )}
                            <p className="text-[10px] text-gray-400">Source: {task.source}</p>
                          </div>
                        )}

                        {!isTicket && task.nextCallbackDate && (
                          <div className="text-right text-[11px] text-gray-500 shrink-0 hidden sm:block">
                            <p>
                              Follow-up Date:{" "}
                              <strong className="text-purple-600 dark:text-purple-400">
                                {new Date(task.nextCallbackDate).toLocaleString()}
                              </strong>
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Calls Attempted: {task.totalCallsMade || 0}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {/* 360 Customer CRM Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(task.user || task.customer || task._id)}
                          className="px-3 py-1.5 rounded-xl border border-gold-300/60 dark:border-gold-900/40 text-gold-700 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-white/5 font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>👤</span> 360° CRM Profile
                        </button>

                        {/* Transfer Task Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setTransferTask({
                              taskId: task._id || task.id,
                              taskType: isTicket ? "Ticket" : "Callback",
                              taskCode: task.ticketCode || task.callbackCode,
                              customerName: task.customerName,
                            });
                            setTransferModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-sky-300/60 dark:border-sky-900/40 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-white/5 font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>🔄</span> Transfer Task
                        </button>
                      </div>

                      {/* Quick Status / Remarks Actions */}
                      <div className="flex items-center gap-2">
                        {isTicket ? (
                          <>
                            <button
                              type="button"
                              disabled={updatingStatusId === task._id}
                              onClick={() => handleQuickStatusUpdate(task._id, "In Progress")}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-semibold cursor-pointer disabled:opacity-50 transition"
                            >
                              {updatingStatusId === task._id ? "Updating..." : "In Progress"}
                            </button>
                            <button
                              type="button"
                              disabled={updatingStatusId === task._id}
                              onClick={() => handleQuickStatusUpdate(task._id, "Resolved")}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-xs cursor-pointer disabled:opacity-50 transition flex items-center gap-1"
                            >
                              <span>✓</span>
                              {updatingStatusId === task._id ? "Saving..." : "Mark Resolved"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveCallbackForRemarks(task)}
                            className="px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <span>📞</span> Log Call Remarks
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: MANAGER / MASTER ADMIN OVERVIEW */}
      {deskMode === "manager-overview" && (
        <div className="space-y-6">
          {/* Department High-Level KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-200/30 dark:border-gold-900/30">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                Pending Support Tickets
              </span>
              <span className="text-2xl font-serif font-bold text-gray-900 dark:text-white mt-1 block">
                {mgrData?.counts?.pendingTickets || 0}
              </span>
              <span className="text-[10px] text-gray-500">Across all roles</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-200/30 dark:border-gold-900/30">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                Pending Callbacks
              </span>
              <span className="text-2xl font-serif font-bold text-sky-600 mt-1 block">
                {mgrData?.counts?.pendingCallbacks || 0}
              </span>
              <span className="text-[10px] text-gray-500">Active requests</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-red-500/30">
              <span className="text-[10px] uppercase font-bold text-red-500 block flex items-center gap-1">
                <span>🚨</span> SLA Violations
              </span>
              <span className="text-2xl font-serif font-bold text-red-600 mt-1 block">
                {mgrData?.counts?.slaViolations || 0}
              </span>
              <span className="text-[10px] text-gray-500">Overdue resolution</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-rose-500/30">
              <span className="text-[10px] uppercase font-bold text-rose-500 block flex items-center gap-1">
                <span>⚡</span> Active Escalations
              </span>
              <span className="text-2xl font-serif font-bold text-rose-600 mt-1 block">
                {mgrData?.counts?.escalations || 0}
              </span>
              <span className="text-[10px] text-gray-500">Critical priority</span>
            </div>
          </div>

          {/* Team Workload & Performance Leaderboard */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-white/5 space-y-4">
            <h3 className="text-sm font-serif font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <span>👥</span> Executive Workforce & Workload Distribution
            </h3>

            {mgrLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">Calculating workload...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase font-bold text-gray-400">
                    <tr>
                      <th className="p-3">Executive</th>
                      <th className="p-3">Department / Role</th>
                      <th className="p-3">Assigned Tickets</th>
                      <th className="p-3">Callbacks Handled</th>
                      <th className="p-3">Total Workload</th>
                      <th className="p-3">Capacity Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {(mgrData?.departmentMetrics || []).map((exec) => {
                      const totalLoad = exec.assignedTickets + exec.assignedCallbacks;
                      return (
                        <tr key={exec.employeeId} className="hover:bg-gold-50/20 dark:hover:bg-white/5">
                          <td className="p-3 font-semibold text-gray-900 dark:text-white">
                            {exec.name}
                          </td>
                          <td className="p-3 text-gray-500">{exec.role}</td>
                          <td className="p-3 font-mono font-bold text-gold-600">
                            {exec.assignedTickets}
                          </td>
                          <td className="p-3 font-mono font-bold text-sky-600">
                            {exec.assignedCallbacks}
                          </td>
                          <td className="p-3 font-serif font-bold">{totalLoad}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                totalLoad > 10
                                  ? "bg-red-500/15 text-red-600"
                                  : totalLoad > 5
                                  ? "bg-amber-500/15 text-amber-600"
                                  : "bg-emerald-500/15 text-emerald-600"
                              }`}
                            >
                              {totalLoad > 10 ? "Heavy Load" : totalLoad > 5 ? "Moderate" : "Available"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Global Task Reassignment Table */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-white/5 space-y-4">
            <h3 className="text-sm font-serif font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <span>🔀</span> Master Task Queue & Reassignment Console
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase font-bold text-gray-400">
                  <tr>
                    <th className="p-3">Task ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Subject / Type</th>
                    <th className="p-3">Current Assignee</th>
                    <th className="p-3">Priority / SLA</th>
                    <th className="p-3">Reassign Executive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {(mgrData?.pendingTickets || []).slice(0, 15).map((tkt) => (
                    <tr key={tkt._id} className="hover:bg-gold-50/20 dark:hover:bg-white/5">
                      <td className="p-3 font-mono font-bold text-gold-600">
                        {tkt.ticketCode}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-gray-900 dark:text-white block">
                          {tkt.customerName}
                        </span>
                        <span className="text-[10px] text-gray-400">{tkt.customerPhone}</span>
                      </td>
                      <td className="p-3 max-w-[220px] truncate text-gray-600 dark:text-gray-300">
                        {tkt.subject}
                      </td>
                      <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">
                        {tkt.assignedAgent?.name || "Unassigned"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            PRIORITY_COLORS[tkt.priority] || PRIORITY_COLORS.Medium
                          }`}
                        >
                          {tkt.priority}
                        </span>
                        {tkt.slaBreached && (
                          <span className="ml-1 text-[9px] text-red-500 font-bold block">Breached</span>
                        )}
                      </td>
                      <td className="p-3">
                        <select
                          disabled={reassigningId === tkt._id}
                          defaultValue=""
                          onChange={(e) => handleReassign(tkt._id, "ticket", e.target.value)}
                          className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2.5 py-1 text-xs outline-none cursor-pointer"
                        >
                          <option value="" disabled>
                            Reassign to...
                          </option>
                          {employees.map((emp) => (
                            <option key={emp._id} value={emp._id}>
                              {emp.name} ({emp.designation || "Staff"})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Universal Enterprise Task Transfer Modal */}
      <EnterpriseTaskTransferModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setTransferTask(null);
        }}
        taskData={transferTask}
        authHeader={getEffectiveAuthHeader()}
        employees={employees}
        onTransferSuccess={() => {
          setTransferModalOpen(false);
          setTransferTask(null);
          if (deskMode === "my-desk") fetchMyDesk();
          else fetchManagerOverview();
        }}
      />

      {/* 360° Customer Profile View Drawer */}
      <Customer360Drawer
        customerId={selectedCustomerId}
        isOpen={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        authHeader={getEffectiveAuthHeader()}
      />

      {/* Callback Remarks Modal */}
      {activeCallbackForRemarks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setActiveCallbackForRemarks(null)}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#1C1C1C] rounded-3xl p-6 border border-gold-300/40 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-base font-serif font-bold text-gray-900 dark:text-white">
                Log Call Remarks — {activeCallbackForRemarks.callbackCode}
              </h3>
              <button
                type="button"
                onClick={() => setActiveCallbackForRemarks(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <CallbackRemarksSection
              callbackId={activeCallbackForRemarks._id}
              initialRemarks={activeCallbackForRemarks.callRemarks || []}
              currentStatus={activeCallbackForRemarks.status}
              authHeader={getEffectiveAuthHeader()}
              adminAuth={currentAdmin}
              onRemarksUpdated={() => {
                fetchMyDesk();
                setActiveCallbackForRemarks(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeWorkDeskTab;
