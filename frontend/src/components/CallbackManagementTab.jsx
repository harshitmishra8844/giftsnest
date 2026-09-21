import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import api from "../services/api";
import CallbackRemarksSection from "./CallbackRemarksSection";

const STATUS_BADGES = {
  Pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Assigned: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  Attempted: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  "Follow-up Scheduled": "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold",
  Completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold",
  Escalated: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-bold animate-pulse",
  Cancelled: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30",
};

const PRIORITY_BADGES = {
  Urgent: "bg-red-500 text-white font-bold",
  High: "bg-amber-500 text-white font-semibold",
  Medium: "bg-blue-500 text-white",
  Low: "bg-gray-500 text-white",
};

const OUTCOME_TAGS = {
  Connected: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Not Answered": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Busy: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Switched Off": "bg-gray-500/10 text-gray-600 border-gray-500/20",
  "Wrong Number": "bg-rose-500/10 text-rose-600 border-rose-500/20",
  "Call Back Later Requested": "bg-sky-500/10 text-sky-600 border-sky-500/20",
  "Issue Resolved": "bg-emerald-600/15 text-emerald-700 border-emerald-600/30 font-bold",
  Escalated: "bg-red-500/15 text-red-600 border-red-500/30 font-bold",
  "Interested in Purchase": "bg-purple-500/10 text-purple-600 border-purple-500/20 font-semibold",
  "Order Placed": "bg-gold-500/15 text-gold-700 border-gold-500/30 font-bold",
  "Complaint Registered": "bg-pink-500/10 text-pink-600 border-pink-500/20",
};

const CallbackManagementTab = ({ authHeader, adminAuth, employees = [] }) => {
  const [callbacks, setCallbacks] = useState([]);
  const [metrics, setMetrics] = useState({
    totalCallbacks: 0,
    totalCallsMade: 0,
    connectedCalls: 0,
    connectedRate: "0.0",
    missedCalls: 0,
    conversionRate: "0.0",
    conversionCount: 0,
    followUpPending: 0,
    resolutionRate: "0.0",
    resolvedCount: 0,
    complaintsCount: 0,
  });
  const [outcomeDistribution, setOutcomeDistribution] = useState({});
  const [employeePerformance, setEmployeePerformance] = useState([]);

  // Navigation & Filtering
  const [activeView, setActiveView] = useState("callbacks"); // 'callbacks', 'followup', 'performance'
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  // Modals / Drawers
  const [selectedCallbackId, setSelectedCallbackId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Callback Form State
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newSubject, setNewSubject] = useState("Customer Callback Request");
  const [newNotes, setNewNotes] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [creatingCallback, setCreatingCallback] = useState(false);

  // Fetch KPI Reports
  const fetchReports = async () => {
    try {
      const res = await api.get("/callbacks/reports/analytics", {
        headers: authHeader?.headers,
      });
      if (res.data?.success) {
        setMetrics(res.data.metrics || {});
        setOutcomeDistribution(res.data.outcomeDistribution || {});
        setEmployeePerformance(res.data.employeePerformance || []);
      }
    } catch (err) {
      console.warn("Failed to fetch callback reports:", err.message);
    }
  };

  // Fetch Callbacks List
  const fetchCallbacks = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 15,
      };

      if (statusFilter !== "All") params.status = statusFilter;
      if (priorityFilter !== "All") params.priority = priorityFilter;
      if (outcomeFilter !== "All") params.callOutcome = outcomeFilter;
      if (assignedFilter !== "All") params.assignedTo = assignedFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      if (dateFilter === "Today") params.dateRange = "today";
      if (dateFilter === "Week") params.dateRange = "week";
      if (dateFilter === "Month") params.dateRange = "month";

      if (activeView === "followup") {
        params.followUpPending = "true";
      }

      const res = await api.get("/callbacks", {
        headers: authHeader?.headers,
        params,
      });

      if (res.data?.success) {
        setCallbacks(res.data.callbacks || []);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load callbacks list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallbacks();
    fetchReports();
  }, [page, statusFilter, priorityFilter, outcomeFilter, assignedFilter, dateFilter, activeView]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCallbacks();
  };

  // Create Callback Request
  const handleCreateCallback = async (e) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      alert("Customer Name and Phone number are required.");
      return;
    }

    try {
      setCreatingCallback(true);
      const res = await api.post(
        "/callbacks",
        {
          customerName: newCustomerName.trim(),
          customerPhone: newCustomerPhone.trim(),
          customerEmail: newCustomerEmail.trim(),
          subject: newSubject.trim(),
          initialNotes: newNotes.trim(),
          priority: newPriority,
          assignedTo: newAssignedTo || null,
        },
        { headers: authHeader?.headers }
      );

      if (res.data?.success) {
        setShowCreateModal(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
        setNewCustomerEmail("");
        setNewNotes("");
        fetchCallbacks();
        fetchReports();
        if (res.data.callback?._id) {
          setSelectedCallbackId(res.data.callback._id);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create callback request.");
    } finally {
      setCreatingCallback(false);
    }
  };

  // Export Data to Excel / CSV
  const handleExportData = async (format = "xlsx", reportType = "callbacks") => {
    try {
      setExporting(true);
      if (reportType === "performance") {
        // Export Employee Performance Table
        const rows = employeePerformance.map((emp) => ({
          "Employee ID": emp.employeeId,
          "Employee Name": emp.employeeName,
          "Total Calls Logged": emp.totalCalls,
          "Connected Calls": emp.connectedCalls,
          "Connected Rate (%)": `${emp.connectedRate}%`,
          "Missed Calls": emp.missedCalls,
          "Conversions (Interested/Order)": emp.conversions,
          "Conversion Rate (%)": `${emp.conversionRate}%`,
          "Resolutions Count": emp.resolutions,
          "Resolution Rate (%)": `${emp.resolutionRate}%`,
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Performance");

        if (format === "csv") {
          XLSX.writeFile(workbook, `Niyora_Employee_Callback_Performance_${Date.now()}.csv`, { bookType: "csv" });
        } else {
          XLSX.writeFile(workbook, `Niyora_Employee_Callback_Performance_${Date.now()}.xlsx`);
        }
      } else {
        // Export Raw Callbacks & Remarks History
        const res = await api.get("/callbacks/reports/export", {
          headers: authHeader?.headers,
        });

        if (res.data?.success && res.data.data) {
          const worksheet = XLSX.utils.json_to_sheet(res.data.data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Callback Remarks");

          if (format === "csv") {
            XLSX.writeFile(workbook, `Niyora_Callback_Remarks_Report_${Date.now()}.csv`, { bookType: "csv" });
          } else {
            XLSX.writeFile(workbook, `Niyora_Callback_Remarks_Report_${Date.now()}.xlsx`);
          }
        }
      }
    } catch (err) {
      alert("Failed to export report: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-luxury-black dark:text-white flex items-center gap-2">
            <span>📞</span> Callback Management & Follow-up Queue
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Track telephone interactions, log post-call remarks, manage follow-ups, and review employee performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative group">
            <button
              type="button"
              disabled={exporting}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 hover:border-gold-500 text-xs font-semibold text-luxury-black dark:text-white flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span>📊</span>
              <span>{exporting ? "Generating..." : "Export Reports ▾"}</span>
            </button>
            <div className="absolute right-0 mt-1 w-56 rounded-xl bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 p-1.5 space-y-1">
              <button
                type="button"
                onClick={() => handleExportData("xlsx", "callbacks")}
                className="w-full text-left px-3 py-1.5 text-xs text-luxury-black dark:text-white hover:bg-gold-50 dark:hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
              >
                <span>📗</span> Export Remarks (Excel .xlsx)
              </button>
              <button
                type="button"
                onClick={() => handleExportData("csv", "callbacks")}
                className="w-full text-left px-3 py-1.5 text-xs text-luxury-black dark:text-white hover:bg-gold-50 dark:hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
              >
                <span>📄</span> Export Remarks (CSV)
              </button>
              <div className="border-t border-gray-100 dark:border-white/5 my-1" />
              <button
                type="button"
                onClick={() => handleExportData("xlsx", "performance")}
                className="w-full text-left px-3 py-1.5 text-xs text-luxury-black dark:text-white hover:bg-gold-50 dark:hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
              >
                <span>🏆</span> Performance Report (Excel)
              </button>
              <button
                type="button"
                onClick={() => handleExportData("csv", "performance")}
                className="w-full text-left px-3 py-1.5 text-xs text-luxury-black dark:text-white hover:bg-gold-50 dark:hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
              >
                <span>📋</span> Performance Report (CSV)
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold shadow-md shadow-gold-500/20 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span> Schedule New Callback
          </button>
        </div>
      </div>

      {/* KPI METRICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Calls Made */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-200/40 dark:border-gold-900/20 shadow-xs">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
            Total Calls Made
          </span>
          <div className="text-xl sm:text-2xl font-serif font-bold text-luxury-black dark:text-white mt-0.5">
            {metrics.totalCallsMade || 0}
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block">
            Across {metrics.totalCallbacks || 0} callbacks
          </span>
        </div>

        {/* Connected Calls */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-emerald-500/30 shadow-xs">
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block">
            Connected Calls
          </span>
          <div className="text-xl sm:text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {metrics.connectedCalls || 0}
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {metrics.connectedRate || "0.0"}% Connect Rate
          </span>
        </div>

        {/* Missed Calls */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-amber-500/30 shadow-xs">
          <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold block">
            Missed Calls
          </span>
          <div className="text-xl sm:text-2xl font-serif font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {metrics.missedCalls || 0}
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block">
            Not answered / busy / off
          </span>
        </div>

        {/* Conversion Rate */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-purple-500/30 shadow-xs">
          <span className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold block">
            Conversion Rate
          </span>
          <div className="text-xl sm:text-2xl font-serif font-bold text-purple-600 dark:text-purple-400 mt-0.5">
            {metrics.conversionRate || "0.0"}%
          </div>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 block font-medium">
            {metrics.conversionCount || 0} purchase conversions
          </span>
        </div>

        {/* Follow-up Pending */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-blue-500/30 shadow-xs">
          <span className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold block">
            Follow-up Pending
          </span>
          <div className="text-xl sm:text-2xl font-serif font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {metrics.followUpPending || 0}
          </div>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 block">
            Active in reminder queue
          </span>
        </div>

        {/* Resolution Rate */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-400/40 dark:border-gold-900/30 shadow-xs">
          <span className="text-[10px] uppercase tracking-wider text-gold-600 dark:text-gold-400 font-bold block">
            Resolution Rate
          </span>
          <div className="text-xl sm:text-2xl font-serif font-bold text-gold-600 dark:text-gold-400 mt-0.5">
            {metrics.resolutionRate || "0.0"}%
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block">
            {metrics.resolvedCount || 0} issues resolved
          </span>
        </div>
      </div>

      {/* Main Tab Navigation & View Switcher */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveView("callbacks");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              activeView === "callbacks"
                ? "bg-gold-500 text-white shadow-md shadow-gold-500/20"
                : "bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-400 hover:bg-gold-50 border border-gray-200 dark:border-white/5"
            }`}
          >
            📋 All Callbacks & Logs
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("followup");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeView === "followup"
                ? "bg-gold-500 text-white shadow-md shadow-gold-500/20"
                : "bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-400 hover:bg-gold-50 border border-gray-200 dark:border-white/5"
            }`}
          >
            <span>⏰ Follow-up Queue</span>
            {metrics.followUpPending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold animate-pulse">
                {metrics.followUpPending}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView("performance")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              activeView === "performance"
                ? "bg-gold-500 text-white shadow-md shadow-gold-500/20"
                : "bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-400 hover:bg-gold-50 border border-gray-200 dark:border-white/5"
            }`}
          >
            🏆 Employee Performance
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR (Visible on Callbacks & Followup tabs) */}
      {activeView !== "performance" && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-200/30 dark:border-gold-900/20 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone, email, callback code, order or staff..."
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 pl-9 pr-20 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500"
            />
            <button
              type="submit"
              className="absolute inset-y-1 right-1 px-3 bg-gold-500 hover:bg-gold-600 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2 py-1.5 text-xs text-luxury-black dark:text-white outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="Attempted">Attempted</option>
                <option value="Follow-up Scheduled">Follow-up Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Escalated">Escalated</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400 font-medium">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2 py-1.5 text-xs text-luxury-black dark:text-white outline-none"
              >
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Call Outcome Filter */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400 font-medium">Outcome:</span>
              <select
                value={outcomeFilter}
                onChange={(e) => {
                  setOutcomeFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2 py-1.5 text-xs text-luxury-black dark:text-white outline-none"
              >
                <option value="All">All Outcomes</option>
                <option value="Connected">Connected</option>
                <option value="Not Answered">Not Answered</option>
                <option value="Busy">Busy</option>
                <option value="Switched Off">Switched Off</option>
                <option value="Wrong Number">Wrong Number</option>
                <option value="Call Back Later Requested">Call Back Later</option>
                <option value="Issue Resolved">Issue Resolved</option>
                <option value="Escalated">Escalated</option>
                <option value="Interested in Purchase">Interested in Purchase</option>
                <option value="Order Placed">Order Placed</option>
                <option value="Complaint Registered">Complaint Registered</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400 font-medium">Time:</span>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] px-2 py-1.5 text-xs text-luxury-black dark:text-white outline-none"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="Week">This Week</option>
                <option value="Month">This Month</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1 & 2: CALLBACKS TABLE & QUEUE */}
      {activeView !== "performance" && (
        <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-200/30 dark:border-gold-900/20 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-500 animate-pulse">
              Loading callbacks and follow-up queue...
            </div>
          ) : callbacks.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <span className="text-3xl">📞</span>
              <p className="text-xs text-gray-400 font-medium">No callbacks found matching criteria.</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="text-xs text-gold-600 hover:underline font-bold"
              >
                + Schedule a new callback request
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-3.5">Code & Customer</th>
                    <th className="p-3.5">Subject / Query</th>
                    <th className="p-3.5">Status & Priority</th>
                    <th className="p-3.5">Last Outcome</th>
                    <th className="p-3.5">Assigned To</th>
                    <th className="p-3.5">Next Follow-up</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {callbacks.map((cb) => (
                    <tr
                      key={cb._id}
                      className="hover:bg-gold-50/30 dark:hover:bg-white/2 transition cursor-pointer"
                      onClick={() => setSelectedCallbackId(cb._id)}
                    >
                      <td className="p-3.5">
                        <div className="font-mono text-xs font-bold text-gold-600 dark:text-gold-400">
                          {cb.callbackCode}
                        </div>
                        <div className="font-semibold text-luxury-black dark:text-white mt-0.5">
                          {cb.customerName}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {cb.customerPhone}
                        </div>
                      </td>

                      <td className="p-3.5 max-w-[200px]">
                        <div className="font-medium text-luxury-black dark:text-white truncate">
                          {cb.subject}
                        </div>
                        {cb.orderCode && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            Order: {cb.orderCode}
                          </div>
                        )}
                        {cb.ticketCode && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            Ticket: {cb.ticketCode}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              STATUS_BADGES[cb.status] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {cb.status}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              PRIORITY_BADGES[cb.priority] || "bg-gray-500 text-white"
                            }`}
                          >
                            {cb.priority}
                          </span>
                        </div>
                        {cb.totalCallsMade > 0 && (
                          <span className="text-[10px] text-gray-400 block mt-1">
                            📞 {cb.totalCallsMade} {cb.totalCallsMade === 1 ? "call" : "calls"}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {cb.lastCallOutcome ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              OUTCOME_TAGS[cb.lastCallOutcome] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {cb.lastCallOutcome}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">
                            No calls yet
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="font-medium text-luxury-black dark:text-white block">
                          {cb.assignedToName || "Unassigned"}
                        </span>
                        {cb.assignedToEmployeeId && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            ({cb.assignedToEmployeeId})
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {cb.followUpRequired && cb.nextCallbackDate ? (
                          <div>
                            <span className="font-semibold text-purple-600 dark:text-purple-400 block">
                              {new Date(cb.nextCallbackDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(cb.nextCallbackDate).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">None scheduled</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCallbackId(cb._id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-white font-bold text-[11px] transition cursor-pointer shadow-xs"
                        >
                          Call Remarks →
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
                  className="px-2.5 py-1 rounded border border-gray-200 dark:border-white/10 disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded border border-gray-200 dark:border-white/10 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: EMPLOYEE PERFORMANCE LEADERBOARD */}
      {activeView === "performance" && (
        <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-200/30 dark:border-gold-900/20 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-luxury-black dark:text-white">
                Employee Telephony Performance & Conversion Metrics
              </h3>
              <p className="text-xs text-gray-400">
                Audited calls, connected rate, purchase conversion rates, and resolutions per staff member.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExportData("xlsx", "performance")}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-semibold cursor-pointer flex items-center gap-1"
            >
              <span>📥 Export Performance (Excel)</span>
            </button>
          </div>

          {employeePerformance.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              No employee call activity logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-3.5">Employee Name & ID</th>
                    <th className="p-3.5 text-center">Total Calls</th>
                    <th className="p-3.5 text-center">Connected Calls</th>
                    <th className="p-3.5 text-center">Missed Calls</th>
                    <th className="p-3.5 text-center">Conversion Rate</th>
                    <th className="p-3.5 text-center">Resolution Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {employeePerformance.map((emp, idx) => (
                    <tr key={idx} className="hover:bg-gold-50/30 dark:hover:bg-white/2 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-luxury-black dark:text-white">
                          {emp.employeeName}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400">
                          ID: {emp.employeeId}
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-bold text-luxury-black dark:text-white">
                        {emp.totalCalls}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {emp.connectedCalls} ({emp.connectedRate}%)
                        </span>
                      </td>

                      <td className="p-3.5 text-center text-amber-600 dark:text-amber-400 font-medium">
                        {emp.missedCalls}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400">
                          {emp.conversions} ({emp.conversionRate}%)
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gold-500/15 text-gold-600 dark:text-gold-400">
                          {emp.resolutions} ({emp.resolutionRate}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL / DRAWER: CALLBACK DETAILS → CALL REMARKS */}
      {selectedCallbackId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setSelectedCallbackId(null)}
          />

          {/* Drawer container */}
          <div className="relative w-full max-w-3xl bg-white dark:bg-[#1A1A1A] h-full shadow-2xl z-10 animate-slide-left overflow-hidden flex flex-col">
            <CallbackRemarksSection
              callbackId={selectedCallbackId}
              authHeader={authHeader}
              adminAuth={adminAuth}
              onCallbackUpdated={() => {
                fetchCallbacks();
                fetchReports();
              }}
              onClose={() => setSelectedCallbackId(null)}
            />
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW CALLBACK REQUEST */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 border border-gold-500/40 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-base font-bold text-luxury-black dark:text-white">
                📞 Schedule New Callback
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCallback} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Customer Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91-9876543210"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. customer@gmail.com"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Subject / Requirement
                </label>
                <input
                  type="text"
                  placeholder="e.g. Inquiry regarding Anniversary Keepsake box"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 text-xs outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Assign Staff
                  </label>
                  <select
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 text-xs outline-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.designation || "Staff"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Initial Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Any background context..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCallback}
                  className="px-5 py-2 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs shadow-md shadow-gold-500/20 cursor-pointer disabled:opacity-50"
                >
                  {creatingCallback ? "Scheduling..." : "Create & Queue Callback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallbackManagementTab;
