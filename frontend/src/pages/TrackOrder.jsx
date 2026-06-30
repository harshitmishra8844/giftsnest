import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

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

  useEffect(() => {
    api.get("/store-info").then(res => setStoreInfo(res.data)).catch(() => null);
  }, []);

  const getOrderDisplayId = (order) => order?.orderCode || (order?._id ? order._id.slice(-8) : "N/A");

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
    // Clear error when user starts typing
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
      case "Pending": return "bg-gray-50 text-gray-800 border border-gray-200/40";
      case "Order Confirmed": return "bg-purple-50 text-purple-800 border border-purple-200/40";
      case "Processing": return "bg-amber-50 text-amber-800 border border-amber-200/40";
      case "Shipped": return "bg-blue-50 text-blue-800 border border-blue-200/40";
      case "Delivered": return "bg-gold-50 text-gold-800 border border-gold-200/45";
      case "Cancelled": return "bg-red-50 text-red-800 border border-red-200/40";
      default: return "bg-gray-50 text-gray-800 border border-gray-200/40";
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

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-light tracking-tight text-luxury-black md:text-4xl">
            Track Your Order
          </h1>
          <p className="mt-4 text-xs text-text-secondary font-light">
            Enter your order details to track the status of your gift delivery
          </p>
        </div>

        <div className="mx-auto max-w-2xl animate-fade-in">
          <div className="rounded-3xl border border-champagne/45 bg-white/70 p-8 shadow-xs backdrop-blur-md">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="orderId" className="block text-[10px] font-bold uppercase tracking-wider text-luxury-black mb-1.5">
                  Order ID
                </label>
                <input
                  type="text"
                  id="orderId"
                  name="orderId"
                  value={formData.orderId}
                  onChange={handleInputChange}
                  placeholder="Enter your order ID (e.g., ORD-20241225-ABC123)"
                  className="w-full rounded-full border border-champagne bg-white px-4 py-3 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
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
                  placeholder="Enter the email used for order"
                  className="w-full rounded-full border border-champagne bg-white px-4 py-3 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-200/40 p-4">
                  <p className="text-xs text-red-650 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-sm transition cursor-pointer"
              >
                {loading ? "Tracking Order..." : "Track Order"}
              </button>
            </form>

            {success && orderDetails && (
              <div className="mt-8 border-t border-champagne/30 pt-6">
                <h3 className="text-base font-serif font-semibold text-luxury-black mb-4">Order Details</h3>

                <div className="space-y-4 text-xs text-text-secondary font-light">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="font-bold text-luxury-black mb-0.5">Order ID</p>
                      <p className="text-luxury-black font-medium">{orderDetails.orderCode}</p>
                    </div>
                    <div>
                      <p className="font-bold text-luxury-black mb-0.5">Status</p>
                      <span className={`inline-flex px-2.5 py-0.5 text-[9px] font-bold uppercase border tracking-wider rounded-full ${getStatusColor(orderDetails.status)}`}>
                        {orderDetails.status}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-luxury-black mb-0.5">Order Date</p>
                      <p className="text-luxury-black font-medium">{formatDate(orderDetails.createdAt)}</p>
                    </div>
                    <div>
                      <p className="font-bold text-luxury-black mb-0.5">Total Amount</p>
                      <p className="text-luxury-black font-semibold font-serif">₹{orderDetails.totalPrice}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-champagne/20">
                    <p className="font-bold text-luxury-black mb-1">Delivery Address</p>
                    <p className="text-luxury-black leading-relaxed">
                      <span className="font-medium">{orderDetails.address.fullName}</span><br />
                      {orderDetails.address.city}, {orderDetails.address.state} {orderDetails.address.postalCode}
                    </p>
                  </div>

                  {orderDetails.trackingId && (
                    <div className="pt-2 border-t border-champagne/20">
                      <p className="font-bold text-luxury-black mb-1">Tracking Information</p>
                      <p className="text-luxury-black">
                        Tracking ID: {orderDetails.trackingId}<br />
                        Carrier: <span className="capitalize">{orderDetails.trackingCarrier}</span>
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-champagne/20">
                    <p className="font-bold text-luxury-black mb-2">Items Ordered</p>
                    <div className="space-y-2">
                      {orderDetails.products.map((product, index) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <span className="text-luxury-black">{product.name} (x{product.quantity})</span>
                          <span className="font-serif text-luxury-black font-medium">₹{product.price * product.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {orderDetails.status === "Delivered" && (
                    <div className="pt-4 border-t border-champagne/30 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(orderDetails)}
                        className="rounded-full bg-luxury-black hover:bg-gold-600 text-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition duration-300 flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Invoice
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-champagne/30 pt-6">
              <h3 className="text-base font-serif font-semibold text-luxury-black">Order Status Guide</h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-50 text-[10px] font-bold border border-purple-200/50 text-purple-800">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-luxury-black">Order Confirmed</p>
                    <p className="text-[11px] text-text-secondary font-light mt-0.5">Your order has been received and confirmed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-[10px] font-bold border border-amber-200/50 text-amber-800">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-luxury-black">Preparing</p>
                    <p className="text-[11px] text-text-secondary font-light mt-0.5">Your gift is being carefully prepared</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold border border-blue-200/50 text-blue-800">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-luxury-black">Out for Delivery</p>
                    <p className="text-[11px] text-text-secondary font-light mt-0.5">Your order is on the way to you</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-50 text-[10px] font-bold border border-gold-200/40 text-gold-850">
                    4
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-luxury-black">Delivered</p>
                    <p className="text-[11px] text-text-secondary font-light mt-0.5">Your gift has been successfully delivered</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-text-secondary font-light">
              Need help?{" "}
              <Link to="/products" className="font-bold text-gold-700 hover:text-gold-800 transition">
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;