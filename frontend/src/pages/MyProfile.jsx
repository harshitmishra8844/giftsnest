import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { resolveMediaUrl } from "../services/api";
import { clearUserAuth, getUserAuth, saveUserAuth } from "../services/userAuth";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, Calendar, Award, Activity, ChevronRight, LogOut, Settings,
  ShoppingBag, Heart, MapPin, Truck, Bell, Gift, Compass, ShieldCheck, HelpCircle,
  Edit, Trash2, Plus, Search, Share2, Camera, FileText, CheckCircle, MessageSquare,
  Paperclip, ArrowLeft, AlertCircle, TrendingUp, Lock, Moon, Globe, RefreshCw, Download,
  Info, CreditCard, ChevronDown, Check, X, Shield, Eye, LockKeyhole, UserCog, ToggleLeft, HelpCircle as HelpIcon
} from "lucide-react";

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
  { id: "home", label: "Home", icon: "🏠", color: "bg-amber-50/80 text-amber-900 border border-amber-200/50" },
  { id: "work", label: "Work", icon: "💼", color: "bg-amber-50/80 text-amber-900 border border-amber-200/50" },
  { id: "office", label: "Office", icon: "🏢", color: "bg-amber-50/80 text-amber-900 border border-amber-200/50" },
  { id: "parents", label: "Parents", icon: "👨‍👩‍👧‍👦", color: "bg-amber-50/80 text-amber-900 border border-amber-200/50" },
  { id: "friend", label: "Friend", icon: "👥", color: "bg-amber-50/80 text-amber-900 border border-amber-200/50" },
  { id: "other", label: "Other", icon: "📍", color: "bg-amber-50/80 text-amber-900 border border-amber-200/50" },
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

  const { auth, login, logout } = useAuth();
  const { wishlistItems, removeFromWishlist, isLoading: wishlistLoading } = useWishlist();
  const { addToCart, cartItems } = useCart();

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 17) return "Good afternoon";
    return "Good evening";
  };

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
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

  // Recommendations state
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [userCoupons, setUserCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Profile update form state
  const [profileForm, setProfileForm] = useState({
    name: auth?.name || "",
    email: auth?.email || "",
    mobileNumber: auth?.mobileNumber || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Future-ready setting toggles
  const [darkMode, setDarkMode] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);

  // Sync profile form when auth updates
  useEffect(() => {
    if (auth) {
      setProfileForm({
        name: auth.name || "",
        email: auth.email || "",
        mobileNumber: auth.mobileNumber || "",
      });
    }
  }, [auth]);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [dynamicFaqs, setDynamicFaqs] = useState([]);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data } = await api.get("/cms/content/faq");
        if (data?.content?.items) {
          setDynamicFaqs(data.content.items);
        }
      } catch (err) {
        console.error("Failed to load CMS FAQs:", err);
      }
    };
    fetchFaqs();
  }, []);

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

  // Notifications states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Return request states
  const [returnsList, setReturnsList] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [selectedReturnItems, setSelectedReturnItems] = useState({}); // { productId: true/false }
  const [returnItemQuantities, setReturnItemQuantities] = useState({}); // { productId: qty }
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnResolution, setReturnResolution] = useState("Refund");
  const [returnImages, setReturnImages] = useState([]); // [ { url, publicId } ]
  const [returnVideo, setReturnVideo] = useState(null); // { url, publicId }
  const [returnPolicyChecked, setReturnPolicyChecked] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [orderProductsDetails, setOrderProductsDetails] = useState({});

  // COD refund fields
  const [codRefundMethod, setCodRefundMethod] = useState("UPI");
  const [codUpiId, setCodUpiId] = useState("");
  const [codBankName, setCodBankName] = useState("");
  const [codAccountHolderName, setCodAccountHolderName] = useState("");
  const [codAccountNumber, setCodAccountNumber] = useState("");
  const [codIfscCode, setCodIfscCode] = useState("");

  // Chat attachment states
  const [chatAttachment, setChatAttachment] = useState(null); // { name, url, fileType }
  const [uploadingChatAttachment, setUploadingChatAttachment] = useState(false);

  const fetchReturns = async () => {
    try {
      setLoadingReturns(true);
      setError("");
      const [returnsRes, replacementsRes] = await Promise.all([
        api.get("/returns/my-requests"),
        api.get("/returns/my-replacements"),
      ]);
      const formattedReturns = returnsRes.data.map(item => ({
        ...item,
        type: "Return",
        code: item.returnCode,
        order: item.orderId
      }));
      const formattedReplacements = replacementsRes.data.map(item => ({
        ...item,
        type: "Replacement",
        code: item.replacementCode,
        order: item.orderId
      }));
      const combined = [...formattedReturns, ...formattedReplacements].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setReturnsList(combined);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load returns.");
    } finally {
      setLoadingReturns(false);
    }
  };

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

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      setError("");
      const { data } = await api.get("/user/notifications");
      setNotifications(data);
      setUnreadCount(data.filter((n) => n.status !== "Read").length);
    } catch (err) {
      console.error("Load notifications error:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchUserCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const { data } = await api.get("/user/coupons");
      const assignedList = (data.assigned || [])
        .filter((as) => {
          const cp = as.couponId;
          if (!cp) return false;
          if (as.status !== "Unused") return false;
          if (cp.active === false) return false;
          const now = new Date();
          if (cp.endDate && new Date(cp.endDate) < now) return false;
          return true;
        })
        .map((as) => {
          const cp = as.couponId || {};
          return {
            code: cp.code || "N/A",
            desc: cp.isSpecial ? `Exclusive coupon: assigned to you. (Reason: ${as.assignmentType || 'reward'})` : "Hand-curated gift box discount.",
            type: cp.type === "percent" ? "Percentage" : "Flat",
            val: cp.type === "percent" ? `${cp.value}% OFF` : `₹${cp.value} OFF`,
            exp: cp.endDate ? `Expires ${new Date(cp.endDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}` : "No Expiry",
            status: as.status || "Unused"
          };
        });
      const publicList = (data.public || [])
        .filter((cp) => {
          if (cp.active === false) return false;
          const now = new Date();
          if (cp.endDate && new Date(cp.endDate) < now) return false;
          return true;
        })
        .map((cp) => {
          return {
            code: cp.code || "N/A",
            desc: "Public checkout coupon available for all orders.",
            type: cp.type === "percent" ? "Percentage" : "Flat",
            val: cp.type === "percent" ? `${cp.value}% OFF` : `₹${cp.value} OFF`,
            exp: cp.endDate ? `Expires ${new Date(cp.endDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}` : "No Expiry",
            status: "Public"
          };
        });
      setUserCoupons([...assignedList, ...publicList]);
    } catch (err) {
      console.error("Failed to load user coupons:", err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/user/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, status: "Read" } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    try {
      await api.delete(`/user/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((prev) => {
        const deletedNotif = notifications.find((n) => n._id === id);
        if (deletedNotif && deletedNotif.status !== "Read") {
          return Math.max(0, prev - 1);
        }
        return prev;
      });
    } catch (err) {
      console.error("Failed to delete notification:", err);
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
      const payload = {
        message: replyMessage,
      };
      if (chatAttachment) {
        payload.attachments = [chatAttachment];
      }
      const { data } = await api.post(`/tickets/my/${selectedTicket._id}/messages`, payload);
      setSelectedTicket(data);
      setTickets((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      setReplyMessage("");
      setChatAttachment(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message.");
    } finally {
      setSendingReply(false);
    }
  };

  const openReturnModal = async (order) => {
    setReturnOrder(order);
    setReturnReason("");
    setReturnDescription("");
    setReturnResolution("Refund");
    setReturnImages([]);
    setReturnVideo(null);
    setReturnPolicyChecked(false);
    setCodRefundMethod("UPI");
    setCodUpiId("");
    setCodBankName("");
    setCodAccountHolderName("");
    setCodAccountNumber("");
    setCodIfscCode("");
    setError("");
    setSuccessMessage("");

    const itemsSelection = {};
    const itemsQtys = {};
    order.products.forEach((p) => {
      const key = p.productId || p._id;
      itemsSelection[key] = true;
      itemsQtys[key] = p.quantity || 1;
    });
    setSelectedReturnItems(itemsSelection);
    setReturnItemQuantities(itemsQtys);

    setReturnModalOpen(true);

    const productDetailMap = {};
    try {
      setUploadingFiles(true);
      await Promise.all(
        order.products.map(async (p) => {
          const key = p.productId || p._id;
          try {
            const { data } = await api.get(`/products/${key}`);
            productDetailMap[key] = data;
          } catch (e) {
            console.error("Failed to load product details for return validation:", e);
          }
        })
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingFiles(false);
    }
    setOrderProductsDetails(productDetailMap);
  };

  const handleReturnFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    const formData = new FormData();
    setUploadingFiles(true);
    setError("");

    const isVideo = e.target.name === "video";
    if (isVideo) {
      formData.append("video", files[0]);
    } else {
      for (let i = 0; i < files.length; i++) {
        formData.append("images", files[i]);
      }
    }

    try {
      const { data } = await api.post("/returns/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (isVideo) {
        setReturnVideo(data.video);
      } else {
        setReturnImages((prev) => [...prev, ...data.images]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "File upload failed.");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleChatAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("attachment", file);
    setUploadingChatAttachment(true);
    setError("");

    try {
      const { data } = await api.post("/returns/upload-attachment", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setChatAttachment({
        name: data.name,
        url: data.url,
        fileType: data.fileType,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Attachment upload failed.");
    } finally {
      setUploadingChatAttachment(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnReason) {
      setError("Please select a return reason.");
      return;
    }
    if (!returnDescription.trim()) {
      setError("Please provide a detailed description.");
      return;
    }
    if (!returnPolicyChecked) {
      setError("You must agree to the Return Policy.");
      return;
    }

    const selectedItems = returnOrder.products.filter(p => selectedReturnItems[p.productId || p._id]);
    if (selectedItems.length === 0) {
      setError("Please select at least one item to return.");
      return;
    }

    if (returnResolution === "Refund" && returnOrder.paymentMethod === "COD") {
      if (!codRefundMethod) {
        setError("Please select a refund method for COD.");
        return;
      }
      if (codRefundMethod === "UPI") {
        if (!codUpiId.trim()) {
          setError("Please provide a UPI ID.");
          return;
        }
      } else if (codRefundMethod === "Bank Transfer") {
        if (!codBankName.trim() || !codAccountHolderName.trim() || !codAccountNumber.trim() || !codIfscCode.trim()) {
          setError("Please fill all bank account details.");
          return;
        }
      }
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        orderId: returnOrder._id,
        items: selectedItems.map(p => {
          const key = p.productId || p._id;
          return {
            productId: key,
            name: p.name,
            price: p.price,
            quantity: returnItemQuantities[key] || 1,
            image: p.image || "",
          };
        }),
        reason: returnReason,
        description: returnDescription.trim(),
        images: returnImages,
        codRefundMethod: (returnResolution === "Refund" && returnOrder.paymentMethod === "COD") ? codRefundMethod : "",
        codRefundDetails: (returnResolution === "Refund" && returnOrder.paymentMethod === "COD") ? {
          upiId: codUpiId.trim(),
          bankName: codBankName.trim(),
          accountHolderName: codAccountHolderName.trim(),
          accountNumber: codAccountNumber.trim(),
          ifscCode: codIfscCode.trim(),
        } : undefined,
      };

      let endpoint = "/returns/requests";
      if (returnResolution === "Replacement") {
        endpoint = "/returns/replacements";
      } else {
        payload.video = returnVideo || undefined;
      }

      const { data } = await api.post(endpoint, payload);
      setSuccessMessage(data.message || "Request submitted successfully!");
      setReturnModalOpen(false);
      setReturnOrder(null);

      await Promise.all([fetchReturns(), fetchTickets(), api.get("/orders/my").then(res => setOrders(res.data))]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "help" && auth?.token) {
      fetchTickets();
    }
    if (activeTab === "returns" && auth?.token) {
      fetchReturns();
    }
    if (activeTab === "notifications" && auth?.token) {
      fetchNotifications();
    }
  }, [activeTab, auth]);

  // Fetch product recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoadingRecommendations(true);
        const { data } = await api.get("/products");
        setRecommendations(data.slice(0, 8));
      } catch (err) {
        console.error("Failed to load recommendations:", err);
      } finally {
        setLoadingRecommendations(false);
      }
    };
    fetchRecommendations();
  }, []);

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

  const canRequestReturn = (order) => {
    if (!order) return false;
    if (order.status !== "Delivered") return false;

    const hasExisting = returnsList.some((ret) => {
      const orderId = ret.order?._id || ret.order;
      return orderId === order._id;
    });
    if (hasExisting) return false;

    const deliveryDate = new Date(order.updatedAt);
    const diffTime = Math.abs(new Date() - deliveryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const getOrderReturn = (orderId) => {
    return returnsList.find((ret) => {
      const oid = ret.order?._id || ret.order;
      return oid === orderId;
    });
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
        const [ordersRes, addressesRes, storeInfoRes] = await Promise.all([
          api.get("/orders/my"),
          api.get("/user/addresses"),
          api.get("/store-info").catch(() => null),
        ]);
        setOrders(ordersRes.data);
        setAddresses(addressesRes.data);
        if (storeInfoRes && storeInfoRes.data) {
          setStoreInfo(storeInfoRes.data);
        }
        await Promise.all([fetchReturns(), fetchNotifications(), fetchUserCoupons()]);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load your profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth, navigate]);

  const handleLogout = () => {
    logout();
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

    if (!profileForm.name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!profileForm.mobileNumber.trim()) {
      setError("Mobile number is required.");
      return;
    }

    try {
      setSavingProfile(true);
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.toLowerCase().trim(),
        mobileNumber: profileForm.mobileNumber.trim(),
      };

      const { data } = await api.put("/user/profile", payload);
      login(data);
      setSuccessMessage("Account settings updated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile settings");
    } finally {
      setSavingProfile(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-amber-100/50 text-amber-900 border border-amber-300/30";
      case "Shipped":
        return "bg-blue-100/40 text-blue-900 border border-blue-300/30";
      case "Processing":
        return "bg-indigo-100/40 text-indigo-900 border border-indigo-300/30";
      case "Order Confirmed":
        return "bg-emerald-100/40 text-emerald-900 border border-emerald-300/30";
      case "Pending":
        return "bg-gray-100/50 text-gray-700 border border-gray-300/30";
      case "Cancelled":
        return "bg-rose-100/40 text-rose-900 border border-rose-300/30";
      default:
        return "bg-gray-100/50 text-gray-700 border border-gray-300/30";
    }
  };

  const getReturnStatusColor = (status) => {
    switch (status) {
      case "Return Requested":
        return "bg-indigo-50 text-indigo-800 border border-indigo-200/50";
      case "Under Review":
        return "bg-blue-50 text-blue-800 border border-blue-200/50";
      case "Approved":
      case "Refunded":
      case "Completed":
        return "bg-amber-50 text-amber-800 border border-gold-300/30";
      case "Pickup Scheduled":
      case "Product Received":
      case "Refund Processing":
      case "Replacement Shipped":
        return "bg-purple-50 text-purple-800 border border-purple-200/50";
      case "Rejected":
        return "bg-red-50 text-red-800 border border-red-200/50";
      default:
        return "bg-gray-50 text-gray-800 border border-gray-200/50";
    }
  };

  const renderReturnModal = () => {
    if (!returnModalOpen || !returnOrder) return null;

    const getEligibleResolutions = () => {
      let canReturn = false;
      let canReplace = false;

      const selectedKeys = Object.keys(selectedReturnItems).filter(k => selectedReturnItems[k]);
      if (selectedKeys.length === 0) return { canReturn: true, canReplace: true };

      selectedKeys.forEach(key => {
        const prodDetails = orderProductsDetails[key];
        if (!prodDetails) {
          canReturn = true;
          canReplace = true;
          return;
        }
        const deliveryDate = new Date(returnOrder.updatedAt);
        const elapsedDays = Math.ceil(Math.abs(new Date() - deliveryDate) / (1000 * 60 * 60 * 24));

        const rAvailable = prodDetails.isPersonalized ? false : prodDetails.returnAvailable;
        const rWindow = prodDetails.returnWindow;
        const rDays = rWindow === "3 Days" ? 3 : rWindow === "7 Days" ? 7 : rWindow === "10 Days" ? 10 : rWindow === "15 Days" ? 15 : rWindow === "30 Days" ? 30 : 0;
        if (rAvailable && elapsedDays <= rDays) {
          canReturn = true;
        }

        const repAvailable = prodDetails.replacementAvailable;
        const repWindow = prodDetails.replacementWindow;
        const repDays = repWindow === "3 Days" ? 3 : repWindow === "7 Days" ? 7 : repWindow === "10 Days" ? 10 : repWindow === "15 Days" ? 15 : repWindow === "30 Days" ? 30 : 0;
        if (repAvailable && elapsedDays <= repDays) {
          canReplace = true;
        }
      });

      return { canReturn, canReplace };
    };

    const selectedCount = returnOrder.products.filter(p => selectedReturnItems[p.productId || p._id]).length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-black/60 p-4 backdrop-blur-md overflow-y-auto">
        <div className="w-full max-w-2xl rounded-3xl bg-white border border-gold-300/20 p-6 md:p-8 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto no-scrollbar">
          <div className="flex items-start justify-between gap-3 border-b border-champagne/35 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gold-600">Return Request Portal</p>
              <h3 className="mt-1.5 text-xl font-serif font-light text-luxury-black">
                Order #{returnOrder.orderCode || returnOrder._id.slice(-8)}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setReturnModalOpen(false);
                setReturnOrder(null);
              }}
              className="text-text-secondary hover:text-luxury-black text-2xl font-light cursor-pointer"
              aria-label="Close Return Modal"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleReturnSubmit} className="space-y-5">
            {/* Products Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-luxury-black uppercase tracking-wider block">
                Select Items *
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border border-champagne/30 rounded-2xl p-2 bg-gold-50/5">
                {returnOrder.products.map((product) => {
                  const key = product.productId || product._id;
                  const isChecked = !!selectedReturnItems[key];
                  const maxQty = product.quantity || 1;
                  const selectedQty = returnItemQuantities[key] || 1;

                  const prodDetails = orderProductsDetails[key];
                  const deliveryDate = new Date(returnOrder.updatedAt);
                  const elapsedDays = Math.ceil(Math.abs(new Date() - deliveryDate) / (1000 * 60 * 60 * 24));

                  const returnAvailable = prodDetails ? (prodDetails.isPersonalized ? false : prodDetails.returnAvailable) : true;
                  const returnWindow = prodDetails ? prodDetails.returnWindow : "7 Days";
                  const returnDays = returnWindow === "3 Days" ? 3 : returnWindow === "7 Days" ? 7 : returnWindow === "10 Days" ? 10 : returnWindow === "15 Days" ? 15 : returnWindow === "30 Days" ? 30 : 7;
                  const isReturnEligible = returnAvailable && elapsedDays <= returnDays;

                  const replacementAvailable = prodDetails ? prodDetails.replacementAvailable : true;
                  const replacementWindow = prodDetails ? prodDetails.replacementWindow : "7 Days";
                  const replacementDays = replacementWindow === "3 Days" ? 3 : replacementWindow === "7 Days" ? 7 : replacementWindow === "10 Days" ? 10 : replacementWindow === "15 Days" ? 15 : replacementWindow === "30 Days" ? 30 : 7;
                  const isReplacementEligible = replacementAvailable && elapsedDays <= replacementDays;

                  const isEligible = isReturnEligible || isReplacementEligible;

                  return (
                    <div key={key} className={`flex items-center justify-between p-2.5 rounded-xl border transition duration-200 ${!isEligible ? 'opacity-50 bg-gray-50 border-gray-200' : 'border-champagne/20 bg-white hover:border-gold-200/40'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked && isEligible}
                          disabled={!isEligible}
                          onChange={(e) => {
                            setSelectedReturnItems(prev => ({ ...prev, [key]: e.target.checked }));
                          }}
                          className="h-4.5 w-4.5 rounded border-champagne text-gold-500 accent-gold-600 focus:ring-gold-500/20 cursor-pointer disabled:cursor-not-allowed"
                        />
                        {product.image && (
                          <img
                            src={resolveMediaUrl(product.image)}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-lg border border-champagne/25"
                          />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-luxury-black line-clamp-1">{product.name}</p>
                          <p className="text-[10px] text-text-secondary">
                            INR {product.price} &bull; Qty Ordered: {maxQty}
                            {!isEligible && <span className="text-red-500 font-bold ml-2">(Policy Check: Outside eligibility window)</span>}
                          </p>
                        </div>
                      </div>

                      {isChecked && isEligible && maxQty > 1 && (
                        <div className="flex items-center gap-1.5">
                          <label className="text-[9px] text-text-secondary font-bold uppercase">Qty:</label>
                          <select
                            value={selectedQty}
                            onChange={(e) => {
                              setReturnItemQuantities(prev => ({ ...prev, [key]: Number(e.target.value) }));
                            }}
                            className="rounded-lg border border-champagne bg-white px-2 py-1 text-xs outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 cursor-pointer"
                          >
                            {[...Array(maxQty).keys()].map((q) => (
                              <option key={q + 1} value={q + 1}>
                                {q + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Return Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-luxury-black uppercase tracking-wider block mb-1.5">
                  Reason for Return *
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  required
                  className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none cursor-pointer"
                >
                  <option value="">Select a reason</option>
                  <option value="Damaged Product">Damaged Product</option>
                  <option value="Wrong Product Received">Wrong Product Received</option>
                  <option value="Product Not As Expected">Product Not As Expected</option>
                  <option value="Missing Item">Missing Item</option>
                  <option value="Quality Issue">Quality Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-luxury-black uppercase tracking-wider block mb-1.5">
                  Preferred Resolution *
                </label>
                <select
                  value={returnResolution}
                  onChange={(e) => setReturnResolution(e.target.value)}
                  required
                  className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none cursor-pointer"
                >
                  {(() => {
                    const res = getEligibleResolutions();
                    const options = [];
                    if (res.canReturn) {
                      options.push(<option key="Refund" value="Refund">Refund (Original Source)</option>);
                      options.push(<option key="Store Credit" value="Store Credit">Store Credit (Gift Wallet)</option>);
                    }
                    if (res.canReplace) {
                      options.push(<option key="Replacement" value="Replacement">Product Replacement</option>);
                    }
                    return options.length > 0 ? options : <option value="">No options available</option>;
                  })()}
                </select>
              </div>
            </div>

            {returnResolution === "Refund" && returnOrder.paymentMethod === "COD" && (
              <div className="rounded-2xl border border-gold-300/40 bg-gold-50/10 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-champagne/30 pb-2">
                  <span className="text-base">💳</span>
                  <div>
                    <h4 className="text-xs font-serif font-bold text-luxury-black">COD Refund Details</h4>
                    <p className="text-[9px] text-text-secondary font-light uppercase tracking-wider">Provide details to receive your refund</p>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <span className="text-xs text-luxury-black font-semibold">Refund Via:</span>
                  <label className="flex items-center gap-1.5 text-xs text-luxury-black cursor-pointer">
                    <input
                      type="radio"
                      name="codRefundMethod"
                      value="UPI"
                      checked={codRefundMethod === "UPI"}
                      onChange={(e) => setCodRefundMethod(e.target.value)}
                      className="accent-gold-600"
                    />
                    UPI ID
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-luxury-black cursor-pointer">
                    <input
                      type="radio"
                      name="codRefundMethod"
                      value="Bank Transfer"
                      checked={codRefundMethod === "Bank Transfer"}
                      onChange={(e) => setCodRefundMethod(e.target.value)}
                      className="accent-gold-600"
                    />
                    Bank Account Transfer
                  </label>
                </div>

                {codRefundMethod === "UPI" ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-luxury-black">UPI ID *</label>
                    <input
                      type="text"
                      value={codUpiId}
                      onChange={(e) => setCodUpiId(e.target.value)}
                      placeholder="e.g. user@bank"
                      className="w-full rounded-xl border border-champagne bg-white px-3.5 py-2.5 text-xs focus:border-gold-500 focus:bg-gold-50/15 focus:ring-1 focus:ring-gold-500/20 placeholder:text-gray-400 font-light text-luxury-black"
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-luxury-black">Account Holder Name *</label>
                      <input
                        type="text"
                        value={codAccountHolderName}
                        onChange={(e) => setCodAccountHolderName(e.target.value)}
                        placeholder="Name as in Bank Account"
                        className="w-full rounded-xl border border-champagne bg-white px-3.5 py-2.5 text-xs focus:border-gold-500 focus:bg-gold-50/15 focus:ring-1 focus:ring-gold-500/20 placeholder:text-gray-400 font-light text-luxury-black"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-luxury-black">Bank Name *</label>
                      <input
                        type="text"
                        value={codBankName}
                        onChange={(e) => setCodBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full rounded-xl border border-champagne bg-white px-3.5 py-2.5 text-xs focus:border-gold-500 focus:bg-gold-50/15 focus:ring-1 focus:ring-gold-500/20 placeholder:text-gray-400 font-light text-luxury-black"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-luxury-black">Account Number *</label>
                      <input
                        type="text"
                        value={codAccountNumber}
                        onChange={(e) => setCodAccountNumber(e.target.value)}
                        placeholder="Bank Account Number"
                        className="w-full rounded-xl border border-champagne bg-white px-3.5 py-2.5 text-xs focus:border-gold-500 focus:bg-gold-50/15 focus:ring-1 focus:ring-gold-500/20 placeholder:text-gray-400 font-light text-luxury-black"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-luxury-black">IFSC Code *</label>
                      <input
                        type="text"
                        value={codIfscCode}
                        onChange={(e) => setCodIfscCode(e.target.value)}
                        placeholder="e.g. HDFC0001234"
                        className="w-full rounded-xl border border-champagne bg-white px-3.5 py-2.5 text-xs focus:border-gold-500 focus:bg-gold-50/15 focus:ring-1 focus:ring-gold-500/20 placeholder:text-gray-400 font-light text-luxury-black"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-luxury-black uppercase tracking-wider block mb-1.5">
                Detailed Description *
              </label>
              <textarea
                value={returnDescription}
                onChange={(e) => setReturnDescription(e.target.value)}
                placeholder="Please describe the issue in detail. If it is damaged or wrong product, detail the condition..."
                rows={3}
                required
                className="w-full rounded-2xl border border-champagne bg-white px-4 py-2.5 text-xs focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none resize-none"
              />
            </div>

            {/* File Uploads */}
            <div className="grid gap-4 sm:grid-cols-2 bg-gold-50/10 border border-gold-200/20 p-4 rounded-2xl">
              <div>
                <label className="text-[10px] font-bold text-luxury-black uppercase tracking-wider block mb-1">
                  Product Images (Min 1, Max 5) *
                </label>
                <p className="text-[9px] text-text-secondary mb-2">Upload pictures of product condition</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleReturnFileUpload}
                  disabled={uploadingFiles}
                  className="text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-4.5 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-gold-500 file:text-white hover:file:bg-gold-600 file:cursor-pointer"
                />

                {/* Previews */}
                {returnImages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {returnImages.map((img, i) => (
                      <div key={i} className="relative w-12 h-12 rounded-lg border border-champagne overflow-hidden group">
                        <img src={resolveMediaUrl(img.url)} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setReturnImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-black/40 text-white font-bold flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-luxury-black uppercase tracking-wider block mb-1">
                  Unboxing Video (Optional)
                </label>
                <p className="text-[9px] text-text-secondary mb-2">Help verify shipping box status</p>
                <input
                  type="file"
                  name="video"
                  accept="video/*"
                  onChange={handleReturnFileUpload}
                  disabled={uploadingFiles}
                  className="text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-4.5 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-gold-500 file:text-white hover:file:bg-gold-600 file:cursor-pointer"
                />

                {returnVideo && (
                  <div className="flex items-center justify-between gap-2 mt-2.5 p-1.5 rounded-lg border border-champagne bg-white text-[10px] text-luxury-black">
                    <span className="truncate">📹 Video Uploaded</span>
                    <button
                      type="button"
                      onClick={() => setReturnVideo(null)}
                      className="text-red-500 font-bold text-sm bg-transparent border-0 cursor-pointer px-1"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>

              {uploadingFiles && (
                <div className="sm:col-span-2 text-center text-[10px] text-gold-700 font-bold animate-pulse">
                  Uploading files to database storage, please wait...
                </div>
              )}
            </div>

            {/* Policy Consent */}
            <label className="flex items-start gap-2.5 rounded-2xl border border-champagne bg-white/60 px-4 py-3.5 text-xs text-text-secondary cursor-pointer leading-normal select-none">
              <input
                type="checkbox"
                checked={returnPolicyChecked}
                onChange={(e) => setReturnPolicyChecked(e.target.checked)}
                className="mt-0.5 h-4.5 w-4.5 rounded border-champagne text-gold-500 accent-gold-600 focus:ring-gold-500/20 cursor-pointer"
              />
              <span>I confirm that the products selected are returnable, in their received status, and that my unboxing evidence is genuine. I agree to the Niyora Gifts Return Policy.</span>
            </label>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <button
                type="submit"
                disabled={loading || uploadingFiles || selectedCount === 0}
                className="flex-1 rounded-full bg-gold-500 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-60 transition cursor-pointer shadow-xs"
              >
                {loading ? "Submitting Request..." : "Submit Return Claim"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReturnModalOpen(false);
                  setReturnOrder(null);
                }}
                className="rounded-full border border-champagne bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-luxury-black hover:bg-gold-50 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Modern Empty States Components
  const renderEmptyState = (title, message, iconStr) => (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white/40 border border-champagne/30 rounded-3xl min-h-[300px]">
      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gold-100/50 border border-gold-200/20">
        <span className="text-3xl">{iconStr}</span>
      </div>
      <h3 className="text-lg font-serif font-light text-luxury-black">{title}</h3>
      <p className="mt-2 text-xs text-text-secondary max-w-sm font-light leading-relaxed">{message}</p>
    </div>
  );

  return (
    <section className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Luxury Hero Banner Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="rounded-3xl bg-gradient-to-tr from-luxury-black via-[#1E1E1E] to-[#2D2A22] text-white p-6 md:p-8 relative overflow-hidden shadow-2xl border border-gold-500/20"
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-44 h-44 bg-gold-400/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-2 border-gold-500 bg-gold-500/10 flex items-center justify-center text-4xl font-serif text-gold-400 font-bold backdrop-blur-md shadow-inner transition-transform duration-300 group-hover:scale-105">
                {(auth?.name || "G").charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-1 right-1 bg-emerald-500 h-3 w-3 rounded-full border-2 border-luxury-black animate-pulse" />
            </div>

            <div className="text-center md:text-left space-y-1">
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <ShieldCheck className="w-2.5 h-2.5" /> Email Verified
                </span>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <ShieldCheck className="w-2.5 h-2.5" /> Mobile Verified
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-light tracking-wide mt-1 text-white">
                {getGreeting()}, {auth?.name ? auth.name.split(" ")[0] : "Gift Lover"}
              </h1>
              <div className="flex flex-col sm:flex-row gap-x-4 gap-y-1 pt-1.5 text-xs text-gold-100/70 font-light justify-center md:justify-start">
                <p className="flex items-center justify-center md:justify-start gap-1">
                  <Mail className="w-3.5 h-3.5" /> {auth?.email}
                </p>
                {auth?.mobileNumber && (
                  <p className="flex items-center justify-center md:justify-start gap-1">
                    <Phone className="w-3.5 h-3.5" /> {auth?.mobileNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-center gap-4 self-center md:self-auto w-full sm:w-auto md:w-auto">
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setActiveTab("settings")}
                className="flex-1 rounded-full border border-gold-500/40 hover:border-gold-500 text-gold-300 hover:text-white px-5 py-2 text-xs font-bold uppercase tracking-widest transition duration-300 cursor-pointer text-center bg-transparent"
              >
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="rounded-full bg-gold-500 hover:bg-gold-600 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:scale-[1.02] shadow-md cursor-pointer flex items-center justify-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </div>

        {/* Profile Completion Progress */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-light text-gold-100/80">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-semibold text-gold-400 uppercase tracking-wider text-[10px]">Profile Status:</span>
            <span>85% Completed</span>
            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gold-500 rounded-full" style={{ width: "85%" }} />
            </div>
          </div>
          <span className="text-[10px] text-gray-400 uppercase tracking-widest">Joined {auth?.createdAt ? new Date(auth.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "June 2026"}</span>
        </div>
      </motion.div>


      {/* Scrollable Sticky Tab Navigation */}
      <div className="sticky top-0 bg-[#FAF7F2]/90 backdrop-blur-md z-30 py-3 border-b border-champagne/15 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap -mx-4 px-4 md:mx-0 md:px-0">
        {[
          { id: "overview", label: "Overview", icon: <Activity className="w-3.5 h-3.5" /> },
          { id: "orders", label: "My Orders", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
          { id: "wishlist", label: "Wishlist", icon: <Heart className="w-3.5 h-3.5" /> },
          { id: "returns", label: "Returns", icon: <RefreshCw className="w-3.5 h-3.5" /> },
          { id: "addresses", label: "Addresses", icon: <MapPin className="w-3.5 h-3.5" /> },
          { id: "tracking", label: "Tracking", icon: <Truck className="w-3.5 h-3.5" /> },
          { id: "coupons", label: "Coupons", icon: <Gift className="w-3.5 h-3.5" /> },
          { id: "help", label: "Support", icon: <HelpCircle className="w-3.5 h-3.5" /> },
          { id: "settings", label: "Settings", icon: <Settings className="w-3.5 h-3.5" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer select-none ${activeTab === tab.id
                ? "bg-gold-500 text-white shadow-md scale-[1.02]"
                : "bg-white text-luxury-black hover:bg-gold-50 hover:text-gold-600 border border-champagne/50"
              }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className="rounded-full bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 animate-pulse">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification Banner messages */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 text-xs text-text-secondary bg-white rounded-2xl p-4 border border-champagne/40 shadow-sm"
          >
            <RefreshCw className="w-4 h-4 text-gold-500 animate-spin" />
            Loading details...
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200/40 rounded-2xl p-4 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            {error}
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs font-semibold text-gold-800 bg-gold-50 border border-gold-200/40 rounded-2xl p-4 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-gold-700 shrink-0" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Tab Container with transitions */}
      <div className="min-h-0">
        <AnimatePresence>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && !loading && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >

              <div className="grid gap-6 md:grid-cols-3">
                {/* Recent Activity Card */}
                <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <div>
                    <h3 className="text-base font-serif font-semibold text-luxury-black mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gold-600" /> Recent Order Status
                    </h3>
                    {latestOrder ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-champagne/20 pb-2">
                          <span className="text-sm font-bold text-luxury-black font-serif">Order #{getOrderDisplayId(latestOrder)}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(latestOrder.status)}`}>
                            {latestOrder.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-text-secondary font-light">
                          <p>Placed: <span className="font-semibold text-luxury-black">{new Date(latestOrder.createdAt).toLocaleDateString("en-IN")}</span></p>
                          <p>Total: <span className="font-semibold text-gold-700 font-serif">INR {latestOrder.totalPrice}</span></p>
                        </div>

                        {/* Progress Bar */}
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
                      <p className="text-xs text-text-secondary font-light leading-relaxed py-4">No orders placed yet. Curate your first custom surprise box now!</p>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="mt-6 text-xs font-bold uppercase tracking-widest text-gold-700 hover:text-gold-800 inline-flex items-center gap-1.5 bg-transparent border-0 cursor-pointer"
                  >
                    View Order Logs &rarr;
                  </button>
                </div>

                {/* Default Address Destination Card */}
                <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden bg-gradient-to-br from-gold-50/5 via-white to-white">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/5 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <h3 className="text-base font-serif font-semibold text-luxury-black mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gold-600" /> Default Delivery Address
                    </h3>
                    {defaultAddress ? (
                      <div className="space-y-3.5 text-xs text-text-secondary font-light">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const opt = addressLabelOptions.find((o) => o.label === defaultAddress.label) || { icon: "📍", color: "bg-gold-50 text-gold-800 border-gold-200/40" };
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${opt.color}`}>
                                <span>{opt.icon}</span>
                                <span>{defaultAddress.label}</span>
                              </span>
                            );
                          })()}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-luxury-black text-white uppercase tracking-wider">
                            ✨ Default
                          </span>
                        </div>
                        <p className="font-bold text-luxury-black text-sm leading-tight font-serif">{defaultAddress.fullName}</p>
                        <div className="leading-relaxed">
                          <p>{defaultAddress.line1}</p>
                          <p className="font-semibold text-gray-700 mt-0.5">
                            {defaultAddress.city}, {defaultAddress.state} - <span className="font-extrabold text-luxury-black font-sans">{defaultAddress.postalCode}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-champagne/30 text-luxury-black font-normal">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-bold">{defaultAddress.phone}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary font-light leading-relaxed py-4">No default address registered yet. Save shipping details for frictionless checkout.</p>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab("addresses")}
                    className="mt-6 text-xs font-bold uppercase tracking-widest text-gold-700 hover:text-gold-800 inline-flex items-center gap-1.5 bg-transparent border-0 cursor-pointer"
                  >
                    Manage Locations &rarr;
                  </button>
                </div>

                {/* Recent Activity Timeline Card */}
                <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <div>
                    <h3 className="text-base font-serif font-semibold text-luxury-black mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gold-600" /> Activity Timeline
                    </h3>
                    <div className="space-y-4 border-l border-champagne/40 pl-4 ml-2 pt-1 text-xs">
                      <div className="relative">
                        <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-gold-500 ring-4 ring-gold-50" />
                        <p className="font-semibold text-luxury-black text-[11px]">Security settings updated</p>
                        <p className="text-[9px] text-text-secondary">Just now &bull; Settings panel</p>
                      </div>
                      {orders.length > 0 && (
                        <div className="relative">
                          <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-gold-500 ring-4 ring-gold-50" />
                          <p className="font-semibold text-luxury-black text-[11px]">Order placed successfully</p>
                          <p className="text-[9px] text-text-secondary">Order Reference #{getOrderDisplayId(orders[0])}</p>
                        </div>
                      )}
                      {wishlistItems.length > 0 && (
                        <div className="relative">
                          <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-gold-500 ring-4 ring-gold-50" />
                          <p className="font-semibold text-luxury-black text-[11px]">Gifts saved to wishlist</p>
                          <p className="text-[9px] text-text-secondary">{wishlistItems.length} curations loved</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className="mt-6 text-xs font-bold uppercase tracking-widest text-gold-700 hover:text-gold-800 inline-flex items-center gap-1.5 bg-transparent border-0 cursor-pointer"
                  >
                    View Security Logs &rarr;
                  </button>
                </div>
              </div>

              {/* Recommended luxury products grid */}
              <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-champagne/20 pb-3">
                  <div>
                    <h3 className="text-base font-serif font-semibold text-luxury-black flex items-center gap-2">
                      <Compass className="w-4 h-4 text-gold-600 animate-spin-slow" /> Exquisite Recommendations
                    </h3>
                    <p className="text-[10px] text-text-secondary font-light mt-0.5">AI curated luxury gifts based on trend patterns.</p>
                  </div>
                  <Link to="/products" className="text-xs font-bold text-gold-700 hover:text-gold-800 uppercase tracking-wider">
                    View Catalog &rarr;
                  </Link>
                </div>

                {loadingRecommendations ? (
                  <div className="py-8 text-center text-xs text-text-secondary">Analyzing catalog...</div>
                ) : recommendations.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recommendations.slice(0, 4).map((prod) => (
                      <div key={prod._id} className="group border border-champagne/20 bg-white rounded-2xl overflow-hidden hover:border-gold-300/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                        <div className="relative aspect-square bg-gold-50/20">
                          <img
                            src={resolveMediaUrl(prod.image || prod.images?.[0])}
                            alt={prod.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-3.5 space-y-1">
                          <h4 className="text-xs font-serif font-semibold text-luxury-black line-clamp-1 group-hover:text-gold-650 transition-colors">
                            <Link to={`/products/${prod.slug || prod._id}`}>{prod.name}</Link>
                          </h4>
                          <div className="flex justify-between items-baseline pt-1">
                            <span className="text-xs font-serif font-bold text-luxury-black">INR {prod.price}</span>
                            <span className="text-[8px] uppercase tracking-wider text-gold-650 bg-gold-50 px-1.5 py-0.5 rounded font-bold">{prod.category}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary">Catalog products are being loaded...</p>
                )}
              </div>
            </motion.div>
          )}

          {/* MY ORDERS TAB */}
          {activeTab === "orders" && !loading && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs">
                <h2 className="text-lg font-serif font-semibold text-luxury-black">Order History Logs</h2>
                <p className="text-xs text-text-secondary mt-1 font-light">Detailed catalog of surprise boxes and customized gifts bought.</p>
              </div>

              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <article
                      key={order._id}
                      className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-5 shadow-xs hover:shadow-md transition-all duration-300"
                    >
                      {/* Card Top */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-champagne/20 pb-3.5">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-gold-600 uppercase tracking-widest">Surprise Pack</span>
                          <h4 className="text-sm font-bold text-luxury-black font-serif">Order #{getOrderDisplayId(order)}</h4>
                          <p className="text-[10px] text-text-secondary font-light">Placed: {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>

                      {/* Card Center: Products inside Order */}
                      <div className="py-4 border-b border-champagne/10">
                        <div className="space-y-3">
                          {order.products?.map((prod, idx) => (
                            <div key={idx} className="flex gap-3 items-center">
                              {prod.image && (
                                <img
                                  src={resolveMediaUrl(prod.image)}
                                  alt={prod.name}
                                  className="w-12 h-12 object-cover rounded-xl border border-champagne/20 shadow-inner"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="text-xs font-semibold text-luxury-black truncate">{prod.name}</h5>
                                <p className="text-[10px] text-text-secondary mt-0.5 font-light">
                                  Price: INR {prod.price} &bull; Qty: <strong>{prod.quantity}</strong>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-4 text-xs font-light text-text-secondary bg-gold-50/10 p-3 rounded-2xl border border-champagne/15">
                          <p>Items Count: <span className="font-semibold text-luxury-black">{order.products?.length || 0}</span></p>
                          <p>Total Paid: <span className="font-bold text-gold-700 font-serif">INR {order.totalPrice}</span></p>
                          <p>Payment: <span className="font-semibold uppercase text-luxury-black text-[10px]">{order.paymentMethod} ({order.paymentStatus})</span></p>
                        </div>
                      </div>

                      {/* Cancellation Status details if exists */}
                      {order.cancellationRequest?.status && order.cancellationRequest.status !== "None" && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/20 px-4 py-3 mt-3 text-xs">
                          <p className="font-semibold text-amber-900">
                            Cancellation request status: <span className="uppercase font-bold">{order.cancellationRequest.status}</span>
                          </p>
                          {order.cancellationRequest.reason && (
                            <p className="text-amber-800 mt-1 font-light">Reason: {order.cancellationRequest.reason}</p>
                          )}
                          {order.cancellationRequest.adminNote && (
                            <p className="text-amber-800 mt-1 font-light"><strong className="font-semibold">Concierge Note:</strong> {order.cancellationRequest.adminNote}</p>
                          )}
                        </div>
                      )}

                      {/* Card Actions Bottom */}
                      <div className="pt-4 flex flex-wrap gap-2.5">
                        {order.trackingId && (
                          <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-gold-50/20 border border-gold-200/20 mb-1 text-xs">
                            <span className="font-light text-text-secondary">Logistics Carrier: <strong className="text-luxury-black capitalize">{order.trackingCarrier}</strong> AWB: <strong className="font-mono text-luxury-black">{order.trackingId}</strong></span>
                            <a
                              href={getTrackingUrl(order.trackingId, order.trackingCarrier)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-gold-500 hover:bg-gold-600 px-4.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm transition"
                            >
                              Track Package
                            </a>
                          </div>
                        )}

                        {canRequestCancellation(order) && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(order)}
                            className="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                          >
                            Request Cancellation
                          </button>
                        )}

                        {canRequestReturn(order) && (
                          <button
                            type="button"
                            onClick={() => openReturnModal(order)}
                            className="rounded-full border border-gold-500 bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gold-700 hover:bg-gold-50 transition cursor-pointer"
                          >
                            Return Order
                          </button>
                        )}

                        {getOrderReturn(order._id) && (
                          <button
                            type="button"
                            onClick={() => {
                              const ret = getOrderReturn(order._id);
                              setSelectedReturn(ret);
                              setActiveTab("returns");
                            }}
                            className="rounded-full border border-gold-500 bg-gold-100/30 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gold-900 hover:bg-gold-200/30 transition cursor-pointer"
                          >
                            Track Return Claim: {getOrderReturn(order._id).status}
                          </button>
                        )}

                        {order.status === "Delivered" && (
                          <button
                            type="button"
                            onClick={() => handleDownloadInvoice(order)}
                            className="rounded-full bg-luxury-black hover:bg-gold-500 text-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition duration-300 flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Invoice
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                renderEmptyState("No orders placed yet", "All your completed and running gift purchases will show up here. Select our finest packages to start shopping.", "🛍️")
              )}
            </motion.div>
          )}

          {/* WISHLIST TAB */}
          {activeTab === "wishlist" && !loading && (
            <motion.div
              key="wishlist"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-luxury-black">My Wishlist</h2>
                  <p className="text-xs text-text-secondary mt-1 font-light">Fine selections that you saved to purchase later.</p>
                </div>
                <span className="px-3 py-1 bg-gold-100 border border-gold-200/50 rounded-full text-xs font-bold text-gold-800">
                  {wishlistItems.length} Items
                </span>
              </div>

              {wishlistLoading ? (
                <div className="py-8 text-center text-xs animate-pulse">Syncing loved list...</div>
              ) : wishlistItems.length > 0 ? (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {wishlistItems.map((item) => {
                    const product = item.product_id;
                    if (!product) return null;

                    const imageUrl = resolveMediaUrl(product.image || product.images?.[0] || "https://via.placeholder.com/600x400?text=Gift");
                    const stock = product.stock !== undefined && product.stock !== null ? Number(product.stock) : null;
                    const outOfStock = stock !== null && stock <= 0;

                    const comparePrice = product.originalPrice || Math.round(Number(product.price || 0) * 1.18);
                    const hasDiscount = comparePrice > product.price;
                    const discountPercentage = product.discountPercentage || (hasDiscount ? Math.round(((comparePrice - product.price) / comparePrice) * 100) : 0);

                    return (
                      <article
                        key={item._id}
                        className="group overflow-hidden rounded-3xl border border-champagne/45 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
                      >
                        <div className="relative aspect-[4/3] bg-gold-50/10 overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {hasDiscount && discountPercentage > 0 && (
                            <span className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                              {discountPercentage}% OFF
                            </span>
                          )}
                        </div>

                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-sm font-serif font-semibold text-luxury-black line-clamp-1 group-hover:text-gold-650 transition-colors">
                              <Link to={`/products/${product.slug || product._id}`}>{product.name}</Link>
                            </h4>
                            <p className="text-[9px] text-text-secondary uppercase mt-0.5 tracking-wider font-light">{product.category}</p>
                          </div>

                          <div className="flex justify-between items-baseline pt-2 border-t border-champagne/20">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-serif font-bold text-luxury-black">INR {product.price}</span>
                              {hasDiscount && (
                                <span className="text-[10px] text-text-secondary line-through font-light">INR {comparePrice}</span>
                              )}
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${outOfStock ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-gold-50 text-gold-800 border-gold-200'}`}>
                              {outOfStock ? 'Sold Out' : 'In Stock'}
                            </span>
                          </div>
                        </div>

                        {/* Card Buttons */}
                        <div className="grid grid-cols-2 gap-1 p-2 bg-gold-50/10 border-t border-champagne/30">
                          <button
                            type="button"
                            onClick={() => removeFromWishlist(product._id)}
                            className="rounded-full border border-champagne bg-white py-2 text-[9px] font-bold uppercase tracking-wider text-red-500 hover:bg-rose-50 transition cursor-pointer select-none"
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              addToCart(product);
                              removeFromWishlist(product._id);
                            }}
                            disabled={outOfStock}
                            className="rounded-full bg-luxury-black text-white py-2 text-[9px] font-bold uppercase tracking-wider hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer select-none"
                          >
                            Move to Cart
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                renderEmptyState("Your wishlist is empty", "Save curated premium surprises and luxury boxes you like to explore them easily anytime.", "❤️")
              )}
            </motion.div>
          )}

          {/* MY RETURNS TAB */}
          {activeTab === "returns" && !loading && (
            <motion.div
              key="returns"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderReturnsTab()}
            </motion.div>
          )}

          {/* ADDRESSES TAB */}
          {activeTab === "addresses" && (
            <motion.div
              key="addresses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white/70 backdrop-blur-md border border-champagne/45 p-6 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-luxury-black">Saved Delivery Addresses</h2>
                  <p className="text-xs text-text-secondary mt-1 font-light font-sans">Manage ship-to information for immediate express checkout curate flows.</p>
                </div>
                <button
                  onClick={handleAddAddress}
                  className="rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Address
                </button>
              </div>

              {showAddressForm && (
                <div className="rounded-3xl border border-champagne/45 bg-white/80 p-6 md:p-8 shadow-md space-y-5 animate-slide-up">
                  <div className="flex justify-between items-center border-b border-champagne/20 pb-3">
                    <h3 className="text-base font-serif font-semibold text-luxury-black">
                      {editingAddress ? "Modify Shipping Destination" : "Create Shipping Destination"}
                    </h3>
                    <button onClick={resetAddressForm} className="text-text-secondary hover:text-luxury-black font-light text-xl cursor-pointer">
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleSaveAddress} className="space-y-5">
                    {/* Types Selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-luxury-black uppercase tracking-wider block">Address Category Type</label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {addressLabelOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setAddressForm((prev) => ({ ...prev, label: opt.label }))}
                            className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border transition duration-200 hover:scale-[1.02] cursor-pointer ${addressForm.label === opt.label
                                ? "border-gold-500 bg-gold-50 text-gold-900 font-bold"
                                : "border-champagne bg-white hover:border-gold-300 text-text-secondary"
                              }`}
                          >
                            <span className="text-xl mb-1">{opt.icon}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                      {addressForm.label === "Other" && (
                        <div className="pt-2">
                          <input
                            name="customLabel"
                            value={addressForm.customLabel || ""}
                            onChange={handleAddressFormChange}
                            placeholder="Enter custom label name (e.g. Guest House, Friend)"
                            required
                            className="w-full rounded-full border border-champagne px-4 py-2 text-xs focus:border-gold-500 outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1">Recipient Full Name *</label>
                        <input
                          name="fullName"
                          value={addressForm.fullName}
                          onChange={handleAddressFormChange}
                          required
                          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1">Mobile Phone Number *</label>
                        <input
                          name="phone"
                          value={addressForm.phone}
                          onChange={handleAddressFormChange}
                          required
                          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1">Street Address Detail *</label>
                        <input
                          name="line1"
                          value={addressForm.line1}
                          onChange={handleAddressFormChange}
                          required
                          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1">City *</label>
                          <input
                            name="city"
                            value={addressForm.city}
                            onChange={handleAddressFormChange}
                            required
                            className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1">State *</label>
                          <input
                            name="state"
                            value={addressForm.state}
                            onChange={handleAddressFormChange}
                            required
                            className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1">Pincode *</label>
                          <input
                            name="postalCode"
                            value={addressForm.postalCode}
                            onChange={handleAddressFormChange}
                            required
                            className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1">Country *</label>
                        <input
                          name="country"
                          value={addressForm.country}
                          onChange={handleAddressFormChange}
                          required
                          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer leading-none">
                      <input
                        type="checkbox"
                        name="isDefault"
                        checked={addressForm.isDefault}
                        onChange={handleAddressFormChange}
                        className="h-4.5 w-4.5 rounded border-champagne text-gold-500 accent-gold-600 focus:ring-gold-500/20 cursor-pointer"
                      />
                      <span>Set as primary shipping address default</span>
                    </label>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className="flex-1 rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-sm disabled:opacity-60 transition cursor-pointer text-center"
                      >
                        {savingAddress ? "Saving Address..." : editingAddress ? "Save Changes" : "Save Destination"}
                      </button>
                      <button
                        type="button"
                        onClick={resetAddressForm}
                        className="rounded-full border border-champagne bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-luxury-black hover:bg-gold-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {addresses.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {addresses.map((address) => {
                    const labelOption = addressLabelOptions.find((opt) => opt.label === address.label) || { icon: "📍", color: "bg-gold-50 text-gold-800 border-gold-200/40" };
                    return (
                      <div
                        key={address._id}
                        className={`rounded-3xl border p-5 flex flex-col justify-between transition duration-300 hover:shadow-md relative overflow-hidden bg-white/70 ${address.isDefault ? "border-gold-500 ring-1 ring-gold-500/10 shadow-sm" : "border-champagne/45 hover:border-gold-300"
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wider ${labelOption.color}`}>
                              <span>{labelOption.icon}</span>
                              <span>{address.label}</span>
                            </span>
                            {address.isDefault && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gold-500 text-white uppercase tracking-wider">
                                Primary
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 text-xs text-text-secondary font-light">
                            <p className="font-bold text-luxury-black text-sm font-serif">{address.fullName}</p>
                            <p className="text-luxury-black">{address.line1}</p>
                            <p className="font-semibold text-gray-700">
                              {address.city}, {address.state} - <span className="font-bold text-luxury-black font-mono text-xs">{address.postalCode}</span>
                            </p>
                            <p className="text-[9px] uppercase tracking-widest font-semibold">{address.country}</p>
                            <p className="pt-2 border-t border-champagne/15 text-luxury-black font-semibold flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-gray-400" /> {address.phone}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-champagne/20 flex gap-2">
                          {!address.isDefault && (
                            <button
                              onClick={() => handleSetDefaultAddress(address._id)}
                              className="flex-1 rounded-xl border border-gold-200/60 bg-gold-50/20 py-2 text-[10px] font-bold text-gold-700 hover:bg-gold-100/50 transition cursor-pointer"
                            >
                              Default
                            </button>
                          )}
                          <button
                            onClick={() => handleEditAddress(address)}
                            className="flex-1 rounded-xl border border-champagne bg-white py-2 text-[10px] font-bold text-luxury-black hover:bg-gold-50 transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(address._id)}
                            className="rounded-xl border border-rose-200 bg-rose-50/50 p-2 text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !showAddressForm && renderEmptyState("No saved addresses", "Add shipping addresses to save time during checkout on subsequent curate surprises.", "📍")
              )}
            </motion.div>
          )}

          {/* ORDER TRACKING TAB */}


          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && !loading && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
            >
              <div className="border-b border-champagne/20 pb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-luxury-black flex items-center gap-2">
                    <Bell className="w-5 h-5 text-gold-600 animate-pulse" /> Notification Alerts
                  </h2>
                  <p className="text-xs text-text-secondary mt-1 font-light">Inbox details of promotions, account validations, and orders updates.</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await Promise.all(
                          notifications
                            .filter((n) => n.status !== "Read")
                            .map((n) => api.put(`/user/notifications/${n._id}/read`))
                        );
                        setNotifications((prev) => prev.map((n) => ({ ...n, status: "Read" })));
                        setUnreadCount(0);
                      } catch (err) {
                        console.error("Mark all read failed:", err);
                      }
                    }}
                    className="rounded-full border border-gold-300 text-gold-700 hover:bg-gold-50/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all"
                  >
                    Mark All As Read
                  </button>
                )}
              </div>

              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((n) => {
                    const isRead = n.status === "Read";
                    return (
                      <div
                        key={n._id}
                        onClick={() => !isRead && handleMarkAsRead(n._id)}
                        className={`rounded-2xl border p-4.5 transition duration-300 relative overflow-hidden cursor-pointer ${isRead
                            ? "bg-white/30 border-champagne/20 text-luxury-black/60"
                            : "bg-gold-50/15 border-gold-300/40 text-luxury-black shadow-xs hover:bg-gold-50/20"
                          }`}
                      >
                        {!isRead && (
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-gold-500" />
                        )}
                        <div className="flex flex-wrap justify-between items-start gap-2">
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-gold-50 border-gold-200 text-gold-800">
                              {n.type || "Update"}
                            </span>
                            <h3 className="text-xs font-serif font-bold mt-1 text-luxury-black">
                              {n.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-text-secondary font-light">
                              {new Date(n.createdAt).toLocaleDateString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(n._id);
                              }}
                              className="text-red-500 hover:text-red-700 transition cursor-pointer text-[10px] font-bold uppercase tracking-wider pl-2 border-l border-champagne/45 font-sans"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-light leading-relaxed text-text-secondary whitespace-pre-line">
                          {n.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                renderEmptyState("Inbox is empty", "You do not have any notifications, alerts, or promotional gift coupons at this moment.", "📬")
              )}
            </motion.div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 animate-slide-up"
            >
              {/* Profile Details Edit */}
              <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 md:p-8 shadow-sm space-y-5">
                <div className="border-b border-champagne/20 pb-3 flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-gold-600" />
                  <div>
                    <h3 className="text-base font-serif font-semibold text-luxury-black">Personal Profile Settings</h3>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider font-light mt-0.5">Edit basic registration properties details</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1.5">Full Name</label>
                      <input
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileFormChange}
                        required
                        className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1.5">Email Address</label>
                      <input
                        name="email"
                        type="email"
                        value={profileForm.email}
                        disabled
                        className="w-full rounded-full border border-champagne bg-gray-50 text-gray-500 px-4 py-2.5 text-xs cursor-not-allowed outline-none select-none"
                      />
                      <p className="text-[9px] text-text-secondary mt-1 font-light">
                        Your email address is linked to your login credentials and cannot be modified.
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1.5">Mobile Number</label>
                      <input
                        name="mobileNumber"
                        type="tel"
                        value={profileForm.mobileNumber}
                        onChange={handleProfileFormChange}
                        required
                        className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      {savingProfile ? "Saving changes..." : "Save Settings"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Preferences Settings Future Ready Toggles */}
              <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 md:p-8 shadow-sm space-y-6">
                <div className="border-b border-champagne/20 pb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gold-600" />
                  <div>
                    <h3 className="text-base font-serif font-semibold text-luxury-black">Preferences & Configurations</h3>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider font-light mt-0.5">Toggle notification and dark-mode parameters</p>
                  </div>
                </div>

                <div className="divide-y divide-champagne/25 space-y-4">
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-luxury-black uppercase tracking-wider flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 text-gold-600" /> Dark Mode
                      </h4>
                      <p className="text-[11px] text-text-secondary font-light">Toggle between soft cream luxury ivory and luxury high-contrast dark theme (Future Ready).</p>
                    </div>
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${darkMode ? 'bg-gold-500' : 'bg-gray-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-luxury-black uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gold-600" /> Marketing emails
                      </h4>
                      <p className="text-[11px] text-text-secondary font-light">Receive curated catalogs, luxury guides, and discount coupons codes.</p>
                    </div>
                    <button
                      onClick={() => setMarketingEmails(!marketingEmails)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${marketingEmails ? 'bg-gold-500' : 'bg-gray-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${marketingEmails ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-luxury-black uppercase tracking-wider flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-gold-600" /> SMS alerts
                      </h4>
                      <p className="text-[11px] text-text-secondary font-light">Receive transactional notifications via text message regarding package tracking status.</p>
                    </div>
                    <button
                      onClick={() => setSmsNotifications(!smsNotifications)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${smsNotifications ? 'bg-gold-500' : 'bg-gray-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${smsNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="space-y-0.5 pr-4">
                      <h4 className="text-xs font-bold text-luxury-black uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp updates
                      </h4>
                      <p className="text-[11px] text-text-secondary font-light">Enable WhatsApp alerts for instant concierge response timelines and order receipts.</p>
                    </div>
                    <button
                      onClick={() => setWhatsappUpdates(!whatsappUpdates)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${whatsappUpdates ? 'bg-gold-500' : 'bg-gray-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${whatsappUpdates ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SUPPORT TAB */}
          {activeTab === "help" && !loading && (
            <motion.div
              key="help"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6 lg:grid-cols-3"
            >
              {/* Left Side Channels & FAQ */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white/70 backdrop-blur-md border border-champagne/45 p-6 rounded-3xl shadow-sm space-y-4">
                  <h3 className="text-base font-serif font-semibold text-luxury-black">Direct Concierge</h3>
                  <p className="text-xs text-text-secondary font-light">Reach out via standard premium support pipelines for instant response curation.</p>

                  <div className="space-y-3">
                    <a
                      href="mailto:niyoragifts@gmail.com"
                      className="rounded-2xl border border-gold-200/35 bg-gold-50/5 p-4 hover:bg-gold-50/10 transition duration-300 block"
                    >
                      <h4 className="font-serif font-semibold text-luxury-black text-sm">Concierge Email</h4>
                      <p className="text-[11px] text-text-secondary mt-0.5 font-light">niyoragifts@gmail.com</p>
                      <p className="text-[9px] text-gold-700 mt-2.5 font-bold uppercase tracking-widest">12-24 Hour Reply SLA</p>
                    </a>
                    <a
                      href="https://wa.me/919000000000"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-gold-200/35 bg-gold-50/5 p-4 hover:bg-gold-50/10 transition duration-300 block"
                    >
                      <h4 className="font-serif font-semibold text-luxury-black text-sm">WhatsApp Line</h4>
                      <p className="text-[11px] text-text-secondary mt-0.5 font-light">Instant Mobile Concierge</p>
                      <p className="text-[9px] text-gold-700 mt-2.5 font-bold uppercase tracking-widest">Immediate Assistance</p>
                    </a>
                  </div>
                </div>

                {/* FAQ Accordion */}
                <div className="bg-white/70 backdrop-blur-md border border-champagne/45 p-6 rounded-3xl shadow-sm">
                  <h3 className="text-sm font-serif font-bold text-luxury-black mb-3">Frequently Asked Questions</h3>
                  <div className="divide-y divide-champagne/25">
                    {(dynamicFaqs.length > 0 ? dynamicFaqs : faqs).map((faq, idx) => {
                      const isOpen = openFaqIndex === idx;
                      return (
                        <div key={idx} className="py-3">
                          <button
                            onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between text-left font-serif font-semibold text-luxury-black text-xs bg-transparent border-0 cursor-pointer p-0"
                          >
                            <span className="pr-2">{faq.q}</span>
                            <ChevronDown className={`w-4 h-4 text-gold-600 transition-transform duration-350 shrink-0 ${isOpen ? 'transform rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="mt-2 text-[11px] text-text-secondary leading-relaxed font-light animate-slide-up">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Side Support tickets panel */}
              <div className="lg:col-span-2 space-y-6">
                {selectedTicket ? (
                  /* Chat Thread Conversation view */
                  <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-sm flex flex-col min-h-[500px]">
                    <div className="border-b border-champagne/20 pb-4 mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <button
                          onClick={() => setSelectedTicket(null)}
                          className="text-xs font-bold uppercase tracking-widest text-gold-700 hover:text-gold-800 flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0 mb-2"
                        >
                          &larr; Back to Tickets
                        </button>
                        <h3 className="text-base font-serif font-semibold text-luxury-black">{selectedTicket.subject}</h3>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-text-secondary font-light">
                          <span className="font-mono font-bold text-luxury-black">{selectedTicket.ticketCode}</span>
                          <span>&bull;</span>
                          <span>Created {new Date(selectedTicket.createdAt).toLocaleDateString("en-IN")}</span>
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase border tracking-wider ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status}
                      </span>
                    </div>

                    {/* Messages list */}
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
                          <div key={index} className={`flex flex-col ${msg.isAdmin ? 'items-start' : 'items-end'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-bold text-luxury-black mb-0.5">{msg.senderName}</span>
                              <span className="text-[9px] text-text-secondary font-light">{new Date(msg.createdAt).toLocaleString("en-IN", { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`rounded-2xl p-2.5 text-xs leading-relaxed max-w-sm ${msg.isAdmin ? 'bg-amber-50/60 border border-gold-200/50 text-luxury-black rounded-tl-none' : 'bg-gold-500 text-white rounded-tr-none'}`}>
                              {msg.message}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply form */}
                    {selectedTicket.status !== "Resolved" ? (
                      <form onSubmit={handleSendReply} className="border-t border-champagne/25 pt-4 mt-auto">
                        <div className="flex items-end gap-3">
                          <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your reply here..."
                            rows={2}
                            className="flex-1 rounded-2xl border border-champagne bg-white px-4 py-2.5 text-xs focus:border-gold-500 outline-none resize-none"
                            required
                          />
                          <button
                            type="submit"
                            disabled={sendingReply || !replyMessage.trim()}
                            className="rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            Reply
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="border-t border-champagne/25 pt-4 text-center mt-auto space-y-3">
                        <p className="text-xs text-text-secondary font-light">This ticket is marked resolved. Reply to reopen.</p>
                        <form onSubmit={handleSendReply} className="flex items-end gap-3">
                          <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type message to reopen..."
                            rows={2}
                            className="flex-1 rounded-2xl border border-champagne bg-white px-4 py-2.5 text-xs focus:border-gold-500 outline-none resize-none"
                            required
                          />
                          <button
                            type="submit"
                            disabled={sendingReply || !replyMessage.trim()}
                            className="rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            Reopen
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ) : ticketFormOpen ? (
                  /* Create ticket view */
                  <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-champagne/25 mb-4">
                      <h3 className="text-base font-serif font-semibold text-luxury-black">Raise Support Ticket</h3>
                      <button onClick={() => setTicketFormOpen(false)} className="text-xs font-bold uppercase tracking-wider text-text-secondary bg-transparent border-0 cursor-pointer">Cancel</button>
                    </div>

                    <form onSubmit={handleCreateTicket} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1">Subject Issue Summary *</label>
                        <input
                          value={newTicketSubject}
                          onChange={(e) => setNewTicketSubject(e.target.value)}
                          placeholder="e.g. Broken packaging on transit, missing elements"
                          required
                          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs focus:border-gold-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1">Associated Order (Optional)</label>
                        <select
                          value={newTicketOrderId}
                          onChange={(e) => setNewTicketOrderId(e.target.value)}
                          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs focus:border-gold-500 outline-none cursor-pointer"
                        >
                          <option value="">General Query (No order association)</option>
                          {orders.map((o) => (
                            <option key={o._id} value={o._id}>Order #{getOrderDisplayId(o)} - INR {o.totalPrice}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-luxury-black uppercase tracking-wider mb-1">Description *</label>
                        <textarea
                          value={newTicketMessage}
                          onChange={(e) => setNewTicketMessage(e.target.value)}
                          placeholder="Please detail your query..."
                          rows={4}
                          required
                          className="w-full rounded-2xl border border-champagne bg-white px-4 py-2.5 text-xs focus:border-gold-500 outline-none resize-none"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={submittingTicket}
                          className="flex-1 rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          Submit Ticket
                        </button>
                        <button
                          type="button"
                          onClick={() => setTicketFormOpen(false)}
                          className="rounded-full border border-champagne bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-luxury-black hover:bg-gold-50 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  /* Ticket list view */
                  <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-champagne/25 pb-3">
                      <div>
                        <h3 className="text-base font-serif font-semibold text-luxury-black">Support Tickets Logs</h3>
                        <p className="text-[10px] text-text-secondary mt-0.5 font-light">Track running queries and conversation history with concierge.</p>
                      </div>
                      <button
                        onClick={() => setTicketFormOpen(true)}
                        className="rounded-full bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-sm transition cursor-pointer"
                      >
                        Raise Ticket
                      </button>
                    </div>

                    {loadingTickets ? (
                      <div className="py-10 text-center text-xs animate-pulse">Syncing tickets...</div>
                    ) : tickets.length > 0 ? (
                      <div className="divide-y divide-champagne/20">
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
                              <p className="text-[9px] text-text-secondary font-light">Last update {new Date(t.updatedAt).toLocaleDateString("en-IN")}</p>
                            </div>
                            <button
                              onClick={() => fetchTicketDetails(t._id)}
                              className="rounded-full border border-champagne bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-luxury-black hover:bg-gold-50 transition cursor-pointer"
                            >
                              View Chat &rarr;
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center border border-dashed border-champagne/60 rounded-2xl bg-gold-50/5">
                        <p className="text-xs text-text-secondary font-light">No support tickets running at this time.</p>
                        <button
                          onClick={() => setTicketFormOpen(true)}
                          className="mt-4 rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-sm transition cursor-pointer"
                        >
                          Open Support Ticket
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TRACKING TAB */}
          {activeTab === "tracking" && (
            <motion.div
              key="tracking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs">
                <h2 className="text-lg font-serif font-semibold text-luxury-black">Track Shipment Journeys</h2>
                <p className="text-xs text-text-secondary mt-1 font-light">Review tracking statuses, shipping timelines, and download receipt records.</p>
              </div>

              {orders.length > 0 ? (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order._id} className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-champagne/25 pb-3">
                        <div>
                          <span className="text-[9px] font-bold text-gold-600 uppercase tracking-widest">Active Order Tracking</span>
                          <h4 className="text-sm font-bold text-luxury-black font-serif">Order Reference: {getOrderDisplayId(order)}</h4>
                          <p className="text-[10px] text-text-secondary font-light">Placed on {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Timeline Milestones */}
                      <div className="space-y-4 pt-2">
                        <div className="relative">
                          <div className="relative h-1 w-full bg-champagne/40 rounded-full">
                            <div
                              className="absolute h-full bg-gold-500 rounded-full transition-all duration-500"
                              style={{ width: `${(getStepIndex(order.status) / (trackingSteps.length - 1)) * 100}%` }}
                            />
                          </div>
                          <div className="grid grid-cols-5 gap-1 text-[9px] font-bold text-text-secondary uppercase tracking-wider text-center mt-3">
                            {trackingSteps.map((step, idx) => {
                              const currentIdx = getStepIndex(order.status);
                              const isCompleted = idx <= currentIdx;
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className={`mx-auto h-4 w-4 rounded-full border flex items-center justify-center text-[7px] ${isCompleted ? 'border-gold-500 bg-gold-500 text-white' : 'border-champagne bg-white text-gray-300'}`}>
                                    {isCompleted ? "✓" : idx + 1}
                                  </div>
                                  <span className={isCompleted ? "text-gold-700 font-bold" : "font-light"}>{step}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Courier Partner detail */}
                      <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl bg-gold-50/10 border border-gold-200/25 text-xs font-light text-text-secondary gap-3">
                        <div className="space-y-1">
                          <p>Estimated Delivery: <strong className="text-luxury-black font-semibold">{new Date(new Date(order.createdAt).setDate(new Date(order.createdAt).getDate() + 5)).toLocaleDateString("en-IN")}</strong></p>
                          <p>Courier Partner: <strong className="text-luxury-black font-semibold capitalize">{order.trackingCarrier || "Niyora Curated Delivery"}</strong></p>
                          <p>AWB Tracking ID: <strong className="text-luxury-black font-mono font-semibold">{order.trackingId || "Pending Allocation"}</strong></p>
                        </div>
                        <div className="flex gap-2">
                          {order.trackingId && (
                            <a
                              href={getTrackingUrl(order.trackingId, order.trackingCarrier)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-gold-500 hover:bg-gold-600 text-white text-[10px] font-bold uppercase tracking-widest px-4.5 py-2.5 transition cursor-pointer"
                            >
                              Track Live Courier
                            </a>
                          )}
                          {order.status === "Delivered" && (
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(order)}
                              className="rounded-full bg-luxury-black hover:bg-gold-500 text-white text-[10px] font-bold uppercase tracking-widest px-4.5 py-2.5 transition cursor-pointer"
                            >
                              Invoice
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                renderEmptyState("No Orders Found", "Create your first curated gift box to track logistics logs here.", "🚚")
              )}
            </motion.div>
          )}

          {/* COUPONS TAB */}
          {activeTab === "coupons" && (
            <motion.div
              key="coupons"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs">
                <h2 className="text-lg font-serif font-semibold text-luxury-black">Luxury Coupons & Offers</h2>
                <p className="text-xs text-text-secondary mt-1 font-light">Copy promotional codes to apply during checkout for exclusive discounts.</p>
              </div>

              {loadingCoupons ? (
                <div className="text-center py-12 text-sm text-text-secondary">Loading available coupons...</div>
              ) : userCoupons.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {userCoupons.map((cp, idx) => (
                    <div key={idx} className="group relative rounded-3xl border border-champagne/40 bg-white p-6 shadow-sm hover:shadow-md hover:border-gold-300/40 transition-all duration-300 flex flex-col justify-between space-y-4 overflow-hidden">
                      <div className="absolute -right-6 -top-6 w-16 h-16 bg-gold-500/10 rounded-full blur-xl" />
                      <div>
                        <div className="flex gap-2 flex-wrap items-center">
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-gold-700 bg-gold-50 px-2 py-0.5 rounded-md">{cp.type}</span>
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{cp.status}</span>
                        </div>
                        <h4 className="text-lg font-serif font-bold text-luxury-black mt-2">{cp.val}</h4>
                        <p className="text-xs text-text-secondary font-light mt-1">{cp.desc}</p>
                      </div>
                      <div className="pt-3 border-t border-champagne/20 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-gold-800 bg-gold-50 border border-gold-200/35 rounded px-2.5 py-1 select-all">{cp.code}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cp.code);
                            setSuccessMessage(`Coupon code "${cp.code}" copied to clipboard!`);
                            setTimeout(() => setSuccessMessage(""), 3000);
                          }}
                          className="rounded-full bg-luxury-black hover:bg-gold-500 text-white text-[9px] font-bold uppercase tracking-widest px-3.5 py-2 transition cursor-pointer select-none"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-[8px] text-gray-400 font-mono text-right">{cp.exp}</p>
                    </div>
                  ))}
                </div>
              ) : (
                renderEmptyState("No Coupons Found", "No promotional coupons are currently available.", "🎟️")
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CANCELLATION DIALOG MODAL */}
      {cancelModalOpen && cancelTargetOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-black/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-gold-300/20 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-champagne/30 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Cancellation Request form</p>
                <h3 className="mt-1.5 text-lg font-serif font-light text-luxury-black">
                  Order #{getOrderDisplayId(cancelTargetOrder)}
                </h3>
                <p className="mt-1 text-xs text-text-secondary font-light leading-relaxed">
                  Cancellations requests will undergo concierge verification audit. Funds will route back to source.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="text-text-secondary hover:text-luxury-black text-2xl font-light cursor-pointer"
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
                  className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500 cursor-pointer"
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
                  className="w-full rounded-2xl border border-champagne bg-white px-4 py-2.5 text-xs outline-none focus:border-gold-500 resize-none"
                  placeholder="Detail context if necessary..."
                />
              </div>
              <label className="flex items-start gap-2.5 rounded-2xl border border-champagne bg-white/60 px-4 py-3.5 text-xs text-text-secondary cursor-pointer leading-normal select-none">
                <input
                  type="checkbox"
                  checked={cancelConfirmed}
                  onChange={(e) => setCancelConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-champagne text-gold-500 accent-gold-600 focus:ring-gold-500/20 cursor-pointer"
                />
                <span>I confirm that I request complete cancellation review of this order parcel.</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={submitCancellationRequest}
                disabled={submittingCancel || !cancelConfirmed || !cancelReason}
                className="flex-1 rounded-full bg-rose-650 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-rose-750 disabled:opacity-60 disabled:cursor-not-allowed transition cursor-pointer"
              >
                {submittingCancel ? "Submitting..." : "Submit request"}
              </button>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="rounded-full border border-champagne bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-luxury-black hover:bg-gold-50 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER RETURN MODAL */}
      {renderReturnModal()}
    </section>
  );

  // Return request page tab details section
  function renderReturnsTab() {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Claims list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white/70 backdrop-blur-md border border-champagne/45 p-5 rounded-3xl shadow-xs">
            <h2 className="text-base font-serif font-semibold text-luxury-black">Returns History logs</h2>
            <p className="text-[10px] text-text-secondary mt-0.5 font-light">Pipeline tracking records of return/replacement claims.</p>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
            {loadingReturns ? (
              <div className="py-8 text-center text-xs text-text-secondary animate-pulse">Syncing return history records...</div>
            ) : returnsList.length > 0 ? (
              returnsList.map((ret) => {
                const isSelected = selectedReturn?._id === ret._id;
                const orderCode = ret.order?.orderCode || "N/A";
                return (
                  <div
                    key={ret._id}
                    onClick={() => {
                      setSelectedReturn(ret);
                      if (ret.ticket) {
                        fetchTicketDetails(ret.ticket._id || ret.ticket);
                      }
                    }}
                    className={`rounded-3xl border p-4.5 cursor-pointer transition-all duration-300 ${isSelected
                        ? "border-gold-500 bg-gold-100/10 shadow-xs scale-[1.01]"
                        : "border-champagne/45 bg-white hover:border-gold-300/40"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-champagne/10 pb-2">
                      <span className="font-mono text-xs font-bold text-luxury-black">{ret.returnCode}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${getReturnStatusColor(ret.status)}`}>
                        {ret.status}
                      </span>
                    </div>
                    <div className="mt-2.5 text-[11px] text-text-secondary font-light space-y-1">
                      <p>Order Code: <span className="font-semibold text-luxury-black">{orderCode}</span></p>
                      <p>Refund Resolution: <span className="font-semibold text-luxury-black">{ret.preferredResolution}</span></p>
                      <p>Date: {new Date(ret.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white/50 border border-champagne/40 text-center py-10 rounded-3xl">
                <p className="text-xs text-text-secondary font-light">No return claims submitted yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Claim details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedReturn ? (
            <div className="bg-white/70 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs flex flex-col space-y-6 animate-slide-up">
              <div className="border-b border-champagne/30 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-serif font-semibold text-luxury-black">Claim #{selectedReturn.returnCode}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-text-secondary font-light">
                    <span>Order #{selectedReturn.order?.orderCode || "N/A"}</span>
                    <span>&bull;</span>
                    <span>Created: {new Date(selectedReturn.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase border tracking-wider ${getReturnStatusColor(selectedReturn.status)}`}>
                  {selectedReturn.status}
                </span>
              </div>

              {/* Steps vertical tracking */}
              <div className="rounded-2xl border border-gold-200/20 bg-gold-50/5 p-4 space-y-3.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-luxury-black">{selectedReturn.type} Process Tracker</h4>
                <div className={`grid ${selectedReturn.type === "Replacement" ? 'grid-cols-6' : 'grid-cols-4'} gap-1.5`}>
                  {(selectedReturn.type === "Replacement" ? [
                    { label: "Submitted", test: ["Pending", "Under Review", "Investigation In Progress", "Evidence Verified", "Approved", "Pickup Scheduled", "Item Picked Up", "Item Received & Verified", "Replacement Packed", "Shipped", "Delivered"] },
                    { label: "Approved", test: ["Approved", "Pickup Scheduled", "Item Picked Up", "Item Received & Verified", "Replacement Packed", "Shipped", "Delivered"] },
                    { label: "Pickup Scheduled", test: ["Pickup Scheduled", "Item Picked Up", "Item Received & Verified", "Replacement Packed", "Shipped", "Delivered"] },
                    { label: "Returned & Verified", test: ["Item Received & Verified", "Replacement Packed", "Shipped", "Delivered"] },
                    { label: "Shipped", test: ["Shipped", "Delivered"] },
                    { label: "Delivered", test: ["Delivered"] }
                  ] : [
                    { label: "Request Submitted", test: ["Pending", "Under Review", "Approved", "Pickup Scheduled", "Item Received", "Refund Processed"] },
                    { label: "Under Review", test: ["Under Review", "Approved", "Pickup Scheduled", "Item Received", "Refund Processed"] },
                    { label: "Pickup Scheduled", test: ["Pickup Scheduled", "Item Received", "Refund Processed"] },
                    { label: "Refund Processed", test: ["Refund Processed"] }
                  ]).map((step, idx) => {
                    const reached = step.test.includes(selectedReturn.status) && selectedReturn.status !== "Rejected";
                    const isRejected = selectedReturn.status === "Rejected";
                    return (
                      <div key={idx} className="flex flex-col items-center text-center">
                        <div className={`mb-1.5 h-6.5 w-6.5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${reached ? 'border-gold-500 bg-gold-500 text-white' :
                            isRejected && idx === 1 ? 'border-rose-500 bg-rose-500 text-white' :
                              'border-champagne bg-white text-gray-400'
                          }`}>
                          {isRejected && idx === 1 ? "×" : idx + 1}
                        </div>
                        <p className={`text-[8px] font-bold leading-tight ${reached ? 'text-gold-800' : 'text-text-secondary'}`}>{step.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items in Return */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-luxury-black mb-2">Claim Items details</h4>
                <div className="divide-y divide-champagne/15 border border-champagne/30 rounded-2xl p-2 bg-white">
                  {selectedReturn.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2">
                      {item.image && (
                        <img src={resolveMediaUrl(item.image)} alt={item.name} className="w-10 h-10 object-cover rounded-lg border border-champagne/20" />
                      )}
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-semibold text-luxury-black truncate">{item.name}</p>
                        <p className="text-[10px] text-text-secondary mt-0.5">Quantity: <strong>{item.quantity}</strong> &bull; Value: INR {item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Refund details */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs text-text-secondary font-light">
                <div className="rounded-2xl border border-champagne/30 p-3.5 bg-white space-y-1.5">
                  <h5 className="font-bold text-luxury-black uppercase tracking-widest text-[9px] border-b border-champagne/15 pb-1">Claim Resolution</h5>
                  <p>Preference: <strong className="text-gold-850">{selectedReturn.preferredResolution}</strong></p>

                  {selectedReturn.refundDetails?.refundStatus && selectedReturn.refundDetails.refundStatus !== "None" && (
                    <div className="mt-2 text-[10px] space-y-0.5">
                      <p>Refund Status: <strong className="text-emerald-700">{selectedReturn.refundDetails.refundStatus}</strong></p>
                      <p>Refund Method: <strong>{selectedReturn.refundDetails.refundMethod}</strong></p>
                      <p>Amount: <strong className="font-serif">INR {selectedReturn.refundDetails.refundAmount}</strong></p>
                      {selectedReturn.refundDetails.transactionReference && (
                        <p className="truncate">Txn ID: <code className="bg-gray-50 px-1 py-0.5 rounded">{selectedReturn.refundDetails.transactionReference}</code></p>
                      )}
                    </div>
                  )}

                  {selectedReturn.codRefundMethod && (
                    <div className="mt-2 text-[10px] bg-gold-50/15 border border-gold-200/20 p-2 rounded-xl space-y-0.5">
                      <p className="font-bold text-gold-800 uppercase tracking-wider text-[8px]">COD Refund Account Details</p>
                      <p>Method: <strong>{selectedReturn.codRefundMethod}</strong></p>
                      {selectedReturn.codRefundMethod === "UPI" ? (
                        <p>UPI ID: <strong>{selectedReturn.codRefundDetails?.upiId}</strong></p>
                      ) : (
                        <>
                          <p>Holder: <strong>{selectedReturn.codRefundDetails?.accountHolderName}</strong></p>
                          <p>Bank: <strong>{selectedReturn.codRefundDetails?.bankName}</strong></p>
                          <p>Account: <strong>{selectedReturn.codRefundDetails?.accountNumber}</strong></p>
                          <p>IFSC: <strong>{selectedReturn.codRefundDetails?.ifscCode}</strong></p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Pickup details */}
                {selectedReturn.pickupDetails?.trackingId && (
                  <div className="rounded-2xl border border-champagne/30 p-3.5 bg-white space-y-1">
                    <h5 className="font-bold text-luxury-black uppercase tracking-widest text-[9px] border-b border-champagne/15 pb-1">Pickup Logistics</h5>
                    <p>Courier: <strong>{selectedReturn.pickupDetails.courier || "Registered Courier"}</strong></p>
                    <p>AWB Tracking: <strong>{selectedReturn.pickupDetails.trackingId}</strong></p>
                    {selectedReturn.pickupDetails.pickupDate && (
                      <p>Date: <strong>{new Date(selectedReturn.pickupDetails.pickupDate).toLocaleDateString("en-IN")}</strong></p>
                    )}
                  </div>
                )}
              </div>

              {/* Chat timeline thread details */}
              {selectedTicket && (
                <div className="border-t border-champagne/20 pt-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-luxury-black">Chat Thread Concierge</h4>
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {selectedTicket.messages?.map((msg, index) => {
                      const isSystem = msg.senderName === "System Note";
                      if (isSystem) {
                        return (
                          <div key={index} className="rounded-lg bg-gray-50 border py-1.5 px-3 text-[10px] text-center max-w-sm mx-auto text-text-secondary">
                            {msg.message}
                          </div>
                        );
                      }
                      return (
                        <div key={index} className={`flex flex-col ${msg.isAdmin ? 'items-start' : 'items-end'}`}>
                          <span className="text-[9px] font-bold text-luxury-black mb-0.5">{msg.senderName}</span>
                          <div className={`rounded-2xl p-2.5 text-xs max-w-sm ${msg.isAdmin ? 'bg-amber-50/60 border border-gold-200/50 text-luxury-black rounded-tl-none' : 'bg-gold-500 text-white rounded-tr-none'}`}>
                            {msg.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedTicket.status !== "Resolved" && (
                    <form onSubmit={handleSendReply} className="border-t border-champagne/20 pt-3 flex gap-2">
                      <input
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Reply support..."
                        className="flex-1 rounded-full border border-champagne px-4 py-2 text-xs focus:border-gold-500 outline-none"
                        required
                      />
                      <button type="submit" disabled={sendingReply || !replyMessage.trim()} className="rounded-full bg-gold-500 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-gold-600 transition cursor-pointer select-none">
                        Send
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-champagne bg-white/50 p-12 text-center flex flex-col justify-center items-center h-64">
              <span className="text-3xl mb-2">🔄</span>
              <h4 className="text-sm font-serif font-semibold text-luxury-black">Select Return Claim</h4>
              <p className="text-[11px] text-text-secondary mt-1 max-w-xs font-light">Select a claim from the history pane to check logistics updates.</p>
            </div>
          )}
        </div>
      </div>
    );
  }
};

export default MyProfile;
