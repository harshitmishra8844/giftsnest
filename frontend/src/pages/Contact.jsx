import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const CATEGORIES = [
  { value: "Contact Us", label: "General Inquiry / Question" },
  { value: "Order Issue", label: "Order Related Issue" },
  { value: "Complaint", label: "Service or Delivery Complaint" },
  { value: "Product Inquiry", label: "Product & Customization Query" },
  { value: "Return / Replacement", label: "Return or Replacement Request" },
  { value: "Account", label: "Account / Profile Help" },
];

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    orderNumber: "",
    category: "Contact Us",
    priority: "Medium",
    subject: "",
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Contact Concierge & Customer Support | Niyora Gifts";
    window.scrollTo({ top: 0, behavior: "smooth" });
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!formData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!formData.message.trim()) {
      setError("Please describe your message or query.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/tickets/contact", {
        ...formData,
        subject: formData.subject.trim() || `${formData.category} from ${formData.name}`,
      });

      if (res.data?.success) {
        setSubmittedTicket(res.data.ticket);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const [activeMode, setActiveMode] = useState("message"); // 'message' or 'callback'
  const [callbackData, setCallbackData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    orderCode: "",
    preferredTime: "Immediately / Urgent",
    notes: "",
  });
  const [submittedCallback, setSubmittedCallback] = useState(null);

  const handleCallbackChange = (e) => {
    const { name, value } = e.target;
    setCallbackData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!callbackData.customerName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!callbackData.customerPhone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/callbacks/request", {
        customerName: callbackData.customerName.trim(),
        customerPhone: callbackData.customerPhone.trim(),
        customerEmail: callbackData.customerEmail.trim(),
        orderCode: callbackData.orderCode.trim(),
        preferredTime: callbackData.preferredTime,
        notes: callbackData.notes.trim(),
        subject: `Callback Request from ${callbackData.customerName}`,
        priority: callbackData.preferredTime === "Immediately / Urgent" ? "Urgent" : "Medium",
      });

      if (res.data?.success) {
        setSubmittedCallback(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule callback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#121212] text-luxury-black dark:text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Hero */}
        <div className="text-center space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/30">
            Niyora Concierge Service
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-luxury-black dark:text-white">
            We Are Here To Assist You
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto font-light">
            Have a question about an order, customized gift, return, or general inquiry? Our dedicated team is available to assist you.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex justify-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setActiveMode("message");
                setError("");
              }}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
                activeMode === "message"
                  ? "bg-gold-500 text-white shadow-md shadow-gold-500/20"
                  : "bg-white dark:bg-[#1C1C1C] text-gray-500 border border-gold-200/50 dark:border-gold-900/30 hover:text-gold-600"
              }`}
            >
              <span>✉️</span>
              <span>Send Message</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode("callback");
                setError("");
              }}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
                activeMode === "callback"
                  ? "bg-gold-500 text-white shadow-md shadow-gold-500/20"
                  : "bg-white dark:bg-[#1C1C1C] text-gray-500 border border-gold-200/50 dark:border-gold-900/30 hover:text-gold-600"
              }`}
            >
              <span>📞</span>
              <span>Request Instant Callback</span>
            </button>
          </div>
        </div>

        {submittedTicket ? (
          /* Submission Success Card */
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-gold-200/50 dark:border-gold-900/30 shadow-xl text-center space-y-5 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center text-3xl border border-emerald-500/30">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-luxury-black dark:text-white">
                Inquiry Received
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-light">
                Your support request has been queued in our concierge system. A confirmation ticket has been generated.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#222] border border-gold-200/40 dark:border-gold-900/20 max-w-sm mx-auto text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Ticket ID:</span>
                <span className="font-mono font-bold text-gold-600 dark:text-gold-400">
                  {submittedTicket.ticketCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Subject:</span>
                <span className="font-medium text-luxury-black dark:text-white truncate max-w-[180px]">
                  {submittedTicket.subject}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Category:</span>
                <span className="font-medium text-luxury-black dark:text-white">
                  {submittedTicket.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  {submittedTicket.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubmittedTicket(null);
                  setFormData({
                    name: "",
                    email: "",
                    phone: "",
                    orderNumber: "",
                    category: "Contact Us",
                    priority: "Medium",
                    subject: "",
                    message: "",
                  });
                }}
                className="px-6 py-2.5 rounded-full border border-gold-500/50 text-gold-600 dark:text-gold-400 hover:bg-gold-500/10 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Submit Another Inquiry
              </button>
              <Link
                to="/"
                className="px-6 py-2.5 rounded-full bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold uppercase tracking-wider transition shadow-md shadow-gold-500/20 cursor-pointer"
              >
                Back To Store
              </Link>
            </div>
          </div>
        ) : submittedCallback ? (
          /* Callback Success Card */
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-gold-200/50 dark:border-gold-900/30 shadow-xl text-center space-y-5 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center text-3xl border border-emerald-500/30">
              📞
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-luxury-black dark:text-white">
                Callback Scheduled
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-light">
                Our concierge team has received your callback request. An SLA countdown timer has commenced for an outbound call.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#222] border border-gold-200/40 dark:border-gold-900/20 max-w-sm mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Callback Code:</span>
                <span className="font-mono font-bold text-luxury-black dark:text-white">
                  {submittedCallback.callbackCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Linked Ticket ID:</span>
                <span className="font-mono font-bold text-gold-600 dark:text-gold-400">
                  {submittedCallback.ticketCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Target Response SLA:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Within 15 Minutes
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubmittedCallback(null);
                  setCallbackData({
                    customerName: "",
                    customerPhone: "",
                    customerEmail: "",
                    orderCode: "",
                    preferredTime: "Immediately / Urgent",
                    notes: "",
                  });
                }}
                className="px-6 py-2.5 rounded-full border border-gold-500/50 text-gold-600 dark:text-gold-400 hover:bg-gold-500/10 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Request Another Callback
              </button>
              <Link
                to="/"
                className="px-6 py-2.5 rounded-full bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold uppercase tracking-wider transition shadow-md shadow-gold-500/20 cursor-pointer"
              >
                Back To Store
              </Link>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Info Column */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-gold-200/50 dark:border-gold-900/30 shadow-md space-y-6">
              <div>
                <h3 className="text-lg font-serif font-bold text-luxury-black dark:text-white">
                  Concierge Desk
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-light">
                  We take pride in exceptional customer satisfaction and handcrafted gift personalization.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <span className="text-lg">📍</span>
                  <div>
                    <span className="font-bold block text-luxury-black dark:text-white">Niyora Atelier</span>
                    <span className="text-gray-400 font-light">Crafted with love in India</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-lg">✉️</span>
                  <div>
                    <span className="font-bold block text-luxury-black dark:text-white">Email Inquiries</span>
                    <span className="text-gray-400 font-light">support@niyoragifts.com</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-lg">⏰</span>
                  <div>
                    <span className="font-bold block text-luxury-black dark:text-white">Operating Hours</span>
                    <span className="text-gray-400 font-light">Mon - Sat: 9:00 AM - 7:00 PM IST</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-lg">⚡</span>
                  <div>
                    <span className="font-bold block text-luxury-black dark:text-white">Callback SLA</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">15-minute response target</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gold-50/50 dark:bg-gold-950/20 border border-gold-200/40 dark:border-gold-900/30 text-xs text-gray-600 dark:text-gray-300">
                <span className="font-bold text-gold-600 dark:text-gold-400 block mb-1">
                  💡 Have an active order?
                </span>
                Include your Order Number in the form to help us expedite your request with priority.
              </div>
            </div>

            {/* Right Contact Form Column */}
            <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1A1A1A] border border-gold-200/50 dark:border-gold-900/30 shadow-md">
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {activeMode === "message" ? (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Aditi Sharma"
                        required
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. aditi@example.com"
                        required
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Order Number (Optional)
                      </label>
                      <input
                        type="text"
                        name="orderNumber"
                        value={formData.orderNumber}
                        onChange={handleChange}
                        placeholder="e.g. ORD-20260917-ABC123"
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Summary of your inquiry..."
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                      Your Message / Details *
                    </label>
                    <textarea
                      rows={4}
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Please share the details of your inquiry, question, or issue..."
                      required
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-3 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 resize-none transition-colors"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto px-8 py-3 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-md shadow-gold-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? "Transmitting to Concierge..." : "Send Message"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCallbackSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={callbackData.customerName}
                        onChange={handleCallbackChange}
                        placeholder="e.g. Rajesh Kumar"
                        required
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Mobile / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        name="customerPhone"
                        value={callbackData.customerPhone}
                        onChange={handleCallbackChange}
                        placeholder="e.g. +91 98765 43210"
                        required
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        name="customerEmail"
                        value={callbackData.customerEmail}
                        onChange={handleCallbackChange}
                        placeholder="e.g. rajesh@example.com"
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Order Code (Optional)
                      </label>
                      <input
                        type="text"
                        name="orderCode"
                        value={callbackData.orderCode}
                        onChange={handleCallbackChange}
                        placeholder="e.g. ORD-20260917-ABC123"
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                      Preferred Callback Time
                    </label>
                    <select
                      name="preferredTime"
                      value={callbackData.preferredTime}
                      onChange={handleCallbackChange}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
                    >
                      <option value="Immediately / Urgent">⚡ Urgent / Immediately (Within 15 Mins)</option>
                      <option value="Morning (9 AM - 12 PM)">Morning (9:00 AM - 12:00 PM)</option>
                      <option value="Afternoon (12 PM - 4 PM)">Afternoon (12:00 PM - 4:00 PM)</option>
                      <option value="Evening (4 PM - 7 PM)">Evening (4:00 PM - 7:00 PM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                      What would you like assistance with?
                    </label>
                    <textarea
                      rows={3}
                      name="notes"
                      value={callbackData.notes}
                      onChange={handleCallbackChange}
                      placeholder="e.g. Inquiry regarding personalized photo frame, delivery timeline to Delhi, or custom packaging..."
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-3 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 resize-none transition-colors"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto px-8 py-3 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-md shadow-gold-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span>📞</span>
                      <span>{submitting ? "Booking Callback..." : "Request Outbound Callback"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contact;
