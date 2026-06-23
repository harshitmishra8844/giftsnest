import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { clearUserAuth, getUserAuth, saveUserAuth } from "../services/userAuth";

const tabClass = (active) =>
  `shrink-0 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition duration-300 ${
    active
      ? "bg-gold-500 text-white shadow-xs scale-[1.02]"
      : "bg-white text-luxury-black hover:bg-gold-50 hover:text-gold-600 border border-champagne"
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
  { id: "home", label: "Home", icon: "🏠", color: "bg-gold-50 text-gold-800 border-gold-200/40" },
  { id: "work", label: "Work", icon: "💼", color: "bg-gold-50 text-gold-800 border-gold-200/40" },
  { id: "office", label: "Office", icon: "🏢", color: "bg-gold-50 text-gold-800 border-gold-200/40" },
  { id: "parents", label: "Parents", icon: "👨‍👩‍👧‍👦", color: "bg-gold-50 text-gold-800 border-gold-200/40" },
  { id: "friend", label: "Friend", icon: "👥", color: "bg-gold-50 text-gold-800 border-gold-200/40" },
  { id: "other", label: "Other", icon: "📍", color: "bg-gold-50 text-gold-800 border-gold-200/40" },
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

  // Support Tickets State
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketOrderId, setNewTicketOrderId] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      setError("");
      const { data } = await api.get("/tickets/my");
      setTickets(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load support tickets.");
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      setLoadingTickets(true);
      setError("");
      const { data } = await api.get(`/tickets/my/${ticketId}`);
      setSelectedTicket(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load ticket conversation.");
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicketSubject.trim()) {
      setError("Please enter a subject.");
      return;
    }
    if (!newTicketMessage.trim()) {
      setError("Please enter a message.");
      return;
    }

    try {
      setSubmittingTicket(true);
      setError("");
      setSuccessMessage("");
      const { data } = await api.post("/tickets", {
        subject: newTicketSubject,
        message: newTicketMessage,
        orderId: newTicketOrderId || undefined,
      });
      setTickets((prev) => [data, ...prev]);
      setNewTicketSubject("");
      setNewTicketOrderId("");
      setNewTicketMessage("");
      setTicketFormOpen(false);
      setSuccessMessage("Support ticket created successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create support ticket.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      setSendingReply(true);
      setError("");
      const { data } = await api.post(`/tickets/my/${selectedTicket._id}/messages`, {
        message: replyMessage,
      });
      setSelectedTicket(data);
      setTickets((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      setReplyMessage("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message.");
    } finally {
      setSendingReply(false);
    }
  };

  useEffect(() => {
    if (activeTab === "help" && auth?.token) {
      fetchTickets();
    }
  }, [activeTab, auth]);

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
        return "bg-gold-50 text-gold-800 border-gold-200/45";
      case "Shipped":
        return "bg-blue-50 text-blue-800 border-blue-200/40";
      case "Processing":
        return "bg-amber-50 text-amber-800 border-amber-200/40";
      case "Order Confirmed":
        return "bg-purple-50 text-purple-800 border-purple-200/40";
      case "Pending":
        return "bg-gray-50 text-gray-800 border-gray-200/40";
      case "Cancelled":
        return "bg-red-50 text-red-800 border-red-200/40";
      default:
        return "bg-gray-50 text-gray-800 border-gray-200/40";
    }
  };

  return (
    <section className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-luxury-black p-6 text-white md:p-8 shadow-xl relative overflow-hidden border border-gold-500/20 animate-fade-in">
        <div className="absolute right-0 top-0 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-gold-400/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gold-500/10 border border-gold-500/30 text-gold-450 rounded-full flex items-center justify-center text-2xl md:text-3xl font-serif font-bold backdrop-blur-md shadow-inner">
              {(auth?.name || "G").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-400">My Profile</p>
              <h1 className="mt-1 text-2xl md:text-3xl font-serif font-light tracking-tight">Hello, {auth?.name || "Gift Lover"}!</h1>
              <p className="mt-1 text-xs text-gray-350 font-light">{auth?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="self-start md:self-auto rounded-full bg-gold-500 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-gold-600 hover:scale-102 shadow-xs cursor-pointer"
          >
            Logout Account
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-3xl md:rounded-full border border-champagne/45 shadow-xs flex overflow-x-auto md:flex-wrap gap-1 w-full md:w-fit no-scrollbar whitespace-nowrap scroll-smooth">
        <button onClick={() => setActiveTab("overview")} className={tabClass(activeTab === "overview")}>Overview</button>
        <button onClick={() => setActiveTab("orders")} className={tabClass(activeTab === "orders")}>My Orders</button>
        <button onClick={() => setActiveTab("addresses")} className={tabClass(activeTab === "addresses")}>My Addresses</button>
        <button onClick={() => setActiveTab("tracking")} className={tabClass(activeTab === "tracking")}>Order Tracking</button>
        <button onClick={() => setActiveTab("settings")} className={tabClass(activeTab === "settings")}>Settings</button>
        <button onClick={() => setActiveTab("help")} className={tabClass(activeTab === "help")}>Support</button>
      </div>

      {/* Feedback Messages */}
      {loading ? (
        <div className="flex items-center gap-3 text-xs text-text-secondary bg-white rounded-2xl p-4 border border-champagne/40 shadow-xs">
          <svg className="animate-spin h-4 w-4 text-gold-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading profile details...
        </div>
      ) : null}
      {error ? (
        <div className="text-xs font-semibold text-red-750 bg-red-50 border border-red-200/40 rounded-2xl p-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-550 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      ) : null}
      {successMessage ? (
        <div className="text-xs font-semibold text-gold-800 bg-gold-50 border border-gold-200/40 rounded-2xl p-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-gold-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-xs hover:shadow-sm transition duration-300 hover:scale-[1.01]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Total Orders</p>
              <h3 className="mt-2 text-3xl font-serif font-light text-luxury-black">{orders.length}</h3>
              <p className="text-[10px] text-text-secondary mt-1">Surprises placed to date</p>
            </div>
            <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-xs hover:shadow-sm transition duration-300 hover:scale-[1.01]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Active Orders</p>
              <h3 className="mt-2 text-3xl font-serif font-light text-gold-700">{activeOrdersCount}</h3>
              <p className="text-[10px] text-text-secondary mt-1">Preparing & on their way</p>
            </div>
            <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-xs hover:shadow-sm transition duration-300 hover:scale-[1.01]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Saved Addresses</p>
              <h3 className="mt-2 text-3xl font-serif font-light text-luxury-black">{addresses.length}</h3>
              <p className="text-[10px] text-text-secondary mt-1">Registered delivery options</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Activity Card */}
            <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all duration-300">
              <div>
                <h3 className="text-base font-serif font-semibold text-luxury-black mb-3">Recent Activity</h3>
                {latestOrder ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-luxury-black">Order #{getOrderDisplayId(latestOrder)}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(latestOrder.status)}`}>
                        {latestOrder.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary font-light">Total Price: <span className="font-semibold font-serif text-luxury-black">INR {latestOrder.totalPrice}</span></p>
                    <p className="text-[10px] text-text-secondary font-light">Placed on {new Date(latestOrder.createdAt).toLocaleDateString("en-IN")}</p>
                    
                    {/* Tiny Progress Tracker */}
                    <div className="pt-2">
                      <div className="h-1.5 w-full bg-champagne/50 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 bg-gold-500 rounded-full"
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
                  <p className="text-xs text-text-secondary font-light leading-relaxed">No orders placed yet. Explore our catalog to make surprises!</p>
                )}
              </div>
              <button
                onClick={() => setActiveTab("orders")}
                className="mt-6 text-xs font-bold uppercase tracking-widest text-gold-700 hover:text-gold-800 inline-flex items-center gap-1.5 w-fit bg-transparent border-0 cursor-pointer"
              >
                View all orders &rarr;
              </button>
            </div>

            {/* Default Address Card */}
            <div className="rounded-3xl border border-champagne/40 bg-white/70 backdrop-blur-md p-6 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all duration-300 relative overflow-hidden bg-gradient-to-br from-gold-50/5 via-white to-white">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/5 rounded-full blur-xl pointer-events-none" />
              <div>
                <h3 className="text-base font-serif font-semibold text-luxury-black mb-3 flex items-center gap-2">
                  <span>📍</span> Shipping Destination
                </h3>
                {defaultAddress ? (
                  <div className="space-y-3 text-xs text-text-secondary font-light">
                    <div className="flex items-center gap-2 mb-1">
                      {(() => {
                        const opt = addressLabelOptions.find((o) => o.label === defaultAddress.label) || { icon: "📍", color: "bg-gold-50 text-gold-800 border-gold-200/40" };
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${opt.color}`}>
                            <span>{opt.icon}</span>
                            <span>{defaultAddress.label}</span>
                          </span>
                        );
                      })()}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-luxury-black text-white shadow-xs border border-gold-500/20 uppercase tracking-wider">
                        ✨ Default
                      </span>
                    </div>
                    <p className="font-bold text-luxury-black text-sm leading-tight font-serif">{defaultAddress.fullName}</p>
                    <div className="flex items-start gap-1.5 pt-0.5">
                      <div className="leading-relaxed">
                        <p>{defaultAddress.line1}</p>
                        <p className="font-semibold text-gray-700 mt-0.5">
                          {defaultAddress.city}, {defaultAddress.state} - <span className="font-extrabold text-luxury-black font-sans">{defaultAddress.postalCode}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-champagne/30 text-luxury-black font-normal">
                      <span>📞</span>
                      <span className="font-bold">{defaultAddress.phone}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary font-light leading-relaxed">No default shipping address set. Save a shipping address for faster ordering.</p>
                )}
              </div>
              <button
                onClick={() => setActiveTab("addresses")}
                className="mt-6 text-xs font-bold uppercase tracking-widest text-gold-700 hover:text-gold-800 inline-flex items-center gap-1.5 w-fit bg-transparent border-0 cursor-pointer"
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
          <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs animate-fade-in">
            <h2 className="text-lg font-serif font-semibold text-luxury-black">My Orders</h2>
            <p className="text-xs text-text-secondary mt-1 font-light">Review status details, request cancellations, or download tracking codes.</p>
          </div>
          <div className="space-y-3">
            {orders.map((order) => (
              <article key={order._id} className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-5 shadow-xs hover:shadow-sm transition duration-300">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-champagne/30 pb-3">
                  <div>
                    <p className="text-sm font-bold text-luxury-black font-serif">Order #{getOrderDisplayId(order)}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5 font-light">Placed on {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase border tracking-wider ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="py-3 text-xs text-text-secondary font-light space-y-1.5">
                  <p>Items Count: <span className="font-semibold text-luxury-black">{order.products?.length || 0}</span></p>
                  <p>Total Cost: <span className="font-semibold text-gold-700 font-serif">INR {order.totalPrice}</span></p>
                  
                  {order.cancellationRequest?.status && order.cancellationRequest.status !== "None" ? (
                    <div className="rounded-xl border border-amber-200/50 bg-amber-50/30 px-3.5 py-2.5 mt-2">
                      <p className="text-xs font-semibold text-amber-900">
                        Cancellation Request Status: <span className="uppercase">{order.cancellationRequest.status}</span>
                      </p>
                      {order.cancellationRequest.reason ? (
                        <p className="text-[11px] text-amber-800 mt-0.5">Reason: {order.cancellationRequest.reason}</p>
                      ) : null}
                      {order.cancellationRequest.adminNote ? (
                        <p className="text-[11px] text-amber-800 mt-1">Admin Response: {order.cancellationRequest.adminNote}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {order.trackingId ? (
                    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-gold-200/30 bg-gold-50/10 p-3">
                      <p className="text-[11px] text-gold-800 font-medium">Tracking ID: {order.trackingId}</p>
                      <a
                        href={getTrackingUrl(order.trackingId, order.trackingCarrier)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-gold-500 hover:bg-gold-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-xs transition duration-300 cursor-pointer"
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
                      className="rounded-full border border-red-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 hover:scale-[1.01] transition cursor-pointer"
                    >
                      Request Cancellation
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            {!orders.length ? (
              <div className="bg-white/50 border border-champagne/40 text-center py-12 rounded-3xl">
                <p className="text-xs text-text-secondary font-medium">No orders found yet. Start shopping now.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* CANCELLATION MODAL */}
      {cancelModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-black/60 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white/95 border border-gold-300/20 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-champagne/30 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Cancellation request</p>
                <h3 className="mt-1.5 text-lg font-serif font-light text-luxury-black">
                  Order #{getOrderDisplayId(cancelTargetOrder)}
                </h3>
                <p className="mt-1 text-xs text-text-secondary font-light leading-relaxed">
                  Your request will be reviewed by admin. If approved, the order will be cancelled and refund will be initiated.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="text-text-secondary hover:text-luxury-black text-2xl font-light cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-luxury-black uppercase tracking-wider block mb-1.5">Reason *</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
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
                <label className="text-xs font-bold text-luxury-black uppercase tracking-wider block mb-1.5">Details (optional)</label>
                <textarea
                  value={cancelDetails}
                  onChange={(e) => setCancelDetails(e.target.value)}
                  rows={3}
                  className="w-2xl max-w-full rounded-2xl border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none resize-none"
                  placeholder="Add details to help us process the cancellation request faster..."
                />
              </div>
              <label className="flex items-start gap-2.5 rounded-2xl border border-champagne bg-white/60 px-4 py-3 text-xs text-text-secondary cursor-pointer leading-normal select-none">
                <input
                  type="checkbox"
                  checked={cancelConfirmed}
                  onChange={(e) => setCancelConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-champagne text-gold-500 accent-gold-600 focus:ring-gold-500/20 cursor-pointer"
                />
                <span>I understand this is a request and cancellation will be confirmed after review.</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={submitCancellationRequest}
                disabled={submittingCancel}
                className="flex-1 rounded-full bg-red-650 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-750 disabled:cursor-not-allowed disabled:opacity-60 transition cursor-pointer"
              >
                {submittingCancel ? "Submitting..." : "Submit request"}
              </button>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="rounded-full border border-champagne bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-luxury-black hover:bg-gold-50 transition cursor-pointer"
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
          <div className="bg-white/70 backdrop-blur-md border border-champagne/45 p-6 rounded-3xl shadow-xs flex flex-wrap items-center justify-between gap-4 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-1 h-full bg-gold-500" />
            <div>
              <h2 className="text-lg font-serif font-semibold text-luxury-black flex items-center gap-2">
                <span>📍</span> Delivery Addresses
              </h2>
              <p className="mt-1 text-xs text-text-secondary font-light">Manage your shipping details for frictionless checkout experiences.</p>
            </div>
            <button
              onClick={handleAddAddress}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 shadow-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add New Address
            </button>
          </div>

          {showAddressForm && (
            <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 md:p-8 shadow-xs space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-serif font-semibold text-luxury-black mb-1">
                  {editingAddress ? "Edit Address" : "Add Address"}
                </h2>
                <p className="text-xs text-text-secondary font-light">
                  {editingAddress ? "Update your saved shipping details." : "Save a shipping address to speed up order confirmation."}
                </p>
              </div>

              <form onSubmit={handleSaveAddress} className="space-y-6">
                <div className="rounded-2xl border border-champagne/45 bg-white/60 p-5 space-y-4">
                  <h3 className="text-xs font-bold text-luxury-black uppercase tracking-wider">Select Address Type</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {addressLabelOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setAddressForm((prev) => ({ ...prev, label: option.label }))}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition duration-300 hover:scale-[1.02] cursor-pointer ${
                          addressForm.label === option.label
                            ? "border-gold-500 bg-gold-50/40 text-gold-800 shadow-xs"
                            : "border-champagne bg-white hover:border-gold-300 text-text-secondary hover:text-gold-700"
                        }`}
                      >
                        <span className="text-2xl mb-1.5">{option.icon}</span>
                        <span className="text-xs font-bold">{option.label}</span>
                      </button>
                    ))}
                  </div>
                  {addressForm.label === "Other" && (
                    <div className="mt-4 animate-slide-down">
                      <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">Custom Label Name *</label>
                      <input
                        name="customLabel"
                        value={addressForm.customLabel || ""}
                        onChange={handleAddressFormChange}
                        placeholder="e.g. Vacation Home, Friend's house"
                        required
                        className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-champagne/45 bg-white/60 p-5 space-y-4">
                  <h3 className="text-xs font-bold text-luxury-black uppercase tracking-wider">Contact Information</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">
                        Full Name *
                      </label>
                      <input
                        name="fullName"
                        value={addressForm.fullName}
                        onChange={handleAddressFormChange}
                        placeholder="Enter recipient's full name"
                        required
                        className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        name="phone"
                        value={addressForm.phone}
                        onChange={handleAddressFormChange}
                        placeholder="10-digit mobile number"
                        required
                        className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-champagne/45 bg-white/60 p-5 space-y-4">
                  <h3 className="text-xs font-bold text-luxury-black uppercase tracking-wider">Address Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">
                        Street Address *
                      </label>
                      <input
                        name="line1"
                        value={addressForm.line1}
                        onChange={handleAddressFormChange}
                        placeholder="Flat/House number, Building name, Street name"
                        required
                        className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">
                          City *
                        </label>
                        <input
                          name="city"
                          value={addressForm.city}
                          onChange={handleAddressFormChange}
                          placeholder="City"
                          required
                          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">
                          State *
                        </label>
                        <input
                          name="state"
                          value={addressForm.state}
                          onChange={handleAddressFormChange}
                          placeholder="State"
                          required
                          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">
                          Postal Code *
                        </label>
                        <input
                          name="postalCode"
                          value={addressForm.postalCode}
                          onChange={handleAddressFormChange}
                          placeholder="Pincode (e.g. 400001)"
                          required
                          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">
                        Country *
                      </label>
                      <input
                        name="country"
                        value={addressForm.country}
                        onChange={handleAddressFormChange}
                        placeholder="Country"
                        required
                        className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-champagne/45 bg-white/60 p-5">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="isDefault"
                      name="isDefault"
                      checked={addressForm.isDefault}
                      onChange={handleAddressFormChange}
                      className="h-5 w-5 rounded border-champagne text-gold-500 accent-gold-600 focus:ring-gold-500/20 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="isDefault" className="text-sm font-bold text-luxury-black cursor-pointer block select-none">
                        Set as Default Address
                      </label>
                      <p className="text-xs text-text-secondary mt-0.5 select-none font-light">
                        This address will be auto-selected during your next checkout process.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gold-500 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-gold-600 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {savingAddress ? "Saving Address..." : editingAddress ? "Update Address" : "Save Address"}
                  </button>
                  <button
                    type="button"
                    onClick={resetAddressForm}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-champagne px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-luxury-black transition hover:bg-gold-50 hover:scale-[1.01] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Addresses Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            {addresses.map((address) => {
              const labelOption = addressLabelOptions.find((opt) => opt.label === address.label) || { icon: "📍", color: "bg-gold-50 text-gold-800 border-gold-200/40" };
              return (
                <div
                  key={address._id}
                  className={`group relative rounded-3xl border transition duration-300 hover:shadow-md p-6 flex flex-col justify-between ${
                    address.isDefault
                      ? "border-gold-500 bg-gradient-to-br from-gold-50/20 via-white to-white shadow-xs"
                      : "border-champagne/45 bg-white hover:border-gold-300/40"
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-500 text-white shadow-xs border border-gold-450 uppercase tracking-wider">
                          ✨ Default
                        </span>
                      ) : null}
                    </div>

                    {/* Content line of the card */}
                    <div className="space-y-2.5 text-sm text-text-secondary font-light">
                      <p className="font-bold text-luxury-black text-base leading-tight font-serif">{address.fullName}</p>
                      
                      <div className="flex items-start gap-2 pt-1">
                        <span className="text-gray-405 mt-0.5 text-base shrink-0">📍</span>
                        <div className="leading-relaxed">
                          <p className="text-luxury-black">{address.line1}</p>
                          <p className="font-semibold text-luxury-black mt-0.5">
                            {address.city}, {address.state} - <span className="font-extrabold text-luxury-black font-sans">{address.postalCode}</span>
                          </p>
                          <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-1 font-semibold">{address.country}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-champagne/30 text-luxury-black font-normal">
                        <span className="text-gray-400 shrink-0">📞</span>
                        <span className="font-bold tracking-wide text-sm">{address.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons line of the card */}
                  <div className="mt-6 pt-4 border-t border-champagne/30 flex items-center gap-2.5">
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAddress(address._id)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-gold-200/60 bg-gold-50/40 py-2.5 text-xs font-bold text-gold-800 transition hover:bg-gold-100/50 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEditAddress(address)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-champagne bg-white py-2.5 text-xs font-bold text-luxury-black transition hover:bg-gold-50 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address._id)}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50/50 p-2.5 text-red-650 transition hover:bg-red-100 hover:text-red-700 cursor-pointer"
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
            <div className="rounded-3xl border-2 border-dashed border-gold-200 bg-gold-50/5 p-12 text-center max-w-xl mx-auto shadow-inner animate-fade-in">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-50 text-gold-600 border border-gold-100 text-3xl">
                📍
              </div>
              <h3 className="text-lg font-serif font-semibold text-luxury-black mb-1">No delivery addresses saved</h3>
              <p className="text-xs text-text-secondary mb-6 font-light">Create your first shipping details to save time on your next checkout.</p>
              <button
                onClick={handleAddAddress}
                className="inline-flex items-center gap-2 rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 shadow-xs hover:shadow-sm cursor-pointer"
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
          <div className="bg-white/70 backdrop-blur-md border border-champagne/45 p-6 rounded-3xl shadow-xs animate-fade-in">
            <h2 className="text-lg font-serif font-semibold text-luxury-black">Track Shipment Journeys</h2>
            <p className="text-xs text-text-secondary mt-1 font-light">Review tracking statuses, shipping timelines, and download receipt records.</p>
          </div>

          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order._id} className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-champagne/30 pb-3">
                    <div>
                      <p className="text-sm font-bold text-luxury-black font-serif">Order #{getOrderDisplayId(order)}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5 font-light">Placed on {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase border tracking-wider ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-luxury-black">Delivery Status Track</h4>
                      {["Shipped", "Delivered"].includes(order.status) && order.trackingId && (
                        <a
                          href={getTrackingUrl(order.trackingId, order.trackingCarrier)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 hover:bg-gold-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition duration-300 shadow-xs cursor-pointer"
                        >
                          Track Live Package
                        </a>
                      )}
                    </div>

                    {["Shipped", "Delivered"].includes(order.status) && order.trackingId && (
                      <div className="rounded-xl bg-blue-50/30 p-3.5 border border-blue-200/50">
                        <p className="text-xs text-blue-900">
                          <span className="font-semibold">Tracking Number:</span> {order.trackingId}
                        </p>
                        {order.trackingCarrier && (
                          <p className="text-[11px] text-blue-700 mt-1 capitalize">
                            <span className="font-semibold">Courier Partner:</span> {order.trackingCarrier}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="relative mb-4 h-2 rounded-full bg-champagne/50">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            order.status === "Cancelled" ? "bg-red-500" : "bg-gold-500"
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
                                  reached ? "border-gold-500 bg-gold-500 text-white" :
                                  isCurrent ? "border-gold-500 bg-white text-gold-500 animate-pulse" :
                                  "border-champagne bg-white text-gray-400"
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <p className={`text-[9px] md:text-[10px] font-bold leading-tight ${
                                reached ? "text-gold-800" :
                                isCurrent ? "text-gold-500" : "text-text-secondary"
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
            <div className="rounded-3xl border border-champagne bg-white/50 p-8 text-center max-w-xl mx-auto shadow-xs animate-fade-in">
              <div className="mx-auto mb-3 text-2xl">📦</div>
              <h3 className="text-base font-serif font-semibold text-luxury-black">No orders placed</h3>
              <p className="text-xs text-text-secondary mt-1 font-light">Start buying gifts to track their delivery statuses here.</p>
            </div>
          )}
        </div>
      ) : null}

      {/* ACCOUNT SETTINGS TAB */}
      {activeTab === "settings" && !loading ? (
        <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 md:p-8 shadow-xs animate-fade-in">
          <div className="border-b border-champagne/30 pb-4 mb-6">
            <h2 className="text-lg font-serif font-semibold text-luxury-black">Account Settings</h2>
            <p className="text-xs text-text-secondary mt-1 font-light">Manage registered contact details and account passwords securely.</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal Info Settings */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-luxury-black uppercase tracking-wider mb-2">Personal Information</h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">Full Name</label>
                  <input
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileFormChange}
                    required
                    className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                    placeholder="Update name"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileFormChange}
                    required
                    className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                    placeholder="Update email"
                  />
                </div>
              </div>

              {/* Password Settings */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-luxury-black uppercase tracking-wider mb-2">Change Password</h3>
                <p className="text-xs text-text-secondary font-light">Leave these blank if you do not wish to update your password.</p>

                <div>
                  <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">Current Password</label>
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={profileForm.password}
                    onChange={handleProfileFormChange}
                    className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">New Password</label>
                  <input
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={profileForm.newPassword}
                    onChange={handleProfileFormChange}
                    className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-luxury-black uppercase mb-1.5">Confirm New Password</label>
                  <input
                    name="confirmNewPassword"
                    type="password"
                    autoComplete="new-password"
                    value={profileForm.confirmNewPassword}
                    onChange={handleProfileFormChange}
                    className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-champagne/30 pt-5">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-sm cursor-pointer"
              >
                {savingProfile ? "Saving changes..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* HELP & SUPPORT TAB */}
      {activeTab === "help" && !loading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Quick Contact & FAQs */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/70 backdrop-blur-md border border-champagne/45 p-6 rounded-3xl shadow-xs animate-fade-in">
              <h2 className="text-lg font-serif font-semibold text-luxury-black">Support Channels</h2>
              <p className="text-xs text-text-secondary mt-1 font-light leading-relaxed">Reach out directly via email or our concierge service.</p>
              
              <div className="mt-4 space-y-3">
                <a
                  href="mailto:niyoragifts@gmail.com"
                  className="rounded-2xl border border-gold-200/40 bg-gold-50/5 p-4 hover:bg-gold-50/10 transition duration-300 block"
                >
                  <h3 className="font-serif font-semibold text-luxury-black text-sm">Send Email</h3>
                  <p className="text-[11px] text-text-secondary mt-0.5 font-light">niyoragifts@gmail.com</p>
                  <p className="text-[9px] text-gold-700 mt-2 font-bold uppercase tracking-widest">12-24 Hour Turnaround</p>
                </a>
                <a
                  href="https://wa.me/919000000000"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-gold-200/40 bg-gold-50/5 p-4 hover:bg-gold-50/10 transition duration-300 block"
                >
                  <h3 className="font-serif font-semibold text-luxury-black text-sm">WhatsApp Chat</h3>
                  <p className="text-[11px] text-text-secondary mt-0.5 font-light">Instant mobile concierge</p>
                  <p className="text-[9px] text-gold-700 mt-2 font-bold uppercase tracking-widest">Immediate Assistance</p>
                </a>
              </div>
            </div>

            {/* FAQs Accordion */}
            <div className="bg-white/70 backdrop-blur-md border border-champagne/45 p-6 rounded-3xl shadow-xs animate-fade-in">
              <h3 className="text-sm font-serif font-bold text-luxury-black mb-3">Frequently Asked Questions</h3>
              <div className="divide-y divide-champagne/30">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className="py-3">
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between text-left font-serif font-semibold text-luxury-black text-xs focus:outline-none bg-transparent border-0 cursor-pointer p-0"
                      >
                        <span className="pr-2">{faq.q}</span>
                        <svg
                          className={`w-3.5 h-3.5 text-gold-600 transition-transform duration-300 shrink-0 ${isOpen ? "transform rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="mt-2 text-[11px] text-text-secondary leading-relaxed animate-slide-down font-light">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Support Tickets Panel */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTicket ? (
              /* Ticket Detail / Conversation Thread View */
              <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs animate-fade-in flex flex-col min-h-[500px]">
                {/* Header */}
                <div className="border-b border-champagne/40 pb-4 mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="text-xs font-bold uppercase tracking-widest text-gold-700 hover:text-gold-800 flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0 mb-2"
                    >
                      &larr; Back to Tickets
                    </button>
                    <h3 className="text-base font-serif font-semibold text-luxury-black">
                      {selectedTicket.subject}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-secondary font-light">
                      <span className="font-bold font-mono">{selectedTicket.ticketCode}</span>
                      <span>&bull;</span>
                      <span>Created {new Date(selectedTicket.createdAt).toLocaleDateString("en-IN")}</span>
                      {selectedTicket.order && (
                        <>
                          <span>&bull;</span>
                          <span>Order #{selectedTicket.order.orderCode}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase border tracking-wider ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px] pr-2 mb-4 scroll-smooth">
                  {selectedTicket.messages?.map((msg, index) => {
                    const isSystem = msg.senderName === "System Note";
                    if (isSystem) {
                      return (
                        <div key={index} className="rounded-xl bg-gray-50 border border-gray-150 py-1.5 px-3 text-[10px] text-center max-w-md mx-auto text-text-secondary font-light">
                          {msg.message}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={index}
                        className={`flex flex-col ${msg.isAdmin ? "items-start" : "items-end"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-luxury-black font-serif">
                            {msg.senderName}
                          </span>
                          <span className="text-[9px] text-text-secondary font-light">
                            {new Date(msg.createdAt).toLocaleString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl p-3 text-xs leading-relaxed max-w-md ${
                            msg.isAdmin
                              ? "bg-cream border border-champagne text-luxury-black rounded-tl-none"
                              : "bg-gold-500 text-white rounded-tr-none"
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Send Reply Form */}
                {selectedTicket.status !== "Resolved" ? (
                  <form onSubmit={handleSendReply} className="border-t border-champagne/45 pt-4 mt-auto">
                    <div className="flex items-end gap-3">
                      <textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Type your reply here..."
                        rows={2}
                        className="flex-1 rounded-2xl border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none resize-none"
                        required
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !replyMessage.trim()}
                        className="rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
                      >
                        {sendingReply ? "Sending..." : "Reply"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="border-t border-champagne/45 pt-4 text-center mt-auto">
                    <p className="text-xs text-text-secondary font-light">
                      This ticket has been marked as Resolved. You can send a message below to reopen it.
                    </p>
                    <form onSubmit={handleSendReply} className="mt-3 flex items-end gap-3">
                      <textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Reopen ticket by replying..."
                        rows={2}
                        className="flex-1 rounded-2xl border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none resize-none"
                        required
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !replyMessage.trim()}
                        className="rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
                      >
                        {sendingReply ? "Reopen" : "Send"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : ticketFormOpen ? (
              /* New Ticket Form */
              <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-champagne/40 mb-4">
                  <h3 className="text-base font-serif font-semibold text-luxury-black">
                    Raise a Support Ticket
                  </h3>
                  <button
                    onClick={() => setTicketFormOpen(false)}
                    className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-luxury-black bg-transparent border-0 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1.5">
                      Subject / Issue Summary *
                    </label>
                    <input
                      value={newTicketSubject}
                      onChange={(e) => setNewTicketSubject(e.target.value)}
                      placeholder="e.g. Damage during delivery, Missing gift card"
                      required
                      className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1.5">
                      Associated Order (optional)
                    </label>
                    <select
                      value={newTicketOrderId}
                      onChange={(e) => setNewTicketOrderId(e.target.value)}
                      className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
                    >
                      <option value="">General Query (No Order)</option>
                      {orders.map((order) => (
                        <option key={order._id} value={order._id}>
                          Order #{getOrderDisplayId(order)} ({new Date(order.createdAt).toLocaleDateString("en-IN")}) - INR {order.totalPrice}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1.5">
                      Detailed Message *
                    </label>
                    <textarea
                      value={newTicketMessage}
                      onChange={(e) => setNewTicketMessage(e.target.value)}
                      placeholder="Describe your issue in detail. If it relates to a specific package, let us know what happened..."
                      rows={4}
                      required
                      className="w-full rounded-2xl border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={submittingTicket}
                      className="flex-1 rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-sm cursor-pointer"
                    >
                      {submittingTicket ? "Submitting..." : "Submit Ticket"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketFormOpen(false)}
                      className="rounded-full border border-champagne bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-luxury-black transition hover:bg-gold-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Tickets List View */
              <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-champagne/40 mb-4">
                  <div>
                    <h3 className="text-base font-serif font-semibold text-luxury-black">
                      Support Tickets
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-0.5 font-light">
                      Track open tickets and review conversation logs with support concierge.
                    </p>
                  </div>
                  <button
                    onClick={() => setTicketFormOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 shadow-xs cursor-pointer"
                  >
                    Raise Ticket
                  </button>
                </div>

                {loadingTickets ? (
                  <div className="py-12 flex justify-center text-xs text-text-secondary items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-gold-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading tickets...
                  </div>
                ) : tickets.length > 0 ? (
                  <div className="divide-y divide-champagne/30">
                    {tickets.map((t) => (
                      <div key={t._id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-luxury-black">{t.ticketCode}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${getStatusColor(t.status)}`}>
                              {t.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-luxury-black">{t.subject}</h4>
                          <div className="text-[10px] text-text-secondary font-light flex items-center gap-2">
                            <span>Last updated {new Date(t.updatedAt).toLocaleDateString("en-IN")}</span>
                            {t.order && (
                              <>
                                <span>&bull;</span>
                                <span className="font-mono">Order #{t.order.orderCode}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => fetchTicketDetails(t._id)}
                          className="rounded-full border border-champagne bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-luxury-black hover:bg-gold-50 hover:border-gold-300 transition cursor-pointer"
                        >
                          View Thread &rarr;
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border-2 border-dashed border-champagne/60 rounded-2xl bg-gold-50/5">
                    <p className="text-xs text-text-secondary font-light">
                      No support tickets created yet.
                    </p>
                    <button
                      onClick={() => setTicketFormOpen(true)}
                      className="mt-4 rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-xs transition cursor-pointer"
                    >
                      Raise Your First Ticket
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default MyProfile;
