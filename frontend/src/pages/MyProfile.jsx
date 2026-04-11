import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { clearUserAuth, getUserAuth } from "../services/userAuth";

const tabClass = (active) =>
  `rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
    active ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
  }`;

const trackingSteps = ["Pending", "Order Confirmed", "Processing", "Shipped", "Delivered"];

const getStepIndex = (status) => {
  const index = trackingSteps.findIndex((step) => step === status);
  if (index >= 0) return index;
  if (status === "Cancelled") return 0;
  return 0;
};

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

const addressLabelOptions = [
  { id: "home", label: "Home", icon: "🏠", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "work", label: "Work", icon: "💼", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "office", label: "Office", icon: "🏢", color: "bg-green-100 text-green-700 border-green-200" },
  { id: "parents", label: "Parents", icon: "👨‍👩‍👧‍👦", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "friend", label: "Friend", icon: "👥", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { id: "other", label: "Other", icon: "📍", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

const initialAddressForm = {
  label: "",
  customLabel: "",
  fullName: "",
  phone: "",
  line1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

const MyProfile = () => {
  const navigate = useNavigate();
  const [auth, setAuth] = useState(getUserAuth());
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [activeTab, setActiveTab] = useState("orders");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState(initialAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!auth?.token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [ordersRes, addressesRes] = await Promise.all([
          api.get("/orders/my"),
          api.get("/user/addresses")
        ]);
        setOrders(ordersRes.data);
        setAddresses(addressesRes.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load your profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth, navigate]);

  const handleLogout = () => {
    clearUserAuth();
    setAuth(null);
    navigate("/login");
  };

  const handleAddressFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const resetAddressForm = () => {
    setAddressForm(initialAddressForm);
    setEditingAddress(null);
    setShowAddressForm(false);
  };

  const handleAddAddress = () => {
    setAddressForm(initialAddressForm);
    setEditingAddress(null);
    setShowAddressForm(true);
  };

  const handleEditAddress = (address) => {
    // Check if the label is one of the predefined options
    const predefinedOption = addressLabelOptions.find(option => option.label === address.label);
    const isCustomLabel = !predefinedOption;

    setAddressForm({
      label: isCustomLabel ? "Other" : address.label,
      customLabel: isCustomLabel ? address.label : "",
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setEditingAddress(address);
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSavingAddress(true);

    try {
      const finalLabel = addressForm.label === "Other" && addressForm.customLabel
        ? addressForm.customLabel.trim()
        : addressForm.label;

      const addressData = {
        ...addressForm,
        label: finalLabel,
      };

      if (editingAddress) {
        await api.put(`/user/addresses/${editingAddress._id}`, addressData);
      } else {
        await api.post("/user/addresses", addressData);
      }

      // Refresh addresses
      const { data } = await api.get("/user/addresses");
      setAddresses(data);
      resetAddressForm();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      await api.delete(`/user/addresses/${addressId}`);
      setAddresses(prev => prev.filter(addr => addr._id !== addressId));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete address");
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await api.patch(`/user/addresses/${addressId}/default`);
      const { data } = await api.get("/user/addresses");
      setAddresses(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to set default address");
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 to-teal-800 p-6 text-white md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">My Profile</p>
        <h1 className="mt-2 text-3xl font-bold">Hello, {auth?.name || "Gift Lover"}!</h1>
        <p className="mt-2 text-sm text-emerald-50">Track your orders, manage support needs and stay updated in one place.</p>
        <button onClick={handleLogout} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-emerald-800">
          Logout
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveTab("orders")} className={tabClass(activeTab === "orders")}>My Orders</button>
        <button onClick={() => setActiveTab("addresses")} className={tabClass(activeTab === "addresses")}>My Addresses</button>
        <button onClick={() => setActiveTab("tracking")} className={tabClass(activeTab === "tracking")}>Order Tracking</button>
        <button onClick={() => setActiveTab("help")} className={tabClass(activeTab === "help")}>Help & Support</button>
      </div>

      {loading ? <p className="text-sm text-gray-600">Loading your profile data...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {activeTab === "orders" ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-emerald-900">My Orders</h2>
          <div className="mt-3 space-y-3">
            {orders.map((order) => (
              <article key={order._id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">Order #{getOrderDisplayId(order)}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-emerald-700">{order.status}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">Items: {order.products?.length || 0}</p>
                <p className="text-sm font-semibold text-gray-900">Total: INR {order.totalPrice}</p>
                {order.trackingId ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-emerald-700">Tracking ID: {order.trackingId}</p>
                    <a
                      href={getTrackingUrl(order.trackingId, order.trackingCarrier)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Track Package
                    </a>
                  </div>
                ) : null}
                <p className="text-xs text-gray-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>
              </article>
            ))}
            {!orders.length ? <p className="text-sm text-gray-600">No orders found yet. Start shopping now.</p> : null}
          </div>
        </div>
      ) : null}

      {activeTab === "addresses" ? (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Delivery Addresses</h2>
                <p className="mt-1 text-emerald-100">Manage your shipping addresses for faster checkout</p>
              </div>
              <button
                onClick={handleAddAddress}
                className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Address
              </button>
            </div>
          </div>

          {/* Add/Edit Address Form */}
          {showAddressForm && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border border-emerald-100 shadow-xl">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-200/20 rounded-full translate-y-12 -translate-x-12"></div>

              <div className="relative p-8">
                {/* Header */}
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {editingAddress ? "Edit Delivery Address" : "Add New Address"}
                  </h2>
                  <p className="text-gray-600">
                    {editingAddress ? "Update your shipping details" : "Add a new shipping address for faster checkout"}
                  </p>
                </div>

                <form onSubmit={handleSaveAddress} className="space-y-8">
                  {/* Address Label Section */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-emerald-100/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Address Type</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {addressLabelOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setAddressForm(prev => ({ ...prev, label: option.label }))}
                          className={`group relative overflow-hidden rounded-xl border-2 p-4 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md ${
                            addressForm.label === option.label
                              ? `${option.color} border-current shadow-lg ring-2 ring-offset-2 ring-emerald-500/20`
                              : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl group-hover:scale-110 transition-transform">{option.icon}</span>
                            <span className="font-semibold">{option.label}</span>
                          </div>
                          {addressForm.label === option.label && (
                            <div className="absolute top-2 right-2">
                              <svg className="w-5 h-5 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    {addressForm.label === "Other" && (
                      <div className="mt-4">
                        <input
                          name="customLabel"
                          value={addressForm.customLabel || ""}
                          onChange={handleAddressFormChange}
                          placeholder="Enter custom label (e.g., Work, Vacation Home)"
                          className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm transition-all focus:border-emerald-500 focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-400"
                        />
                      </div>
                    )}
                  </div>

                  {/* Contact Information Section */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-emerald-100/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Full Name *
                        </label>
                        <input
                          name="fullName"
                          value={addressForm.fullName}
                          onChange={handleAddressFormChange}
                          placeholder="Enter your full name"
                          required
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all focus:border-emerald-500 focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Phone Number *
                        </label>
                        <input
                          name="phone"
                          value={addressForm.phone}
                          onChange={handleAddressFormChange}
                          placeholder="Enter phone number"
                          required
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all focus:border-emerald-500 focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Details Section */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-emerald-100/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Address Details</h3>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Street Address *
                        </label>
                        <input
                          name="line1"
                          value={addressForm.line1}
                          onChange={handleAddressFormChange}
                          placeholder="Street address, building, apartment, etc."
                          required
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all focus:border-emerald-500 focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-400"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            City *
                          </label>
                          <input
                            name="city"
                            value={addressForm.city}
                            onChange={handleAddressFormChange}
                            placeholder="City"
                            required
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all focus:border-emerald-500 focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            State *
                          </label>
                          <input
                            name="state"
                            value={addressForm.state}
                            onChange={handleAddressFormChange}
                            placeholder="State"
                            required
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all focus:border-emerald-500 focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Postal Code *
                          </label>
                          <input
                            name="postalCode"
                            value={addressForm.postalCode}
                            onChange={handleAddressFormChange}
                            placeholder="Postal code"
                            required
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all focus:border-emerald-500 focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Country *
                        </label>
                        <input
                          name="country"
                          value={addressForm.country}
                          onChange={handleAddressFormChange}
                          placeholder="Country"
                          required
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-all focus:border-emerald-500 focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Default Address Option */}
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-2xl p-6 border border-emerald-200/50">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          id="isDefault"
                          name="isDefault"
                          checked={addressForm.isDefault}
                          onChange={handleAddressFormChange}
                          className="w-5 h-5 text-emerald-600 bg-white border-2 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                        />
                      </div>
                      <div>
                        <label htmlFor="isDefault" className="text-sm font-semibold text-gray-800 cursor-pointer mb-1 block">
                          Set as Default Address
                        </label>
                        <p className="text-sm text-gray-600">
                          This address will be selected automatically during checkout for faster ordering
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-emerald-100">
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="flex-1 flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-4 text-sm font-semibold text-white transition-all hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {savingAddress ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving Address...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {editingAddress ? "Update Address" : "Save Address"}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={resetAddressForm}
                      className="px-8 py-4 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl transition-all hover:bg-gray-50 hover:border-gray-400 shadow-md hover:shadow-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Addresses Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {addresses.map((address) => (
              <div
                key={address._id}
                className="group relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-lg hover:border-emerald-200"
              >
                {address.isDefault && (
                  <div className="absolute -top-2 -right-2 rounded-full bg-emerald-500 px-2 py-1 text-xs font-semibold text-white shadow-lg">
                    Default
                  </div>
                )}

                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    {(() => {
                      const option = addressLabelOptions.find(opt => opt.label === address.label);
                      return option ? (
                        <span className="text-lg">{option.icon}</span>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      );
                    })()}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{address.label}</h4>
                    <p className="text-sm text-gray-600">{address.fullName}</p>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <p className="leading-relaxed">{address.line1}</p>
                  <p>
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p>{address.country}</p>
                  <p className="font-medium text-gray-900">{address.phone}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefaultAddress(address._id)}
                      className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleEditAddress(address)}
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(address._id)}
                    className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {!addresses.length && !showAddressForm && (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">No addresses yet</h3>
              <p className="mb-6 text-gray-600">Add your first delivery address to make checkout faster and easier.</p>
              <button
                onClick={handleAddAddress}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Your First Address
              </button>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "tracking" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-emerald-900">Track Your Orders</h2>
            <p className="mt-1 text-sm text-gray-600">Select an order below to view its tracking status and details.</p>
          </div>

          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order._id} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">Order #{getOrderDisplayId(order)}</p>
                      <p className="text-sm text-gray-600">Placed on {new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        order.status === "Delivered" ? "bg-green-100 text-green-800" :
                        order.status === "Shipped" ? "bg-blue-100 text-blue-800" :
                        order.status === "Processing" ? "bg-yellow-100 text-yellow-800" :
                        order.status === "Pending" ? "bg-gray-100 text-gray-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Order Items Summary */}
                  <div className="mb-4 rounded-lg bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-900 mb-2">Items ({order.products?.length || 0})</p>
                    <div className="flex flex-wrap gap-2">
                      {order.products?.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="rounded-full bg-white px-3 py-1 text-xs text-gray-700 border">
                          {item.name}
                        </span>
                      ))}
                      {order.products?.length > 3 && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500 border">
                          +{order.products.length - 3} more
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">Total: INR {order.totalPrice}</p>
                  </div>

                  {/* Tracking Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Tracking Status</h3>
                      {["Shipped", "Delivered"].includes(order.status) && order.trackingId && (
                        <a
                          href={getTrackingUrl(order.trackingId, order.trackingCarrier)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Track Package
                        </a>
                      )}
                    </div>

                    {["Shipped", "Delivered"].includes(order.status) && order.trackingId && (
                      <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <span className="font-semibold">Tracking ID:</span> {order.trackingId}
                        </p>
                        {order.trackingCarrier && (
                          <p className="text-sm text-blue-700 mt-1">
                            <span className="font-semibold">Carrier:</span> {order.trackingCarrier}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div>
                      <div className="relative mb-3 h-2 rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            order.status === "Cancelled" ? "bg-red-500" :
                            order.status === "Delivered" ? "bg-green-500" : "bg-emerald-500"
                          }`}
                          style={{
                            width:
                              order.status === "Cancelled" ? "100%" :
                              order.status === "Delivered" ? "100%" :
                              order.status === "Shipped" ? "75%" :
                              order.status === "Processing" ? "50%" :
                              order.status === "Pending" ? "25%" : "0%",
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-5 gap-1 text-center">
                        {trackingSteps.map((step, idx) => {
                          const reached = getStepIndex(order.status) >= idx && order.status !== "Cancelled";
                          const isCurrent = getStepIndex(order.status) === idx && order.status !== "Cancelled" && order.status !== "Delivered";
                          return (
                            <div key={step} className="flex flex-col items-center">
                              <div
                                className={`mb-1 h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                                  reached ? "border-emerald-500 bg-emerald-500 text-white" :
                                  isCurrent ? "border-emerald-500 bg-white text-emerald-500" :
                                  "border-gray-300 bg-white text-gray-400"
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <p className={`text-[10px] font-medium leading-tight ${
                                reached ? "text-emerald-700" :
                                isCurrent ? "text-emerald-600" : "text-gray-500"
                              }`}>
                                {step}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {order.status === "Cancelled" && (
                      <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                        <p className="text-sm text-red-800">
                          <span className="font-semibold">Order Cancelled</span>
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          This order has been cancelled. Contact support if you need assistance.
                        </p>
                      </div>
                    )}

                    {order.status === "Pending" && (
                      <div className="rounded-lg bg-yellow-50 p-3 border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          <span className="font-semibold">Order Confirmation Pending</span>
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          We're processing your order. You'll receive a confirmation email soon.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">No orders to track</h3>
              <p className="text-gray-600">Place your first order to start tracking its journey.</p>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "help" ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-emerald-900">Help & Support</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <a href="mailto:care@giftnest.com" className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 hover:bg-emerald-100/60">
              <p className="font-semibold text-gray-900">Email Support</p>
              <p className="text-sm text-gray-600">care@giftnest.com</p>
            </a>
            <a href="https://wa.me/919000000000" target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 hover:bg-emerald-100/60">
              <p className="font-semibold text-gray-900">WhatsApp Support</p>
              <p className="text-sm text-gray-600">Chat with our care team</p>
            </a>
          </div>
          <Link to="/products" className="mt-4 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Continue Shopping
          </Link>
        </div>
      ) : null}
    </section>
  );
};

export default MyProfile;
