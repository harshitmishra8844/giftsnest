import { useState, useEffect } from "react";
import api from "../services/api";
import {
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Download,
  RotateCcw,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  ShoppingCart,
  Headphones,
  Bell,
  Archive,
  Lock,
  Layers,
  FileSpreadsheet
} from "lucide-react";

export default function ProductionCleanupTab({ authHeader, adminAuth }) {
  const [activeSubTab, setActiveSubTab] = useState("preview"); // 'preview', 'backup', 'execute', 'rollback'
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [executing, setExecuting] = useState(false);
  const [report, setReport] = useState(null);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [rollbackInput, setRollbackInput] = useState("");
  const [rollingBack, setRollingBack] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchPreview = async () => {
    try {
      setLoadingPreview(true);
      setError("");
      const { data } = await api.get("/admin/cleanup/preview", authHeader);
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load database cleanup preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      const { data } = await api.get("/admin/cleanup/backups", authHeader);
      setBackups(data || []);
    } catch (err) {
      console.error("Failed to load backups:", err);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    fetchPreview();
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      setError("");
      setSuccess("");
      const { data } = await api.post("/admin/cleanup/backup", {}, authHeader);
      setSuccess(`Full database backup created successfully: ${data.backup?.backupId}`);
      fetchBackups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create full backup");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleExecuteCleanup = async () => {
    if (confirmationInput !== "CONFIRM_PRODUCTION_CLEANUP") {
      setError("You must type 'CONFIRM_PRODUCTION_CLEANUP' exactly to proceed.");
      return;
    }
    try {
      setExecuting(true);
      setError("");
      setSuccess("");
      const { data } = await api.post(
        "/admin/cleanup/execute",
        { confirmation: confirmationInput },
        authHeader
      );
      setReport(data.report);
      setSuccess("Production cleanup completed successfully! A complete backup was generated before deletion.");
      setConfirmationInput("");
      fetchPreview();
      fetchBackups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to execute production cleanup");
    } finally {
      setExecuting(false);
    }
  };

  const handleRollback = async (backupId) => {
    if (rollbackInput !== "RESTORE_DATABASE") {
      setError("You must type 'RESTORE_DATABASE' to confirm restoration.");
      return;
    }
    try {
      setRollingBack(true);
      setError("");
      setSuccess("");
      const { data } = await api.post(
        "/admin/cleanup/rollback",
        { backupId, confirmation: rollbackInput },
        authHeader
      );
      setSuccess(data.message || `Database successfully restored from ${backupId}`);
      setRollbackTarget(null);
      setRollbackInput("");
      fetchPreview();
    } catch (err) {
      setError(err.response?.data?.message || "Rollback failed");
    } finally {
      setRollingBack(false);
    }
  };

  const downloadExportFile = (type, backupId) => {
    const token = adminAuth?.token || localStorage.getItem("adminToken");
    const baseUrl = api.defaults.baseURL || "/api";
    const url = `${baseUrl}/admin/cleanup/download-export?type=${type}${backupId ? `&backupId=${backupId}` : ""}`;
    
    // Trigger download using hidden anchor with auth header or window open
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error("File not found or unauthorized");
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = window.URL.createObjectURL(blob);
        a.download = `${type}_${Date.now()}.${type.endsWith("csv") ? "csv" : "json"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => {
        setError(`Download failed: ${err.message}`);
      });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Production Pre-Launch Cleanup Tool</h2>
                <span className="bg-red-500/20 text-red-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-red-500/30">
                  Master Admin Restricted
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1">
                Safely purge all development, test, and demo data before launch while guaranteeing full preservation of configurations, catalog, and the Master Admin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Master Admin Safe: {preview?.masterAdminEmail || "niyoragifts@gmail.com"}</span>
            </div>
            <button
              onClick={() => {
                fetchPreview();
                fetchBackups();
              }}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subtab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSubTab("preview")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeSubTab === "preview"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            Preview & Audit
          </button>
          <button
            onClick={() => setActiveSubTab("backup")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeSubTab === "backup"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Database className="w-4 h-4" />
            Safety Backups & Pre-Exports
          </button>
          <button
            onClick={() => setActiveSubTab("execute")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeSubTab === "execute"
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-300" />
            Execute Cleanup
          </button>
          <button
            onClick={() => setActiveSubTab("rollback")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeSubTab === "rollback"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Rollback & Restore ({backups.length})
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">{error}</div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">{success}</div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* SUBTAB 1: PREVIEW */}
      {activeSubTab === "preview" && (
        <div className="space-y-6">
          {loadingPreview ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Scanning all database collections and classifying records...</p>
            </div>
          ) : (
            <>
              {/* Total Summary Stat */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Marked For Purging</span>
                    <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-2">
                    {preview?.totalToDelete?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Non-production records & logs identified</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Preserved Production Entities</span>
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-2">
                    {preview?.preservedData?.productsCount} Products · {preview?.preservedData?.realUsersCount} Customers
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Catalog, configurations & real accounts preserved</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Master Admin Status</span>
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Lock className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Locked & Protected</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{preview?.masterAdminEmail}</p>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Detailed Purge Breakdown by Operational Category
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <ShoppingCart className="w-4 h-4 text-rose-500" />
                      Orders & Fulfillment
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {preview?.toDeleteSummary?.orders || 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Test orders, failed payments, replacement orders</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <Users className="w-4 h-4 text-rose-500" />
                      Test Customer Accounts
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {preview?.toDeleteSummary?.testCustomers || 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">@test.com, demo buyers, test profiles</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <Headphones className="w-4 h-4 text-rose-500" />
                      Support & Enquiries
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {preview?.toDeleteSummary?.supportEnquiries || 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Tickets, messages, notes, callback requests</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <RotateCcw className="w-4 h-4 text-rose-500" />
                      Returns & Refunds
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {preview?.toDeleteSummary?.returnsRefunds || 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Return requests, refund records, audit logs</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <Archive className="w-4 h-4 text-rose-500" />
                      Store Credit Test Ledger
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {preview?.toDeleteSummary?.storeCreditRecords || 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Accounts, transactions, reservations, logs</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <Bell className="w-4 h-4 text-rose-500" />
                      Notifications & Transcripts
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {preview?.toDeleteSummary?.notificationsAndLogs || 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Emails, SMS, push logs, notification history</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <FileText className="w-4 h-4 text-rose-500" />
                      System & Login Logs
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {preview?.toDeleteSummary?.systemLogs || 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Activity logs, login history, employee logs</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <Database className="w-4 h-4 text-rose-500" />
                      Coupons, Carts & Uploads
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {(preview?.toDeleteSummary?.testCoupons || 0) +
                        (preview?.toDeleteSummary?.wishlistsAndCarts || 0) +
                        (preview?.toDeleteSummary?.tempUploads || 0)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Test discount codes, lingering carts, temp files</p>
                  </div>
                </div>

                {/* Preserved Data List */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Verified Production Records To Be Strictly Preserved
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-xl">
                      <span className="font-semibold text-emerald-900">Product Catalog:</span>
                      <p className="text-slate-600 mt-0.5">{preview?.preservedData?.productsCount} Active Products</p>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-xl">
                      <span className="font-semibold text-emerald-900">Enterprise Roles:</span>
                      <p className="text-slate-600 mt-0.5">{preview?.preservedData?.rolesCount} System Roles</p>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-xl">
                      <span className="font-semibold text-emerald-900">CMS & Content:</span>
                      <p className="text-slate-600 mt-0.5">{preview?.preservedData?.cmsCount} Homepage Sections</p>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-xl">
                      <span className="font-semibold text-emerald-900">SLA & Workflows:</span>
                      <p className="text-slate-600 mt-0.5">{preview?.preservedData?.slaPoliciesCount} SLA Policies</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB 2: BACKUPS & PRE-EXPORTS */}
      {activeSubTab === "backup" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  Pre-Cleanup Safety Snapshot & Standalone Data Exports
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Create a point-in-time full database backup and download customer and order archives in JSON and CSV formats.
                </p>
              </div>

              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition shadow-md shadow-indigo-600/20"
              >
                {creatingBackup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {creatingBackup ? "Creating Full Backup..." : "Create Full Backup Now"}
              </button>
            </div>

            {/* Standalone Export Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-200">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Customer Data Export
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Export all customer accounts, emails & profiles</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadExportFile("customers_csv")}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    CSV
                  </button>
                  <button
                    onClick={() => downloadExportFile("customers_json")}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    JSON
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-indigo-600" />
                    Order Records Export
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Export all order codes, totals, and payment records</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadExportFile("orders_csv")}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    CSV
                  </button>
                  <button
                    onClick={() => downloadExportFile("orders_json")}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    JSON
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Backup History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Available Database Backups</h4>
              <span className="text-xs text-slate-500">{backups.length} snapshots available</span>
            </div>

            {loadingBackups ? (
              <div className="p-8 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-xs">Loading backup directory...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No database backups created yet. Click "Create Full Backup Now" above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Backup ID</th>
                      <th className="px-5 py-3">Created At</th>
                      <th className="px-5 py-3">Collections</th>
                      <th className="px-5 py-3">Total Documents</th>
                      <th className="px-5 py-3">Uploads Included</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {backups.map((b) => (
                      <tr key={b.backupId} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">{b.backupId}</td>
                        <td className="px-5 py-3.5">{b.timestamp ? new Date(b.timestamp).toLocaleString() : "N/A"}</td>
                        <td className="px-5 py-3.5">{b.totalCollections || Object.keys(b.collectionCounts || {}).length} collections</td>
                        <td className="px-5 py-3.5 font-semibold text-indigo-600">{b.totalDocuments?.toLocaleString() || "N/A"}</td>
                        <td className="px-5 py-3.5">
                          {b.hasUploadsBackup ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setActiveSubTab("rollback");
                              setRollbackTarget(b.backupId);
                            }}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: EXECUTE CLEANUP */}
      {activeSubTab === "execute" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Execute Pre-Launch Production Cleanup</h3>
                <p className="text-slate-600 text-sm mt-1">
                  This operation will permanently purge all test orders, fake customer accounts, test support tickets, test return requests, test notifications, and test logs.
                </p>

                <div className="mt-4 p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>An automated, complete database backup will be created immediately before any deletion begins.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>The Master Admin account ({preview?.masterAdminEmail}) is locked and cannot be deleted or modified.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>All 18 products in the catalog, categories, images, and website settings will remain 100% untouched.</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Type <span className="font-mono text-rose-600 select-all">CONFIRM_PRODUCTION_CLEANUP</span> to authorize:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      value={confirmationInput}
                      onChange={(e) => setConfirmationInput(e.target.value)}
                      placeholder="CONFIRM_PRODUCTION_CLEANUP"
                      className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                    <button
                      onClick={handleExecuteCleanup}
                      disabled={confirmationInput !== "CONFIRM_PRODUCTION_CLEANUP" || executing}
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
                    >
                      {executing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      {executing ? "Sanitizing Database..." : "Purge Test Data Now"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Post-Execution Report */}
          {report && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg p-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Cleanup Execution Summary Report</h4>
                  <p className="text-xs text-slate-500">
                    Backup ID: <span className="font-mono font-semibold text-slate-700">{report.backupId}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500">Orders Deleted:</span>
                  <div className="text-lg font-bold text-slate-900 mt-1">{report.deleted?.orders || 0}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500">Test Users Purged:</span>
                  <div className="text-lg font-bold text-slate-900 mt-1">{report.deleted?.testCustomerAccounts || 0}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500">Support Enquiries:</span>
                  <div className="text-lg font-bold text-slate-900 mt-1">{report.deleted?.supportAndEnquiries || 0}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500">Notifications Cleared:</span>
                  <div className="text-lg font-bold text-slate-900 mt-1">{report.deleted?.notifications || 0}</div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">Production Status:</span> System is 100% clean and ready for real customer traffic.
                </div>
                <button
                  onClick={() => setActiveSubTab("preview")}
                  className="px-3 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                >
                  View Updated Audit
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: ROLLBACK & RESTORE */}
      {activeSubTab === "rollback" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <RotateCcw className="w-5 h-5 text-indigo-600" />
              Emergency Rollback & Point-in-Time Database Restoration
            </h3>
            <p className="text-slate-500 text-xs">
              If any unexpected issue occurs after cleanup, you can restore all collections and files back to their exact state from any saved snapshot.
            </p>

            {rollbackTarget && (
              <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Confirm Restoration from Snapshot: <span className="font-mono">{rollbackTarget}</span>
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      This will replace existing records with the documents saved inside this snapshot.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-200/80">
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                    Type <span className="font-mono text-amber-800 select-all">RESTORE_DATABASE</span> to execute rollback:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={rollbackInput}
                      onChange={(e) => setRollbackInput(e.target.value)}
                      placeholder="RESTORE_DATABASE"
                      className="px-4 py-2 border border-amber-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => handleRollback(rollbackTarget)}
                      disabled={rollbackInput !== "RESTORE_DATABASE" || rollingBack}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                    >
                      {rollingBack ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      {rollingBack ? "Restoring..." : "Restore Snapshot"}
                    </button>
                    <button
                      onClick={() => {
                        setRollbackTarget(null);
                        setRollbackInput("");
                      }}
                      className="px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of snapshots */}
            <div className="mt-6 space-y-3">
              {backups.map((b) => (
                <div
                  key={b.backupId}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between transition"
                >
                  <div>
                    <div className="font-mono font-bold text-slate-900 text-sm">{b.backupId}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Created: {b.timestamp ? new Date(b.timestamp).toLocaleString() : "Unknown"} · Documents: {b.totalDocuments?.toLocaleString() || "N/A"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setRollbackTarget(b.backupId);
                      setRollbackInput("");
                    }}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Select to Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
