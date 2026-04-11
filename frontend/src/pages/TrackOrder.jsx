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
      case "Pending": return "bg-gray-100 text-gray-700";
      case "Order Confirmed": return "bg-blue-100 text-blue-700";
      case "Processing": return "bg-yellow-100 text-yellow-700";
      case "Shipped": return "bg-orange-100 text-orange-700";
      case "Delivered": return "bg-green-100 text-green-700";
      case "Cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 to-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-900 md:text-4xl">
            Track Your Order
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Enter your order details to track the status of your gift delivery
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">
                  Order ID
                </label>
                <input
                  type="text"
                  id="orderId"
                  name="orderId"
                  value={formData.orderId}
                  onChange={handleInputChange}
                  placeholder="Enter your order ID (e.g., ORD-20241225-ABC123)"
                  className="mt-1 block w-full rounded-lg border border-emerald-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter the email used for order"
                  className="mt-1 block w-full rounded-lg border border-emerald-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Tracking Order..." : "Track Order"}
              </button>
            </form>

            {success && orderDetails && (
              <div className="mt-8 border-t border-emerald-100 pt-6">
                <h3 className="text-lg font-semibold text-emerald-900 mb-4">Order Details</h3>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Order ID</p>
                      <p className="text-sm text-gray-900">{orderDetails.orderCode}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(orderDetails.status)}`}>
                        {orderDetails.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Order Date</p>
                      <p className="text-sm text-gray-900">{formatDate(orderDetails.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Amount</p>
                      <p className="text-sm text-gray-900">₹{orderDetails.totalPrice}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Delivery Address</p>
                    <p className="text-sm text-gray-900">
                      {orderDetails.address.fullName}<br />
                      {orderDetails.address.city}, {orderDetails.address.state} {orderDetails.address.postalCode}
                    </p>
                  </div>

                  {orderDetails.trackingId && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Tracking Information</p>
                      <p className="text-sm text-gray-900">
                        Tracking ID: {orderDetails.trackingId}<br />
                        Carrier: {orderDetails.trackingCarrier}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Items Ordered</p>
                    <div className="space-y-2">
                      {orderDetails.products.map((product, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-900">{product.name} (x{product.quantity})</span>
                          <span className="text-gray-700">₹{product.price * product.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-emerald-100 pt-6">
              <h3 className="text-lg font-semibold text-emerald-900">Order Status Guide</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Order Confirmed</p>
                    <p className="text-sm text-gray-600">Your order has been received and confirmed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 text-xs font-semibold text-yellow-700">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Preparing</p>
                    <p className="text-sm text-gray-600">Your gift is being carefully prepared</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Out for Delivery</p>
                    <p className="text-sm text-gray-600">Your order is on the way to you</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Delivered</p>
                    <p className="text-sm text-gray-600">Your gift has been successfully delivered</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Need help?{" "}
              <Link to="/contact" className="font-medium text-emerald-600 hover:text-emerald-700">
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