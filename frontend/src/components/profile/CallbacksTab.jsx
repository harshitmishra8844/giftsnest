import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  PhoneCall,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Plus,
  User,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export default function CallbacksTab() {
  const { auth } = useAuth();
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Request Callback Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: auth?.name || "",
    customerPhone: auth?.mobileNumber || "",
    preferredTime: "Morning (10:00 AM - 01:00 PM)",
    subject: "Order & Gifting Assistance",
    orderCode: "",
    notes: "",
  });

  const fetchCallbacks = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/callbacks/my");
      if (data?.success) {
        setCallbacks(data.callbacks || []);
      }
    } catch (err) {
      console.error("Failed to load customer callbacks:", err);
      setError(err.response?.data?.message || "Failed to load callback history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallbacks();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      customerName: auth?.name || "",
      customerPhone: auth?.mobileNumber || "",
      preferredTime: "Morning (10:00 AM - 01:00 PM)",
      subject: "Order & Gifting Assistance",
      orderCode: "",
      notes: "",
    });
    setError("");
    setSuccessMessage("");
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerPhone.trim()) {
      setError("Please provide a valid phone number for the callback.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await api.post("/callbacks/request", {
        customerName: formData.customerName || auth?.name || "Customer",
        customerPhone: formData.customerPhone.trim(),
        customerEmail: auth?.email || "",
        subject: formData.subject,
        preferredTime: formData.preferredTime,
        orderCode: formData.orderCode.trim(),
        notes: formData.notes.trim(),
      });
      setSuccessMessage("Your callback request has been scheduled! Our concierge team will reach out to you.");
      setModalOpen(false);
      fetchCallbacks();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit callback request.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "In Progress":
        return "bg-blue-50 text-blue-800 border-blue-300";
      case "Assigned":
        return "bg-purple-50 text-purple-800 border-purple-300";
      case "Cancelled":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "Pending":
      default:
        return "bg-amber-50 text-amber-800 border-amber-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
            Dedicated Customer Care
          </span>
          <h2 className="text-xl font-serif font-bold text-luxury-black mt-1">
            Concierge Callbacks
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-light">
            Schedule a dedicated call with our gifting concierge or review past consultation records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCallbacks}
            disabled={loading}
            className="p-2.5 rounded-full border border-champagne text-luxury-black hover:bg-gold-50/60 transition cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gold-600 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Callback</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Callbacks List */}
      <div className="bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs space-y-4">
        <h3 className="text-base font-serif font-bold text-luxury-black">
          Scheduled & Past Callbacks ({callbacks.length})
        </h3>

        {loading ? (
          <div className="py-16 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-gold-600 animate-spin" />
            <span>Checking scheduled appointments...</span>
          </div>
        ) : callbacks.length > 0 ? (
          <div className="space-y-3">
            {callbacks.map((cb) => (
              <div
                key={cb._id}
                className="rounded-2xl border border-champagne/35 bg-white p-5 hover:border-gold-400 hover:shadow-xs transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-champagne/15 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-luxury-black">
                      {cb.callbackCode || "CB-REQUEST"}
                    </span>
                    <span className="text-[10px] text-gray-400">&bull;</span>
                    <span className="text-xs font-semibold text-text-secondary">
                      {cb.subject || "Concierge Call"}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusBadge(
                      cb.status
                    )}`}
                  >
                    {cb.status || "Pending"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-text-secondary font-bold tracking-wider block">
                      Preferred Window
                    </span>
                    <span className="font-medium text-luxury-black flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-gold-600" />
                      {cb.preferredTime || "Anytime during business hours"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-text-secondary font-bold tracking-wider block">
                      Assigned Concierge
                    </span>
                    <span className="font-medium text-luxury-black flex items-center gap-1.5 mt-0.5">
                      <User className="w-3 h-3 text-gold-600" />
                      {cb.assignedTo?.name || "Pending Specialist Allocation"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-text-secondary font-bold tracking-wider block">
                      Requested On
                    </span>
                    <span className="text-text-secondary font-light block mt-0.5">
                      {new Date(cb.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {cb.orderCode && (
                  <div className="mt-3 text-xs text-text-secondary">
                    <span className="font-semibold text-luxury-black">Order Reference: </span>
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                      #{cb.orderCode}
                    </span>
                  </div>
                )}

                {cb.notes && (
                  <div className="mt-2.5 p-3 rounded-xl bg-gold-50/15 border border-champagne/25 text-xs text-text-secondary font-light">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-luxury-black mb-1">
                      Customer Inquiry Notes:
                    </p>
                    <p>"{cb.notes}"</p>
                  </div>
                )}

                {cb.remarks && cb.remarks.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-champagne/15 text-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-luxury-black mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-gold-600" />
                      Executive Call Summary:
                    </p>
                    <div className="space-y-1">
                      {cb.remarks.map((rem, rIdx) => (
                        <p key={rIdx} className="text-text-secondary text-[11px] font-light bg-gray-50 p-2 rounded-lg">
                          {rem.remarkText || rem.resolutionProvided || rem.issueDiscussed}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-text-secondary font-light space-y-2">
            <div className="w-12 h-12 rounded-full bg-gold-50 border border-gold-200 text-gold-600 flex items-center justify-center mx-auto text-lg">
              📞
            </div>
            <h4 className="font-serif font-semibold text-luxury-black">No Callbacks Scheduled</h4>
            <p className="max-w-sm mx-auto text-[11px]">
              Need expert assistance with custom orders, corporate requests, or return resolutions? Schedule a callback with one tap.
            </p>
            <button
              onClick={handleOpenModal}
              className="mt-3 px-4 py-2 rounded-full bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Request a Call Now
            </button>
          </div>
        )}
      </div>

      {/* Modal to Request Callback */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-gold-300/30 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-champagne/25 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
                  Concierge Support
                </span>
                <h3 className="text-lg font-serif font-bold text-luxury-black mt-0.5">
                  Schedule a Concierge Callback
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1">
                  Your Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1">
                  Preferred Time Window
                </label>
                <select
                  value={formData.preferredTime}
                  onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
                >
                  <option value="Morning (10:00 AM - 01:00 PM)">Morning (10:00 AM - 01:00 PM)</option>
                  <option value="Afternoon (02:00 PM - 05:00 PM)">Afternoon (02:00 PM - 05:00 PM)</option>
                  <option value="Evening (05:00 PM - 08:00 PM)">Evening (05:00 PM - 08:00 PM)</option>
                  <option value="Urgent (Within 1 Hour)">Urgent (Within 1 Hour)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1">
                  Subject / Topic
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
                >
                  <option value="Order & Gifting Assistance">Order & Gifting Assistance</option>
                  <option value="Custom Box & Personalization">Custom Box & Personalization</option>
                  <option value="Return / Replacement Follow-up">Return / Replacement Follow-up</option>
                  <option value="Refund & Store Credit Inquiry">Refund & Store Credit Inquiry</option>
                  <option value="Corporate & Bulk Gifting">Corporate & Bulk Gifting</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1">
                  Order Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ORD-2026-12345"
                  value={formData.orderCode}
                  onChange={(e) => setFormData({ ...formData, orderCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1">
                  Inquiry Details / Specific Questions
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell us what you would like to discuss..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-champagne text-luxury-black hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Scheduling..." : "Confirm Callback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
