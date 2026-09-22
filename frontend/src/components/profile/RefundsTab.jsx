import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  CreditCard,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Search,
  Eye,
  FileText,
  HelpCircle,
} from "lucide-react";

export default function RefundsTab() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/refunds/my");
      if (data?.success) {
        setRefunds(data.refunds || []);
      }
    } catch (err) {
      console.error("Failed to load customer refunds:", err);
      setError(err.response?.data?.message || "Failed to load refund history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Processed":
        return {
          label: "Processed & Paid",
          bg: "bg-emerald-50 text-emerald-800 border-emerald-300",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case "Approved":
        return {
          label: "Approved",
          bg: "bg-blue-50 text-blue-800 border-blue-300",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
        };
      case "Processing":
        return {
          label: "Payout Processing",
          bg: "bg-cyan-50 text-cyan-800 border-cyan-300",
          icon: <RefreshCw className="w-3.5 h-3.5 text-cyan-600 animate-spin" />,
        };
      case "Verification_Pending":
      case "Requested":
        return {
          label: "Verification Pending",
          bg: "bg-amber-50 text-amber-800 border-amber-300",
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
        };
      case "Under_Investigation":
        return {
          label: "Under Investigation",
          bg: "bg-purple-50 text-purple-800 border-purple-300",
          icon: <AlertCircle className="w-3.5 h-3.5 text-purple-600" />,
        };
      case "Rejected":
        return {
          label: "Rejected",
          bg: "bg-rose-50 text-rose-800 border-rose-300",
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
        };
      default:
        return {
          label: status,
          bg: "bg-gray-50 text-gray-800 border-gray-300",
          icon: <HelpCircle className="w-3.5 h-3.5 text-gray-500" />,
        };
    }
  };

  const filteredRefunds = refunds.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = r.refundId?.toLowerCase().includes(q);
      const matchOrder = r.orderCode?.toLowerCase().includes(q);
      const matchReason = r.refundReason?.toLowerCase().includes(q);
      return matchId || matchOrder || matchReason;
    }
    return true;
  });

  const totalProcessed = refunds
    .filter((r) => r.status === "Processed")
    .reduce((sum, r) => sum + (r.approvedAmount || r.refundAmount || 0), 0);

  const totalPending = refunds
    .filter((r) => ["Requested", "Verification_Pending", "Under_Investigation", "Approved", "Processing"].includes(r.status))
    .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
            Payment & Wallet Protection
          </span>
          <h2 className="text-xl font-serif font-bold text-luxury-black mt-1">
            Refunds Tracker
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-light">
            Monitor verified refunds disbursed to your original payment method or Store Credit wallet.
          </p>
        </div>

        <button
          onClick={fetchRefunds}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-champagne text-xs font-semibold text-luxury-black hover:bg-gold-50/60 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gold-600 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Total Claims Raised
          </span>
          <p className="text-2xl font-serif font-bold text-luxury-black mt-2">
            {refunds.length}
          </p>
          <p className="text-[11px] text-text-secondary mt-1 font-light">
            Cancelled orders & eligible returns.
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-200/60 bg-emerald-50/20 backdrop-blur-md p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
            Disbursed & Processed
          </span>
          <p className="text-2xl font-serif font-bold text-emerald-800 mt-2">
            ₹{formatCurrency(totalProcessed)}
          </p>
          <p className="text-[11px] text-emerald-900 mt-1 font-light">
            Credited via Gateway or Store Credit.
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200/60 bg-amber-50/20 backdrop-blur-md p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
            In Verification / Processing
          </span>
          <p className="text-2xl font-serif font-bold text-amber-800 mt-2">
            ₹{formatCurrency(totalPending)}
          </p>
          <p className="text-[11px] text-amber-900 mt-1 font-light">
            Under active finance desk review.
          </p>
        </div>
      </div>

      {/* Refunds List / Table */}
      <div className="bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-champagne/20 pb-4">
          <div>
            <h3 className="text-base font-serif font-bold text-luxury-black">
              Refund Claims & History
            </h3>
            <p className="text-xs text-text-secondary font-light">
              Real-time audit records of verification, approvals, and payout IDs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Refund / Order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-full border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500 w-44"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-full border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Processed">Processed</option>
              <option value="Approved">Approved</option>
              <option value="Processing">Processing</option>
              <option value="Verification_Pending">Verification Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-gold-600 animate-spin" />
            <span>Fetching refund claims...</span>
          </div>
        ) : filteredRefunds.length > 0 ? (
          <div className="space-y-3">
            {filteredRefunds.map((rf) => {
              const badge = getStatusBadge(rf.status);
              const orderNum = rf.orderCode || rf.orderId?.orderNumber || "Order";
              const isStoreCredit = rf.refundMethod === "Store Credit";

              return (
                <div
                  key={rf._id || rf.refundId}
                  className="rounded-2xl border border-champagne/35 bg-white p-4.5 hover:border-gold-400 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-champagne/15 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-luxury-black">
                        {rf.refundId}
                      </span>
                      <span className="text-[10px] text-gray-400">&bull;</span>
                      <span className="text-xs font-semibold text-text-secondary">
                        Order #{orderNum}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${badge.bg}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      <button
                        onClick={() => setSelectedRefund(rf)}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-700 hover:text-gold-900 border border-champagne rounded-full hover:bg-gold-50/40 transition cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-text-secondary font-bold tracking-wider block">
                        Refund Amount
                      </span>
                      <span className="font-serif font-bold text-luxury-black text-sm">
                        ₹{formatCurrency(rf.approvedAmount || rf.refundAmount)}
                      </span>
                      {rf.refundType && (
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({rf.refundType})
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-text-secondary font-bold tracking-wider block">
                        Refund Method
                      </span>
                      <span className="font-medium text-luxury-black flex items-center gap-1 mt-0.5">
                        {isStoreCredit ? (
                          <span className="bg-gold-50 text-gold-900 border border-gold-300/60 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            ★ Store Credit Wallet
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            Original Source (Gateway)
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-text-secondary font-bold tracking-wider block">
                        Date Requested
                      </span>
                      <span className="text-text-secondary font-light">
                        {new Date(rf.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-text-secondary font-bold tracking-wider block">
                        Transaction Ref
                      </span>
                      <span className="font-mono text-[11px] text-gray-700 truncate block">
                        {rf.payoutTransactionId || rf.transactionReference || "Pending Payout"}
                      </span>
                    </div>
                  </div>

                  {rf.refundReason && (
                    <div className="mt-3 pt-2.5 border-t border-champagne/10 text-[11px] text-text-secondary flex items-start gap-1.5 font-light">
                      <span className="font-semibold text-luxury-black shrink-0">Reason:</span>
                      <span>{rf.refundReason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-text-secondary font-light space-y-2">
            <div className="w-12 h-12 rounded-full bg-gold-50 border border-gold-200 text-gold-600 flex items-center justify-center mx-auto text-lg">
              💳
            </div>
            <h4 className="font-serif font-semibold text-luxury-black">No Refund Claims</h4>
            <p className="max-w-sm mx-auto text-[11px]">
              When an order is cancelled or a return is approved, you can monitor the refund payout lifecycle here.
            </p>
          </div>
        )}
      </div>

      {/* Detailed Modal Drawer */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-gold-300/30 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-champagne/25 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
                  Refund Audit Details
                </span>
                <h3 className="text-lg font-serif font-bold text-luxury-black mt-0.5">
                  Claim #{selectedRefund.refundId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRefund(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gold-50/20 p-4 rounded-2xl border border-champagne/30">
                <div>
                  <span className="text-[10px] uppercase text-text-secondary block">Order Number</span>
                  <strong className="text-luxury-black text-sm font-mono">
                    #{selectedRefund.orderCode || "Order"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-text-secondary block">Status</span>
                  <span className="font-bold text-luxury-black">
                    {selectedRefund.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-text-secondary block">Refund Amount</span>
                  <strong className="text-emerald-800 text-sm font-serif">
                    ₹{formatCurrency(selectedRefund.approvedAmount || selectedRefund.refundAmount)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-text-secondary block">Method</span>
                  <span className="font-semibold text-luxury-black">
                    {selectedRefund.refundMethod || "Original Payment"}
                  </span>
                </div>
              </div>

              {selectedRefund.payoutTransactionId && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
                  <p className="text-[10px] uppercase font-bold text-emerald-800">Payout Reference UTR / Ledger ID</p>
                  <p className="font-mono font-bold text-xs mt-0.5">{selectedRefund.payoutTransactionId}</p>
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-luxury-black">
                  Audit Lifecycle Timeline
                </h4>
                {selectedRefund.timeline && selectedRefund.timeline.length > 0 ? (
                  <div className="divide-y divide-champagne/15 border border-champagne/30 rounded-2xl p-2 bg-white">
                    {selectedRefund.timeline.map((event, idx) => (
                      <div key={idx} className="py-2.5 px-2 flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-gold-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-luxury-black">{event.event}</p>
                          {event.note && (
                            <p className="text-[11px] text-text-secondary mt-0.5 font-light">{event.note}</p>
                          )}
                          <span className="text-[9px] text-gray-400 mt-0.5 block">
                            {new Date(event.timestamp).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-secondary text-[11px] italic">No timeline entries yet.</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRefund(null)}
                className="px-5 py-2 rounded-full bg-luxury-black text-white text-xs font-semibold hover:bg-gold-500 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
