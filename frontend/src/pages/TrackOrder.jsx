import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api, { resolveMediaUrl } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowLeft, Truck, Package, Calendar, MapPin, CreditCard, Download, HelpCircle,
  Clock, ShieldCheck, ShoppingBag, FileText, CheckCircle, RefreshCw, MessageSquare, Phone, Mail, Compass
} from "lucide-react";

const trackingSteps = ["Pending", "Order Confirmed", "Processing", "Shipped", "Delivered"];

const getStepIndex = (status) => {
  const index = trackingSteps.findIndex((step) => step === status);
  if (index >= 0) return index;
  return 0;
};

const TrackOrder = () => {
  const [formData, setFormData] = useState({
    orderId: "",
    email: "",
  });
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    api.get("/store-info").then(res => setStoreInfo(res.data)).catch(() => null);
  }, []);

  // Fetch recommendations
  useEffect(() => {
    const fetchRecs = async () => {
      try {
        setLoadingRecs(true);
        const { data } = await api.get("/products");
        setRecommendations(data.slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRecs(false);
      }
    };
    fetchRecs();
  }, []);

  const getOrderDisplayId = (order) => order?.orderCode || (order?._id ? order._id.slice(-8) : "N/A");

  const getTrackingUrl = (trackingId, carrier = "generic") => {
    if (!trackingId) return "#";
    const cleanId = encodeURIComponent(trackingId.trim());
    const normalizedCarrier = String(carrier || "generic").toLowerCase();

    if (normalizedCarrier === "delhivery") {
      return `https://www.delhivery.com/track/package/${cleanId}`;
    }
    if (normalizedCarrier === "bluedart") {
      return `https://www.bluedart.com/tracking?trackingNo=${cleanId}`;
    }
    if (normalizedCarrier === "xpressbees") {
      return `https://www.xpressbees.com/shipment-tracking?awb=${cleanId}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(`courier tracking ${trackingId}`)}`;
  };

  const handleDownloadInvoice = (order) => {
    const safeOrder = order || {};
    const address = safeOrder?.address || {};
    const items = Array.isArray(safeOrder?.products) ? safeOrder.products : [];
    const subtotal = Number(safeOrder?.subtotal || 0);
    const discount = Number(safeOrder?.discountAmount || 0);
    const total = Number(safeOrder?.totalPrice || 0);
    const paymentStamp = safeOrder.paymentMethod === "COD" && safeOrder.paymentStatus !== "Paid" ? "COD - UNPAID" : "PAID";

    const info = storeInfo || {
      storeName: "Niyora Gifts",
      storePhone: "+91-90000-00000",
      storeAddress: "123 Commerce Street, Mumbai, Maharashtra 400001, India",
      storeLogoUrl: "",
    };

    const logoHtml = info.storeLogoUrl
      ? `<img src="${info.storeLogoUrl}" alt="Store Logo" class="store-logo" />`
      : `<div class="logo-dot">N</div>`;

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to download invoice.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${getOrderDisplayId(safeOrder)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,450;0,650;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
            @page { size: A4 portrait; margin: 8mm; }
            body { font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; color: #1a1a1a; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .sheet { width: 100%; max-width: 194mm; margin: 0 auto; border: 1px solid #e5dccb; padding: 10mm; box-sizing: border-box; background: #faf9f6; border-radius: 12px; position: relative; }
            .top-banner { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 2px solid #b89047; padding-bottom: 12px; }
            .brand { display: flex; align-items: center; gap: 10px; }
            .logo-dot { width: 36px; height: 36px; border-radius: 999px; background: linear-gradient(135deg, #b89047, #d4af37); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-family: 'Playfair Display', serif; font-size: 16px; }
            .store-logo { width: 42px; height: 42px; object-fit: contain; border-radius: 6px; border: 1px solid #e5dccb; background: #fff; padding: 2px; }
            .brand-name { margin: 0; font-size: 16px; font-weight: 700; font-family: 'Playfair Display', serif; color: #1a1a1a; letter-spacing: 0.5px; }
            .brand-subtitle { margin: 0; font-size: 9px; text-transform: uppercase; letter-spacing: 1.2px; color: #b89047; font-weight: 600; }
            .pay-stamp { border: 1px solid; padding: 4px 12px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; font-family: 'Outfit', sans-serif; }
            .pay-stamp.paid { color: #1b4332; border-color: #52b788; background-color: #d8f3dc; }
            .pay-stamp.cod { color: #7f5539; border-color: #ddb892; background-color: #ede0d4; }
            h1 { margin: 0; font-size: 22px; font-family: 'Playfair Display', serif; font-weight: 500; color: #1a1a1a; }
            h2 { margin: 0 0 6px; font-size: 11px; font-family: 'Outfit', sans-serif; text-transform: uppercase; color: #8b7355; border-bottom: 1px solid #e5dccb; padding-bottom: 4px; font-weight: 700; letter-spacing: 1px; }
            p { margin: 4px 0; font-size: 11px; line-height: 1.45; color: #4a4a4a; }
            strong { color: #1a1a1a; }
            .top { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
            .box { border: 1px solid #e5dccb; border-radius: 8px; padding: 10px; flex: 1; background: #fff; }
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 12px; border-radius: 8px; overflow: hidden; border: 1px solid #e5dccb; }
            th, td { text-align: left; padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #e5dccb; }
            th { color: #8b7355; font-family: 'Outfit', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; background-color: #f5f0e6; }
            td { background-color: #fff; color: #333; }
            tr:last-child td { border-bottom: none; }
            .totals { margin-top: 12px; margin-left: auto; width: 240px; background: #fff; border: 1px solid #e5dccb; border-radius: 8px; padding: 10px; }
            .totals p { display: flex; justify-content: space-between; margin: 4px 0; }
            .grand { font-family: 'Outfit', sans-serif; font-weight: 700; border-top: 1px solid #e5dccb; padding-top: 8px; margin-top: 8px; color: #b89047; font-size: 13px; }
            .muted { color: #6b7280; font-size: 10px; margin-top: 10px; }
            .footer-note { margin-top: 25px; text-align: center; font-family: 'Playfair Display', serif; font-style: italic; font-size: 12px; color: #8b7355; border-top: 1px dashed #e5dccb; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="top-banner">
              <div class="brand">
                ${logoHtml}
                <div>
                  <p class="brand-name">${info.storeName || "Niyora Gifts"}</p>
                  <p class="brand-subtitle">Customer Invoice</p>
                </div>
              </div>
              <div class="pay-stamp ${paymentStamp === "PAID" ? "paid" : "cod"}">${paymentStamp}</div>
            </div>
            <div class="top">
              <div class="box">
                <h1>Tax Invoice</h1>
                <p><strong>${info.storeName}</strong></p>
                <p>${info.storeAddress}</p>
                <p>Phone: ${info.storePhone}</p>
              </div>
              <div class="box">
                <h2>Invoice Details</h2>
                <p><strong>Order ID:</strong> ${getOrderDisplayId(safeOrder)}</p>
                <p><strong>Date:</strong> ${new Date(safeOrder.createdAt || Date.now()).toLocaleString("en-IN")}</p>
                <p><strong>Status:</strong> ${safeOrder.status || "Pending"}</p>
                <p><strong>Coupon:</strong> ${safeOrder.couponCode || "-"}</p>
              </div>
            </div>
            <div class="box">
              <h2>Bill To / Ship To</h2>
              <p><strong>${address.fullName || "N/A"}</strong></p>
              <p>${address.phone || "-"}</p>
              <p>${address.line1 || "-"}</p>
              <p>${[address.city, address.state, address.postalCode].filter(Boolean).join(", ") || "-"}</p>
              <p>${address.country || "-"}</p>
            </div>
            <table>
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Price</th><th>Line Total</th></tr>
              </thead>
              <tbody>
                ${items.map((item) => {
                  const qty = Number(item.quantity || 0);
                  const price = Number(item.price || 0);
                  const lineTotal = (qty * price).toFixed(2);
                  return `<tr><td>${item.name || "Item"}</td><td>${qty}</td><td>INR ${price.toFixed(2)}</td><td>INR ${lineTotal}</td></tr>`;
                }).join("")}
              </tbody>
            </table>
            <div class="totals">
              <p><span>Subtotal</span><span>INR ${subtotal.toFixed(2)}</span></p>
              <p><span>Discount</span><span>- INR ${discount.toFixed(2)}</span></p>
              <p class="grand"><span>Total</span><span>INR ${total.toFixed(2)}</span></p>
            </div>
            <div class="footer-note">
              Thank you for letting us curate your special moments. With love, Niyora.
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get("orderId") || params.get("id");
    const emailParam = params.get("email");
    if (orderIdParam && emailParam) {
      setFormData({ orderId: orderIdParam, email: emailParam });
      const autoTrack = async () => {
        setLoading(true);
        setError("");
        setOrderDetails(null);
        setSuccess(false);
        try {
          const response = await api.post("/orders/track", {
            orderId: orderIdParam,
            email: emailParam,
          });
          setOrderDetails(response.data.order);
          setSuccess(true);
        } catch (err) {
          setError(err.response?.data?.message || "Failed to track order. Please try again.");
        } finally {
          setLoading(false);
        }
      };
      autoTrack();
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrderDetails(null);
    setSuccess(false);

    try {
      const response = await api.post("/orders/track", {
        orderId: formData.orderId,
        email: formData.email,
      });

      setOrderDetails(response.data.order);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to track order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-gray-100 text-gray-700 border border-gray-200/50";
      case "Order Confirmed": return "bg-emerald-100 text-emerald-900 border border-emerald-200/50";
      case "Processing": return "bg-indigo-100 text-indigo-900 border border-indigo-200/50";
      case "Shipped": return "bg-blue-100 text-blue-900 border border-blue-200/50";
      case "Delivered": return "bg-amber-100 text-amber-900 border border-gold-300/30";
      case "Cancelled": return "bg-rose-100 text-rose-900 border border-rose-200/50";
      default: return "bg-gray-100 text-gray-700 border border-gray-200/50";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper values for timeline offset times
  const getTimelineTime = (baseDate, daysOffset = 0, hoursOffset = 0) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + daysOffset);
    date.setHours(date.getHours() + hoursOffset);
    return date.toLocaleString("en-IN", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-12 px-4 md:px-8 font-sans text-luxury-black">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-gold-700 hover:text-gold-800 transition mb-2 font-bold">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
          </Link>
          <h1 className="text-3xl md:text-4xl font-serif font-light tracking-wide text-luxury-black">
            Track Gift Journey
          </h1>
          <p className="text-xs text-text-secondary font-light max-w-sm mx-auto leading-relaxed">
            Verify shipment coordinates, timestamps fulfillment, and download curation receipts.
          </p>
        </div>

        {/* STANDALONE SEARCH CARD */}
        <div className="max-w-2xl mx-auto rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 md:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="orderId" className="block text-[10px] font-bold uppercase tracking-wider text-luxury-black mb-1.5">
                  Order Reference ID
                </label>
                <input
                  type="text"
                  id="orderId"
                  name="orderId"
                  value={formData.orderId}
                  onChange={handleInputChange}
                  placeholder="e.g. ORD-20260630-1234"
                  className="w-full rounded-full border border-champagne bg-white px-4.5 py-3 text-xs outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-wider text-luxury-black mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="recipient@example.com"
                  className="w-full rounded-full border border-champagne bg-white px-4.5 py-3 text-xs outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200/50 p-4 text-xs text-rose-800 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-60 transition shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing Logistics...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Track Surprises
                </>
              )}
            </button>
          </form>
        </div>

        {/* RESULTS RENDER */}
        <AnimatePresence mode="wait">
          {success && orderDetails && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Premium Tracking Header Card */}
              <div className="rounded-3xl border border-champagne/45 bg-gradient-to-tr from-white to-gold-50/10 p-6 md:p-8 shadow-sm grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-gold-500 text-white uppercase tracking-widest">
                      Luxe Parcel
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${getStatusColor(orderDetails.status)}`}>
                      {orderDetails.status}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-serif font-light text-luxury-black">
                    Order Reference: <span className="font-bold">{orderDetails.orderCode}</span>
                  </h2>
                  <div className="space-y-1.5 text-xs text-text-secondary font-light">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gold-600" />
                      <span>Estimated Curated Delivery: <strong className="text-luxury-black">{getTimelineTime(orderDetails.createdAt, 5)}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-gold-600" />
                      <span>Logistics Partner: <strong className="text-luxury-black capitalize">{orderDetails.trackingCarrier || "Niyora Premium Delivery Network"}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-gold-600" />
                      <span>AWB Tracking ID: <strong className="text-luxury-black font-mono">{orderDetails.trackingId || "Pending Allocation"}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between items-start md:items-end border-t md:border-t-0 md:border-l border-champagne/30 pt-4 md:pt-0 md:pl-6 space-y-4">
                  <div className="space-y-1 text-xs text-text-secondary font-light text-left md:text-right">
                    <p className="font-bold text-luxury-black uppercase tracking-wider text-[9px]">Delivery Destination</p>
                    <p className="font-semibold text-luxury-black">{orderDetails.address.fullName}</p>
                    <p>{orderDetails.address.line1}</p>
                    <p>{orderDetails.address.city}, {orderDetails.address.state} - {orderDetails.address.postalCode}</p>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {orderDetails.status === "Delivered" && (
                      <button
                        onClick={() => handleDownloadInvoice(orderDetails)}
                        className="flex-1 sm:flex-initial rounded-full bg-luxury-black hover:bg-gold-500 text-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" /> Invoice
                      </button>
                    )}
                    <a
                      href="mailto:niyoragifts@gmail.com?subject=Inquiry%20Order%20"
                      className="flex-1 sm:flex-initial rounded-full border border-champagne bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-luxury-black hover:bg-gold-50 transition text-center"
                    >
                      Need Help?
                    </a>
                  </div>
                </div>
              </div>

              {/* Large Status Illustration Card */}
              <div className="rounded-3xl border border-champagne/45 bg-white p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-2 relative z-10 text-center md:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">Current Pipeline Activity</span>
                  <h3 className="text-xl font-serif font-light text-luxury-black">
                    {orderDetails.status === "Delivered" ? "Gift Delivered Successfully" :
                     orderDetails.status === "Shipped" ? "In Transit to Destination" :
                     orderDetails.status === "Processing" ? "Handcrafting & Packing Surprises" :
                     orderDetails.status === "Order Confirmed" ? "Curator Assignment Completed" : "Order Placed & Queued"}
                  </h3>
                  <p className="text-xs text-text-secondary font-light max-w-md leading-relaxed">
                    We ensure premium gift handling at every check-point node. Your surprise parcel is treated with the utmost care.
                  </p>
                </div>
                {/* Visual badge/icon */}
                <div className="relative z-10 w-24 h-24 rounded-full bg-gold-50 border border-gold-200/50 flex items-center justify-center text-4xl shadow-inner animate-pulse-subtle">
                  {orderDetails.status === "Delivered" ? "🎁" :
                   orderDetails.status === "Shipped" ? "🚚" :
                   orderDetails.status === "Processing" ? "✨" : "📜"}
                </div>
              </div>

              {/* Horizontal Progress Timeline */}
              <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 md:p-8 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-luxury-black border-b border-champagne/20 pb-2">Fulfillment Milestones</h3>
                <div className="relative pt-4">
                  {/* Timeline Bar */}
                  <div className="relative h-1 w-full bg-champagne/40 rounded-full">
                    <div
                      className="absolute h-1 bg-gold-500 rounded-full transition-all duration-500"
                      style={{ width: `${(getStepIndex(orderDetails.status) / (trackingSteps.length - 1)) * 100}%` }}
                    />
                  </div>

                  {/* Timeline Dots */}
                  <div className="grid grid-cols-5 gap-1 text-[9px] font-bold text-text-secondary uppercase tracking-wider text-center mt-4">
                    {trackingSteps.map((step, idx) => {
                      const currentIdx = getStepIndex(orderDetails.status);
                      const isCompleted = idx <= currentIdx;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className={`mx-auto h-5 w-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${isCompleted ? 'border-gold-500 bg-gold-500 text-white' : 'border-champagne bg-white text-gray-300'}`}>
                            {isCompleted ? "✓" : idx + 1}
                          </div>
                          <span className={isCompleted ? "text-gold-800 font-bold" : "font-light"}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Shipment Logistics & Delivery Timeline (Vertical) */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Vertical activity history timeline logs */}
                <div className="md:col-span-2 rounded-3xl border border-champagne/45 bg-white p-6 md:p-8 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-luxury-black border-b border-champagne/20 pb-2">Detailed Tracking Timeline</h3>
                  <div className="space-y-5 border-l border-champagne/50 pl-5 ml-2">
                    {/* Step Delivered */}
                    {getStepIndex(orderDetails.status) >= 4 && (
                      <div className="relative">
                        <span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-gold-500 ring-4 ring-gold-50" />
                        <p className="font-semibold text-xs text-luxury-black">Surprise Gift Delivered Successfully</p>
                        <p className="text-[10px] text-text-secondary font-light mt-0.5">Location: Destination | {getTimelineTime(orderDetails.createdAt, 4)}</p>
                      </div>
                    )}
                    {/* Step Shipped */}
                    {getStepIndex(orderDetails.status) >= 3 && (
                      <div className="relative">
                        <span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-gold-500 ring-4 ring-gold-50" />
                        <p className="font-semibold text-xs text-luxury-black">Dispatched via Logistics Carrier Partner</p>
                        <p className="text-[10px] text-text-secondary font-light mt-0.5">Location: Hub Sorting Center | {getTimelineTime(orderDetails.createdAt, 2)}</p>
                      </div>
                    )}
                    {/* Step Processing */}
                    {getStepIndex(orderDetails.status) >= 2 && (
                      <div className="relative">
                        <span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-gold-500 ring-4 ring-gold-50" />
                        <p className="font-semibold text-xs text-luxury-black">Handcrafted Gift Curated & Quality Audited</p>
                        <p className="text-[10px] text-text-secondary font-light mt-0.5">Location: Mumbai Curation Center | {getTimelineTime(orderDetails.createdAt, 1)}</p>
                      </div>
                    )}
                    {/* Step Placed/Confirmed */}
                    <div className="relative">
                      <span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-gold-500 ring-4 ring-gold-50" />
                      <p className="font-semibold text-xs text-luxury-black">Order Placed & Payment Confirmed</p>
                      <p className="text-[10px] text-text-secondary font-light mt-0.5">Location: System Queue | {formatDate(orderDetails.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Shipment logistics stats card */}
                <div className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-luxury-black border-b border-champagne/20 pb-2">Shipment Coordinates</h3>
                    <div className="space-y-3.5 text-xs text-text-secondary font-light pt-2">
                      <p>Weight: <strong className="text-luxury-black font-mono">1.25 Kg</strong></p>
                      <p>Carrier Partner: <strong className="text-luxury-black capitalize">{orderDetails.trackingCarrier || "Registered Partner"}</strong></p>
                      <p>Courier Method: <strong className="text-luxury-black">Express Surprise Curate</strong></p>
                      <p>AWB Reference: <strong className="text-luxury-black font-mono">{orderDetails.trackingId || "Pending Allocation"}</strong></p>
                    </div>
                  </div>
                  {orderDetails.trackingId && (
                    <a
                      href={getTrackingUrl(orderDetails.trackingId, orderDetails.trackingCarrier)}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-center rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold uppercase tracking-widest text-[9px] py-3.5 transition"
                    >
                      Track Live Courier
                    </a>
                  )}
                </div>
              </div>

              {/* Purchased items list detail card */}
              <div className="rounded-3xl border border-champagne/45 bg-white p-6 md:p-8 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-luxury-black border-b border-champagne/20 pb-2">Items inside Surprise Box</h3>
                <div className="divide-y divide-champagne/15">
                  {orderDetails.products.map((item, idx) => (
                    <div key={idx} className="flex gap-4 py-3.5 items-center">
                      {item.image && (
                        <img
                          src={resolveMediaUrl(item.image)}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-2xl border border-champagne/25 shadow-inner"
                        />
                      )}
                      <div className="flex-1 min-w-0 text-xs font-light text-text-secondary space-y-1">
                        <h4 className="font-semibold text-sm text-luxury-black truncate">{item.name}</h4>
                        <p>Quantity Ordered: <strong>{item.quantity}</strong></p>
                        {item.customization && Object.keys(item.customization).length > 0 && (
                          <div className="text-[10px] bg-gold-50/10 p-2 rounded-xl border border-gold-200/20 max-w-sm mt-1.5">
                            <span className="font-bold text-gold-800 uppercase tracking-widest text-[8px] block mb-1">Custom Curation Detail:</span>
                            {Object.entries(item.customization).map(([k, v]) => (
                              <p key={k} className="capitalize"><strong>{k}:</strong> {String(v)}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-serif font-bold text-luxury-black">INR {item.price * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary breakdown */}
              <div className="rounded-3xl border border-champagne/45 bg-white p-6 md:p-8 shadow-sm max-w-md ml-auto space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-luxury-black border-b border-champagne/20 pb-2">Payment Details Curation</h3>
                <div className="space-y-2 text-xs text-text-secondary font-light">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>INR {orderDetails.subtotal || orderDetails.totalPrice}</span>
                  </div>
                  {orderDetails.discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount (Coupon)</span>
                      <span>- INR {orderDetails.discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping Charges</span>
                    <span className="text-emerald-700 uppercase font-bold text-[10px] tracking-wider">Free curation shipping</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-champagne/20 font-serif font-bold text-luxury-black text-sm">
                    <span>Grand Total</span>
                    <span className="text-gold-700">INR {orderDetails.totalPrice}</span>
                  </div>
                </div>
                <div className="pt-2 text-[10px] text-gray-400 font-light border-t border-champagne/15 font-mono">
                  <p>Method: {orderDetails.paymentMethod} &bull; Status: {orderDetails.paymentStatus}</p>
                  {orderDetails.razorpayPaymentId && <p>Transaction ID: {orderDetails.razorpayPaymentId}</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Support contacts concierge */}
        <div className="rounded-3xl border border-champagne/45 bg-white p-6 md:p-8 shadow-sm max-w-3xl mx-auto space-y-4">
          <h3 className="text-sm font-serif font-bold text-luxury-black text-center">Niyora Direct Assistance</h3>
          <p className="text-xs text-text-secondary font-light text-center max-w-md mx-auto leading-relaxed">
            Need urgent changes to your delivery address, package custom message, or support timelines queries?
          </p>
          <div className="grid gap-3 sm:grid-cols-3 pt-2.5">
            <a
              href="mailto:niyoragifts@gmail.com"
              className="rounded-2xl border border-gold-200/30 bg-gold-50/5 p-4 hover:bg-gold-50/10 transition text-center"
            >
              <Mail className="w-5 h-5 mx-auto text-gold-600 mb-2" />
              <h4 className="font-serif font-bold text-xs text-luxury-black">Email Concierge</h4>
              <p className="text-[10px] text-text-secondary mt-0.5">niyoragifts@gmail.com</p>
            </a>
            <a
              href="https://wa.me/919000000000"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-gold-200/30 bg-gold-50/5 p-4 hover:bg-gold-50/10 transition text-center"
            >
              <MessageSquare className="w-5 h-5 mx-auto text-emerald-600 mb-2" />
              <h4 className="font-serif font-bold text-xs text-luxury-black">WhatsApp Line</h4>
              <p className="text-[10px] text-text-secondary mt-0.5">Instant live response</p>
            </a>
            <Link
              to="/products"
              className="rounded-2xl border border-gold-200/30 bg-gold-50/5 p-4 hover:bg-gold-50/10 transition text-center"
            >
              <Compass className="w-5 h-5 mx-auto text-gold-600 mb-2 animate-spin-slow" />
              <h4 className="font-serif font-bold text-xs text-luxury-black">Explore Catalog</h4>
              <p className="text-[10px] text-text-secondary mt-0.5">Shop fine gift packs</p>
            </Link>
          </div>
        </div>

        {/* Recommended catalog products horizontal scroll */}
        {recommendations.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-serif font-light text-luxury-black text-center">Exquisite Trending Gifts</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendations.map((prod) => (
                <div key={prod._id} className="group border border-champagne/20 bg-white rounded-3xl overflow-hidden hover:border-gold-300/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                  <div className="relative aspect-square bg-gold-50/10">
                    <img
                      src={resolveMediaUrl(prod.image || prod.images?.[0])}
                      alt={prod.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4 space-y-1">
                    <h4 className="text-xs font-serif font-semibold text-luxury-black line-clamp-1 group-hover:text-gold-600 transition-colors">
                      <Link to={`/products/${prod.slug || prod._id}`}>{prod.name}</Link>
                    </h4>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-xs font-serif font-bold text-luxury-black">INR {prod.price}</span>
                      <span className="text-[8px] uppercase tracking-wider text-gold-700 bg-gold-50 px-2 py-0.5 rounded font-bold">{prod.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;