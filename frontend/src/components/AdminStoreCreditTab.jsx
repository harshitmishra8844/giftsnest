import { useState, useEffect } from "react";
import api from "../services/api";
import {
  Wallet,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileText,
  User,
  History,
  TrendingUp,
} from "lucide-react";

export default function AdminStoreCreditTab({ authHeader, adminAuth, onOpenCustomerDrawer }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected account for ledger inspection
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedAccountDetails, setSelectedAccountDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Manual Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustType, setAdjustType] = useState("CREDIT"); // "CREDIT" or "DEBIT"
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustExpiresInDays, setAdjustExpiresInDays] = useState("365");
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Freeze/Unfreeze Modal
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeTarget, setFreezeTarget] = useState(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [submittingFreeze, setSubmittingFreeze] = useState(false);

  // Expiry Worker Trigger
  const [runningWorker, setRunningWorker] = useState(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/store-credit/admin/accounts", authHeader);
      if (data?.success) {
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error("Failed to load store credit accounts:", err);
      setError(err.response?.data?.message || "Failed to load store credit accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccountDetails = async (customerId) => {
    try {
      setLoadingDetails(true);
      const { data } = await api.get(`/store-credit/admin/accounts/${customerId}`, authHeader);
      if (data?.success) {
        setSelectedAccountDetails(data);
      }
    } catch (err) {
      console.error("Failed to fetch customer credit details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenAdjust = (account) => {
    setAdjustTarget(account);
    setAdjustType("CREDIT");
    setAdjustAmount("");
    setAdjustReason("");
    setAdjustExpiresInDays("365");
    setAdjustModalOpen(true);
  };

  const handleOpenFreeze = (account) => {
    setFreezeTarget(account);
    setFreezeReason("");
    setFreezeModalOpen(true);
  };

  const handleInspectAccount = (account) => {
    setSelectedAccount(account);
    fetchAccountDetails(account.customer?._id || account.customerId);
  };

  const submitManualAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustReason.trim()) {
      setError("A detailed reason is mandatory for manual credit adjustments.");
      return;
    }
    const amtNum = Number(adjustAmount);
    if (!amtNum || amtNum <= 0) {
      setError("Please specify a valid positive amount.");
      return;
    }

    const finalAmount = adjustType === "DEBIT" ? -Math.abs(amtNum) : Math.abs(amtNum);
    const customerId = adjustTarget.customer?._id || adjustTarget.customerId;

    try {
      setSubmittingAdjust(true);
      setError("");
      setSuccess("");

      const { data } = await api.post(
        `/store-credit/admin/accounts/${customerId}/adjust`,
        {
          amount: finalAmount,
          reason: adjustReason.trim(),
          expiresInDays: adjustType === "CREDIT" ? Number(adjustExpiresInDays) || 365 : null,
        },
        authHeader
      );

      setSuccess(`Store Credit adjusted successfully: ${data?.message || "Updated"}`);
      setAdjustModalOpen(false);
      fetchAccounts();
      if (selectedAccount && (selectedAccount.customer?._id === customerId || selectedAccount.customerId === customerId)) {
        fetchAccountDetails(customerId);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process manual adjustment");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const submitFreezeToggle = async (e) => {
    e.preventDefault();
    const customerId = freezeTarget.customer?._id || freezeTarget.customerId;
    const isCurrentlyFrozen = freezeTarget.status === "Frozen";
    const endpoint = isCurrentlyFrozen ? "unfreeze" : "freeze";

    try {
      setSubmittingFreeze(true);
      setError("");
      setSuccess("");

      const { data } = await api.post(
        `/store-credit/admin/accounts/${customerId}/${endpoint}`,
        { reason: freezeReason.trim() || (isCurrentlyFrozen ? "Account unfrozen by administrator" : "Account frozen by administrator") },
        authHeader
      );

      setSuccess(`Account status updated: ${data?.message || "Success"}`);
      setFreezeModalOpen(false);
      fetchAccounts();
      if (selectedAccount && (selectedAccount.customer?._id === customerId || selectedAccount.customerId === customerId)) {
        fetchAccountDetails(customerId);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update account freeze status");
    } finally {
      setSubmittingFreeze(false);
    }
  };

  const handleRunExpiryWorker = async () => {
    if (!window.confirm("Run the Store Credit Expiry & Notification dispatch worker now?")) return;
    try {
      setRunningWorker(true);
      setError("");
      setSuccess("");
      const { data } = await api.post("/store-credit/admin/run-expiry-worker", {}, authHeader);
      setSuccess(`Expiry Worker Executed: ${data.expiredCount || 0} credits expired, ${data.remindersSent || 0} alerts dispatched.`);
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to trigger expiry worker");
    } finally {
      setRunningWorker(false);
    }
  };

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (statusFilter !== "ALL" && acc.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = acc.customer?.name?.toLowerCase() || "";
      const email = acc.customer?.email?.toLowerCase() || "";
      const phone = acc.customer?.mobileNumber?.toLowerCase() || "";
      return name.includes(q) || email.includes(q) || phone.includes(q);
    }
    return true;
  });

  // KPI Calculations
  const totalOutstanding = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalReserved = accounts.reduce((sum, a) => sum + (a.reservedBalance || 0), 0);
  const frozenCount = accounts.filter((a) => a.status === "Frozen").length;

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#1C1C1C] border border-gold-200/20 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
              Admin &bull; Financial Ledger
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gold-50 text-gold-800 border border-gold-200 uppercase">
              Zero-Negative Firewall
            </span>
          </div>
          <h2 className="text-xl font-serif font-bold text-luxury-black dark:text-white mt-1">
            Store Credit Management Console
          </h2>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5 font-light">
            Monitor customer balances, process audited manual adjustments, freeze accounts, and run expiry tasks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-champagne text-xs font-semibold text-luxury-black dark:text-white hover:bg-gold-50/60 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gold-600 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleRunExpiryWorker}
            disabled={runningWorker}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-luxury-black text-white hover:bg-gold-500 text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Clock className={`w-3.5 h-3.5 text-gold-400 ${runningWorker ? "animate-spin" : ""}`} />
            <span>{runningWorker ? "Processing..." : "Run Expiry Worker"}</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-gold-200/20 bg-white dark:bg-[#1C1C1C] p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Total Outstanding Balance
          </span>
          <p className="text-2xl font-serif font-bold text-luxury-black dark:text-white mt-1">
            ₹{formatCurrency(totalOutstanding)}
          </p>
          <p className="text-[11px] text-text-secondary mt-1 font-light">
            Spendable customer credit in circulation.
          </p>
        </div>

        <div className="rounded-3xl border border-gold-200/20 bg-white dark:bg-[#1C1C1C] p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
            In Checkout Reservations
          </span>
          <p className="text-2xl font-serif font-bold text-amber-700 mt-1">
            ₹{formatCurrency(totalReserved)}
          </p>
          <p className="text-[11px] text-text-secondary mt-1 font-light">
            Held during active payment gateways.
          </p>
        </div>

        <div className="rounded-3xl border border-gold-200/20 bg-white dark:bg-[#1C1C1C] p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Total Customer Accounts
          </span>
          <p className="text-2xl font-serif font-bold text-luxury-black dark:text-white mt-1">
            {accounts.length}
          </p>
          <p className="text-[11px] text-text-secondary mt-1 font-light">
            {accounts.filter((a) => a.balance > 0).length} accounts with balance &gt; ₹0.
          </p>
        </div>

        <div className="rounded-3xl border border-gold-200/20 bg-white dark:bg-[#1C1C1C] p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
            Frozen / Suspended Accounts
          </span>
          <p className="text-2xl font-serif font-bold text-rose-700 mt-1">
            {frozenCount}
          </p>
          <p className="text-[11px] text-text-secondary mt-1 font-light">
            Spending blocked by security policy.
          </p>
        </div>
      </div>

      {/* Main Table + Inspector Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts List Table */}
        <div className={`${selectedAccount ? "lg:col-span-2" : "lg:col-span-3"} bg-white dark:bg-[#1C1C1C] border border-gold-200/20 rounded-3xl p-6 shadow-sm space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gold-200/10 pb-4">
            <div>
              <h3 className="text-base font-serif font-bold text-luxury-black dark:text-white">
                Customer Store Credit Wallets ({filteredAccounts.length})
              </h3>
              <p className="text-xs text-text-secondary font-light">
                Click any row to inspect historical transaction ledger.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-full border border-champagne bg-white dark:bg-[#252525] text-luxury-black dark:text-white focus:outline-none focus:border-gold-500 w-44"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-3 text-xs rounded-full border border-champagne bg-white dark:bg-[#252525] text-luxury-black dark:text-white focus:outline-none focus:border-gold-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Frozen">Frozen</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 text-gold-600 animate-spin" />
              <span>Loading ledger accounts...</span>
            </div>
          ) : filteredAccounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase font-bold text-text-secondary tracking-wider border-b border-gold-200/15">
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Available</th>
                    <th className="py-2.5 px-3 text-right">Reserved</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-200/10">
                  {filteredAccounts.map((acc) => {
                    const isSelected = selectedAccount?._id === acc._id;
                    const custName = acc.customer?.name || "Customer";
                    const custEmail = acc.customer?.email || "No email";
                    const isFrozen = acc.status === "Frozen";

                    return (
                      <tr
                        key={acc._id}
                        className={`hover:bg-gold-50/20 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                          isSelected ? "bg-gold-50/30 dark:bg-gold-500/10" : ""
                        }`}
                        onClick={() => handleInspectAccount(acc)}
                      >
                        <td className="py-3 px-3">
                          <p className="font-semibold text-luxury-black dark:text-white">{custName}</p>
                          <p className="text-[10px] text-text-secondary font-mono">{custEmail}</p>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              isFrozen
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            {acc.status}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-luxury-black dark:text-white">
                          ₹{formatCurrency(acc.balance)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-amber-700">
                          ₹{formatCurrency(acc.reservedBalance)}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleOpenAdjust(acc)}
                              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-700 hover:text-gold-900 border border-gold-300 rounded-full hover:bg-gold-50 transition cursor-pointer"
                              title="Manual Credit / Debit"
                            >
                              Adjust
                            </button>

                            <button
                              onClick={() => handleOpenFreeze(acc)}
                              className={`p-1.5 rounded-full border transition cursor-pointer ${
                                isFrozen
                                  ? "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                  : "text-rose-700 border-rose-300 hover:bg-rose-50"
                              }`}
                              title={isFrozen ? "Unfreeze Account" : "Freeze Account"}
                            >
                              {isFrozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-text-secondary font-light">
              No store credit accounts found matching filter.
            </div>
          )}
        </div>

        {/* Selected Customer Ledger Drawer / Detail Pane */}
        {selectedAccount && (
          <div className="lg:col-span-1 bg-white dark:bg-[#1C1C1C] border border-gold-200/20 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gold-200/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
                  Account Ledger
                </span>
                <h4 className="text-base font-serif font-bold text-luxury-black dark:text-white mt-0.5">
                  {selectedAccount.customer?.name}
                </h4>
                <p className="text-[10px] text-text-secondary font-mono">
                  {selectedAccount.customer?.email}
                </p>
              </div>

              <button
                onClick={() => setSelectedAccount(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Balances Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-gold-50/20 border border-gold-200/40">
                <span className="text-[9px] uppercase font-bold text-text-secondary block">Available</span>
                <p className="font-serif font-bold text-base text-luxury-black dark:text-white mt-0.5">
                  ₹{formatCurrency(selectedAccount.balance)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/20 border border-amber-200/40">
                <span className="text-[9px] uppercase font-bold text-amber-900 block">Reserved</span>
                <p className="font-serif font-bold text-base text-amber-800 mt-0.5">
                  ₹{formatCurrency(selectedAccount.reservedBalance)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenAdjust(selectedAccount)}
                className="flex-1 py-2 rounded-full bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer text-center"
              >
                + / - Adjust
              </button>
              <button
                onClick={() => handleOpenFreeze(selectedAccount)}
                className={`py-2 px-4 rounded-full text-xs font-bold uppercase tracking-wider border transition cursor-pointer ${
                  selectedAccount.status === "Frozen"
                    ? "border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                    : "border-rose-400 text-rose-700 hover:bg-rose-50"
                }`}
              >
                {selectedAccount.status === "Frozen" ? "Unfreeze" : "Freeze"}
              </button>
            </div>

            {/* Transactions History */}
            <div className="space-y-3">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-luxury-black dark:text-white flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-gold-600" />
                Ledger Entries ({selectedAccountDetails?.transactions?.length || 0})
              </h5>

              {loadingDetails ? (
                <div className="py-8 text-center text-xs text-text-secondary animate-pulse">
                  Loading ledger entries...
                </div>
              ) : selectedAccountDetails?.transactions && selectedAccountDetails.transactions.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {selectedAccountDetails.transactions.map((tx) => (
                    <div
                      key={tx._id || tx.transactionId}
                      className="p-3 rounded-2xl border border-champagne/30 bg-white dark:bg-[#252525] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-luxury-black dark:text-white">
                          {tx.transactionId}
                        </span>
                        <span
                          className={`font-mono font-bold text-xs ${
                            tx.transactionType === "CREDIT" || (tx.transactionType === "MANUAL_ADJUSTMENT" && tx.amount > 0)
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}₹{formatCurrency(tx.amount)}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary font-light">{tx.description}</p>
                      <div className="flex justify-between items-center text-[9px] text-gray-400 pt-1 border-t border-champagne/15">
                        <span>{new Date(tx.createdAt).toLocaleString("en-IN")}</span>
                        <span>Bal: ₹{formatCurrency(tx.balanceAfter)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary font-light italic">No ledger records found.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual Adjustment Modal */}
      {adjustModalOpen && adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 shadow-2xl max-w-md w-full p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gold-200/20 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
                  Audited Financial Action
                </span>
                <h3 className="text-lg font-serif font-bold text-luxury-black dark:text-white mt-0.5">
                  Manual Store Credit Adjustment
                </h3>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-gold-50/20 border border-gold-200/40 text-xs">
              <span className="text-[10px] uppercase text-text-secondary block">Customer Target</span>
              <strong className="text-luxury-black dark:text-white text-sm">
                {adjustTarget.customer?.name} ({adjustTarget.customer?.email})
              </strong>
              <div className="mt-1 text-gray-500">
                Current Available: <span className="font-mono font-bold text-luxury-black">₹{formatCurrency(adjustTarget.balance)}</span>
              </div>
            </div>

            <form onSubmit={submitManualAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black dark:text-white mb-1.5">
                  Adjustment Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("CREDIT")}
                    className={`p-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer ${
                      adjustType === "CREDIT"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-champagne bg-white text-gray-600"
                    }`}
                  >
                    + Add Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("DEBIT")}
                    className={`p-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer ${
                      adjustType === "DEBIT"
                        ? "border-rose-500 bg-rose-50 text-rose-900"
                        : "border-champagne bg-white text-gray-600"
                    }`}
                  >
                    - Deduct Credit
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black dark:text-white mb-1">
                  Amount in INR (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="500.00"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white dark:bg-[#252525] text-luxury-black dark:text-white focus:outline-none focus:border-gold-500 font-mono text-sm"
                />
              </div>

              {adjustType === "CREDIT" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black dark:text-white mb-1">
                    Expires In (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="365"
                    value={adjustExpiresInDays}
                    onChange={(e) => setAdjustExpiresInDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white dark:bg-[#252525] text-luxury-black dark:text-white focus:outline-none focus:border-gold-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Default is 365 days (1 year).</p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black dark:text-white mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Concierge apology compensation for order transit delay #ORD-2026-..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white dark:bg-[#252525] text-luxury-black dark:text-white focus:outline-none focus:border-gold-500"
                />
                <p className="text-[10px] text-amber-700 mt-0.5">
                  This reason will be logged in the immutable employee activity audit trail.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-champagne text-luxury-black dark:text-white hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="px-5 py-2 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                >
                  {submittingAdjust ? "Saving..." : "Confirm Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Freeze / Unfreeze Modal */}
      {freezeModalOpen && freezeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gold-300/30 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gold-200/20 pb-3">
              <h3 className="text-base font-serif font-bold text-luxury-black dark:text-white">
                {freezeTarget.status === "Frozen" ? "Unfreeze Store Credit Account" : "Freeze Store Credit Account"}
              </h3>
              <button
                onClick={() => setFreezeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {freezeTarget.status === "Frozen"
                ? `Are you sure you want to unfreeze ${freezeTarget.customer?.name}'s account? The customer will regain immediate ability to spend their balance at checkout.`
                : `Are you sure you want to freeze ${freezeTarget.customer?.name}'s account? The customer will be blocked from spending credits at checkout until manually unfrozen.`}
            </p>

            <form onSubmit={submitFreezeToggle} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black dark:text-white mb-1">
                  Reason for {freezeTarget.status === "Frozen" ? "Unfreezing" : "Freezing"} *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="State operational reason for security audit..."
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white dark:bg-[#252525] text-luxury-black dark:text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFreezeModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-champagne text-luxury-black dark:text-white hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFreeze}
                  className={`px-5 py-2 rounded-full text-white font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50 ${
                    freezeTarget.status === "Frozen"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submittingFreeze
                    ? "Updating..."
                    : freezeTarget.status === "Frozen"
                    ? "Confirm Unfreeze"
                    : "Confirm Freeze"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
