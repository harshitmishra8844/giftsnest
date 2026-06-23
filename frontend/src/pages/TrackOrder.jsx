import { useState } from "react";
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