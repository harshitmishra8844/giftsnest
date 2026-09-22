import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  CreditCard,
  TrendingUp,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Gift,
  Search,
  Filter,
  Info,
} from "lucide-react";

export default function StoreCreditTab() {
  const [balance, setBalance] = useState({
    availableBalance: 0,
    reservedBalance: 0,
    totalCredited: 0,
    totalDebited: 0,
    expiringCredit: 0,
    expiringDays: 0,
    expiredCredit: 0,
    status: "Active",
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCreditData = async () => {
    try {
      setLoading(true);
      setError("");
      const [balRes, txnRes] = await Promise.all([
        api.get("/store-credit/my/balance"),
        api.get("/store-credit/my/transactions?limit=100"),
      ]);
      if (balRes.data?.success) {
        setBalance(balRes.data.balance);
      }
      if (txnRes.data?.success) {
        setTransactions(txnRes.data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to load store credit data:", err);
      setError(err.response?.data?.message || "Failed to load store credit details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditData();
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== "ALL" && t.transactionType !== filterType) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchId = t.transactionId?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchRef = t.metadata?.orderNumber?.toLowerCase().includes(q) ||
                       t.metadata?.refundId?.toLowerCase().includes(q);
      return matchId || matchDesc || matchRef;
    }
    return true;
  });

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "CREDIT":
        return {
          label: "Credit Added",
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <ArrowDownLeft className="w-3 h-3 text-emerald-600" />,
        };
      case "DEBIT":
        return {
          label: "Store Purchase",
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          icon: <ArrowUpRight className="w-3 h-3 text-rose-600" />,
        };
      case "RESERVATION_HOLD":
        return {
          label: "Checkout Hold",
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Lock className="w-3 h-3 text-amber-600" />,
        };
      case "RESERVATION_RELEASE":
        return {
          label: "Hold Released",
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          icon: <RefreshCw className="w-3 h-3 text-blue-600" />,
        };
      case "EXPIRED":
        return {
          label: "Credit Expired",
          bg: "bg-gray-100 text-gray-700 border-gray-300",
          icon: <AlertTriangle className="w-3 h-3 text-gray-500" />,
        };
      case "MANUAL_ADJUSTMENT":
        return {
          label: "Concierge Adjustment",
          bg: "bg-purple-50 text-purple-800 border-purple-200",
          icon: <Gift className="w-3 h-3 text-purple-600" />,
        };
      default:
        return {
          label: type,
          bg: "bg-gray-50 text-gray-800 border-gray-200",
          icon: <Info className="w-3 h-3 text-gray-500" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
              Niyora Private Ledger
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                balance.status === "Active"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              Account {balance.status}
            </span>
          </div>
          <h2 className="text-xl font-serif font-bold text-luxury-black mt-1">
            Store Credit Center
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-light">
            Manage your wallet credits, instant refund balances, and checkout spending ledger.
          </p>
        </div>

        <button
          onClick={fetchCreditData}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-champagne text-xs font-semibold text-luxury-black hover:bg-gold-50/60 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gold-600 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Main Available Balance Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#121110] p-6 text-white shadow-lg border border-gold-500/20 col-span-1 md:col-span-2">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gold-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
              Available to Spend
            </span>
            <span className="text-[10px] text-gray-400 font-mono tracking-wider">
              100% Instant at Checkout
            </span>
          </div>

          <div className="mt-4">
            <p className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              ₹{formatCurrency(balance.availableBalance)}
            </p>
            <p className="text-xs text-gray-300 mt-1 font-light">
              Usable on any curated gift box or customized surprise package.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">Lifetime Credited</span>
              <span className="font-semibold text-white font-mono">₹{formatCurrency(balance.totalCredited)}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block uppercase text-right">Lifetime Debited</span>
              <span className="font-semibold text-white font-mono">₹{formatCurrency(balance.totalDebited)}</span>
            </div>
          </div>
        </div>

        {/* Reserved / Pending Credit Card */}
        <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                Reserved / In Checkout
              </span>
            </div>
            <p className="text-2xl font-serif font-bold text-luxury-black mt-3">
              ₹{formatCurrency(balance.reservedBalance)}
            </p>
            <p className="text-[11px] text-text-secondary mt-1 font-light leading-relaxed">
              Temporarily held while an active payment window is awaiting completion. Automatically returns to your wallet if payment is cancelled.
            </p>
          </div>
          <div className="pt-3 border-t border-champagne/20 text-[10px] text-gray-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Protected by auto-release timer</span>
          </div>
        </div>

        {/* Expiring Credit Card */}
        <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                Expiring Soon
              </span>
              {balance.expiringCredit > 0 && (
                <span className="bg-amber-100 text-amber-900 font-bold text-[9px] px-2 py-0.5 rounded-full">
                  Next {balance.expiringDays || 30} Days
                </span>
              )}
            </div>
            <p className="text-2xl font-serif font-bold text-luxury-black mt-3">
              ₹{formatCurrency(balance.expiringCredit)}
            </p>
            <p className="text-[11px] text-text-secondary mt-1 font-light leading-relaxed">
              {balance.expiringCredit > 0
                ? "Credit will lapse if not utilized before the expiration deadline."
                : "No credits expiring in the immediate window."}
            </p>
          </div>
          <div className="pt-3 border-t border-champagne/20 text-[10px] text-gray-400">
            <span>Expired to date: </span>
            <strong className="text-luxury-black font-mono">₹{formatCurrency(balance.expiredCredit)}</strong>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-champagne/20 pb-4">
          <div>
            <h3 className="text-base font-serif font-bold text-luxury-black">
              Transaction History Ledger
            </h3>
            <p className="text-xs text-text-secondary font-light">
              Audit logs of all credits, deductions, and checkout applications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Txn or Reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-full border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500 w-44"
              />
            </div>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-full border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
            >
              <option value="ALL">All Types</option>
              <option value="CREDIT">Credits Added</option>
              <option value="DEBIT">Debits (Purchases)</option>
              <option value="RESERVATION_HOLD">Holds</option>
              <option value="RESERVATION_RELEASE">Releases</option>
              <option value="EXPIRED">Expired</option>
              <option value="MANUAL_ADJUSTMENT">Adjustments</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-gold-600 animate-spin" />
            <span>Loading store credit transactions...</span>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="divide-y divide-champagne/20 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-text-secondary tracking-wider pb-2">
                  <th className="py-2.5 px-2">Date & Time</th>
                  <th className="py-2.5 px-2">Transaction ID</th>
                  <th className="py-2.5 px-2">Type</th>
                  <th className="py-2.5 px-2">Description & Reference</th>
                  <th className="py-2.5 px-2 text-right">Amount</th>
                  <th className="py-2.5 px-2 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-champagne/15">
                {filteredTransactions.map((tx) => {
                  const badge = getTypeBadge(tx.transactionType);
                  const isPositive =
                    tx.transactionType === "CREDIT" ||
                    (tx.transactionType === "MANUAL_ADJUSTMENT" && tx.amount > 0) ||
                    tx.transactionType === "RESERVATION_RELEASE";
                  const isNegative =
                    tx.transactionType === "DEBIT" ||
                    tx.transactionType === "EXPIRED" ||
                    (tx.transactionType === "MANUAL_ADJUSTMENT" && tx.amount < 0);

                  const orderRef = tx.metadata?.orderNumber;
                  const refundRef = tx.metadata?.refundId;

                  return (
                    <tr key={tx._id || tx.transactionId} className="hover:bg-gold-50/20 transition-colors">
                      <td className="py-3 px-2 text-text-secondary whitespace-nowrap font-light">
                        {new Date(tx.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-2 font-mono font-bold text-luxury-black whitespace-nowrap text-[11px]">
                        {tx.transactionId}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${badge.bg}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-medium text-luxury-black">{tx.description || "-"}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-text-secondary">
                          {orderRef && (
                            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono">
                              Order #{orderRef}
                            </span>
                          )}
                          {refundRef && (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                              Refund #{refundRef}
                            </span>
                          )}
                          {tx.expiresAt && (
                            <span className="text-amber-800">
                              Expires: {new Date(tx.expiresAt).toLocaleDateString("en-IN")}
                              {tx.remainingCreditAmount !== undefined && (
                                <span className="ml-1 text-gray-400">
                                  (₹{formatCurrency(tx.remainingCreditAmount)} unspent)
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right whitespace-nowrap font-mono font-bold text-xs">
                        <span
                          className={
                            isPositive
                              ? "text-emerald-700"
                              : isNegative
                              ? "text-rose-700"
                              : "text-luxury-black"
                          }
                        >
                          {isPositive ? "+" : isNegative ? "-" : ""}₹{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right whitespace-nowrap font-mono text-gray-600">
                        ₹{formatCurrency(tx.balanceAfter)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-text-secondary font-light space-y-2">
            <div className="w-12 h-12 rounded-full bg-gold-50 border border-gold-200 text-gold-600 flex items-center justify-center mx-auto text-lg">
              📜
            </div>
            <h4 className="font-serif font-semibold text-luxury-black">No Transactions Found</h4>
            <p className="max-w-sm mx-auto text-[11px]">
              When you receive refund disbursements or pay with Store Credit, complete record logs will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
