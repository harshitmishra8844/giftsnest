import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { clearUserAuth, getUserAuth, saveUserAuth } from "../services/userAuth";

const tabClass = (active) =>
  `rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition duration-300 ${
    active
      ? "bg-emerald-950 text-white shadow-sm scale-[1.02]"
      : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200"
  }`;

const trackingSteps = ["Pending", "Order Confirmed", "Processing", "Shipped", "Delivered"];

const getStepIndex = (status) => {
  const index = trackingSteps.findIndex((step) => step === status);
  if (index >= 0) return index;
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
  const location = useLocation();
  const returnToAfterAddressSave = location.state?.returnTo || "";
  
  const [auth, setAuth] = useState(getUserAuth());
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState(initialAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);
  
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetOrder, setCancelTargetOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDetails, setCancelDetails] = useState("");
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Profile update form state
  const [profileForm, setProfileForm] = useState({
    name: auth?.name || "",
    email: auth?.email || "",
    password: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const faqs = [
    { q: "How can I track my package?", a: "Once your order has Shipped, a Tracking ID and Carrier link will appear under your 'Order Tracking' tab. Click 'Track Package' to see real-time updates." },
    { q: "Can I change my delivery address after placing an order?", a: "You can request address updates before the order transitions to 'Shipped'. Please contact niyoragifts@gmail.com or WhatsApp us immediately with your Order ID." },
    { q: "How do I request a cancellation?", a: "Go to the 'My Orders' tab and click 'Request Cancellation' on any eligible order (orders that are Shipped or Delivered cannot be cancelled). Our admin team will review and approve eligible requests." },
    { q: "What is your refund policy?", a: "For cancelled or returned items, refunds are processed back to the original payment source within 5-7 business days." }
  ];

  // Calculate overview metrics
  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => !["Delivered", "Cancelled"].includes(o.status)).length;
  }, [orders]);

  const defaultAddress = useMemo(() => {
    return addresses.find((addr) => addr.isDefault) || null;
  }, [addresses]);

  const latestOrder = useMemo(() => {
    if (!orders.length) return null;
    return orders[0];
  }, [orders]);

  const canRequestCancellation = (order) => {
    if (!order) return false;
    if (["Shipped", "Delivered", "Cancelled"].includes(order.status)) return false;
    if (order.cancellationRequest?.status === "Pending") return false;
    return true;
  };

  const openCancelModal = (order) => {
    setCancelTargetOrder(order);
    setCancelReason("");
    setCancelDetails("");
    setCancelConfirmed(false);
    setCancelModalOpen(true);
  };

  const submitCancellationRequest = async () => {
    if (!cancelTargetOrder?._id) return;
    if (!cancelReason.trim()) {
      setError("Please select a cancellation reason.");
      return;
    }
    if (!cancelConfirmed) {
      setError("Please confirm you want to request cancellation.");
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setSubmittingCancel(true);
      const { data } = await api.post(`/orders/${cancelTargetOrder._id}/cancellation-request`, {
        reason: cancelReason.trim(),
        details: cancelDetails.trim(),
      });
      if (data?.order?._id) {
        setOrders((prev) => prev.map((o) => (o._id === data.order._id ? data.order : o)));
      }
      setCancelModalOpen(false);
      setCancelTargetOrder(null);
      setSuccessMessage("Cancellation request submitted. Waiting for approval.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit cancellation request");
    } finally {
      setSubmittingCancel(false);
    }
  };

  useEffect(() => {
    const state = location.state || {};
    if (state.activeTab === "addresses") {
      setActiveTab("addresses");
    }
    if (state.openAddressForm) {
      setShowAddressForm(true);
      setEditingAddress(null);
      setAddressForm(initialAddressForm);
    }
  }, [location.state]);

  useEffect(() => {
    if (!auth?.token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccessMessage("");
        const [ordersRes, addressesRes] = await Promise.all([
          api.get("/orders/my"),
          api.get("/user/addresses"),
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
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
    const predefinedOption = addressLabelOptions.find((option) => option.label === address.label);
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
      const finalLabel =
        addressForm.label === "Other" && addressForm.customLabel
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

      const { data } = await api.get("/user/addresses");
      setAddresses(data);
      resetAddressForm();
      if (returnToAfterAddressSave) {
        navigate(returnToAfterAddressSave);
      }
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
      setAddresses((prev) => prev.filter((addr) => addr._id !== addressId));
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

  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setSavingProfile(true);
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.toLowerCase().trim(),
      };
      if (profileForm.password && profileForm.newPassword) {
        payload.password = profileForm.password;
        payload.newPassword = profileForm.newPassword;
      }

      const { data } = await api.put("/user/profile", payload);
      saveUserAuth(data);
      setAuth(data);
      setSuccessMessage("Account settings updated successfully!");
      setProfileForm((prev) => ({
        ...prev,
        password: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile settings");
    } finally {
      setSavingProfile(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Shipped":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Processing":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Order Confirmed":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "Pending":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <section className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 p-6 text-white md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 border border-white/20 text-white rounded-full flex items-center justify-center text-2xl md:text-3xl font-bold backdrop-blur-md shadow-inner">
              {(auth?.name || "G").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">My Profile</p>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">Hello, {auth?.name || "Gift Lover"}!</h1>
              <p className="mt-1 text-sm text-emerald-100">{auth?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="self-start md:self-auto rounded-full bg-white px-5 py-2.5 text-xs font-bold text-emerald-950 shadow-sm transition duration-300 hover:bg-red-50 hover:text-red-700 hover:scale-105"
          >
            Logout Account
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-full border border-emerald-100/50 shadow-sm flex flex-wrap gap-1 w-fit">
        <button onClick={() => setActiveTab("overview")} className={tabClass(activeTab === "overview")}>Overview</button>
        <button onClick={() => setActiveTab("orders")} className={tabClass(activeTab === "orders")}>My Orders</button>
        <button onClick={() => setActiveTab("addresses")} className={tabClass(activeTab === "addresses")}>My Addresses</button>
        <button onClick={() => setActiveTab("tracking")} className={tabClass(activeTab === "tracking")}>Order Tracking</button>
        <button onClick={() => setActiveTab("settings")} className={tabClass(activeTab === "settings")}>Settings</button>
        <button onClick={() => setActiveTab("help")} className={tabClass(activeTab === "help")}>Support</button>
      </div>

      {/* Feedback Messages */}
      {loading ? (
        <div className="flex items-center gap-3 text-sm text-gray-600 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <svg className="animate-spin h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading profile details...
        </div>
      ) : null}
      {error ? (
        <div className="text-sm font-semibold text-red-750 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      ) : null}
      {successMessage ? (
        <div className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMessage}
        </div>
      ) : null}

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && !loading ? (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-md p-6 shadow-sm hover:shadow-md transition duration-300 hover:scale-[1.01]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Orders</p>
              <h3 className="mt-2 text-3xl font-serif font-light text-gray-900">{orders.length}</h3>
              <p className="text-[10px] text-gray-400 mt-1">Surprises placed to date</p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-md p-6 shadow-sm hover:shadow-md transition duration-300 hover:scale-[1.01]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Orders</p>
              <h3 className="mt-2 text-3xl font-serif font-light text-emerald-800">{activeOrdersCount}</h3>
              <p className="text-[10px] text-gray-400 mt-1">Preparing & on their way</p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-md p-6 shadow-sm hover:shadow-md transition duration-300 hover:scale-[1.01]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Saved Addresses</p>
              <h3 className="mt-2 text-3xl font-serif font-light text-gray-900">{addresses.length}</h3>
              <p className="text-[10px] text-gray-400 mt-1">Registered delivery options</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Activity Card */}
            <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
              <div>
                <h3 className="text-base font-serif font-semibold text-gray-950 mb-3">Recent Activity</h3>
                {latestOrder ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-950">Order #{getOrderDisplayId(latestOrder)}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(latestOrder.status)}`}>
                        {latestOrder.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-light">Total Price: <span className="font-semibold font-serif text-gray-900">INR {latestOrder.totalPrice}</span></p>
                    <p className="text-[10px] text-gray-400 font-light">Placed on {new Date(latestOrder.createdAt).toLocaleDateString("en-IN")}</p>
                    
                    {/* Tiny Progress Tracker */}
                    <div className="pt-2">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 bg-emerald-950 rounded-full"
                          style={{
                            width:
                              latestOrder.status === "Cancelled" ? "100%" :
                              latestOrder.status === "Delivered" ? "100%" :
                              latestOrder.status === "Shipped" ? "75%" :
                              latestOrder.status === "Processing" ? "50%" :
                              latestOrder.status === "Pending" ? "25%" : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 font-light leading-relaxed">No orders placed yet. Explore our catalog to make memories!</p>
                )}
              </div>
              <button
                onClick={() => setActiveTab("orders")}
                className="mt-6 text-xs font-bold uppercase tracking-widest text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1.5 w-fit bg-transparent border-0 cursor-pointer"
              >
                View all orders &rarr;
              </button>
            </div>

            {/* Default Address Card */}
            <div className="rounded-3xl border border-gray-200/40 bg-white/70 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden bg-gradient-to-br from-emerald-50/5 via-white to-white">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <div>
                <h3 className="text-base font-serif font-semibold text-gray-950 mb-3 flex items-center gap-2">
                  <span>📍</span> Shipping Destination
                </h3>
                {defaultAddress ? (
                  <div className="space-y-3 text-xs text-gray-500 font-light">
                    <div className="flex items-center gap-2 mb-1">
                      {(() => {
                        const opt = addressLabelOptions.find((o) => o.label === defaultAddress.label) || { icon: "📍", color: "bg-emerald-50 text-emerald-800 border-emerald-100" };
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${opt.color}`}>
                            <span>{opt.icon}</span>
                            <span>{defaultAddress.label}</span>
                          </span>
                        );
                      })()}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-white shadow-sm border border-emerald-900 uppercase tracking-wider">
                        ✨ Default
                      </span>
                    </div>
                    <p className="font-bold text-gray-950 text-sm leading-tight font-serif">{defaultAddress.fullName}</p>
                    <div className="flex items-start gap-1.5 pt-0.5">
                      <div className="leading-relaxed">
                        <p>{defaultAddress.line1}</p>
                        <p className="font-semibold text-gray-700 mt-0.5">
                          {defaultAddress.city}, {defaultAddress.state} - <span className="font-extrabold text-gray-900 font-sans">{defaultAddress.postalCode}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100/50 text-gray-800 font-normal">
                      <span>📞</span>
                      <span className="font-bold">{defaultAddress.phone}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 font-light leading-relaxed">No default shipping address set. Save a shipping address for faster ordering.</p>
                )}
              </div>
              <button
                onClick={() => setActiveTab("addresses")}
                className="mt-6 text-xs font-bold uppercase tracking-widest text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1.5 w-fit bg-transparent border-0 cursor-pointer"
              >
                Manage addresses &rarr;
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ORDERS TAB */}
      {activeTab === "orders" && !loading ? (
        <div className="space-y-4">
          <div className="bg-white border border-emerald-100/40 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-emerald-950">My Orders</h2>
            <p className="text-sm text-gray-600 mt-1">Review status details, request cancellations, or download tracking codes.</p>
          </div>
          <div className="space-y-3">
            {orders.map((order) => (
              <article key={order._id} className="rounded-2xl border border-emerald-100/50 bg-white p-5 shadow-sm hover:shadow-md transition duration-300">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Order #{getOrderDisplayId(order)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Placed on {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="py-3 text-sm text-gray-700 space-y-1.5">
                  <p>Items Count: <span className="font-semibold text-gray-900">{order.products?.length || 0}</span></p>
                  <p>Total Cost: <span className="font-semibold text-emerald-800">INR {order.totalPrice}</span></p>
                  
                  {order.cancellationRequest?.status && order.cancellationRequest.status !== "None" ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-3.5 py-2.5 mt-2">
                      <p className="text-xs font-semibold text-amber-900">
                        Cancellation Request Status: <span className="uppercase">{order.cancellationRequest.status}</span>
                      </p>
                      {order.cancellationRequest.reason ? (
                        <p className="text-xs text-amber-800 mt-0.5">Reason: {order.cancellationRequest.reason}</p>
                      ) : null}
                      {order.cancellationRequest.adminNote ? (
                        <p className="text-xs text-amber-800 mt-1">Admin Response: {order.cancellationRequest.adminNote}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {order.trackingId ? (
                    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                      <p className="text-xs text-emerald-800 font-medium">Tracking ID: {order.trackingId}</p>
                      <a
                        href={getTrackingUrl(order.trackingId, order.trackingCarrier)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
                      >
                        Track Package
                      </a>
                    </div>
                  ) : null}
                </div>
                <div className="pt-2">
                  {canRequestCancellation(order) ? (
                    <button
                      type="button"
                      onClick={() => openCancelModal(order)}
                      className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-750 hover:bg-red-50 hover:scale-105 transition"
                    >
                      Request Cancellation
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            {!orders.length ? (
              <div className="bg-gray-50/50 border border-gray-100 text-center py-12 rounded-2xl">
                <p className="text-sm text-gray-500 font-medium">No orders found yet. Start shopping now.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* CANCELLATION MODAL */}
      {cancelModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cancellation request</p>
                <h3 className="mt-1 text-lg font-bold text-gray-900">
                  Order #{getOrderDisplayId(cancelTargetOrder)}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Your request will be reviewed by admin. If approved, the order will be cancelled and refund will be initiated.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-1">Reason *</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">Select a reason</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Found a better price">Found a better price</option>
                  <option value="Need to change address/phone">Need to change address/phone</option>
                  <option value="Delivery taking too long">Delivery taking too long</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-1">Details (optional)</label>
                <textarea
                  value={cancelDetails}
                  onChange={(e) => setCancelDetails(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Add details to help us process the cancellation request faster..."
                />
              </div>
              <label className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cancelConfirmed}
                  onChange={(e) => setCancelConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>I understand this is a request and cancellation will be confirmed after review.</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={submitCancellationRequest}
                disabled={submittingCancel}
                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
              >
                {submittingCancel ? "Submitting..." : "Submit cancellation request"}
              </button>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ADDRESSES TAB */}
      {activeTab === "addresses" ? (
        <div className="space-y-6">
          <div className="bg-white border border-emerald-100/50 p-6 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
                <span>📍</span> Delivery Addresses
              </h2>
              <p className="mt-1 text-sm text-gray-600">Manage your shipping details for frictionless checkout experiences.</p>
            </div>
            <button
              onClick={handleAddAddress}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-md hover:shadow-lg hover:scale-[1.01] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add New Address
            </button>
          </div>

          {showAddressForm && (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {editingAddress ? "Edit Address" : "Add Address"}
                </h2>
                <p className="text-sm text-gray-600">
                  {editingAddress ? "Update your saved shipping details." : "Save a shipping address to speed up order confirmation."}
                </p>
              </div>

              <form onSubmit={handleSaveAddress} className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/30 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Select Address Type</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {addressLabelOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setAddressForm((prev) => ({ ...prev, label: option.label }))}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition duration-300 hover:scale-[1.02] cursor-pointer ${
                          addressForm.label === option.label
                            ? "border-emerald-600 bg-emerald-50/50 text-emerald-800 shadow-sm"
                            : "border-gray-200 bg-white hover:border-emerald-300 text-gray-600 hover:text-emerald-700"
                        }`}
                      >
                        <span className="text-2xl mb-1.5">{option.icon}</span>
                        <span className="text-xs font-bold">{option.label}</span>
                      </button>
                    ))}
                  </div>
                  {addressForm.label === "Other" && (
                    <div className="mt-4 animate-slide-down">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Custom Label Name *</label>
                      <input
                        name="customLabel"
                        value={addressForm.customLabel || ""}
                        onChange={handleAddressFormChange}
                        placeholder="e.g. Vacation Home, Friend's house"
                        required
                        className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/30 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Contact Information</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        Full Name *
                      </label>
                      <input
                        name="fullName"
                        value={addressForm.fullName}
                        onChange={handleAddressFormChange}
                        placeholder="Enter recipient's full name"
                        required
                        className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        name="phone"
                        value={addressForm.phone}
                        onChange={handleAddressFormChange}
                        placeholder="10-digit mobile number"
                        required
                        className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/30 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Address Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        Street Address *
                      </label>
                      <input
                        name="line1"
                        value={addressForm.line1}
                        onChange={handleAddressFormChange}
                        placeholder="Flat/House number, Building name, Street name"
                        required
                        className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                          City *
                        </label>
                        <input
                          name="city"
                          value={addressForm.city}
                          onChange={handleAddressFormChange}
                          placeholder="City"
                          required
                          className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                          State *
                        </label>
                        <input
                          name="state"
                          value={addressForm.state}
                          onChange={handleAddressFormChange}
                          placeholder="State"
                          required
                          className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                          Postal Code *
                        </label>
                        <input
                          name="postalCode"
                          value={addressForm.postalCode}
                          onChange={handleAddressFormChange}
                          placeholder="Pincode (e.g. 400001)"
                          required
                          className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        Country *
                      </label>
                      <input
                        name="country"
                        value={addressForm.country}
                        onChange={handleAddressFormChange}
                        placeholder="Country"
                        required
                        className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/30 p-5">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="isDefault"
                      name="isDefault"
                      checked={addressForm.isDefault}
                      onChange={handleAddressFormChange}
                      className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="isDefault" className="text-sm font-bold text-gray-900 cursor-pointer block select-none">
                        Set as Default Address
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5 select-none">
                        This address will be auto-selected during your next checkout process.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {savingAddress ? "Saving Address..." : editingAddress ? "Update Address" : "Save Address"}
                  </button>
                  <button
                    type="button"
                    onClick={resetAddressForm}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-6 py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 hover:scale-[1.01] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Addresses Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {addresses.map((address) => {
              const labelOption = addressLabelOptions.find((opt) => opt.label === address.label) || { icon: "📍", color: "bg-emerald-50 text-emerald-800 border-emerald-100" };
              return (
                <div
                  key={address._id}
                  className={`group relative rounded-3xl border transition duration-300 hover:shadow-lg p-6 flex flex-col justify-between ${
                    address.isDefault
                      ? "border-emerald-400 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-sm ring-1 ring-emerald-400/20"
                      : "border-gray-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <div>
                    {/* Header line of the card */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${labelOption.color}`}>
                        <span>{labelOption.icon}</span>
                        <span>{address.label}</span>
                      </span>
                      
                      {address.isDefault ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm border border-emerald-500 uppercase tracking-wider">
                          ✨ Default
                        </span>
                      ) : null}
                    </div>

                    {/* Content line of the card */}
                    <div className="space-y-2.5 text-sm text-gray-600">
                      <p className="font-bold text-gray-900 text-base leading-tight">{address.fullName}</p>
                      
                      <div className="flex items-start gap-2 pt-1">
                        <span className="text-gray-400 mt-0.5 text-base shrink-0">📍</span>
                        <div className="leading-relaxed">
                          <p className="text-gray-700">{address.line1}</p>
                          <p className="font-semibold text-gray-800 mt-0.5">
                            {address.city}, {address.state} - <span className="font-extrabold text-gray-900">{address.postalCode}</span>
                          </p>
                          <p className="text-[10px] text-gray-450 uppercase tracking-widest mt-1 font-semibold">{address.country}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-50 text-gray-800">
                        <span className="text-gray-400 shrink-0">📞</span>
                        <span className="font-bold tracking-wide text-sm">{address.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons line of the card */}
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2.5">
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAddress(address._id)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/50 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100/50 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEditAddress(address)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address._id)}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-600 transition hover:bg-red-100 hover:text-red-700 cursor-pointer"
                    >
                      <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!addresses.length && !showAddressForm && (
            <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/10 p-12 text-center max-w-xl mx-auto shadow-inner">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-3xl">
                📍
              </div>
              <h3 className="text-lg font-bold text-emerald-950 mb-1">No delivery addresses saved</h3>
              <p className="text-sm text-gray-600 mb-6">Create your first shipping details to save time on your next checkout.</p>
              <button
                onClick={handleAddAddress}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 hover:scale-[1.02] shadow-md hover:shadow-lg cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Shipping Address
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* TRACKING TAB */}
      {activeTab === "tracking" && !loading ? (
        <div className="space-y-6">
          <div className="bg-white border border-emerald-100/40 p-5 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-emerald-950">Track Shipment Journeys</h2>
            <p className="text-sm text-gray-600 mt-1">Review tracking statuses, shipping timelines, and download receipt records.</p>
          </div>

          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order._id} className="rounded-2xl border border-emerald-100/40 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-50 pb-3">
                    <div>
                      <p className="text-lg font-bold text-gray-900">Order #{getOrderDisplayId(order)}</p>
                      <p className="text-xs text-gray-500">Placed on {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Delivery Status Track</h4>
                      {["Shipped", "Delivered"].includes(order.status) && order.trackingId && (
                        <a
                          href={getTrackingUrl(order.trackingId, order.trackingCarrier)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                        >
                          Track Live Package
                        </a>
                      )}
                    </div>

                    {["Shipped", "Delivered"].includes(order.status) && order.trackingId && (
                      <div className="rounded-xl bg-blue-50/50 p-3.5 border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <span className="font-semibold">Tracking Number:</span> {order.trackingId}
                        </p>
                        {order.trackingCarrier && (
                          <p className="text-xs text-blue-700 mt-1 capitalize">
                            <span className="font-semibold">Courier Partner:</span> {order.trackingCarrier}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="relative mb-4 h-2 rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            order.status === "Cancelled" ? "bg-red-500" :
                            order.status === "Delivered" ? "bg-green-500" : "bg-emerald-600"
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
                                className={`mb-1.5 h-6.5 w-6.5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                                  reached ? "border-emerald-600 bg-emerald-600 text-white" :
                                  isCurrent ? "border-emerald-600 bg-white text-emerald-600 animate-pulse" :
                                  "border-gray-300 bg-white text-gray-400"
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <p className={`text-[9px] md:text-[10px] font-bold leading-tight ${
                                reached ? "text-emerald-800" :
                                isCurrent ? "text-emerald-600" : "text-gray-500"
                              }`}>
                                {step}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50/40 p-8 text-center">
              <div className="mx-auto mb-3 text-2xl">📦</div>
              <h3 className="text-lg font-bold text-gray-900">No orders placed</h3>
              <p className="text-gray-600 text-sm mt-0.5">Start buying gifts to track their delivery statuses here.</p>
            </div>
          )}
        </div>
      ) : null}

      {/* ACCOUNT SETTINGS TAB */}
      {activeTab === "settings" && !loading ? (
        <div className="bg-white border border-emerald-100/50 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-emerald-950">Account Settings</h2>
            <p className="text-sm text-gray-600 mt-1">Manage registered contact details and account passwords securely.</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal Info Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Personal Information</h3>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
                  <input
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileFormChange}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Update name"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileFormChange}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Update email"
                  />
                </div>
              </div>

              {/* Password Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Change Password</h3>
                <p className="text-xs text-gray-500">Leave these blank if you do not wish to update your password.</p>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Current Password</label>
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={profileForm.password}
                    onChange={handleProfileFormChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">New Password</label>
                  <input
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={profileForm.newPassword}
                    onChange={handleProfileFormChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirm New Password</label>
                  <input
                    name="confirmNewPassword"
                    type="password"
                    autoComplete="new-password"
                    value={profileForm.confirmNewPassword}
                    onChange={handleProfileFormChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {savingProfile ? "Saving changes..." : "Save Account Settings"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* HELP & SUPPORT TAB */}
      {activeTab === "help" && !loading ? (
        <div className="space-y-6">
          <div className="bg-white border border-emerald-100/40 p-6 md:p-8 rounded-3xl shadow-sm">
            <h2 className="text-xl font-bold text-emerald-950">Help & Support Center</h2>
            <p className="text-sm text-gray-600 mt-1">Get immediate assistance or review quick answers to common checkout concerns.</p>
            
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <a
                href="mailto:niyoragifts@gmail.com"
                className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-5 hover:bg-emerald-50 transition duration-300 block"
              >
                <h3 className="font-bold text-gray-900 text-base">Send Email Support</h3>
                <p className="text-sm text-gray-600 mt-1">niyoragifts@gmail.com</p>
                <p className="text-xs text-emerald-700 mt-3 font-semibold">Response within 12-24 Hours &rarr;</p>
              </a>
              <a
                href="https://wa.me/919000000000"
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-5 hover:bg-emerald-50 transition duration-300 block"
              >
                <h3 className="font-bold text-gray-900 text-base">WhatsApp Concierge</h3>
                <p className="text-sm text-gray-600 mt-1">Instant chat support for order issues</p>
                <p className="text-xs text-emerald-700 mt-3 font-semibold">Immediate Assistance &rarr;</p>
              </a>
            </div>
          </div>

          {/* FAQs Accordion */}
          <div className="bg-white border border-emerald-100/40 p-6 md:p-8 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold text-emerald-950 mb-4">Frequently Asked Questions</h3>
            <div className="divide-y divide-gray-200">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="py-4">
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left font-semibold text-gray-950 focus:outline-none bg-transparent border-0 cursor-pointer w-full p-0"
                    >
                      <span>{faq.q}</span>
                      <svg
                        className={`w-4 h-4 text-emerald-600 transition-transform duration-300 ${isOpen ? "transform rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="mt-2 text-sm text-gray-600 leading-relaxed pr-8 animate-slide-down">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default MyProfile;
