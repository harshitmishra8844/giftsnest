import React, { useState, useEffect, useCallback } from "react";
import api, { resolveMediaUrl } from "../services/api";
import { getAdminAuth } from "../services/adminAuth";
import {
  Search, Filter, Download, Settings, RefreshCw, Eye, CheckCircle,
  XCircle, Truck, Package, CreditCard, AlertCircle, ChevronRight,
  ArrowUpDown, Clock, ShieldCheck, X, Check, FileText, ChevronDown
} from "lucide-react";

const ReturnsReplacementsTab = () => {
  // Metric widgets state
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    refundsPending: 0,
    replacementsPending: 0,
  });

  // Main list & filter state
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [typeFilter, setTypeFilter] = useState("All"); // "All", "Return", "Replacement"
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState(-1);

  // Selected request for detail drawer
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activityTimeline, setActivityTimeline] = useState([]);

  // Action Modals State
  const [activeModal, setActiveModal] = useState(null); // 'status', 'pickup', 'verifyRestock', 'refund', 'replacementOrder', 'dispatchReplacement', 'settings', 'imagePreview'
  const [modalData, setModalData] = useState({});
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  // Settings State
  const [settings, setSettings] = useState({
    returnWindowDays: 7,
    replacementWindowDays: 7,
    allowPersonalizedExceptions: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${getAdminAuth()?.token}` },
  });

  // Fetch KPI Metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const { data } = await api.get("/returns/admin/metrics", authHeader());
      if (data) {
        setMetrics(data.metrics || data);
      }
    } catch (err) {
      console.error("Failed to fetch return metrics:", err);
    }
  }, []);

  // Fetch Return Settings
  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/returns/settings", authHeader());
      if (data) {
        setSettings({
          returnWindowDays: data.returnWindowDays || 7,
          replacementWindowDays: data.replacementWindowDays || 7,
          allowPersonalizedExceptions: data.allowPersonalizedExceptions !== false,
        });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }, []);

  // Fetch Unified Requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        type: typeFilter,
        requestType: typeFilter,
        status: statusFilter,
        search: searchTerm.trim() || undefined,
        sortBy,
        sortOrder,
        limit: 50,
      };
      const { data } = await api.get("/returns/admin/unified-requests", {
        ...authHeader(),
        params,
      });
      const list = Array.isArray(data) ? data : (data?.requests || data?.list || []);
      setRequests(list);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    fetchMetrics();
    fetchSettings();
  }, [fetchMetrics, fetchSettings]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Open Drawer and load full request details + timeline
  const handleOpenDrawer = async (req) => {
    setSelectedRequest(req);
    setDrawerOpen(true);
    setActivityTimeline([]);
    try {
      const { data } = await api.get(`/returns/admin/request-details/${req._id}`, authHeader());
      if (data?.returnRequest) {
        setSelectedRequest({
          ...data.returnRequest,
          timeline: data.timeline || [],
          refundRecord: data.refundRecord || null,
          replacementOrder: data.replacementOrder || null,
        });
        setActivityTimeline(data.timeline || []);
      }
    } catch (err) {
      // Fallback to customer endpoint if admin endpoint has issue
      try {
        const { data: fallbackData } = await api.get(`/returns/my-requests/${req._id}`, authHeader());
        if (fallbackData?.returnRequest) {
          setSelectedRequest({
            ...fallbackData.returnRequest,
            timeline: fallbackData.timeline || [],
            refundRecord: fallbackData.refundRecord || null,
            replacementOrder: fallbackData.replacementOrder || null,
          });
          setActivityTimeline(fallbackData.timeline || []);
        }
      } catch (fallbackErr) {
        console.error("Failed to fetch full request details:", err);
      }
    }
  };

  // CSV Export Handler
  const handleExportCSV = async () => {
    try {
      setError("");
      setSuccess("Preparing CSV export...");
      const response = await api.get("/returns/admin/export", {
        ...authHeader(),
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `niyora_returns_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess("CSV Export downloaded successfully!");
    } catch (err) {
      setError("Failed to download CSV export.");
    }
  };

  // Status Badge Colors Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case "Submitted":
      case "Return Requested":
        return "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40";
      case "Under Review":
      case "Investigation In Progress":
        return "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/40";
      case "Approved":
        return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/40";
      case "Pickup Scheduled":
      case "Item Picked Up":
        return "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40";
      case "Item Received":
      case "Product Received":
      case "Item Received & Verified":
        return "bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40";
      case "Replacement Processing":
      case "Refund Processing":
        return "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/40";
      case "Replacement Shipped":
      case "Delivered":
        return "bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-300/60 dark:border-teal-800/40";
      case "Refund Completed":
      case "Refunded":
      case "Completed":
        return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-400/60";
      case "Rejected":
        return "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800/40";
      default:
        return "bg-gray-50 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300 border border-gray-200/60";
    }
  };

  // Perform Status Change Action
  const handlePerformStatusChange = async (newStatus, adminRemarks = "") => {
    if (!selectedRequest) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post(
        "/returns/admin/status",
        {
          requestId: selectedRequest._id,
          status: newStatus,
          adminRemarks: adminRemarks || undefined,
        },
        authHeader()
      );
      setSuccess(data.message || `Status changed to ${newStatus}`);
      setActiveModal(null);
      await Promise.all([fetchRequests(), fetchMetrics(), handleOpenDrawer(selectedRequest)]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Task Transfer across roles
  const handleTransferReturnTask = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        taskType: "Return",
        taskId: selectedRequest._id,
        targetRole: modalData.targetRole || "Operations Manager",
        priority: modalData.priority || "Medium",
        reason: modalData.reason || "Inter-department handoff",
        notes: modalData.notes || "",
      };
      const { data } = await api.post("/tasks/transfer", payload, authHeader());
      setSuccess(data.message || "Task transferred successfully.");
      setActiveModal(null);
      await Promise.all([fetchRequests(), fetchMetrics(), handleOpenDrawer(selectedRequest)]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to transfer task.");
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Reverse Pickup Scheduling
  const handleSchedulePickup = async (e) => {
    e.preventDefault();
    if (!modalData.courier || !modalData.trackingId) {
      setError("Courier partner and AWB tracking ID are required.");
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post(
        "/returns/admin/schedule-pickup",
        {
          requestId: selectedRequest._id,
          courier: modalData.courier,
          trackingId: modalData.trackingId,
          pickupDate: modalData.pickupDate || new Date(),
          adminRemarks: modalData.remarks || "Pickup scheduled.",
        },
        authHeader()
      );
      setSuccess(data.message || "Reverse pickup successfully scheduled!");
      setActiveModal(null);
      await Promise.all([fetchRequests(), fetchMetrics(), handleOpenDrawer(selectedRequest)]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule pickup.");
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Physical Verification & Restock
  const handleVerifyAndRestock = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post(
        "/returns/admin/verify-and-restock",
        {
          requestId: selectedRequest._id,
          restockProduct: modalData.restockProduct !== false,
          conditionNotes: modalData.conditionNotes || "Physical inspection passed.",
        },
        authHeader()
      );
      setSuccess(data.message || "Item physically verified and inventory updated!");
      setActiveModal(null);
      await Promise.all([fetchRequests(), fetchMetrics(), handleOpenDrawer(selectedRequest)]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify and restock item.");
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Process Refund
  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!modalData.refundAmount || Number(modalData.refundAmount) <= 0) {
      setError("Please specify a valid refund amount.");
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post(
        "/returns/admin/process-refund",
        {
          requestId: selectedRequest._id,
          refundAmount: Number(modalData.refundAmount),
          refundMethod: modalData.refundMethod || "Original Payment Source",
          transactionReference: modalData.transactionReference || undefined,
          remarks: modalData.remarks || "Refund processed.",
        },
        authHeader()
      );
      setSuccess(data.message || "Refund record created and status updated!");
      setActiveModal(null);
      await Promise.all([fetchRequests(), fetchMetrics(), handleOpenDrawer(selectedRequest)]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process refund.");
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Create Replacement Order
  const handleCreateReplacementOrder = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post(
        "/returns/admin/create-replacement-order",
        {
          requestId: selectedRequest._id,
          remarks: modalData.remarks || "Replacement order created with reserved stock.",
        },
        authHeader()
      );
      setSuccess(data.message || "Replacement order created successfully!");
      setActiveModal(null);
      await Promise.all([fetchRequests(), fetchMetrics(), handleOpenDrawer(selectedRequest)]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create replacement order.");
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Dispatch Replacement
  const handleDispatchReplacement = async (e) => {
    e.preventDefault();
    if (!modalData.courier || !modalData.trackingId) {
      setError("Courier partner and forward tracking ID are required.");
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post(
        "/returns/admin/dispatch-replacement",
        {
          requestId: selectedRequest._id,
          courier: modalData.courier,
          trackingId: modalData.trackingId,
          remarks: modalData.remarks || "Replacement parcel dispatched.",
        },
        authHeader()
      );
      setSuccess(data.message || "Replacement parcel marked as shipped!");
      setActiveModal(null);
      await Promise.all([fetchRequests(), fetchMetrics(), handleOpenDrawer(selectedRequest)]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to dispatch replacement.");
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setError("");
    setSuccess("");
    try {
      await api.put(
        "/returns/settings",
        {
          returnWindowDays: Number(settings.returnWindowDays),
          replacementWindowDays: Number(settings.replacementWindowDays),
          allowPersonalizedExceptions: settings.allowPersonalizedExceptions,
        },
        authHeader()
      );
      setSuccess("Return & Replacement settings saved successfully!");
      setActiveModal(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save return settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const statusOptions = [
    "All",
    "Submitted",
    "Under Review",
    "Approved",
    "Pickup Scheduled",
    "Item Received",
    "Replacement Processing",
    "Replacement Shipped",
    "Refund Processing",
    "Refund Completed",
    "Rejected",
  ];

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header with Title and Global Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold-200/20 dark:border-gold-900/20 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-luxury-black dark:text-white flex items-center gap-2">
            <span>🛡️</span>
            <span>Return & Replacement Command Center</span>
          </h2>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-1 font-light">
            Supervise return claims, reverse pickups, verified inventory restocking, and refund payouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setModalData({ ...settings });
              setActiveModal("settings");
            }}
            className="rounded-full border border-gold-300 dark:border-gold-800 bg-white dark:bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-luxury-black dark:text-gold-300 hover:bg-gold-50 dark:hover:bg-white/5 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Policy Window Settings</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-luxury-black dark:text-gray-200 hover:bg-gold-50 dark:hover:bg-white/5 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-gold-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchRequests();
              fetchMetrics();
            }}
            className="rounded-full bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 dark:bg-rose-950/30 p-4 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-rose-400 hover:text-rose-600 font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 dark:bg-emerald-950/30 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 shadow-xs">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="ml-auto text-emerald-400 hover:text-emerald-600 font-bold">&times;</button>
        </div>
      )}

      {/* 6 KPI Metric Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { label: "Total Requests", value: metrics.totalRequests, icon: "📦", color: "border-gold-300/40 bg-gold-50/20 text-gold-900 dark:text-gold-300" },
          { label: "Pending Review", value: metrics.pendingRequests, icon: "⏳", color: "border-amber-300/40 bg-amber-50/20 text-amber-900 dark:text-amber-300" },
          { label: "Approved", value: metrics.approvedRequests, icon: "✓", color: "border-emerald-300/40 bg-emerald-50/20 text-emerald-900 dark:text-emerald-300" },
          { label: "Rejected", value: metrics.rejectedRequests, icon: "✕", color: "border-rose-300/40 bg-rose-50/20 text-rose-900 dark:text-rose-300" },
          { label: "Refunds Pending", value: metrics.refundsPending, icon: "💳", color: "border-cyan-300/40 bg-cyan-50/20 text-cyan-900 dark:text-cyan-300" },
          { label: "Replacements Due", value: metrics.replacementsPending, icon: "🔁", color: "border-purple-300/40 bg-purple-50/20 text-purple-900 dark:text-purple-300" },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className={`rounded-2xl border p-4 shadow-xs backdrop-blur-md bg-white/70 dark:bg-[#1C1C1C] ${kpi.color} flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between text-xs text-text-secondary dark:text-gray-400 font-light">
              <span>{kpi.label}</span>
              <span className="text-base">{kpi.icon}</span>
            </div>
            <p className="mt-2 text-2xl font-serif font-bold text-luxury-black dark:text-white">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-gold-200/20 dark:border-gold-900/20 bg-white/70 dark:bg-[#1C1C1C] p-4.5 space-y-4 shadow-xs">
        {/* Type selector tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-200/10 dark:border-gold-900/10 pb-3">
          <div className="flex gap-2">
            {[
              { id: "All", label: "All Requests" },
              { id: "Return", label: "Return Claims" },
              { id: "Replacement", label: "Replacement Claims" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  typeFilter === t.id
                    ? "bg-gold-500 text-white shadow-xs"
                    : "bg-gray-100 dark:bg-white/5 text-text-secondary dark:text-gray-400 hover:text-luxury-black hover:bg-gold-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Sort:</span>
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(":");
                setSortBy(sb);
                setSortOrder(Number(so));
              }}
              className="rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/30 px-3 py-1.5 text-xs outline-none focus:border-gold-500 text-luxury-black dark:text-white cursor-pointer"
            >
              <option value="createdAt:-1">Newest First</option>
              <option value="createdAt:1">Oldest First</option>
              <option value="status:1">Status Ascending</option>
            </select>
          </div>
        </div>

        {/* Search input & status pills */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Request Code (RET-...), Order ID, Customer Name, or Email..."
              className="w-full rounded-full border border-champagne dark:border-gold-900/40 bg-white dark:bg-black/30 pl-10 pr-4 py-2.5 text-xs outline-none focus:border-gold-500 text-luxury-black dark:text-white"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {statusOptions.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer border ${
                statusFilter === st
                  ? "bg-gold-500 text-white border-gold-500 shadow-xs"
                  : "bg-white/60 dark:bg-white/5 border-champagne dark:border-gold-900/30 text-text-secondary dark:text-gray-400 hover:border-gold-400"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Unified Requests Table / Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gold-600 font-bold animate-pulse flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Synchronizing Unified Return Records...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-gold-200/20 dark:border-gold-900/20 bg-white/60 dark:bg-[#1C1C1C] p-16 text-center shadow-xs">
          <span className="text-4xl block mb-2">📭</span>
          <h3 className="text-base font-serif font-semibold text-luxury-black dark:text-white">No Claims Found</h3>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-1 font-light max-w-sm mx-auto">
            No return or replacement claims match your current filter selection. Adjust the search or status filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((req) => {
            const reqCode = req.requestId || req.returnCode || req.replacementCode || "RET-PENDING";
            const reqType = req.requestType || (req.returnCode?.startsWith("REP") ? "Replacement" : "Return");
            const isReplacement = reqType === "Replacement";
            const orderCode = req.orderId?.orderCode || "N/A";
            const customerName = req.customerId?.name || "Customer";
            const customerEmail = req.customerId?.email || "-";
            const itemCount = req.items?.length || 1;

            return (
              <div
                key={req._id}
                className="rounded-3xl border border-gold-200/20 dark:border-gold-900/20 bg-white/80 dark:bg-[#1C1C1C] p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 hover:border-gold-400/40"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-champagne/20 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-luxury-black dark:text-white">
                        {reqCode}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${isReplacement ? 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'}`}>
                        {reqType}
                      </span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>

                  {/* Summary Details */}
                  <div className="mt-3 space-y-2 text-xs text-text-secondary dark:text-gray-300 font-light">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400">Order:</span>
                      <strong className="text-luxury-black dark:text-white font-mono">#{orderCode}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400">Customer:</span>
                      <span className="truncate max-w-[180px] text-right font-medium text-luxury-black dark:text-white">
                        {customerName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400">Claim Reason:</span>
                      <span className="font-semibold text-luxury-black dark:text-white truncate max-w-[180px]">
                        {req.returnReason || req.reason || "General"}
                      </span>
                    </div>

                    {req.pickupDetails?.trackingId && (
                      <div className="flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded-xl text-[10px] border border-indigo-100 dark:border-indigo-900/30">
                        <span className="font-bold text-indigo-900 dark:text-indigo-300">Pickup AWB:</span>
                        <span className="font-mono text-indigo-950 dark:text-indigo-200">{req.pickupDetails.trackingId}</span>
                      </div>
                    )}

                    {req.refundDetails?.refundAmount && (
                      <div className="flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl text-[10px] border border-emerald-100 dark:border-emerald-900/30">
                        <span className="font-bold text-emerald-900 dark:text-emerald-300">Refund Amount:</span>
                        <strong className="font-serif text-emerald-950 dark:text-emerald-200">INR {req.refundDetails.refundAmount}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom CTA */}
                <div className="border-t border-champagne/20 dark:border-white/5 pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-light">
                    {new Date(req.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })} &bull; {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenDrawer(req)}
                    className="rounded-full bg-luxury-black hover:bg-gold-500 text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Inspect & Act</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL & ACTION DRAWER MODAL */}
      {drawerOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-luxury-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#181818] h-full shadow-2xl flex flex-col overflow-hidden border-l border-gold-300/30 animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-champagne/30 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/90 dark:bg-[#181818]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-serif font-bold text-luxury-black dark:text-white">
                    {selectedRequest.requestId || selectedRequest.returnCode || selectedRequest.replacementCode}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${selectedRequest.requestType === "Replacement" ? 'bg-purple-100 text-purple-900' : 'bg-amber-100 text-amber-900'}`}>
                    {selectedRequest.requestType || "Return"}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary dark:text-gray-400 mt-0.5">
                  Order #{selectedRequest.orderId?.orderCode || "N/A"} &bull; Created: {new Date(selectedRequest.createdAt).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase border tracking-wider ${getStatusBadge(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-full border border-champagne dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-luxury-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-luxury-black dark:text-gray-200">
              {/* Customer Information Card */}
              <div className="rounded-2xl border border-champagne/30 dark:border-white/10 bg-gold-50/15 dark:bg-white/5 p-4 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-champagne/20 dark:border-white/5 pb-1.5">
                  Customer & Order Details
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400 text-[10px]">Customer Name</p>
                    <p className="font-semibold text-luxury-black dark:text-white">{selectedRequest.customerId?.name || "N/A"}</p>
                    <p className="text-[11px] text-text-secondary dark:text-gray-400">{selectedRequest.customerId?.email}</p>
                    <p className="text-[11px] text-text-secondary dark:text-gray-400">{selectedRequest.customerId?.mobileNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px]">Original Payment Method</p>
                    <p className="font-semibold text-luxury-black dark:text-white">{selectedRequest.orderId?.paymentMethod || "Online"} &bull; Total: INR {selectedRequest.orderId?.totalPrice || 0}</p>
                    <p className="text-gray-400 text-[10px] mt-1.5">Delivery Status</p>
                    <p className="font-semibold text-emerald-600">{selectedRequest.orderId?.status || "Delivered"}</p>
                  </div>
                </div>
              </div>

              {/* Items Claimed */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400">
                  Claimed Items ({selectedRequest.items?.length || 1})
                </h4>
                <div className="divide-y divide-champagne/20 dark:divide-white/5 border border-champagne/30 dark:border-white/10 rounded-2xl bg-white dark:bg-black/30 p-2">
                  {selectedRequest.items?.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2 px-2">
                      {it.image && (
                        <img src={resolveMediaUrl(it.image)} alt={it.name} className="w-12 h-12 object-cover rounded-xl border border-champagne/20" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-luxury-black dark:text-white">{it.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Quantity: {it.quantity} &bull; Unit Price: INR {it.price}</p>
                      </div>
                      <div className="text-right font-serif font-bold text-gold-700 dark:text-gold-400">
                        INR {(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Claim Reason & Evidence */}
              <div className="rounded-2xl border border-champagne/30 dark:border-white/10 bg-gold-50/10 dark:bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-champagne/20 dark:border-white/5 pb-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 block">Claim Reason</span>
                    <strong className="text-sm font-serif text-luxury-black dark:text-white">{selectedRequest.returnReason || selectedRequest.reason}</strong>
                  </div>
                  {selectedRequest.itemVerified && (
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Physically Verified & Restocked
                    </span>
                  )}
                </div>

                {selectedRequest.customerMessage && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Customer Note:</p>
                    <p className="italic bg-white dark:bg-black/30 p-3 rounded-xl border border-champagne/20 dark:border-white/5 leading-relaxed">
                      "{selectedRequest.customerMessage}"
                    </p>
                  </div>
                )}

                {/* Evidence Photos */}
                {selectedRequest.evidenceImages && selectedRequest.evidenceImages.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Submitted Evidence Photos ({selectedRequest.evidenceImages.length})</p>
                    <div className="flex flex-wrap gap-2.5">
                      {selectedRequest.evidenceImages.map((imgObj, i) => {
                        const url = resolveMediaUrl(imgObj?.url || imgObj);
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setPreviewImageUrl(url);
                              setActiveModal("imagePreview");
                            }}
                            className="w-16 h-16 rounded-xl border border-champagne overflow-hidden cursor-pointer hover:opacity-80 transition hover:scale-105 shadow-xs"
                          >
                            <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Evidence Video */}
                {(selectedRequest.evidenceVideo?.url || selectedRequest.video?.url) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Unboxing Video Evidence</p>
                    <video
                      controls
                      src={resolveMediaUrl(selectedRequest.evidenceVideo?.url || selectedRequest.video?.url)}
                      className="max-h-44 rounded-xl border border-champagne bg-black"
                    />
                  </div>
                )}
              </div>

              {/* Reverse Pickup Logistics */}
              {selectedRequest.pickupDetails?.trackingId && (
                <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-indigo-200/40 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-indigo-600" /> Reverse Pickup Coordination
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-indigo-100 text-indigo-900">
                      {selectedRequest.pickupDetails.pickupStatus || "Scheduled"}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <p>Courier: <strong>{selectedRequest.pickupDetails.courier}</strong></p>
                    <p>AWB ID: <strong className="font-mono">{selectedRequest.pickupDetails.trackingId}</strong></p>
                    <p>Pickup Date: <strong>{selectedRequest.pickupDetails.pickupDate ? new Date(selectedRequest.pickupDetails.pickupDate).toLocaleDateString("en-IN") : "Pending"}</strong></p>
                  </div>
                </div>
              )}

              {/* COD Refund Account Information if provided */}
              {selectedRequest.codRefundMethod && (
                <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 block border-b border-amber-200/50 pb-1">
                    COD Refund Account Details
                  </span>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <p>Method: <strong>{selectedRequest.codRefundMethod}</strong></p>
                    {selectedRequest.codRefundMethod === "UPI" ? (
                      <p>UPI ID: <strong className="font-mono">{selectedRequest.codRefundDetails?.upiId}</strong></p>
                    ) : (
                      <>
                        <p>Holder: <strong>{selectedRequest.codRefundDetails?.accountHolderName}</strong></p>
                        <p>Bank: <strong>{selectedRequest.codRefundDetails?.bankName}</strong></p>
                        <p>Account: <strong className="font-mono">{selectedRequest.codRefundDetails?.accountNumber}</strong></p>
                        <p>IFSC: <strong className="font-mono">{selectedRequest.codRefundDetails?.ifscCode}</strong></p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Activity History Logs */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gold-600" />
                  <span>Audit Activity Timeline</span>
                </h4>
                <div className="divide-y divide-champagne/20 dark:divide-white/5 border border-champagne/30 dark:border-white/10 rounded-2xl bg-white dark:bg-black/30 overflow-hidden">
                  {activityTimeline.length > 0 ? (
                    activityTimeline.map((log, i) => (
                      <div key={log._id || i} className="p-3.5 hover:bg-gold-50/20 dark:hover:bg-white/5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-luxury-black dark:text-white">{log.action || log.status}</span>
                            <span className={`px-2 py-0.2 rounded-full text-[8px] font-bold uppercase ${getStatusBadge(log.status)}`}>
                              {log.status}
                            </span>
                          </div>
                          {log.remarks && (
                            <p className="text-[11px] text-text-secondary dark:text-gray-400 font-light">{log.remarks}</p>
                          )}
                          <span className="text-[9px] text-gray-400 block">By: {log.performedByName || "Admin"}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                          {new Date(log.timestamp || log.createdAt).toLocaleString("en-IN", { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-text-secondary dark:text-gray-400">
                      Initial submission logged. Further lifecycle updates will appear here.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions Bar */}
            <div className="p-5 border-t border-champagne/30 dark:border-white/10 bg-gray-50/80 dark:bg-[#141414] shrink-0 flex flex-wrap gap-2.5 items-center justify-between">
              {/* Contextual Action Buttons */}
              <div className="flex flex-wrap gap-2 w-full">
                {/* 1. If Submitted: Move to Under Review or Approve or Reject */}
                {selectedRequest.status === "Submitted" && (
                  <button
                    type="button"
                    onClick={() => handlePerformStatusChange("Under Review", "Concierge investigation commenced.")}
                    disabled={actionLoading}
                    className="flex-1 rounded-full border border-gold-500 bg-white dark:bg-black/30 hover:bg-gold-50 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-700 dark:text-gold-300 transition cursor-pointer"
                  >
                    Move to Under Review
                  </button>
                )}

                {/* 2. Approve or Reject or Request More Info */}
                {["Submitted", "Under Review", "More Information Requested"].includes(selectedRequest.status) && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePerformStatusChange("Approved", "Claim inspected and approved by concierge.")}
                      disabled={actionLoading}
                      className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
                    >
                      Approve Claim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalData({ remarks: "" });
                        setActiveModal("requestInfo");
                      }}
                      disabled={actionLoading}
                      className="flex-1 rounded-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
                    >
                      Request Info
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalData({ remarks: "" });
                        setActiveModal("status");
                      }}
                      disabled={actionLoading}
                      className="flex-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
                    >
                      Reject Claim
                    </button>
                  </>
                )}

                {/* 3. Schedule Pickup */}
                {selectedRequest.status === "Approved" && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalData({ courier: "Delhivery", trackingId: "", pickupDate: new Date().toISOString().slice(0, 10), remarks: "" });
                      setActiveModal("pickup");
                    }}
                    disabled={actionLoading}
                    className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Schedule Reverse Pickup</span>
                  </button>
                )}

                {/* 4. Verify & Restock Item */}
                {selectedRequest.status === "Pickup Scheduled" && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalData({ restockProduct: true, conditionNotes: "Physically received and verified." });
                      setActiveModal("verifyRestock");
                    }}
                    disabled={actionLoading}
                    className="w-full rounded-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Mark Item Received & Verify Restock</span>
                  </button>
                )}

                {/* 5. Process Refund (for returns) */}
                {selectedRequest.requestType !== "Replacement" && ["Item Received", "Refund Processing"].includes(selectedRequest.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      const totalVal = selectedRequest.items?.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0) || selectedRequest.orderId?.totalPrice || 0;
                      setModalData({
                        refundAmount: totalVal,
                        refundMethod: selectedRequest.codRefundMethod ? (selectedRequest.codRefundMethod === "UPI" ? "UPI" : "Bank Transfer") : "Original Payment Source",
                        transactionReference: "",
                        remarks: "Refund executed to customer.",
                      });
                      setActiveModal("refund");
                    }}
                    disabled={actionLoading}
                    className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Process Refund Payout</span>
                  </button>
                )}

                {/* 6. Create Replacement Order (for replacements) */}
                {selectedRequest.requestType === "Replacement" && selectedRequest.status === "Item Received" && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalData({ remarks: "Zero-cost replacement order generated with reserved inventory." });
                      setActiveModal("replacementOrder");
                    }}
                    disabled={actionLoading}
                    className="w-full rounded-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Package className="w-4 h-4" />
                    <span>Generate Replacement Order & Reserve Stock</span>
                  </button>
                )}

                {/* 7. Dispatch Replacement Parcel */}
                {selectedRequest.requestType === "Replacement" && selectedRequest.status === "Replacement Processing" && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalData({ courier: "Delhivery", trackingId: "", remarks: "Replacement parcel dispatched." });
                      setActiveModal("dispatchReplacement");
                    }}
                    disabled={actionLoading}
                    className="w-full rounded-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Dispatch Replacement Parcel</span>
                  </button>
                )}

                {/* 8. Inter-department Task Transfer */}
                <button
                  type="button"
                  onClick={() => {
                    setModalData({
                      targetRole: "Operations Manager",
                      priority: "Medium",
                      reason: "Inter-department handoff required",
                      notes: "",
                    });
                    setActiveModal("transfer");
                  }}
                  disabled={actionLoading}
                  className="w-full rounded-full border border-gold-500/50 bg-gold-500/10 hover:bg-gold-500/20 text-gold-700 dark:text-gold-300 py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>Transfer Task Across Departments</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVERSE PICKUP SCHEDULING MODAL */}
      {activeModal === "pickup" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-champagne/30 pb-2">
              <h4 className="font-serif font-bold text-luxury-black dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Schedule Reverse Pickup</span>
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-black">&times;</button>
            </div>

            <form onSubmit={handleSchedulePickup} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Courier Partner *</label>
                <input
                  type="text"
                  value={modalData.courier || ""}
                  onChange={(e) => setModalData({ ...modalData, courier: e.target.value })}
                  placeholder="e.g. Delhivery, Bluedart, Shadowfax"
                  required
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">AWB Tracking ID *</label>
                <input
                  type="text"
                  value={modalData.trackingId || ""}
                  onChange={(e) => setModalData({ ...modalData, trackingId: e.target.value })}
                  placeholder="Reverse tracking number"
                  required
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs font-mono outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Scheduled Pickup Date</label>
                <input
                  type="date"
                  value={modalData.pickupDate || ""}
                  onChange={(e) => setModalData({ ...modalData, pickupDate: e.target.value })}
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Log Remarks</label>
                <textarea
                  value={modalData.remarks || ""}
                  onChange={(e) => setModalData({ ...modalData, remarks: e.target.value })}
                  rows={2}
                  placeholder="Reverse pickup coordinated with logistics..."
                  className="w-full rounded-2xl border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 font-bold uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  {actionLoading ? "Scheduling..." : "Confirm Reverse Pickup"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full border border-champagne px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gold-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERIFY & RESTOCK MODAL */}
      {activeModal === "verifyRestock" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-champagne/30 pb-2">
              <h4 className="font-serif font-bold text-luxury-black dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Item Inspection & Restock</span>
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-black">&times;</button>
            </div>

            <form onSubmit={handleVerifyAndRestock} className="space-y-4 text-xs">
              <div className="rounded-2xl border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 p-3.5 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalData.restockProduct !== false}
                    onChange={(e) => setModalData({ ...modalData, restockProduct: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-purple-600 accent-purple-600"
                  />
                  <div>
                    <span className="font-bold text-purple-950 dark:text-purple-200 block">Restock returned units into inventory</span>
                    <span className="text-[10px] text-purple-800 dark:text-purple-300 font-light">
                      If checked, physical stock count will be safely incremented without duplicate risk. Uncheck if item is scrapped or damaged.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Condition Inspection Notes *</label>
                <textarea
                  value={modalData.conditionNotes || ""}
                  onChange={(e) => setModalData({ ...modalData, conditionNotes: e.target.value })}
                  rows={3}
                  placeholder="Describe packaging, seal condition, tags, and usability..."
                  required
                  className="w-full rounded-2xl border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-bold uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  {actionLoading ? "Verifying..." : "Confirm Receipt & Verification"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full border border-champagne px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gold-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROCESS REFUND MODAL */}
      {activeModal === "refund" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-champagne/30 pb-2">
              <h4 className="font-serif font-bold text-luxury-black dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Execute Refund Payout</span>
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-black">&times;</button>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Refund Amount (INR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={modalData.refundAmount || ""}
                  onChange={(e) => setModalData({ ...modalData, refundAmount: e.target.value })}
                  placeholder="Full or partial refund amount"
                  required
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs font-bold outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Refund Method *</label>
                <select
                  value={modalData.refundMethod || "Original Payment Source"}
                  onChange={(e) => setModalData({ ...modalData, refundMethod: e.target.value })}
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500 cursor-pointer"
                >
                  <option value="Original Payment Source">Original Payment Source</option>
                  <option value="UPI">UPI Payout</option>
                  <option value="Bank Transfer">Bank Account Transfer (NEFT/IMPS)</option>
                  <option value="Store Credit">Store Credit (Gift Wallet)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Transaction UTR / Reference ID</label>
                <input
                  type="text"
                  value={modalData.transactionReference || ""}
                  onChange={(e) => setModalData({ ...modalData, transactionReference: e.target.value })}
                  placeholder="e.g. UTR12345678, Bank Ref ID"
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs font-mono outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Concierge Remarks</label>
                <textarea
                  value={modalData.remarks || ""}
                  onChange={(e) => setModalData({ ...modalData, remarks: e.target.value })}
                  rows={2}
                  placeholder="Refund credited back to customer account..."
                  className="w-full rounded-2xl border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 font-bold uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  {actionLoading ? "Executing..." : "Process Refund"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full border border-champagne px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gold-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE REPLACEMENT ORDER MODAL */}
      {activeModal === "replacementOrder" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-champagne/30 pb-2">
              <h4 className="font-serif font-bold text-luxury-black dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span>Create Replacement Order</span>
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-black">&times;</button>
            </div>

            <form onSubmit={handleCreateReplacementOrder} className="space-y-4 text-xs">
              <p className="text-text-secondary dark:text-gray-300 font-light leading-relaxed">
                This action will automatically reserve stock for the replacement product and create a linked zero-value order ready for packaging.
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Remarks</label>
                <textarea
                  value={modalData.remarks || ""}
                  onChange={(e) => setModalData({ ...modalData, remarks: e.target.value })}
                  rows={2}
                  placeholder="Notes for replacement fulfillment..."
                  className="w-full rounded-2xl border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-bold uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  {actionLoading ? "Generating..." : "Generate Replacement Order"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full border border-champagne px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gold-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH REPLACEMENT MODAL */}
      {activeModal === "dispatchReplacement" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-champagne/30 pb-2">
              <h4 className="font-serif font-bold text-luxury-black dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-teal-600" />
                <span>Dispatch Replacement Parcel</span>
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-black">&times;</button>
            </div>

            <form onSubmit={handleDispatchReplacement} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Courier Partner *</label>
                <input
                  type="text"
                  value={modalData.courier || ""}
                  onChange={(e) => setModalData({ ...modalData, courier: e.target.value })}
                  placeholder="e.g. Delhivery, Bluedart"
                  required
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Forward AWB Tracking ID *</label>
                <input
                  type="text"
                  value={modalData.trackingId || ""}
                  onChange={(e) => setModalData({ ...modalData, trackingId: e.target.value })}
                  placeholder="Forward tracking number"
                  required
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs font-mono outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Remarks</label>
                <textarea
                  value={modalData.remarks || ""}
                  onChange={(e) => setModalData({ ...modalData, remarks: e.target.value })}
                  rows={2}
                  placeholder="Parcel handed over to courier partner..."
                  className="w-full rounded-2xl border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-full bg-teal-600 hover:bg-teal-700 text-white py-3 font-bold uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  {actionLoading ? "Dispatching..." : "Confirm Replacement Dispatch"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full border border-champagne px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gold-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION / STATUS CHANGE MODAL */}
      {activeModal === "status" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-champagne/30 pb-2">
              <h4 className="font-serif font-bold text-rose-600 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Reject Return Claim</span>
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-black">&times;</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!modalData.remarks?.trim()) {
                  setError("A rejection reason is required.");
                  return;
                }
                handlePerformStatusChange("Rejected", modalData.remarks.trim());
              }}
              className="space-y-4 text-xs"
            >
              <p className="text-text-secondary dark:text-gray-300 font-light">
                Please provide the official reason for rejecting this claim. This explanation will be communicated to the customer.
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Reason for Rejection *</label>
                <textarea
                  value={modalData.remarks || ""}
                  onChange={(e) => setModalData({ ...modalData, remarks: e.target.value })}
                  rows={3}
                  placeholder="e.g. Evidence submitted does not indicate product defect; Outside return eligibility window..."
                  required
                  className="w-full rounded-2xl border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white py-3 font-bold uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full border border-champagne px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gold-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST MORE INFORMATION MODAL */}
      {activeModal === "requestInfo" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-champagne/30 pb-2">
              <h4 className="font-serif font-bold text-amber-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Request More Information</span>
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-black">&times;</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!modalData.remarks?.trim()) {
                  setError("Please specify what information or photos are needed.");
                  return;
                }
                handlePerformStatusChange("More Information Requested", modalData.remarks.trim());
              }}
              className="space-y-4 text-xs"
            >
              <p className="text-text-secondary dark:text-gray-300 font-light">
                Specify what additional proof, higher resolution images, or clarifications the customer needs to submit before claim approval.
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Information Required from Customer *</label>
                <textarea
                  value={modalData.remarks || ""}
                  onChange={(e) => setModalData({ ...modalData, remarks: e.target.value })}
                  rows={3}
                  placeholder="e.g. Please provide a clear close-up photo of the product barcode and damaged corner..."
                  required
                  className="w-full rounded-2xl border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-full bg-amber-600 hover:bg-amber-700 text-white py-3 font-bold uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  {actionLoading ? "Submitting..." : "Send Request to Customer"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full border border-champagne px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gold-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK TRANSFER MODAL */}
      {activeModal === "transfer" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-champagne/30 pb-2">
              <h4 className="font-serif font-bold text-gold-600 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gold-600" />
                <span>Transfer Return Task</span>
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-black">&times;</button>
            </div>

            <form onSubmit={handleTransferReturnTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Target Department / Role *</label>
                <select
                  value={modalData.targetRole || "Operations Manager"}
                  onChange={(e) => setModalData({ ...modalData, targetRole: e.target.value })}
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs font-bold outline-none focus:border-gold-500"
                >
                  <option value="Operations Manager">Operations Manager</option>
                  <option value="Customer Support Manager">Customer Support Manager</option>
                  <option value="Refund Executive">Refund Executive</option>
                  <option value="Logistics Executive">Logistics Executive</option>
                  <option value="Support Executive">Support Executive</option>
                  <option value="Callback Executive">Callback Executive</option>
                  <option value="Order Executive">Order Executive</option>
                  <option value="Inventory Executive">Inventory Executive</option>
                  <option value="Master Admin">Master Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Priority</label>
                <select
                  value={modalData.priority || "Medium"}
                  onChange={(e) => setModalData({ ...modalData, priority: e.target.value })}
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs font-bold outline-none focus:border-gold-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Reason for Transfer *</label>
                <input
                  type="text"
                  value={modalData.reason || ""}
                  onChange={(e) => setModalData({ ...modalData, reason: e.target.value })}
                  placeholder="e.g. Escalating to logistics for courier dispute; Refund requires finance review..."
                  required
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Handoff Instructions / Notes</label>
                <textarea
                  value={modalData.notes || ""}
                  onChange={(e) => setModalData({ ...modalData, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional context or actions needed by the target team..."
                  className="w-full rounded-2xl border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs outline-none focus:border-gold-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-full bg-gold-500 hover:bg-gold-600 text-black py-3 font-bold uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  {actionLoading ? "Transferring..." : "Confirm Transfer"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full border border-champagne px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gold-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POLICY WINDOW SETTINGS MODAL */}
      {activeModal === "settings" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-champagne/30 pb-2">
              <h4 className="font-serif font-bold text-luxury-black dark:text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-gold-600" />
                <span>Return & Replacement Settings</span>
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-black">&times;</button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Return Window Days *</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={settings.returnWindowDays}
                  onChange={(e) => setSettings({ ...settings, returnWindowDays: Number(e.target.value) })}
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs font-bold outline-none focus:border-gold-500"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Days allowed for customer to submit return claim after delivery.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Replacement Window Days *</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={settings.replacementWindowDays}
                  onChange={(e) => setSettings({ ...settings, replacementWindowDays: Number(e.target.value) })}
                  className="w-full rounded-full border border-champagne dark:border-gold-900 bg-white dark:bg-black/40 px-4 py-2 text-xs font-bold outline-none focus:border-gold-500"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Days allowed for product replacement request after delivery.</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowPersonalizedExceptions}
                    onChange={(e) => setSettings({ ...settings, allowPersonalizedExceptions: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-gold-600 accent-gold-600"
                  />
                  <div>
                    <span className="font-bold text-luxury-black dark:text-white block">Allow Exceptions for Customized Gifts</span>
                    <span className="text-[10px] text-text-secondary dark:text-gray-400 font-light">
                      Personalized gifts are non-returnable by default, but damaged/defective items remain eligible.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex-1 rounded-full bg-gold-500 hover:bg-gold-600 text-white py-3 font-bold uppercase tracking-wider text-xs transition cursor-pointer shadow-sm"
                >
                  {savingSettings ? "Saving..." : "Save Policy Configuration"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full border border-champagne px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gold-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX */}
      {activeModal === "imagePreview" && previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md cursor-pointer"
          onClick={() => setActiveModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2 bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-lg hover:bg-black transition cursor-pointer"
            >
              &times;
            </button>
            <img src={previewImageUrl} alt="Evidence Large Preview" className="max-h-[80vh] w-auto object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsReplacementsTab;
