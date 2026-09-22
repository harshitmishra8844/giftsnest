import { useState, useEffect } from "react";
import api from "../services/api";
import { getAdminAuth } from "../services/adminAuth";

/**
 * Customer360Drawer
 * Complete Enterprise 360° Customer Profile View
 * Displays Lifetime Value, Orders, Returns, Refunds, Callbacks, Support Tickets,
 * Wishlist, Cart, Private Staff Notes, and Communication/Security History.
 */
const Customer360Drawer = ({
  customerId,
  isOpen,
  onClose,
  authHeader,
  onOpenTicket,
  onOpenCallback,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Note addition state
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState("");

  const getEffectiveAuthHeader = () => {
    if (authHeader && authHeader.headers) return authHeader;
    const admin = getAdminAuth();
    if (admin?.token) {
      return { headers: { Authorization: `Bearer ${admin.token}` } };
    }
    return {};
  };

  useEffect(() => {
    if (!isOpen || !customerId) {
      setData(null);
      setError("");
      return;
    }

    const fetchCustomerProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const header = getEffectiveAuthHeader();
        const res = await api.get(`/admin/customers/${customerId}`, header);
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch customer 360 profile:", err);
        setError(err.response?.data?.message || "Failed to load customer profile");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerProfile();
  }, [isOpen, customerId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setAddingNote(true);
    setNoteSuccess("");
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.post(
        `/admin/customers/${customerId}/notes`,
        { text: newNoteText.trim() },
        header
      );

      // Update notes list in local state
      setData((prev) => ({
        ...prev,
        customerNotes: res.data.notes || [
          ...(prev.customerNotes || []),
          {
            text: newNoteText.trim(),
            adminName: getAdminAuth()?.name || "Staff",
            date: new Date().toISOString(),
          },
        ],
      }));

      setNewNoteText("");
      setNoteSuccess("Note added successfully.");
      setTimeout(() => setNoteSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to add customer note:", err);
      alert(err.response?.data?.message || "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  if (!isOpen) return null;

  const profile = data?.profile || {};
  const orderInfo = data?.orderInfo || {};
  const orders = orderInfo.orderHistory || [];
  const returns = data?.returns || [];
  const refunds = data?.refunds || [];
  const callbacks = data?.callbacks || [];
  const tickets = data?.tickets || [];
  const notes = data?.customerNotes || profile.notes || [];
  const wishlist = data?.wishlist || [];
  const cart = data?.cart || [];
  const defaultShipping = data?.addresses?.defaultShipping;
  const billingAddress = data?.addresses?.billingAddress;

  const tabs = [
    { id: "overview", label: "360° Overview", icon: "👤" },
    { id: "orders", label: `Orders (${orders.length})`, icon: "📦" },
    { id: "returns", label: `Returns (${returns.length})`, icon: "🔄" },
    { id: "refunds", label: `Refunds (${refunds.length})`, icon: "💰" },
    { id: "callbacks", label: `Callbacks (${callbacks.length})`, icon: "📞" },
    { id: "tickets", label: `Tickets (${tickets.length})`, icon: "🎧" },
    { id: "wishlist", label: `Wishlist (${wishlist.length})`, icon: "✨" },
    { id: "notes", label: `Notes (${notes.length})`, icon: "📝" },
    { id: "history", label: "History & Logs", icon: "📋" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#181818] text-luxury-black dark:text-white border-l border-gold-300/40 dark:border-gold-900/40 h-full flex flex-col shadow-2xl z-10 animate-slide-left overflow-hidden">
        {/* Top Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-cream/90 to-white dark:from-[#202020] dark:to-[#181818] flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white font-serif font-bold text-xl flex items-center justify-center shadow-md ring-2 ring-gold-400/30">
              {profile.name ? profile.name.charAt(0).toUpperCase() : "C"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                  {profile.name || "Customer Profile"}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    profile.status === "Suspended"
                      ? "bg-red-500/15 text-red-600 border border-red-500/30"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {profile.status || "Active"}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    profile.isEmailVerified || profile.verificationStatus === "Verified"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {profile.isEmailVerified || profile.verificationStatus === "Verified" ? "✓ Email Verified" : "⏳ Email Pending"}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    profile.isPhoneVerified
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-gray-500/10 text-gray-500 dark:text-gray-400 border border-gray-500/20"
                  }`}
                  title={profile.isPhoneVerified ? "Phone verified" : "SMS OTP verification not yet active"}
                >
                  {profile.isPhoneVerified ? "✓ Phone Verified" : "📱 Phone Unverified"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                <span>📧 {profile.email || "No email"}</span>
                <span>📱 {profile.mobileNumber || "No mobile"}</span>
                <span>
                  📅 Member since{" "}
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
                {profile.emailVerifiedAt && (
                  <span>
                    🛡️ Verified on{" "}
                    {new Date(profile.emailVerifiedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
            title="Close 360 View"
          >
            ✕
          </button>
        </div>

        {/* 360 KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50/70 dark:bg-[#1E1E1E]/80 border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="p-3 rounded-xl bg-white dark:bg-[#252525] border border-gold-200/40 dark:border-gold-900/30 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              Lifetime Value (LTV)
            </span>
            <span className="text-base font-serif font-bold text-gold-600 dark:text-gold-400 mt-0.5 block">
              ₹{(orderInfo.totalSpent || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-[#252525] border border-gold-200/40 dark:border-gold-900/30 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              Total Orders / AOV
            </span>
            <span className="text-base font-serif font-bold text-gray-900 dark:text-white mt-0.5 block">
              {orderInfo.totalOrders || 0} / ₹{(orderInfo.averageOrderValue || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-[#252525] border border-gold-200/40 dark:border-gold-900/30 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              Returns & Refunds
            </span>
            <span className="text-base font-serif font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
              {returns.length} Ret / {refunds.length} Ref
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-[#252525] border border-gold-200/40 dark:border-gold-900/30 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              Support & Callbacks
            </span>
            <span className="text-base font-serif font-bold text-sky-600 dark:text-sky-400 mt-0.5 block">
              {tickets.length} Tkts / {callbacks.length} Calls
            </span>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex border-b border-gray-100 dark:border-white/10 px-4 pt-2 bg-white dark:bg-[#181818] overflow-x-auto gap-1 whitespace-nowrap scrollbar-none text-xs font-semibold uppercase tracking-wider shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? "border-gold-500 text-gold-600 dark:text-gold-400 bg-gold-50/50 dark:bg-gold-500/10 font-bold"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Loading 360° CRM profile...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm text-center">
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => {
                  setError("");
                  onClose();
                }}
                className="mt-3 px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Customer Information & Addresses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-gold-200/30 dark:border-gold-900/20 bg-cream/40 dark:bg-white/5 space-y-2.5 text-xs">
                      <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span>📍</span> Shipping Address
                      </h4>
                      {defaultShipping ? (
                        <div className="text-gray-600 dark:text-gray-300 space-y-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {defaultShipping.fullName || profile.name}
                          </p>
                          <p>{defaultShipping.addressLine1 || defaultShipping.address}</p>
                          {defaultShipping.addressLine2 && <p>{defaultShipping.addressLine2}</p>}
                          <p>
                            {defaultShipping.city}, {defaultShipping.state} - {defaultShipping.pincode}
                          </p>
                          <p>Phone: {defaultShipping.phoneNumber || defaultShipping.mobileNumber || "—"}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">No default shipping address recorded.</p>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl border border-gold-200/30 dark:border-gold-900/20 bg-cream/40 dark:bg-white/5 space-y-2.5 text-xs">
                      <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span>💳</span> Billing Address / Fallback
                      </h4>
                      {billingAddress ? (
                        <div className="text-gray-600 dark:text-gray-300 space-y-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {billingAddress.fullName || profile.name}
                          </p>
                          <p>{billingAddress.addressLine1 || billingAddress.address}</p>
                          <p>
                            {billingAddress.city}, {billingAddress.state} - {billingAddress.pincode}
                          </p>
                          <p>Phone: {billingAddress.phoneNumber || billingAddress.mobileNumber || "—"}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">No secondary address recorded.</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Order Snapshot */}
                  {orderInfo.lastOrder && (
                    <div className="p-4 rounded-2xl border border-gold-200/40 dark:border-gold-900/30 bg-white dark:bg-[#202020] space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
                          Latest Order Snapshot
                        </h4>
                        <button
                          type="button"
                          onClick={() => setActiveTab("orders")}
                          className="text-xs font-semibold text-gold-600 dark:text-gold-400 hover:underline cursor-pointer"
                        >
                          View all orders →
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                        <div>
                          <span className="font-mono font-bold text-gold-600 dark:text-gold-400">
                            {orderInfo.lastOrder.orderCode || orderInfo.lastOrder._id}
                          </span>
                          <span className="text-gray-400 ml-2">
                            {new Date(orderInfo.lastOrder.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-serif font-bold text-gray-900 dark:text-white">
                            ₹{orderInfo.lastOrder.totalPrice || orderInfo.lastOrder.totalAmount || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600">
                            {orderInfo.lastOrder.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Cart & Wishlist Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#202020]">
                      <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider mb-2">
                        Active Shopping Cart ({cart.length})
                      </h4>
                      {cart.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Cart is currently empty.</p>
                      ) : (
                        <div className="space-y-2 text-xs">
                          {cart.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                              <span className="truncate max-w-[200px]">{item.product?.name || "Product"}</span>
                              <span className="font-bold">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#202020]">
                      <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider mb-2">
                        Wishlist Preview ({wishlist.length})
                      </h4>
                      {wishlist.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No saved wishlist items.</p>
                      ) : (
                        <div className="space-y-2 text-xs">
                          {wishlist.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                              <span className="truncate max-w-[200px]">{item.name || "Product"}</span>
                              <span className="font-serif text-gold-600 font-semibold">₹{item.price}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ORDERS */}
              {activeTab === "orders" && (
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-xs italic">
                      No purchase orders recorded for this customer.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-white/5">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase font-bold text-gray-400">
                          <tr>
                            <th className="p-3">Order Code</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Items</th>
                            <th className="p-3">Total Amount</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {orders.map((o) => (
                            <tr key={o._id} className="hover:bg-gold-50/30 dark:hover:bg-white/5">
                              <td className="p-3 font-mono font-bold text-gold-600 dark:text-gold-400">
                                {o.orderCode || o._id}
                              </td>
                              <td className="p-3 text-gray-500 whitespace-nowrap">
                                {new Date(o.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-gray-600 dark:text-gray-300">
                                {o.orderItems?.length || 1} items
                              </td>
                              <td className="p-3 font-serif font-bold text-gray-900 dark:text-white">
                                ₹{o.totalPrice || o.totalAmount || 0}
                              </td>
                              <td className="p-3 text-gray-500">
                                {o.paymentMethod || "Prepaid"} ({o.isPaid ? "Paid" : "Pending"})
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                                  {o.status}
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

              {/* TAB 3: RETURNS & REPLACEMENTS */}
              {activeTab === "returns" && (
                <div className="space-y-4">
                  {returns.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-xs italic">
                      No return or replacement claims found for this customer.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {returns.map((ret) => (
                        <div
                          key={ret._id}
                          className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#202020] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                {ret.returnCode || `RET-${ret._id.slice(-6).toUpperCase()}`}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                {ret.status}
                              </span>
                            </div>
                            <span className="text-gray-400 text-[11px]">
                              {new Date(ret.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold text-gray-900 dark:text-white">Reason:</span>{" "}
                            {ret.reason || "Not specified"}
                          </p>
                          {ret.adminNotes && (
                            <p className="text-gray-500 text-[11px] bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                              Staff Note: {ret.adminNotes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: REFUNDS */}
              {activeTab === "refunds" && (
                <div className="space-y-4">
                  {refunds.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-xs italic">
                      No refund records logged for this customer.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {refunds.map((rf) => (
                        <div
                          key={rf._id}
                          className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#202020] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {rf.refundId || `RF-${rf._id.slice(-6).toUpperCase()}`}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                {rf.refundStatus}
                              </span>
                            </div>
                            <span className="font-serif font-bold text-gray-900 dark:text-white">
                              ₹{rf.refundAmount || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>Mode: {rf.refundMethod || "Original Source"}</span>
                            <span>{new Date(rf.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CALLBACKS */}
              {activeTab === "callbacks" && (
                <div className="space-y-4">
                  {callbacks.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-xs italic">
                      No callback requests found for this customer.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {callbacks.map((cb) => (
                        <div
                          key={cb._id}
                          className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#202020] space-y-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gold-600 dark:text-gold-400">
                                {cb.callbackCode}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                {cb.status}
                              </span>
                              {cb.lastCallOutcome && (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                                  Outcome: {cb.lastCallOutcome}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-400 text-[11px]">
                              {new Date(cb.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold text-gray-900 dark:text-white">Requirement:</span>{" "}
                            {cb.customerRequirement || cb.notes || "General callback inquiry"}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100 dark:border-white/5">
                            <span>Assigned: {cb.assignedToName || "Unassigned"}</span>
                            <span>Calls Made: {cb.totalCallsMade || 0}</span>
                            {onOpenCallback && (
                              <button
                                type="button"
                                onClick={() => onOpenCallback(cb)}
                                className="font-semibold text-gold-600 hover:underline cursor-pointer"
                              >
                                Open in Callback Desk →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: SUPPORT TICKETS */}
              {activeTab === "tickets" && (
                <div className="space-y-4">
                  {tickets.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-xs italic">
                      No support tickets logged for this customer.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((tkt) => (
                        <div
                          key={tkt._id}
                          className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#202020] space-y-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gold-600 dark:text-gold-400">
                                {tkt.ticketCode}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/10 text-amber-600">
                                {tkt.priority}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">
                                {tkt.status}
                              </span>
                              {tkt.slaBreached && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 text-red-600 border border-red-500/30 animate-pulse">
                                  SLA Breached
                                </span>
                              )}
                            </div>
                            <span className="text-gray-400 text-[11px]">
                              {new Date(tkt.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <h5 className="font-bold text-gray-900 dark:text-white text-sm">
                            {tkt.subject}
                          </h5>

                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100 dark:border-white/5">
                            <span>Source: {tkt.source}</span>
                            <span>Category: {tkt.category}</span>
                            {onOpenTicket && (
                              <button
                                type="button"
                                onClick={() => onOpenTicket(tkt._id)}
                                className="font-semibold text-gold-600 hover:underline cursor-pointer"
                              >
                                View Ticket Details →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: WISHLIST */}
              {activeTab === "wishlist" && (
                <div className="space-y-4">
                  {wishlist.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-xs italic">
                      Customer has not added any items to wishlist.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {wishlist.map((prod) => (
                        <div
                          key={prod._id}
                          className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#202020] flex items-center gap-3 text-xs"
                        >
                          {prod.image && (
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {prod.name}
                            </p>
                            <p className="font-serif font-bold text-gold-600 dark:text-gold-400 mt-0.5">
                              ₹{prod.price}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: NOTES (INTERNAL STAFF NOTES) */}
              {activeTab === "notes" && (
                <div className="space-y-5">
                  {/* Note Creator Form */}
                  <form
                    onSubmit={handleAddNote}
                    className="p-4 rounded-2xl border border-gold-300/40 dark:border-gold-900/40 bg-gold-50/20 dark:bg-white/5 space-y-3"
                  >
                    <label className="block text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Add Private Internal CRM Note
                    </label>
                    <textarea
                      rows={3}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Write customer preferences, VIP considerations, delivery instructions, or interaction summary..."
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] p-3 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500"
                      required
                    />
                    <div className="flex items-center justify-between">
                      {noteSuccess && (
                        <span className="text-xs text-emerald-600 font-semibold">{noteSuccess}</span>
                      )}
                      <button
                        type="submit"
                        disabled={addingNote || !newNoteText.trim()}
                        className="ml-auto px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                      >
                        {addingNote ? "Saving Note..." : "Save Internal Note"}
                      </button>
                    </div>
                  </form>

                  {/* Notes Timeline List */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Chronological Staff Notes ({notes.length})
                    </h5>
                    {notes.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No notes recorded yet.</p>
                    ) : (
                      notes.map((note, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#202020] space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span className="font-semibold text-gold-600 dark:text-gold-400">
                              👤 {note.adminName || "Staff Member"}
                            </span>
                            <span>{new Date(note.date || note.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {note.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 9: HISTORY & LOGS */}
              {activeTab === "history" && (
                <div className="space-y-6">
                  {/* Notifications sent to customer */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      Direct Notifications & Alerts ({data.notifications?.length || 0})
                    </h5>
                    {(data.notifications || []).length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No notifications dispatched.</p>
                    ) : (
                      <div className="space-y-2">
                        {data.notifications.slice(0, 10).map((n) => (
                          <div
                            key={n._id}
                            className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#202020] text-xs flex items-start justify-between gap-3"
                          >
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{n.title}</p>
                              <p className="text-gray-500 mt-0.5">{n.message}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Login Activity Logs */}
                  {data.loginHistory && data.loginHistory.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                        Security & Login Audits ({data.loginHistory.length})
                      </h5>
                      <div className="space-y-2">
                        {data.loginHistory.slice(0, 8).map((log, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 text-[11px] flex items-center justify-between text-gray-600 dark:text-gray-300"
                          >
                            <span>
                              IP: {log.ipAddress || "Unknown"} ({log.device || "Browser"})
                            </span>
                            <span>{new Date(log.loginTime).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Customer360Drawer;
