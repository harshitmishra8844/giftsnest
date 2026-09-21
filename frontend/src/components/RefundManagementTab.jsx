import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import { getAdminAuth } from "../services/adminAuth";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const QUEUE_TABS = [
  { id: "ALL", label: "All Requests", countKey: "totalRaised" },
  { id: "PENDING_REFUND_REVIEW", label: "Pending Review", countKey: "pendingCount" },
  { id: "REFUND_APPROVED", label: "Approved", countKey: "approvedCount" },
  { id: "REFUND_PROCESSING", label: "Processing", countKey: "processingCount" },
  { id: "REFUNDED", label: "Refunded", countKey: "refundedCount" },
  { id: "REJECTED", label: "Rejected", countKey: "rejectedCount" },
  { id: "MORE_INFO_REQUESTED", label: "More Info Needed" },
  { id: "ESCALATED_TO_MANAGER", label: "Escalated" },
];

const REMARK_TYPES = [
  "Verification Notes",
  "Refund Reason",
  "Investigation Summary",
  "Final Decision",
  "Internal Notes",
  "Customer Communication",
];

export default function RefundManagementTab({ authHeader }) {
  const getEffectiveAuthHeader = () => {
    if (authHeader && authHeader.headers) return authHeader;
    const admin = getAdminAuth();
    if (admin?.token) {
      return { headers: { Authorization: `Bearer ${admin.token}` } };
    }
    return {};
  };

  const currentAdmin = useMemo(() => getAdminAuth() || {}, []);

  // Strict permission check for action execution (Only Refund Team / Finance Managers)
  const canProcessRefund = useMemo(() => {
    if (!currentAdmin) return false;
    if (currentAdmin.isMasterAdmin || currentAdmin.role === "admin" || currentAdmin.isAdmin === true) return true;
    const perms = Array.isArray(currentAdmin.permissions) ? currentAdmin.permissions : [];
    if (perms.includes("ALL") || perms.includes("FINANCE_MANAGE")) return true;
    const designation = (currentAdmin.designation || "").toLowerCase();
    const role = (currentAdmin.role || "").toLowerCase();
    return designation.includes("refund") || designation.includes("finance") || role.includes("refund");
  }, [currentAdmin]);

  // Main State
  const [activeQueue, setActiveQueue] = useState("PENDING_REFUND_REVIEW");
  const [searchQuery, setSearchQuery] = useState("");
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summaryMetrics, setSummaryMetrics] = useState(null);

  // Inspection Drawer & Selected Refund
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [priorRefunds, setPriorRefunds] = useState([]);

  // Verification Form State
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentVerifiedCheck, setPaymentVerifiedCheck] = useState(true);
  const [eligibilityCheck, setEligibilityCheck] = useState(true);
  const [fraudCheck, setFraudCheck] = useState(true);
  const [duplicateCheck, setDuplicateCheck] = useState(true);
  const [verificationNotes, setVerificationNotes] = useState("");

  // Action Modals State
  const [activeActionModal, setActiveActionModal] = useState(null); // "approve", "reject", "requestInfo", "escalate", "auditLogs", "reports"
  const [actionLoading, setActionLoading] = useState(false);

  // Form Fields for Actions
  const [approveAmount, setApproveAmount] = useState("");
  const [approveMethod, setApproveMethod] = useState("Original Source");
  const [approveRemarks, setApproveRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [moreInfoText, setMoreInfoText] = useState("");
  const [escalateReason, setEscalateReason] = useState("");

  // Remarks Form State
  const [newRemarkType, setNewRemarkType] = useState("Verification Notes");
  const [newRemarkText, setNewRemarkText] = useState("");
  const [addingRemark, setAddingRemark] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Toast Feedback
  const [toastMessage, setToastMessage] = useState({ text: "", type: "success" });
  const showToast = (text, type = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage({ text: "", type: "success" }), 5000);
  };

  // Fetch Refunds List & Reports Summary
  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const params = new URLSearchParams();
      if (activeQueue !== "ALL") params.append("status", activeQueue);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const [resList, resReports] = await Promise.all([
        api.get(`/refunds?${params.toString()}`, header),
        api.get("/refunds/analytics/reports", header),
      ]);

      setRefunds(resList.data.refunds || []);
      setSummaryMetrics(resReports.data.summary || null);
    } catch (err) {
      console.error("fetchRefunds error:", err);
      showToast(err.response?.data?.message || "Failed to load refund requests.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [activeQueue]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRefunds();
  };

  // Open Detailed Inspection Drawer
  const openRefundDrawer = async (refundId) => {
    setDrawerLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.get(`/refunds/${refundId}`, header);
      const data = res.data.refund;
      setSelectedRefund(data);
      setPriorRefunds(res.data.priorRefunds || []);

      // Pre-fill forms
      setApproveAmount(data.refundAmount || "");
      setApproveMethod(data.refundMethod || "Original Source");
      setVerificationNotes(data.paymentVerificationNotes || "");
      setPaymentVerifiedCheck(data.paymentVerified ?? true);
      setEligibilityCheck(data.orderEligibilityVerified ?? true);
      setFraudCheck(data.fraudCheckPassed ?? true);
      setDuplicateCheck(data.duplicateCheckPassed ?? true);
    } catch (err) {
      console.error("openRefundDrawer error:", err);
      showToast(err.response?.data?.message || "Failed to load refund details.", "error");
    } finally {
      setDrawerLoading(false);
    }
  };

  // Step 3: Save Payment & Eligibility Verification
  const handleSaveVerification = async (e) => {
    e.preventDefault();
    if (!canProcessRefund) {
      showToast("Access denied. Customer Service Executives cannot verify payments.", "error");
      return;
    }
    setVerifyingPayment(true);
    try {
      const header = getEffectiveAuthHeader();
      const payload = {
        paymentVerified: paymentVerifiedCheck,
        orderEligibilityVerified: eligibilityCheck,
        fraudCheckPassed: fraudCheck,
        duplicateCheckPassed: duplicateCheck,
        paymentVerificationNotes: verificationNotes.trim() || "Payment and eligibility verified successfully.",
      };
      const res = await api.post(`/refunds/${selectedRefund._id}/verify`, payload, header);
      setSelectedRefund(res.data.refund);
      showToast("Payment and eligibility verified successfully!");
      fetchRefunds();
    } catch (err) {
      console.error("Verification error:", err);
      showToast(err.response?.data?.message || "Verification failed.", "error");
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Step 4: Approve Refund
  const handleApproveRefund = async (e) => {
    e.preventDefault();
    if (!canProcessRefund) {
      showToast("Access denied. Customer Service Executives cannot approve refunds.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const payload = {
        approvedAmount: Number(approveAmount) || selectedRefund.refundAmount,
        refundMethod: approveMethod,
        approvalRemarks: approveRemarks.trim() || "Approved by Refund Team",
      };
      const res = await api.post(`/refunds/${selectedRefund._id}/approve`, payload, header);
      setSelectedRefund(res.data.refund);
      setActiveActionModal(null);
      showToast("Refund approved! Ready for gateway processing.");
      fetchRefunds();
    } catch (err) {
      console.error("Approval error:", err);
      showToast(err.response?.data?.message || "Approval failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Step 5 & 6: Process Refund Through Gateway
  const handleProcessRefundGateway = async () => {
    if (!canProcessRefund) {
      showToast("Access denied. Only authorized Refund Team members can process refunds.", "error");
      return;
    }
    if (!window.confirm(`Are you sure you want to execute gateway payout of ₹${selectedRefund.approvedAmount || selectedRefund.refundAmount} for Order #${selectedRefund.orderCode}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.post(`/refunds/${selectedRefund._id}/process`, {}, header);
      setSelectedRefund(res.data.refund);
      showToast(`Gateway Refund confirmed! Reference ID: ${res.data.refund.gatewayRefundId}`);
      fetchRefunds();
    } catch (err) {
      console.error("Process refund error:", err);
      showToast(err.response?.data?.message || "Gateway refund processing failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Step 4 (Alt): Reject Refund
  const handleRejectRefund = async (e) => {
    e.preventDefault();
    if (!canProcessRefund) {
      showToast("Access denied. Customer Service Executives cannot reject refunds.", "error");
      return;
    }
    if (!rejectionReason.trim()) {
      showToast("Rejection reason is required.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.post(`/refunds/${selectedRefund._id}/reject`, { rejectionReason: rejectionReason.trim() }, header);
      setSelectedRefund(res.data.refund);
      setActiveActionModal(null);
      showToast("Refund rejected.");
      fetchRefunds();
    } catch (err) {
      console.error("Reject error:", err);
      showToast(err.response?.data?.message || "Rejection failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Step 4 (Alt): Request More Info
  const handleRequestMoreInfo = async (e) => {
    e.preventDefault();
    if (!canProcessRefund) {
      showToast("Access denied.", "error");
      return;
    }
    if (!moreInfoText.trim()) {
      showToast("Please state what info is needed.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.post(`/refunds/${selectedRefund._id}/request-info`, { notes: moreInfoText.trim() }, header);
      setSelectedRefund(res.data.refund);
      setActiveActionModal(null);
      showToast("Status updated to More Information Requested.");
      fetchRefunds();
    } catch (err) {
      console.error("More info error:", err);
      showToast(err.response?.data?.message || "Failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Step 4 (Alt): Escalate to Manager
  const handleEscalateRefund = async (e) => {
    e.preventDefault();
    if (!canProcessRefund) {
      showToast("Access denied.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.post(`/refunds/${selectedRefund._id}/escalate`, { escalationReason: escalateReason.trim() || "Manager review required" }, header);
      setSelectedRefund(res.data.refund);
      setActiveActionModal(null);
      showToast("Refund escalated to Manager.");
      fetchRefunds();
    } catch (err) {
      console.error("Escalate error:", err);
      showToast(err.response?.data?.message || "Failed to escalate.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Remarks System: Add Remark
  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!newRemarkText.trim()) return;
    setAddingRemark(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.post(`/refunds/${selectedRefund._id}/remarks`, {
        remarkType: newRemarkType,
        text: newRemarkText.trim(),
      }, header);
      setSelectedRefund((prev) => ({
        ...prev,
        remarksHistory: res.data.remarksHistory || prev.remarksHistory,
      }));
      setNewRemarkText("");
      showToast("Remark recorded.");
    } catch (err) {
      console.error("Add remark error:", err);
      showToast(err.response?.data?.message || "Failed to add remark.", "error");
    } finally {
      setAddingRemark(false);
    }
  };

  // Audit Logs Modal Opener
  const openAuditLogs = async (refundId = null) => {
    setLogsLoading(true);
    setActiveActionModal("auditLogs");
    try {
      const header = getEffectiveAuthHeader();
      const url = refundId ? `/refunds/audit-logs?refundId=${refundId}` : "/refunds/audit-logs";
      const res = await api.get(url, header);
      setAuditLogs(res.data.logs || []);
    } catch (err) {
      console.error("Audit logs error:", err);
      showToast(err.response?.data?.message || "Failed to load audit logs.", "error");
    } finally {
      setLogsLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.get("/refunds/analytics/export", {
        ...header,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `refund_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("CSV export downloaded successfully!");
    } catch (err) {
      console.error("Export CSV error:", err);
      showToast("Failed to export CSV.", "error");
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
      const rows = refunds.map((r) => ({
        "Refund ID": r.refundId,
        "Order Number": r.orderCode,
        "Customer Name": r.customerName,
        "Customer Email": r.customerEmail,
        "Refund Amount": r.refundAmount,
        "Approved Amount": r.approvedAmount || r.refundAmount,
        "Refund Type": r.refundType,
        "Payout Method": r.refundMethod,
        "Status": r.status,
        "Raised By": r.raisedByName,
        "Raised At": r.raisedAt ? new Date(r.raisedAt).toLocaleString() : "",
        "Processed By": r.processedByName || "N/A",
        "Gateway Ref": r.gatewayRefundId || "N/A",
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Refunds");
      XLSX.writeFile(workbook, `refunds_master_export_${Date.now()}.xlsx`);
      showToast("Excel export generated!");
    } catch (err) {
      console.error("Export Excel error:", err);
      showToast("Failed to generate Excel export.", "error");
    }
  };

  // Export PDF
  const handleExportPdf = () => {
    try {
      const doc = new jsPDF("landscape");
      doc.setFontSize(16);
      doc.text("Niyora Gifts - Refund Management & Audit Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()} | Total Records: ${refunds.length}`, 14, 22);

      const tableRows = refunds.map((r) => [
        r.refundId,
        r.orderCode,
        r.customerName,
        `₹${r.refundAmount}`,
        r.refundType,
        r.refundMethod,
        r.status,
        r.raisedByName,
        r.processedByName || "Pending",
        r.gatewayRefundId || "N/A",
      ]);

      doc.autoTable({
        head: [["Refund ID", "Order #", "Customer", "Amount", "Type", "Method", "Status", "Raised By", "Processed By", "Gateway Ref"]],
        body: tableRows,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [28, 28, 28] },
      });

      doc.save(`refunds_report_${Date.now()}.pdf`);
      showToast("PDF report downloaded!");
    } catch (err) {
      console.error("Export PDF error:", err);
      showToast("Failed to generate PDF.", "error");
    }
  };

  // Status Badge Formatter
  const renderStatusBadge = (status) => {
    switch (status) {
      case "PENDING_REFUND_REVIEW":
      case "Pending":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Pending Review</span>;
      case "REFUND_APPROVED":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Approved</span>;
      case "REFUND_PROCESSING":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 animate-pulse">Processing Gateway</span>;
      case "REFUNDED":
      case "Completed":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Refunded</span>;
      case "REJECTED":
      case "Failed":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Rejected</span>;
      case "MORE_INFO_REQUESTED":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">More Info</span>;
      case "ESCALATED_TO_MANAGER":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-600/10 text-red-600 dark:text-red-400 border border-red-600/20">Escalated</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-500/10 text-gray-600 border border-gray-500/20">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans text-gray-800 dark:text-gray-100">
      {/* Toast Feedback */}
      {toastMessage.text && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 border transition-all ${
            toastMessage.type === "error"
              ? "bg-rose-500 text-white border-rose-600"
              : "bg-emerald-600 text-white border-emerald-700"
          }`}
        >
          <span>{toastMessage.type === "error" ? "❌" : "✅"}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1C1C1C] border border-gold-900/10 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💳</span>
            <h2 className="text-xl font-bold font-serif text-gray-900 dark:text-white tracking-wide">
              Refund Approval & Gateway Settlement Desk
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enterprise separation of duties: Support agents raise requests; Refund Team verifies payments and executes gateway payouts.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => openAuditLogs()}
            className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>📜</span> Audit Logs
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>📄</span> CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>📊</span> Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 rounded-xl border border-rose-600/30 text-rose-700 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>📑</span> PDF
          </button>
          <button
            onClick={fetchRefunds}
            className="px-3.5 py-2 rounded-xl bg-[#1C1C1C] dark:bg-gold-500 text-white dark:text-black text-xs font-bold hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summaryMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-gray-800 shadow-xs">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Total Raised</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{summaryMetrics.totalRaised}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{summaryMetrics.totalAmountRequested}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-amber-500/20 shadow-xs">
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Pending Review</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{summaryMetrics.pendingCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Awaiting verification</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-blue-500/20 shadow-xs">
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Approved</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{summaryMetrics.approvedCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Rate: {summaryMetrics.approvalRate}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-emerald-500/20 shadow-xs">
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Completed Payouts</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{summaryMetrics.refundedCount}</p>
            <p className="text-[10px] text-emerald-500 font-bold mt-0.5">{summaryMetrics.totalAmountRefunded}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-rose-500/20 shadow-xs">
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">Rejected</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{summaryMetrics.rejectedCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Rate: {summaryMetrics.rejectionRate}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-gray-800 shadow-xs">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Avg Settlement Time</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{summaryMetrics.avgProcessingTimeHours}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Raised to Gateway Ref</p>
          </div>
        </div>
      )}

      {/* Queue Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-800 scrollbar-none">
          {QUEUE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveQueue(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeQueue === tab.id
                  ? "bg-gold-500 text-black shadow-sm"
                  : "bg-white dark:bg-[#1C1C1C] text-gray-600 dark:text-gray-400 hover:text-white border border-gray-200 dark:border-gray-800"
              }`}
            >
              <span>{tab.label}</span>
              {summaryMetrics && tab.countKey && summaryMetrics[tab.countKey] !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                  {summaryMetrics[tab.countKey]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by Refund ID (REF-2026-...), Order Code, Customer Name, Email, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 p-3 rounded-2xl bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-gray-800 text-xs font-medium focus:border-gold-500 outline-none"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-gold-500 hover:bg-gold-hover text-black font-bold text-xs transition cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Refund Requests Master Table */}
      <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-gray-500 animate-pulse">
            Loading refund requests queue...
          </div>
        ) : refunds.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <span className="text-3xl">📭</span>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No refund requests found in this queue.</p>
            <p className="text-xs text-gray-400">All customer refund requests raised by Customer Service Executives will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-black/30 border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Refund ID</th>
                  <th className="p-3.5">Order Reference</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Reason & Source</th>
                  <th className="p-3.5">Verification</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Raised By</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                {refunds.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition">
                    <td className="p-3.5 font-bold font-mono text-gold-600 dark:text-gold-400">
                      <button
                        onClick={() => openRefundDrawer(r._id)}
                        className="hover:underline cursor-pointer"
                      >
                        {r.refundId}
                      </button>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-gray-900 dark:text-white">#{r.orderCode}</p>
                      <p className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-gray-900 dark:text-white">{r.customerName}</p>
                      <p className="text-[10px] text-gray-400">{r.customerPhone || r.customerEmail || "N/A"}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-gray-900 dark:text-white">₹{r.refundAmount}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 text-gray-500 font-semibold">
                        {r.refundType}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <p className="truncate max-w-[140px] text-gray-700 dark:text-gray-300 font-semibold">{r.refundReason}</p>
                      <span className="text-[10px] text-gray-400">{r.source}</span>
                    </td>
                    <td className="p-3.5">
                      {r.paymentVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span>✓</span> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <span>⏳</span> Unverified
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">{renderStatusBadge(r.status)}</td>
                    <td className="p-3.5">
                      <p className="text-gray-700 dark:text-gray-300">{r.raisedByName || "Executive"}</p>
                      <p className="text-[10px] text-gray-400">{new Date(r.raisedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => openRefundDrawer(r._id)}
                        className="px-3 py-1.5 rounded-xl bg-gold-500/10 hover:bg-gold-500 text-gold-600 dark:text-gold-400 hover:text-black font-bold text-[11px] transition cursor-pointer"
                      >
                        Inspect Drawer →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          DETAILED INSPECTION & ACTION DRAWER
         ========================================================================= */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#171717] border-l border-gray-200 dark:border-gray-800 w-full max-w-2xl h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">💳</span>
                  <h3 className="text-lg font-bold font-serif text-gray-900 dark:text-white">
                    {selectedRefund.refundId}
                  </h3>
                  {renderStatusBadge(selectedRefund.status)}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Order #{selectedRefund.orderCode} • Raised via {selectedRefund.source} on {new Date(selectedRefund.raisedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedRefund(null)}
                className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Overview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Refund Amount</p>
                <p className="text-base font-bold text-gold-600 dark:text-gold-400 mt-0.5">₹{selectedRefund.refundAmount}</p>
                <p className="text-[10px] text-gray-400">{selectedRefund.refundType} Refund</p>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Order Value</p>
                <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">₹{selectedRefund.orderId?.totalPrice || 0}</p>
                <p className="text-[10px] text-gray-400">{selectedRefund.orderId?.paymentMethod || "Online"}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Customer</p>
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate mt-0.5">{selectedRefund.customerName}</p>
                <p className="text-[10px] text-gray-400 truncate">{selectedRefund.customerPhone || selectedRefund.customerEmail}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Payout Method</p>
                <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">{selectedRefund.refundMethod}</p>
                <p className="text-[10px] text-emerald-500 font-semibold">{selectedRefund.orderId?.paymentStatus || "Paid"}</p>
              </div>
            </div>

            {/* Gateway & Payment Details */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 space-y-2 text-xs">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>🔐</span> Payment Gateway Details
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-400">Payment ID: </span>
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                    {selectedRefund.orderId?.razorpayPaymentId || "Prepaid Direct"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Payment Status: </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedRefund.orderId?.paymentStatus || "Paid"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Gateway Refund ID: </span>
                  <span className="font-mono font-bold text-gold-600 dark:text-gold-400">
                    {selectedRefund.gatewayRefundId || "Pending Execution"}
                  </span>
                </div>
              </div>
            </div>

            {/* Executive Request Statement & Evidence */}
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2 text-xs">
              <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center justify-between">
                <span>🗣️ Customer Service Executive Statement</span>
                <span className="text-[10px] text-blue-500">Raised by {selectedRefund.raisedByName} ({selectedRefund.raisedByRole})</span>
              </h4>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Refund Reason:</strong> {selectedRefund.refundReason}
              </p>
              {selectedRefund.customerExplanation && (
                <p className="text-gray-600 dark:text-gray-400 italic">
                  &ldquo;{selectedRefund.customerExplanation}&rdquo;
                </p>
              )}
              {selectedRefund.executiveRemarks && (
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Executive Note:</strong> {selectedRefund.executiveRemarks}
                </p>
              )}
              {selectedRefund.supportingEvidence?.length > 0 && (
                <div className="pt-1">
                  <span className="font-bold text-gray-600 dark:text-gray-400">Supporting Evidence: </span>
                  {selectedRefund.supportingEvidence.map((ev, idx) => (
                    <a
                      key={idx}
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gold-500 hover:underline font-bold mr-2 text-[11px]"
                    >
                      Attachment #{idx + 1} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 3: REFUND TEAM PAYMENT & ELIGIBILITY VERIFICATION FORM */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <span>🛡️</span> Step 3: Refund Team Verification
                </h4>
                {selectedRefund.paymentVerified && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Verified by {selectedRefund.verifiedByName} on {new Date(selectedRefund.verifiedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveVerification} className="space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={paymentVerifiedCheck}
                      onChange={(e) => setPaymentVerifiedCheck(e.target.checked)}
                      className="rounded text-gold-500"
                    />
                    <span>Payment successfully received & confirmed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={eligibilityCheck}
                      onChange={(e) => setEligibilityCheck(e.target.checked)}
                      className="rounded text-gold-500"
                    />
                    <span>Order eligibility confirmed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={fraudCheck}
                      onChange={(e) => setFraudCheck(e.target.checked)}
                      className="rounded text-gold-500"
                    />
                    <span>Fraud checks passed (no flags)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={duplicateCheck}
                      onChange={(e) => setDuplicateCheck(e.target.checked)}
                      className="rounded text-gold-500"
                    />
                    <span>Duplicate refund checks passed</span>
                  </label>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Payment verification notes (e.g. Verified with Razorpay dashboard, valid claim)..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyingPayment || !canProcessRefund}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {verifyingPayment ? "Saving Verification..." : "Save Payment Verification"}
                </button>
              </form>
            </div>

            {/* STEP 4 & 5: ACTION CENTER & GATEWAY PROCESSOR */}
            <div className="p-4 rounded-2xl bg-white dark:bg-black/30 border border-gray-200 dark:border-gray-800 space-y-3 text-xs">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>⚡</span> Step 4 & 5: Refund Execution
              </h4>

              {selectedRefund.status === "REFUNDED" ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-1">
                  <p className="text-sm font-bold flex items-center gap-1.5">
                    <span>✅</span> Refund Completed via Gateway
                  </p>
                  <p className="text-xs">
                    <strong>Gateway Reference ID:</strong> <span className="font-mono">{selectedRefund.gatewayRefundId}</span>
                  </p>
                  <p className="text-xs">
                    <strong>Processed By:</strong> {selectedRefund.processedByName} • <strong>Processing Time:</strong> {selectedRefund.processingTimeMs}ms
                  </p>
                </div>
              ) : selectedRefund.status === "REFUND_APPROVED" ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
                    ℹ️ <strong>Status: REFUND_APPROVED.</strong> Approved by {selectedRefund.approvedByName} for ₹{selectedRefund.approvedAmount || selectedRefund.refundAmount}. Click below to connect to the payment gateway and execute settlement.
                  </div>
                  <button
                    onClick={handleProcessRefundGateway}
                    disabled={actionLoading || !canProcessRefund}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer disabled:opacity-50 animate-float"
                  >
                    {actionLoading ? "Processing through Gateway..." : "⚡ PROCESS REFUND (Connect to Payment Gateway)"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveActionModal("approve")}
                    disabled={!canProcessRefund}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    ✓ Approve Refund
                  </button>
                  <button
                    onClick={() => setActiveActionModal("reject")}
                    disabled={!canProcessRefund}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    ✕ Reject Refund
                  </button>
                  <button
                    onClick={() => setActiveActionModal("requestInfo")}
                    disabled={!canProcessRefund}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer disabled:opacity-50"
                  >
                    More Info
                  </button>
                  <button
                    onClick={() => setActiveActionModal("escalate")}
                    disabled={!canProcessRefund}
                    className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    Escalate to Manager
                  </button>
                </div>
              )}
            </div>

            {/* REFUND REMARKS SYSTEM */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <span>📝</span> Refund Remarks History (Append-Only)
                </h4>
                <span className="text-[10px] text-gray-400">{selectedRefund.remarksHistory?.length || 0} remarks logged</span>
              </div>

              {/* Add Remark Form */}
              <form onSubmit={handleAddRemark} className="p-3 rounded-2xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <select
                    value={newRemarkType}
                    onChange={(e) => setNewRemarkType(e.target.value)}
                    className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-xs"
                  >
                    {REMARK_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Add a permanent verification note or investigation detail..."
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    className="flex-1 p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={addingRemark}
                    className="px-4 py-2 rounded-xl bg-[#1C1C1C] dark:bg-gold-500 text-white dark:text-black font-bold text-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                  >
                    {addingRemark ? "Adding..." : "Add Remark"}
                  </button>
                </div>
              </form>

              {/* Remarks List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedRefund.remarksHistory?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No remarks recorded yet.</p>
                ) : (
                  selectedRefund.remarksHistory?.map((rem, idx) => (
                    <div
                      key={rem.remarkId || idx}
                      className="p-3 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-gold-600 dark:text-gold-400 uppercase tracking-wider">
                          [{rem.remarkType}]
                        </span>
                        <span className="text-gray-400">
                          {new Date(rem.timestamp).toLocaleString()} • {rem.authorName} ({rem.authorRole})
                        </span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 font-medium">{rem.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CHRONOLOGICAL TIMELINE */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs">
                <span>⏱️</span> Refund Lifecycle Timeline
              </h4>
              <div className="relative pl-6 space-y-4 border-l-2 border-gold-500/40 ml-2">
                {selectedRefund.timeline?.map((ev, idx) => (
                  <div key={idx} className="relative text-xs">
                    <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-gold-500 ring-4 ring-white dark:ring-[#171717]" />
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900 dark:text-white">{ev.event}</p>
                      <span className="text-[10px] text-gray-400">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {ev.note && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{ev.note}</p>}
                    <p className="text-[9px] text-gray-400">{ev.actorName} ({ev.actorRole})</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ACTION SUB-MODALS (Approve, Reject, More Info, Escalate)
         ========================================================================= */}
      {activeActionModal === "approve" && selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>✅</span> Approve Refund #{selectedRefund.refundId}
            </h3>
            <form onSubmit={handleApproveRefund} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Approved Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedRefund.refundAmount}
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Refund Method *</label>
                <select
                  value={approveMethod}
                  onChange={(e) => setApproveMethod(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold"
                >
                  <option value="Original Source">Original Source ({selectedRefund.orderId?.paymentMethod || "Online"})</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Store Credit">Store Credit</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Approval Remarks</label>
                <textarea
                  rows={2}
                  value={approveRemarks}
                  onChange={(e) => setApproveRemarks(e.target.value)}
                  placeholder="Verification confirmed, authorized for gateway processing..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Approving..." : "Confirm Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeActionModal === "reject" && selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
              <span>✕</span> Reject Refund #{selectedRefund.refundId}
            </h3>
            <form onSubmit={handleRejectRefund} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Rejection Reason *</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="State the official audit reason for rejection (e.g. Duplicate claim, item already returned and settled, warranty expired)..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeActionModal === "requestInfo" && selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>❓</span> Request More Information
            </h3>
            <form onSubmit={handleRequestMoreInfo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Information Required *</label>
                <textarea
                  rows={3}
                  value={moreInfoText}
                  onChange={(e) => setMoreInfoText(e.target.value)}
                  placeholder="Specify photos, proof of purchase, or bank statement needed from the customer..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  Submit Query
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeActionModal === "escalate" && selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-red-500 flex items-center gap-2">
              <span>🚨</span> Escalate Refund to Manager
            </h3>
            <form onSubmit={handleEscalateRefund} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Escalation Justification</label>
                <textarea
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Explain why this requires senior managerial intervention (e.g. VIP account, policy exception, disputed gateway chargeback)..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  Confirm Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          AUDIT LOGS MODAL (Immutable Compliance Audit Trail)
         ========================================================================= */}
      {activeActionModal === "auditLogs" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200 dark:border-gray-800 max-w-4xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📜</span> Immutable Refund Audit Trail
              </h3>
              <button
                onClick={() => setActiveActionModal(null)}
                className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {logsLoading ? (
              <p className="text-center p-8 text-xs font-semibold text-gray-400">Loading audit logs...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-center p-8 text-xs text-gray-400">No audit logs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-black/30 border-b border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase">
                    <tr>
                      <th className="p-2.5">Timestamp</th>
                      <th className="p-2.5">Employee</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Refund ID</th>
                      <th className="p-2.5">Order #</th>
                      <th className="p-2.5">IP Address</th>
                      <th className="p-2.5">Device</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                    {auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td className="p-2.5 text-[11px] text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-2.5 font-bold text-gray-900 dark:text-white">{log.employeeName}</td>
                        <td className="p-2.5 text-[11px]">{log.role}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 font-mono text-[10px] font-bold">
                            {log.actionPerformed}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-gold-500 font-bold">{log.refundId}</td>
                        <td className="p-2.5">#{log.orderNumber}</td>
                        <td className="p-2.5 font-mono text-[10px]">{log.ipAddress}</td>
                        <td className="p-2.5 text-[11px] text-gray-400">{log.device}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
