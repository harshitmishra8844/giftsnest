import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { clearAdminAuth, getAdminAuth, saveAdminAuth } from "../services/adminAuth";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import SEO from "../components/SEO";
import AddProduct from "./AddProduct";
import ReturnsReplacementsTab from "./ReturnsReplacementsTab";
import CustomersSection from "../components/CustomersSection";
import CmsManager from "../components/cms/CmsManager";
import {
  PremiumRingLoader,
  LoadingOverlay,
  CardSkeleton,
  DashboardSkeleton,
  TableSkeleton,
  ProductGridSkeleton,
  AnalyticsSkeleton,
  ChatSkeleton
} from "../components/SkeletonLoaders";

const orderStatuses = ["Pending", "Order Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

const emptyForm = {
  name: "",
  price: "",
  image: "",
  imagesText: "",
  description: "",
  highlightsText: "",
  specificationsText: "",
  deliveryTime: "",
  material: "",
  dimensions: "",
  weight: "",
  occasion: "",
  careInstructions: "",
  category: "",
  stock: "10",
  isPersonalized: false,
  personalizationTextLabel: "",
  personalizationTextLimit: "20",
  personalizationImageRequired: false,
  personalizationImageLabel: "",
  codEnabled: true,
};
const emptyCouponForm = {
  code: "",
  type: "percent",
  value: "",
  minCartValue: "",
  maxDiscount: "",
  startDate: "",
  endDate: "",
  active: true,
  maxRedemptions: "",
  maxRedemptionsPerUser: "",
  activeDays: [],
};

const emptySpecialCouponForm = {
  type: "percent",
  value: "",
  minCartValue: "0",
  maxDiscount: "",
  endDate: "",
  active: true,
  maxRedemptions: "",
  maxRedemptionsPerUser: "",
  customerEmail: "",
  customerName: "",
  emailMessage: "",
};

const emptyCouponEmailForm = { to: "", customerName: "", message: "" };

const formatCouponUsage = (coupon) => {
  const paid = Number(coupon.paidRedemptionsCount || 0);
  const maxG = coupon.maxRedemptions != null ? Number(coupon.maxRedemptions) : null;
  const maxU = coupon.maxRedemptionsPerUser != null ? Number(coupon.maxRedemptionsPerUser) : null;
  const globalPart =
    maxG != null && maxG > 0 ? `${paid} / ${maxG} paid` : `${paid} paid (no global cap)`;
  const userPart =
    maxU != null && maxU > 0 ? `max ${maxU} per customer` : "unlimited per customer";
  return `${globalPart} · ${userPart}`;
};
const trackingCarriers = [
  { value: "generic", label: "Other Courier" },
  { value: "delhivery", label: "Delhivery" },
  { value: "bluedart", label: "BlueDart" },
  { value: "xpressbees", label: "XpressBees" },
];
const defaultStoreInfo = {
  storeName: "Niyora Gifts",
  storePhone: "+91-90000-00000",
  storeAddress: "123 Commerce Street, Mumbai, Maharashtra 400001, India",
  storeLogoUrl: "",
  codEnabled: true,
  specialOffer: {
    title: "Festive Mega Sale",
    subtitle: "Celebrate the season with curated gifts and limited-time savings.",
    eventName: "Festive Special",
    code: "FESTIVE20",
    ctaText: "Grab Offer",
    startDate: "",
    endDate: "",
    active: false,
  },
  offers: [
    { title: "Midnight Surprise Drop", subtitle: "Order before 11 PM and unlock priority prep on select gifts.", code: "MIDNIGHT12", ctaText: "Shop Late Night", active: true },
    { title: "Birthday Bundle Wave", subtitle: "Combo gifts with curated cards and packaging at festival pricing.", code: "BDAYBLISS", ctaText: "View Bundles", active: true },
    { title: "Personalized Express", subtitle: "Fast-track custom gifts with handcrafted finishing.", code: "CUSTOM10", ctaText: "Customize Now", active: true },
  ],
};

const isReadyToShipStatus = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  return normalized === "shipped" || normalized === "delivered";
};

const matchesLabelPrintFilter = (order, filter) => {
  const normalized = String(order?.status || "")
    .trim()
    .toLowerCase();
  if (filter === "shipped") return normalized === "shipped";
  if (filter === "delivered") return normalized === "delivered";
  if (filter === "ready") return isReadyToShipStatus(normalized);
  return true;
};
const toDatetimeLocalString = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminAuth, setAdminAuth] = useState(getAdminAuth());
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [couponForm, setCouponForm] = useState(emptyCouponForm);
  const [editingCouponId, setEditingCouponId] = useState("");
  const [editingCouponIsSpecial, setEditingCouponIsSpecial] = useState(false);
  const [specialCouponForm, setSpecialCouponForm] = useState(emptySpecialCouponForm);
  const [generatingSpecial, setGeneratingSpecial] = useState(false);
  const [lastGeneratedSpecialCode, setLastGeneratedSpecialCode] = useState("");
  const [couponEmailTargetId, setCouponEmailTargetId] = useState("");
  const [couponEmailForm, setCouponEmailForm] = useState(emptyCouponEmailForm);
  const [sendingCouponEmail, setSendingCouponEmail] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  const [fetchingEmployees, setFetchingEmployees] = useState(false);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [fetchingNewsletter, setFetchingNewsletter] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [fetchingOrders, setFetchingOrders] = useState(false);
  const [fetchingOverview, setFetchingOverview] = useState(false);
  const [fetchingCoupons, setFetchingCoupons] = useState(false);

  // --- ENTERPRISE RBAC & SECURITY STATES ---
  const [activeTab, setActiveTab] = useState("overview");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [productsSubTab, setProductsSubTab] = useState("inventory");
  const [couponsSubTab, setCouponsSubTab] = useState("public");
  const [employeesSubTab, setEmployeesSubTab] = useState("employees");
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Lists
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [permissionsConfig, setPermissionsConfig] = useState([]);

  // Log Pagination & Filtering
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [logsSearch, setLogsSearch] = useState("");
  const [logsUserFilter, setLogsUserFilter] = useState("");
  const [logsActionFilter, setLogsActionFilter] = useState("");
  const [logsStartDate, setLogsStartDate] = useState("");
  const [logsEndDate, setLogsEndDate] = useState("");
  const [logsSubTab, setLogsSubTab] = useState("audit"); // audit, login
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogsPage, setLoginLogsPage] = useState(1);
  const [loginLogsTotalPages, setLoginLogsTotalPages] = useState(1);
  const [loginLogsTotalCount, setLoginLogsTotalCount] = useState(0);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);

  // Employee Modal / Forms
  const emptyEmployeeForm = {
    name: "",
    email: "",
    mobileNumber: "",
    password: "",
    department: "",
    designation: "",
    status: "Active",
    roles: []
  };
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState("");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  // Custom Role Builder
  const emptyRoleForm = {
    name: "",
    description: "",
    permissions: []
  };
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState("");

  // Department modal
  const emptyDeptForm = {
    name: "",
    description: ""
  };
  const [deptForm, setDeptForm] = useState(emptyDeptForm);
  const [showDeptModal, setShowDeptModal] = useState(false);



  // Performance
  const [teamStats, setTeamStats] = useState([]);

  // Support Tickets Admin State
  const [adminTickets, setAdminTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [sendingAdminReply, setSendingAdminReply] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState("All");
  const [ticketSearchQuery, setTicketSearchQuery] = useState("");
  const [updatingTicketStatus, setUpdatingTicketStatus] = useState(false);

  const fetchAdminTickets = async (statusVal = ticketStatusFilter, searchVal = ticketSearchQuery) => {
    try {
      setLoadingTickets(true);
      setError("");

      const params = {};
      if (statusVal && statusVal !== "All") {
        params.status = statusVal;
      }
      if (searchVal && searchVal.trim()) {
        params.search = searchVal.trim();
      }

      const { data } = await api.get("/tickets/admin", { params, headers: authHeader.headers });
      setAdminTickets(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load support tickets.");
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchAdminTicketDetails = async (ticketId) => {
    try {
      setLoadingTickets(true);
      setError("");
      const { data } = await api.get(`/tickets/admin/${ticketId}`, authHeader);
      setSelectedTicket(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load ticket details.");
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedTicket) return;

    try {
      setSendingAdminReply(true);
      setError("");
      const { data } = await api.post(`/tickets/admin/${selectedTicket._id}/messages`, {
        message: adminReplyText,
      }, authHeader);
      setSelectedTicket(data);
      setAdminReplyText("");
      // Refresh list to sync updated status/activity
      fetchAdminTickets(ticketStatusFilter, ticketSearchQuery);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reply message.");
    } finally {
      setSendingAdminReply(false);
    }
  };

  const handleUpdateTicketStatus = async (status) => {
    if (!selectedTicket || !status) return;

    try {
      setUpdatingTicketStatus(true);
      setError("");
      const { data } = await api.patch(`/tickets/admin/${selectedTicket._id}/status`, {
        status,
      }, authHeader);
      setSelectedTicket(data);
      setSuccess("Ticket status updated successfully!");
      setTimeout(() => setSuccess(""), 4000);
      fetchAdminTickets(ticketStatusFilter, ticketSearchQuery);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update ticket status.");
    } finally {
      setUpdatingTicketStatus(false);
    }
  };

  // Fetch admin tickets when activeTab switches to tickets
  useEffect(() => {
    if (activeTab === "tickets" && adminAuth) {
      fetchAdminTickets("All", "");
      setTicketStatusFilter("All");
      setTicketSearchQuery("");
      setSelectedTicket(null);
    }
  }, [activeTab, adminAuth]);

  // Permission Check
  const hasPermission = (permission) => {
    if (!adminAuth) return false;
    if (adminAuth.isMasterAdmin) return true;
    return adminAuth.permissions?.includes(permission) || adminAuth.permissions?.includes("ALL");
  };

  const allFormImages = useMemo(() => {
    const parsed = String(form.imagesText || "")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (form.image && !parsed.includes(form.image)) {
      return [form.image, ...parsed];
    }
    return parsed;
  }, [form.imagesText, form.image]);

  const handleDeleteFormImage = (urlToDelete) => {
    const newImagesText = String(form.imagesText || "")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter((item) => item && item !== urlToDelete)
      .join("\n");

    let newImage = form.image;
    if (form.image === urlToDelete) {
      const remaining = String(newImagesText)
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
      newImage = remaining[0] || "";
    }

    setForm((prev) => ({
      ...prev,
      image: newImage,
      imagesText: newImagesText,
    }));
  };

  const handleSetPrimaryFormImage = (url) => {
    setForm((prev) => {
      const existing = String(prev.imagesText || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (!existing.includes(url)) {
        existing.unshift(url);
      }

      return {
        ...prev,
        image: url,
        imagesText: existing.join("\n")
      };
    });
  };

  const handleToggleCategorySelection = (cat) => {
    const currentList = String(form.category || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    let newList;
    if (currentList.includes(cat)) {
      newList = currentList.filter((item) => item !== cat);
    } else {
      newList = [...currentList, cat];
    }

    setForm((prev) => ({
      ...prev,
      category: newList.join(", ")
    }));
  };

  const getUploadErrorMessage = (err) => {
    const status = err?.response?.status;
    const apiMessage = String(err?.response?.data?.message || "").trim();
    if (status === 503) {
      return (
        "Image upload failed: Cloudinary is not configured on the deployed server. " +
        "Add CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) and redeploy backend."
      );
    }
    return apiMessage || err.message || "Image upload failed";
  };
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [orderViewFilter, setOrderViewFilter] = useState("active");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");
  const [storeInfo, setStoreInfo] = useState(defaultStoreInfo);
  const [savingStoreInfo, setSavingStoreInfo] = useState(false);
  const [uploadingStoreLogo, setUploadingStoreLogo] = useState(false);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [trackingCarriersByOrder, setTrackingCarriersByOrder] = useState({});
  const [stockDrafts, setStockDrafts] = useState({});
  const [savingStockId, setSavingStockId] = useState("");
  const [duplicateData, setDuplicateData] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [labelPrintFilter, setLabelPrintFilter] = useState("all");

  const authHeader = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${adminAuth?.token || ""}` },
    }),
    [adminAuth]
  );

  const productCategories = useMemo(() => {
    const standard = ["Birthday", "Anniversary", "Flowers", "Cakes", "Personalized Gifts", "Plants"];
    const dynamic = [];
    products.forEach((product) => {
      if (product.category) {
        String(product.category)
          .split(",")
          .forEach((cat) => {
            const trimmed = cat.trim();
            if (trimmed && !dynamic.includes(trimmed)) {
              dynamic.push(trimmed);
            }
          });
      }
    });
    return Array.from(new Set([...standard, ...dynamic])).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(
    () => {
      let result = selectedCategory === "All"
        ? products
        : products.filter(
          (product) => {
            const productCat = String(product.category || "").toLowerCase();
            const selectedCat = selectedCategory.toLowerCase();
            const categoriesList = productCat.split(",").map(c => c.trim());
            return categoriesList.includes(selectedCat);
          }
        );
      if (globalSearchQuery.trim()) {
        const q = globalSearchQuery.trim().toLowerCase();
        result = result.filter(
          (p) =>
            String(p.name || "").toLowerCase().includes(q) ||
            String(p.category || "").toLowerCase().includes(q) ||
            String(p.sku || "").toLowerCase().includes(q)
        );
      }
      return result;
    },
    [products, selectedCategory, globalSearchQuery]
  );

  const productsByStock = useMemo(
    () =>
      [...products].sort((a, b) => {
        const sa = Number(a.stock ?? 0);
        const sb = Number(b.stock ?? 0);
        if (sa !== sb) return sa - sb;
        return String(a.name || "").localeCompare(String(b.name || ""));
      }),
    [products]
  );

  const stockSummary = useMemo(() => {
    let out = 0;
    let low = 0;
    let units = 0;
    for (const p of products) {
      const s = Number(p.stock ?? 0);
      if (Number.isFinite(s)) units += s;
      if (s <= 0) out += 1;
      else if (s <= 5) low += 1;
    }
    return { out, low, units };
  }, [products]);

  const ordersForView = useMemo(() => {
    if (orderViewFilter === "all") {
      return [
        ...orders.map((order) => ({ ...order, __isArchived: false })),
        ...archivedOrders.map((order) => ({ ...order, __isArchived: true })),
      ];
    }
    if (orderViewFilter === "active") {
      return orders.map((order) => ({ ...order, __isArchived: false }));
    }
    return archivedOrders.map((order) => ({ ...order, __isArchived: true }));
  }, [orderViewFilter, orders, archivedOrders]);

  const ordersForViewFiltered = useMemo(() => {
    let result = ordersForView;
    if (orderStatusFilter !== "all") {
      const normalizedFilter = String(orderStatusFilter || "").trim().toLowerCase();
      result = result.filter(
        (order) => String(order?.status || "").trim().toLowerCase() === normalizedFilter
      );
    }
    if (orderPaymentFilter !== "all") {
      const normalizedFilter = String(orderPaymentFilter || "").trim().toLowerCase();
      result = result.filter(
        (order) => String(order?.paymentMethod || "online").trim().toLowerCase() === normalizedFilter
      );
    }
    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.trim().toLowerCase();
      result = result.filter(
        (order) =>
          String(order.orderCode || order._id || "").toLowerCase().includes(q) ||
          String(order.address?.fullName || "").toLowerCase().includes(q) ||
          String(order.address?.phone || "").toLowerCase().includes(q) ||
          String(order.address?.email || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [ordersForView, orderStatusFilter, orderPaymentFilter, globalSearchQuery]);

  const filteredEmployees = useMemo(() => {
    if (!globalSearchQuery.trim()) return employees;
    const q = globalSearchQuery.trim().toLowerCase();
    return employees.filter(
      (emp) =>
        String(emp.name || "").toLowerCase().includes(q) ||
        String(emp.email || "").toLowerCase().includes(q) ||
        String(emp.designation || "").toLowerCase().includes(q) ||
        String(emp.department?.name || "").toLowerCase().includes(q)
    );
  }, [employees, globalSearchQuery]);

  const filteredCoupons = useMemo(() => {
    if (!globalSearchQuery.trim()) return coupons;
    const q = globalSearchQuery.trim().toLowerCase();
    return coupons.filter(
      (c) =>
        String(c.code || "").toLowerCase().includes(q) ||
        String(c.type || "").toLowerCase().includes(q)
    );
  }, [coupons, globalSearchQuery]);

  const visibleOrderIds = useMemo(() => ordersForViewFiltered.map((order) => order._id), [ordersForViewFiltered]);

  const selectableVisibleOrderIds = useMemo(
    () =>
      ordersForViewFiltered
        .filter((order) => matchesLabelPrintFilter(order, labelPrintFilter))
        .map((order) => order._id),
    [ordersForViewFiltered, labelPrintFilter]
  );

  const selectedOrdersForPrint = useMemo(() => {
    const selected = ordersForViewFiltered.filter((order) => selectedOrderIds.includes(order._id));
    return selected.filter((order) => matchesLabelPrintFilter(order, labelPrintFilter));
  }, [ordersForViewFiltered, selectedOrderIds, labelPrintFilter]);

  const allVisibleOrdersSelected = useMemo(
    () =>
      selectableVisibleOrderIds.length > 0 &&
      selectableVisibleOrderIds.every((orderId) => selectedOrderIds.includes(orderId)),
    [selectableVisibleOrderIds, selectedOrderIds]
  );

  const selectAllButtonLabel = useMemo(() => {
    if (allVisibleOrdersSelected) {
      if (labelPrintFilter === "ready") return "Clear shipped/delivered";
      if (labelPrintFilter === "shipped") return "Clear shipped";
      if (labelPrintFilter === "delivered") return "Clear delivered";
      return "Clear all visible";
    }
    if (labelPrintFilter === "ready") return "Select shipped/delivered";
    if (labelPrintFilter === "shipped") return "Select shipped";
    if (labelPrintFilter === "delivered") return "Select delivered";
    return "Select all visible";
  }, [allVisibleOrdersSelected, labelPrintFilter]);

  const activeTitle = useMemo(() => {
    const tabTitles = {
      overview: "Admin Dashboard | Niyora Gifts Admin",
      products: "Product Management | Niyora Gifts Admin",
      orders: "Orders Management | Niyora Gifts Admin",
      tickets: "Customer Support | Niyora Gifts Admin",
      coupons: "Business Analytics & Settings | Niyora Gifts Admin",
      newsletter: "Newsletter Campaigns | Niyora Gifts Admin",
      employees: "Employees & Permissions | Niyora Gifts Admin",
      logs: "Security Audit Logs | Niyora Gifts Admin",
      customers: "Customer Management | Niyora Gifts Admin",
    };
    return tabTitles[activeTab] || "Admin Dashboard | Niyora Gifts Admin";
  }, [activeTab]);

  const isBusy = saving || uploadingImage || uploadingStoreLogo || updatingTicketStatus || savingStoreInfo || sendingAdminReply || generatingSpecial || sendingCouponEmail || !!savingStockId;
  const busyText = useMemo(() => {
    if (uploadingImage || uploadingStoreLogo) return "Uploading assets securely to cloud storage...";
    if (saving) return "Updating product inventory...";
    if (savingStoreInfo) return "Saving configuration profiles...";
    if (updatingTicketStatus) return "Securing support ticket status update...";
    if (sendingAdminReply) return "Transmitting message to guest...";
    if (generatingSpecial) return "Generating secure retention code & dispatching email...";
    if (sendingCouponEmail) return "Sending promotional coupon code to customer email...";
    if (savingStockId) return "Updating database stock levels...";
    return "Processing request...";
  }, [saving, uploadingImage, uploadingStoreLogo, updatingTicketStatus, savingStoreInfo, sendingAdminReply, generatingSpecial, sendingCouponEmail, savingStockId]);

  useEffect(() => {
    if (activeTab === "overview") {
      setFetchingOverview(true);
      const timer = setTimeout(() => setFetchingOverview(false), 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "orders") {
      setFetchingOrders(true);
      const timer = setTimeout(() => setFetchingOrders(false), 250);
      return () => clearTimeout(timer);
    }
  }, [orderViewFilter, orderStatusFilter, orderPaymentFilter, activeTab]);

  useEffect(() => {
    if (activeTab === "coupons") {
      setFetchingCoupons(true);
      const timer = setTimeout(() => setFetchingCoupons(false), 250);
      return () => clearTimeout(timer);
    }
  }, [activeTab, couponsSubTab]);

  const changeProductCategory = (cat) => {
    setFetchingProducts(true);
    setSelectedCategory(cat);
    setTimeout(() => setFetchingProducts(false), 250);
  };

  useEffect(() => {
    const visibleSet = new Set(visibleOrderIds);
    setSelectedOrderIds((prev) => prev.filter((orderId) => visibleSet.has(orderId)));
  }, [visibleOrderIds]);

  const findOrderCustomImage = (order) =>
    order.products?.find((product) => product.customization?.uploadedImage)?.customization?.uploadedImage || "";

  const handleExportExcel = () => {
    try {
      const dataToExport = productsByStock.map((prod) => {
        const stockLevel = Number(prod.stock ?? 0);
        const status = stockLevel <= 0 ? "Out of stock" : stockLevel <= 5 ? "Low stock" : "In stock";
        return {
          "Product ID": prod._id || "",
          "Name": prod.name || "",
          "Category": prod.category || "",
          "Price (INR)": prod.price || 0,
          "Stock Level": stockLevel,
          "Inventory Status": status,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      const maxLens = {};
      dataToExport.forEach((row) => {
        Object.keys(row).forEach((key) => {
          const valStr = String(row[key]);
          maxLens[key] = Math.max(maxLens[key] || key.length, valStr.length);
        });
      });
      worksheet["!cols"] = Object.keys(maxLens).map((key) => ({
        wch: maxLens[key] + 3,
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Status");

      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `niyora-gifts-stock-report-${dateStr}.xlsx`);
    } catch (err) {
      console.error("Export Excel error:", err);
      alert("Failed to export Excel report.");
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const dateStr = new Date().toLocaleString("en-IN");
      const cleanDateStr = new Date().toISOString().split("T")[0];

      doc.setFillColor(4, 120, 87);
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.text(storeInfo.storeName || "Niyora Gifts", 14, 18);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(209, 250, 229);
      doc.text("Stock Status Report (Admin Copy)", 14, 25);
      doc.text(`Generated on: ${dateStr}`, 14, 32);

      doc.setFillColor(243, 244, 246);
      doc.rect(14, 48, 182, 24, "F");

      doc.setTextColor(17, 24, 39);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("INVENTORY OVERVIEW", 18, 54);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(`Total Products: ${products.length}`, 18, 62);
      doc.text(`Total Stock Units: ${stockSummary.units}`, 18, 67);
      doc.text(`Low Stock Items: ${stockSummary.low}`, 100, 62);
      doc.text(`Out of Stock Items: ${stockSummary.out}`, 100, 67);

      const tableRows = productsByStock.map((prod) => {
        const stockLevel = Number(prod.stock ?? 0);
        const status = stockLevel <= 0 ? "Out of Stock" : stockLevel <= 5 ? "Low Stock" : "In Stock";
        return [
          prod.name || "",
          prod.category || "",
          `INR ${Number(prod.price || 0).toFixed(2)}`,
          String(stockLevel),
          status
        ];
      });

      autoTable(doc, {
        startY: 78,
        head: [["Product Name", "Category", "Price", "Stock", "Status"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [4, 120, 87],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 35 },
          2: { cellWidth: 28, halign: "right" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 29, halign: "center" },
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
        },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.text(
            `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10
          );
        }
      });

      doc.save(`niyora-gifts-stock-report-${cleanDateStr}.pdf`);
    } catch (err) {
      console.error("Export PDF error:", err);
      alert("Failed to export PDF report.");
    }
  };

  const fetchCoupons = async () => {
    try {
      const { data } = await api.get("/admin/coupons", authHeader);
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load coupons");
    }
  };

  useEffect(() => {
    if (!adminAuth?.token || !adminAuth?.isAdmin) {
      navigate("/niyora-admin-portal-2026/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, ordersRes, archivedOrdersRes, couponsRes, storeInfoRes] = await Promise.allSettled([
          api.get("/admin/products", authHeader),
          api.get("/admin/orders", authHeader),
          api.get("/admin/orders/archived", authHeader),
          api.get("/admin/coupons", authHeader),
          api.get("/admin/store-info", authHeader),
        ]);
        if (productsRes.status === "fulfilled") setProducts(productsRes.value.data);
        if (ordersRes.status === "fulfilled") setOrders(ordersRes.value.data);
        if (archivedOrdersRes.status === "fulfilled") setArchivedOrders(archivedOrdersRes.value.data);
        if (couponsRes.status === "fulfilled") setCoupons(Array.isArray(couponsRes.value.data) ? couponsRes.value.data : []);
        if (storeInfoRes.status === "fulfilled") {
          setStoreInfo({
            storeName: storeInfoRes.value.data?.storeName || defaultStoreInfo.storeName,
            storePhone: storeInfoRes.value.data?.storePhone || defaultStoreInfo.storePhone,
            storeAddress: storeInfoRes.value.data?.storeAddress || defaultStoreInfo.storeAddress,
            storeLogoUrl: storeInfoRes.value.data?.storeLogoUrl || defaultStoreInfo.storeLogoUrl,
            specialOffer: storeInfoRes.value.data?.specialOffer || defaultStoreInfo.specialOffer,
            offers: Array.isArray(storeInfoRes.value.data?.offers) ? storeInfoRes.value.data.offers : defaultStoreInfo.offers,
            codEnabled: storeInfoRes.value.data?.codEnabled !== undefined ? storeInfoRes.value.data.codEnabled : defaultStoreInfo.codEnabled,
          });
        }
        if (
          productsRes.status === "rejected" ||
          ordersRes.status === "rejected" ||
          archivedOrdersRes.status === "rejected" ||
          couponsRes.status === "rejected" ||
          storeInfoRes.status === "rejected"
        ) {
          setError("Some admin data failed to load. Please refresh.");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [adminAuth, authHeader, navigate]);

  useEffect(() => {
    setGlobalSearchQuery("");
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "logs") {
      setLogsSearch(globalSearchQuery);
      setLogsPage(1);
    }
  }, [globalSearchQuery, activeTab]);

  // --- ENTERPRISE RBAC & SECURITY HANDLERS & FETCHERS ---
  const fetchEmployeesList = async () => {
    try {
      setFetchingEmployees(true);
      const { data } = await api.get("/admin/employees", authHeader);
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load employees failed:", err);
    } finally {
      setFetchingEmployees(false);
    }
  };

  const fetchRolesList = async () => {
    try {
      const { data } = await api.get("/admin/roles", authHeader);
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load roles failed:", err);
    }
  };

  const fetchDepartmentsList = async () => {
    try {
      const { data } = await api.get("/admin/departments", authHeader);
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load departments failed:", err);
    }
  };

  const fetchPermissionsConfig = async () => {
    try {
      const { data } = await api.get("/admin/roles/permissions", authHeader);
      setPermissionsConfig(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load permissions config failed:", err);
    }
  };

  const fetchActivityLogsList = async () => {
    try {
      setFetchingLogs(true);
      const params = new URLSearchParams();
      if (logsSearch) params.append("search", logsSearch);
      if (logsUserFilter) params.append("userId", logsUserFilter);
      if (logsActionFilter) params.append("action", logsActionFilter);
      if (logsStartDate) params.append("startDate", logsStartDate);
      if (logsEndDate) params.append("endDate", logsEndDate);
      params.append("page", logsPage);
      params.append("limit", 15);

      const { data } = await api.get(`/admin/logs?${params.toString()}`, authHeader);
      setLogs(data.logs || []);
      setLogsTotalPages(data.totalPages || 1);
      setLogsTotalCount(data.totalLogs || 0);
    } catch (err) {
      console.error("Load activity logs failed:", err);
    } finally {
      setFetchingLogs(false);
    }
  };

  const fetchLoginLogsList = async () => {
    try {
      setFetchingLogs(true);
      const { data } = await api.get(`/admin/login-logs?page=${loginLogsPage}&limit=15`, authHeader);
      setLoginLogs(data.logs || []);
      setLoginLogsTotalPages(data.pages || 1);
      setLoginLogsTotalCount(data.total || 0);
    } catch (err) {
      console.error("Load login logs failed:", err);
    } finally {
      setFetchingLogs(false);
    }
  };

  const fetchTeamStats = async () => {
    try {
      const { data } = await api.get("/admin/employees/performance", authHeader);
      setTeamStats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load team performance failed:", err);
    }
  };

  // Load data reactively based on tab changes & filters
  useEffect(() => {
    if (!adminAuth?.token) return;

    if (activeTab === "employees") {
      if (hasPermission("EMPLOYEES_MANAGE")) {
        fetchEmployeesList();
        fetchDepartmentsList();
      }
      if (hasPermission("ROLES_MANAGE")) {
        fetchRolesList();
        fetchPermissionsConfig();
      }
    } else if (activeTab === "logs") {
      if (logsSubTab === "audit" && hasPermission("ACTIVITY_LOGS_VIEW")) {
        fetchActivityLogsList();
      } else if (logsSubTab === "login" && adminAuth.isMasterAdmin) {
        fetchLoginLogsList();
      }
    } else if (activeTab === "overview") {
      if (hasPermission("BUSINESS_ANALYTICS_VIEW")) {
        fetchTeamStats();
      }
    }
  }, [
    activeTab,
    logsSubTab,
    adminAuth,
    logsPage,
    logsSearch,
    logsUserFilter,
    logsActionFilter,
    logsStartDate,
    logsEndDate,
    loginLogsPage
  ]);

  // Employee CRUD handlers
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = { ...employeeForm };
      if (!payload.password && editingEmployeeId) {
        delete payload.password;
      }
      if (editingEmployeeId) {
        await api.put(`/admin/employees/${editingEmployeeId}`, payload, authHeader);
        setSuccess("Employee account updated successfully.");
      } else {
        await api.post("/admin/employees", payload, authHeader);
        setSuccess("Employee account created successfully.");
      }
      setShowEmployeeModal(false);
      setEmployeeForm(emptyEmployeeForm);
      setEditingEmployeeId("");
      fetchEmployeesList();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save employee");
    }
  };

  const startEditEmployee = (emp) => {
    setEditingEmployeeId(emp._id);
    setEmployeeForm({
      name: emp.name,
      email: emp.email,
      mobileNumber: emp.mobileNumber || "",
      password: "",
      department: emp.department?._id || emp.department || "",
      designation: emp.designation || "",
      status: emp.status || "Active",
      roles: emp.roles ? emp.roles.map(r => r._id || r) : []
    });
    setShowEmployeeModal(true);
  };

  const handleToggleEmployeeStatus = async (emp) => {
    setError("");
    setSuccess("");
    try {
      const newStatus = emp.status === "Active" ? "Inactive" : "Active";
      await api.put(`/admin/employees/${emp._id}`, { status: newStatus }, authHeader);
      setSuccess(`Employee ${emp.name} has been set to ${newStatus}.`);
      fetchEmployeesList();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to toggle employee status");
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this employee?")) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/admin/employees/${id}`, authHeader);
      setSuccess("Employee account deleted successfully.");
      fetchEmployeesList();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete employee account");
    }
  };

  // Custom Roles CRUD handlers
  const handleSaveRole = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (editingRoleId) {
        await api.put(`/admin/roles/${editingRoleId}`, roleForm, authHeader);
        setSuccess("Role updated successfully.");
      } else {
        await api.post("/admin/roles", roleForm, authHeader);
        setSuccess("Custom role created successfully.");
      }
      setShowRoleModal(false);
      setRoleForm(emptyRoleForm);
      setEditingRoleId("");
      fetchRolesList();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save role");
    }
  };

  const handleTogglePermissionInForm = (permCode) => {
    setRoleForm(prev => {
      const perms = [...prev.permissions];
      if (perms.includes(permCode)) {
        return { ...prev, permissions: perms.filter(p => p !== permCode) };
      } else {
        return { ...prev, permissions: [...perms, permCode] };
      }
    });
  };

  const startEditRole = (role) => {
    setEditingRoleId(role._id);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || []
    });
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm("Are you sure you want to delete this custom role?")) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/admin/roles/${id}`, authHeader);
      setSuccess("Role deleted successfully.");
      fetchRolesList();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete custom role");
    }
  };

  // Department CRUD handlers
  const handleSaveDept = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/admin/departments", deptForm, authHeader);
      setSuccess("Department created successfully.");
      setShowDeptModal(false);
      setDeptForm(emptyDeptForm);
      fetchDepartmentsList();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save department");
    }
  };

  const handleDeleteDept = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/admin/departments/${id}`, authHeader);
      setSuccess("Department deleted successfully.");
      fetchDepartmentsList();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete department");
    }
  };



  const handleLogout = async (reason = "Manual") => {
    try {
      if (adminAuth) {
        await api.post("/admin/logout", {
          loginLogId: adminAuth.loginLogId,
          reason,
        }, authHeader);
      }
    } catch (err) {
      console.error("Logout API failed:", err);
    }
    clearAdminAuth();
    setAdminAuth(null);
    navigate("/niyora-admin-portal-2026/login");
  };

  const resetInactivityTimers = () => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    if (adminAuth?.token && adminAuth?.isAdmin) {
      // 55 minutes warning
      warningTimerRef.current = setTimeout(() => {
        setShowInactivityWarning(true);
      }, 55 * 60 * 1000);

      // 60 minutes logout
      logoutTimerRef.current = setTimeout(() => {
        handleLogout("Session Expired");
      }, 60 * 60 * 1000);
    }
  };

  const handleStayLoggedIn = () => {
    setShowInactivityWarning(false);
    resetInactivityTimers();
  };

  useEffect(() => {
    if (!adminAuth?.token || !adminAuth?.isAdmin) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      return;
    }

    const handleActivity = () => {
      if (showInactivityWarning) return;
      resetInactivityTimers();
    };

    resetInactivityTimers();

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("click", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("click", handleActivity);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [adminAuth, showInactivityWarning]);

  const handleFormChange = (event) => {
    const { name, type, checked, value } = event.target;
    const val = type === "checkbox" ? checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const parsedImages = String(form.imagesText || "")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    const primaryImage = String(form.image || parsedImages[0] || "").trim();
    const uniqueImages = Array.from(new Set([primaryImage, ...parsedImages].filter(Boolean)));
    const highlights = String(form.highlightsText || "")
      .split(/\r?\n/)
      .map((item) => item.replace(/^[-\u2022]\s*/, "").trim())
      .filter(Boolean);
    const specifications = String(form.specificationsText || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) return null;
        return {
          label: line.slice(0, separatorIndex).trim(),
          value: line.slice(separatorIndex + 1).trim(),
        };
      })
      .filter((item) => item?.label && item?.value);
    const quickSpecs = [
      { label: "Delivery Time", value: String(form.deliveryTime || "").trim() },
      { label: "Material", value: String(form.material || "").trim() },
      { label: "Dimensions", value: String(form.dimensions || "").trim() },
      { label: "Weight", value: String(form.weight || "").trim() },
      { label: "Occasion", value: String(form.occasion || "").trim() },
      { label: "Care Instructions", value: String(form.careInstructions || "").trim() },
    ].filter((item) => item.value);
    const quickSpecLabels = new Set(quickSpecs.map((item) => item.label.toLowerCase()));
    const mergedSpecifications = [
      ...quickSpecs,
      ...specifications.filter((item) => !quickSpecLabels.has(String(item.label || "").toLowerCase())),
    ];
    if (!primaryImage) {
      setError("Please upload at least one product image before saving.");
      return;
    }
    const stockVal = Math.floor(Number(form.stock));
    if (!Number.isFinite(stockVal) || stockVal < 0) {
      setError("Stock must be a whole number ≥ 0.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        image: primaryImage,
        images: uniqueImages,
        price: Number(form.price),
        stock: stockVal,
        highlights,
        specifications: mergedSpecifications,
      };
      delete payload.imagesText;
      delete payload.highlightsText;
      delete payload.specificationsText;
      delete payload.deliveryTime;
      delete payload.material;
      delete payload.dimensions;
      delete payload.weight;
      delete payload.occasion;
      delete payload.careInstructions;
      if (editingId) {
        await api.put(`/admin/products/${editingId}`, payload, authHeader);
      } else {
        await api.post("/admin/products", payload, authHeader);
      }

      const { data } = await api.get("/admin/products", authHeader);
      setProducts(data);
      setForm(emptyForm);
      setEditingId("");
      setImageFile(null);
      setSuccess(editingId ? "Product updated successfully." : "Product created successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };


  const handleDuplicateProduct = (product) => {
    const { _id, sku, createdAt, updatedAt, __v, ...rest } = product;
    setDuplicateData({
      ...rest,
      name: `${rest.name} (Copy)`
    });
    setEditingId("");
    setProductsSubTab("add-edit-product");
  };

  const startEditProduct = (product) => {
    const productSpecifications = Array.isArray(product.specifications) ? product.specifications : [];
    const getSpecValue = (label) =>
      String(
        productSpecifications.find(
          (item) => String(item?.label || "").trim().toLowerCase() === label.toLowerCase()
        )?.value || ""
      ).trim();
    setForm({
      name: product.name,
      price: String(product.price),
      image: product.image || product.images?.[0] || "",
      imagesText: Array.isArray(product.images) ? product.images.join("\n") : "",
      description: product.description,
      highlightsText: Array.isArray(product.highlights) ? product.highlights.join("\n") : "",
      specificationsText: productSpecifications
        .filter(
          (item) =>
            ![
              "delivery time",
              "material",
              "dimensions",
              "weight",
              "occasion",
              "care instructions",
            ].includes(
              String(item?.label || "").trim().toLowerCase()
            )
        )
        .map((item) => `${item.label}: ${item.value}`)
        .join("\n"),
      deliveryTime: getSpecValue("Delivery Time"),
      material: getSpecValue("Material"),
      dimensions: getSpecValue("Dimensions"),
      weight: getSpecValue("Weight"),
      occasion: getSpecValue("Occasion"),
      careInstructions: getSpecValue("Care Instructions"),
      category: product.category,
      stock: String(product.stock ?? 0),
      isPersonalized: Boolean(product.isPersonalized),
      personalizationTextLabel: product.personalizationTextLabel || "",
      personalizationTextLimit: String(product.personalizationTextLimit ?? 20),
      personalizationImageRequired: Boolean(product.personalizationImageRequired),
      personalizationImageLabel: product.personalizationImageLabel || "",
      codEnabled: product.codEnabled !== undefined ? Boolean(product.codEnabled) : true,
    });
    setEditingId(product._id);
    setImageFile(null);
    setSelectedCategory(product.category || "All");
  };

  const handleImageUpload = async () => {
    if (!imageFile) {
      setError("Please select an image file first.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setUploadWarning("");
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", imageFile);
      const { data } = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setForm((prev) => {
        const existing = String(prev.imagesText || "")
          .split(/\r?\n|,/)
          .map((item) => item.trim())
          .filter(Boolean);
        const nextImages = Array.from(new Set([prev.image, ...existing, data.imageUrl].filter(Boolean)));
        return {
          ...prev,
          image: prev.image || data.imageUrl,
          imagesText: nextImages.join("\n"),
        };
      });
      setSuccess("Image uploaded and added to product gallery.");
      if (data?.message && !data.message.toLowerCase().includes("successfully")) {
        setUploadWarning(data.message);
      }
    } catch (err) {
      setError(getUploadErrorMessage(err));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      setSuccess("");
      await api.delete(`/admin/products/${id}`, authHeader);
      setProducts((prev) => prev.filter((item) => item._id !== id));
      setSuccess("Product deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete product");
    }
  };

  const stockInputValue = (product) => {
    const d = stockDrafts[product._id];
    return d !== undefined ? d : String(product.stock ?? 0);
  };

  const saveProductStock = async (productId) => {
    const base = products.find((x) => x._id === productId);
    const raw = stockDrafts[productId] !== undefined ? stockDrafts[productId] : String(base?.stock ?? 0);
    const val = Math.floor(Number(raw));
    if (!Number.isFinite(val) || val < 0) {
      setError("Enter a valid stock number (≥ 0).");
      return;
    }
    setError("");
    setSuccess("");
    try {
      setSavingStockId(productId);
      await api.put(`/admin/products/${productId}`, { stock: val }, authHeader);
      const { data } = await api.get("/admin/products", authHeader);
      setProducts(data);
      setStockDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      setSuccess("Stock updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update stock");
    } finally {
      setSavingStockId("");
    }
  };

  const handleOrderStatusChange = async (orderId, status) => {
    try {
      setSuccess("");
      const { data } = await api.put(`/admin/orders/${orderId}/status`, { status }, authHeader);
      setOrders((prev) => prev.map((order) => (order._id === orderId ? data.order : order)));
      setSuccess("Order status updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update order status");
    }
  };

  const isTrackingEditable = (status) => ["Shipped", "Delivered"].includes(status);

  const handleTrackingInputChange = (orderId, value) => {
    setTrackingInputs((prev) => ({ ...prev, [orderId]: value }));
  };

  const handleTrackingCarrierChange = (orderId, value) => {
    setTrackingCarriersByOrder((prev) => ({ ...prev, [orderId]: value }));
  };

  const handleSaveTrackingId = async (order) => {
    const trackingId = String(trackingInputs[order._id] ?? order.trackingId ?? "").trim();
    if (!isTrackingEditable(order.status)) {
      setError("Tracking ID can be updated only when order is Shipped or Delivered.");
      return;
    }
    if (!trackingId) {
      setError("Tracking ID is required.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const trackingCarrier = trackingCarriersByOrder[order._id] || order.trackingCarrier || "generic";
      const { data } = await api.put(`/admin/orders/${order._id}/tracking`, { trackingId, trackingCarrier }, authHeader);
      const updatedOrder = data.order;
      setOrders((prev) => prev.map((item) => (item._id === order._id ? updatedOrder : item)));
      setArchivedOrders((prev) => prev.map((item) => (item._id === order._id ? updatedOrder : item)));
      setTrackingInputs((prev) => ({ ...prev, [order._id]: updatedOrder.trackingId || trackingId }));
      setTrackingCarriersByOrder((prev) => ({ ...prev, [order._id]: updatedOrder.trackingCarrier || trackingCarrier }));
      setSuccess(`Tracking ID updated for ${getOrderDisplayId(order)}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update tracking ID");
    }
  };

  const handleDeleteOrder = async (order) => {
    const orderIdText = getOrderDisplayId(order);
    if (order.status !== "Cancelled") {
      setError("Only cancelled orders can be deleted. Archive this order instead.");
      return;
    }
    const confirmed = window.confirm(`Delete order ${orderIdText}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await api.delete(`/admin/orders/${order._id}`, authHeader);
      setOrders((prev) => prev.filter((item) => item._id !== order._id));
      setSuccess(`Order ${orderIdText} deleted successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete order");
    }
  };

  const handleArchiveOrder = async (order) => {
    const orderIdText = getOrderDisplayId(order);
    const confirmed = window.confirm(`Archive order ${orderIdText}? It will be hidden from Manage Orders.`);
    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await api.put(`/admin/orders/${order._id}/archive`, {}, authHeader);
      setOrders((prev) => prev.filter((item) => item._id !== order._id));
      setArchivedOrders((prev) => [order, ...prev]);
      setSuccess(`Order ${orderIdText} archived successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to archive order");
    }
  };

  const handleRestoreOrder = async (order) => {
    const orderIdText = getOrderDisplayId(order);
    const confirmed = window.confirm(`Restore order ${orderIdText} to Manage Orders?`);
    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await api.put(`/admin/orders/${order._id}/unarchive`, {}, authHeader);
      setArchivedOrders((prev) => prev.filter((item) => item._id !== order._id));
      setOrders((prev) => [order, ...prev]);
      setSuccess(`Order ${orderIdText} restored successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to restore order");
    }
  };

  const handleStoreInfoChange = (event) => {
    const { name, value } = event.target;
    setStoreInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleOfferChange = (index, key, value) => {
    setStoreInfo((prev) => ({
      ...prev,
      offers: (prev.offers || []).map((offer, offerIndex) =>
        offerIndex === index ? { ...offer, [key]: value } : offer
      ),
    }));
  };

  const addOffer = () => {
    setStoreInfo((prev) => ({
      ...prev,
      offers: [...(prev.offers || []), { title: "", subtitle: "", code: "", ctaText: "Explore", active: true }],
    }));
  };

  const removeOffer = (index) => {
    setStoreInfo((prev) => ({
      ...prev,
      offers: (prev.offers || []).filter((_, offerIndex) => offerIndex !== index),
    }));
  };

  const handleSpecialOfferChange = (key, value) => {
    setStoreInfo((prev) => ({
      ...prev,
      specialOffer: { ...(prev.specialOffer || defaultStoreInfo.specialOffer), [key]: value },
    }));
  };

  const saveStoreInfo = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (!storeInfo.storeName.trim() || !storeInfo.storePhone.trim() || !storeInfo.storeAddress.trim()) {
        setError("Store name, phone and address are required");
        return;
      }
      setSavingStoreInfo(true);
      const payload = {
        storeName: storeInfo.storeName.trim(),
        storePhone: storeInfo.storePhone.trim(),
        storeAddress: storeInfo.storeAddress.trim(),
        storeLogoUrl: String(storeInfo.storeLogoUrl || "").trim(),
        codEnabled: storeInfo.codEnabled !== undefined ? Boolean(storeInfo.codEnabled) : true,
        specialOffer: {
          title: String(storeInfo.specialOffer?.title || "").trim(),
          subtitle: String(storeInfo.specialOffer?.subtitle || "").trim(),
          eventName: String(storeInfo.specialOffer?.eventName || "").trim(),
          code: String(storeInfo.specialOffer?.code || "").trim().toUpperCase(),
          ctaText: String(storeInfo.specialOffer?.ctaText || "Explore").trim(),
          startDate: String(storeInfo.specialOffer?.startDate || "").trim(),
          endDate: String(storeInfo.specialOffer?.endDate || "").trim(),
          active: Boolean(storeInfo.specialOffer?.active),
        },
        offers: (storeInfo.offers || [])
          .map((offer) => ({
            title: String(offer.title || "").trim(),
            subtitle: String(offer.subtitle || "").trim(),
            code: String(offer.code || "").trim().toUpperCase(),
            ctaText: String(offer.ctaText || "Explore").trim(),
            active: Boolean(offer.active),
          }))
          .filter((offer) => offer.title && offer.subtitle),
      };
      const { data } = await api.put("/admin/store-info", payload, authHeader);
      setStoreInfo({
        storeName: data.storeInfo?.storeName || payload.storeName,
        storePhone: data.storeInfo?.storePhone || payload.storePhone,
        storeAddress: data.storeInfo?.storeAddress || payload.storeAddress,
        storeLogoUrl: data.storeInfo?.storeLogoUrl || payload.storeLogoUrl,
        specialOffer: data.storeInfo?.specialOffer || payload.specialOffer,
        offers: Array.isArray(data.storeInfo?.offers) ? data.storeInfo.offers : payload.offers,
        codEnabled: data.storeInfo?.codEnabled !== undefined ? data.storeInfo.codEnabled : payload.codEnabled,
      });
      setSuccess("Store settings updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update store settings");
    } finally {
      setSavingStoreInfo(false);
    }
  };

  const handleStoreLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      setSuccess("");
      setUploadingStoreLogo(true);
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data?.imageUrl) {
        throw new Error("Upload failed");
      }
      setStoreInfo((prev) => ({ ...prev, storeLogoUrl: data.imageUrl }));
      if (data?.message && !data.message.toLowerCase().includes("successfully")) {
        setSuccess(`Logo uploaded (stored locally: ${data.message}). Click 'Save Store Settings' to persist it.`);
      } else {
        setSuccess("Logo uploaded. Click 'Save Store Settings' to persist it.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to upload logo");
    } finally {
      setUploadingStoreLogo(false);
      event.target.value = "";
    }
  };

  const getAddressLines = (address = {}) => {
    const lineOne = [address.line1, address.city].filter(Boolean).join(", ");
    const lineTwo = [address.state, address.postalCode, address.country].filter(Boolean).join(", ");
    return [lineOne, lineTwo].filter(Boolean);
  };

  const getOrderDisplayId = (order) => order?.orderCode || order?._id || "N/A";

  const getPaymentStampText = (order) => {
    const methodText = String(order?.paymentMethod || order?.paymentType || "").toLowerCase();
    const isCodMethod = methodText.includes("cod") || methodText.includes("cash");
    const isPaid =
      Boolean(order?.isPaid) ||
      String(order?.paymentStatus || "").toLowerCase() === "paid" ||
      String(order?.status || "").toLowerCase() === "delivered";
    return isPaid && !isCodMethod ? "PAID" : "COD";
  };

  const buildShippingLabelSheetMarkup = (order) => {
    const safeOrder = order || {};
    const address = safeOrder.address || {};
    const addressLines = getAddressLines(address);
    const items = Array.isArray(safeOrder.products) ? safeOrder.products : [];
    const itemList = items.map((item) => `${item.name || "Item"} x${Number(item.quantity || 0)}`).join("<br/>");
    const qrValue = encodeURIComponent(safeOrder._id || "");
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrValue}`;
    const paymentStamp = getPaymentStampText(safeOrder);
    const logoHtml = storeInfo.storeLogoUrl
      ? `<img src="${storeInfo.storeLogoUrl}" alt="Store Logo" class="store-logo" />`
      : `<div class="logo-dot">N</div>`;

    return `
      <div class="sheet">
        <div class="top-banner">
          <div class="brand">
            ${logoHtml}
            <div>
              <p class="brand-name">${storeInfo.storeName || "Niyora Gifts"}</p>
              <p class="muted">Shipping Operations Copy</p>
            </div>
          </div>
          <div class="pay-stamp ${paymentStamp === "PAID" ? "paid" : "cod"}">${paymentStamp}</div>
        </div>
        <h1>Shipping Label</h1>
        <div class="meta">
          <p><strong>Order ID:</strong> ${getOrderDisplayId(safeOrder)}</p>
          <p><strong>Status:</strong> ${safeOrder.status || "Pending"} | <strong>Amount:</strong> INR ${Number(safeOrder.totalPrice || 0).toFixed(2)}</p>
          <p><strong>Date:</strong> ${new Date(safeOrder.createdAt || Date.now()).toLocaleString()}</p>
        </div>
        <div class="row">
          <div class="col">
            <h2>From (Sender)</h2>
            <div class="box">
              <p><strong>${storeInfo.storeName}</strong></p>
              <p>Support: ${storeInfo.storePhone}</p>
              <p>${storeInfo.storeAddress}</p>
            </div>
          </div>
          <div class="col">
            <h2>To (Receiver)</h2>
            <div class="box">
              <p><strong>${address.fullName || "N/A"}</strong></p>
              <p>${address.phone || "-"}</p>
              ${addressLines.map((line) => `<p>${line}</p>`).join("")}
            </div>
          </div>
          <div class="qr">
            <img src="${qrUrl}" alt="Order QR" />
            <p class="muted">Scan for Order ID</p>
            <p class="barcode">*${getOrderDisplayId(safeOrder)}*</p>
          </div>
        </div>
        <div class="items">
          <h2>Package Items</h2>
          <p>${itemList || "N/A"}</p>
        </div>
        <p class="muted">Generated from Admin Dashboard</p>
      </div>
    `;
  };

  const handlePrintShippingLabelsBatch = (ordersToPrint) => {
    const printableOrders = Array.isArray(ordersToPrint) ? ordersToPrint.filter(Boolean) : [];
    if (!printableOrders.length) {
      setError("Select at least one order to print shipping labels.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to print shipping label.");
      return;
    }

    const labelsHtml = printableOrders
      .map((order) => `<div class="sheet-wrap">${buildShippingLabelSheetMarkup(order)}</div>`)
      .reduce((pages, sheetHtml, idx) => {
        if (idx % 2 === 0) {
          pages.push([sheetHtml]);
        } else {
          pages[pages.length - 1].push(sheetHtml);
        }
        return pages;
      }, [])
      .map((pageSheets, pageIdx) => {
        const first = pageSheets[0] || `<div class="sheet-wrap"></div>`;
        const second = pageSheets[1] || `<div class="sheet-wrap placeholder"></div>`;
        return `
          <div class="${pageIdx > 0 ? "page-break" : ""}">
            <div class="two-up">
              ${first}
              ${second}
            </div>
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Shipping Labels (${printableOrders.length})</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111827; background: #fff; }
            .two-up { display: grid; grid-template-rows: 1fr 1fr; gap: 8mm; }
            .sheet-wrap { height: 136.5mm; overflow: hidden; }
            .sheet-wrap.placeholder { border: 1px dashed #d1d5db; border-radius: 10px; }
            .sheet { width: 100%; max-width: 194mm; margin: 0 auto; border: 2px solid #111827; padding: 6mm; box-sizing: border-box; }
            .page-break { page-break-before: always; break-before: page; }
            .top-banner { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
            .brand { display: flex; align-items: center; gap: 8px; }
            .logo-dot { width: 30px; height: 30px; border-radius: 999px; background: #047857; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
            .store-logo { width: 34px; height: 34px; object-fit: contain; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; padding: 2px; }
            .brand-name { margin: 0; font-size: 14px; font-weight: 700; }
            .pay-stamp { border: 2px solid; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.6px; }
            .pay-stamp.paid { color: #047857; border-color: #047857; background: #ecfdf5; }
            .pay-stamp.cod { color: #9a3412; border-color: #9a3412; background: #fff7ed; }
            .row { display: flex; gap: 10mm; align-items: flex-start; }
            .col { flex: 1; }
            h1 { margin: 0 0 6px; font-size: 18px; letter-spacing: 0.4px; }
            h2 { margin: 0 0 5px; font-size: 12px; text-transform: uppercase; color: #374151; }
            p { margin: 3px 0; font-size: 11px; line-height: 1.32; }
            .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; min-height: 92px; }
            .meta { margin: 8px 0 10px; border-top: 1px dashed #6b7280; border-bottom: 1px dashed #6b7280; padding: 8px 0; }
            .items { margin-top: 10px; }
            .qr { text-align: center; min-width: 150px; }
            .qr img { width: 110px; height: 110px; border: 1px solid #d1d5db; padding: 4px; border-radius: 6px; }
            .barcode { margin-top: 6px; font-family: "Courier New", monospace; letter-spacing: 1.6px; font-size: 12px; }
            .muted { color: #6b7280; font-size: 10px; }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const buildInvoiceSheetMarkup = (order) => {
    const safeOrder = order || {};
    const address = safeOrder?.address || {};
    const items = Array.isArray(safeOrder?.products) ? safeOrder.products : [];
    const subtotal = Number(safeOrder?.subtotal || 0);
    const discount = Number(safeOrder?.discountAmount || 0);
    const total = Number(safeOrder?.totalPrice || 0);
    const paymentStamp = getPaymentStampText(safeOrder);
    const logoHtml = storeInfo.storeLogoUrl
      ? `<img src="${storeInfo.storeLogoUrl}" alt="Store Logo" class="store-logo" />`
      : `<div class="logo-dot">N</div>`;

    const invoiceItems = items.slice(0, 8);
    const remainingCount = Math.max(0, items.length - invoiceItems.length);

    return `
      <div class="sheet">
        <div class="top-banner">
          <div class="brand">
            ${logoHtml}
            <div>
              <p class="brand-name">${storeInfo.storeName || "Niyora Gifts"}</p>
              <p class="muted">Invoice</p>
            </div>
          </div>
          <div class="pay-stamp ${paymentStamp === "PAID" ? "paid" : "cod"}">${paymentStamp}</div>
        </div>
        <h1>Tax Invoice</h1>
        <p class="muted"><strong>Order:</strong> ${getOrderDisplayId(safeOrder)} • <strong>Date:</strong> ${new Date(safeOrder.createdAt || Date.now()).toLocaleString()}</p>
        <div class="row">
          <div class="col">
            <h2>Bill To</h2>
            <div class="box">
              <p><strong>${address.fullName || "N/A"}</strong></p>
              <p>${address.phone || "-"}</p>
              <p>${address.line1 || "-"}</p>
              <p>${[address.city, address.state, address.postalCode].filter(Boolean).join(", ") || "-"}</p>
              <p>${address.country || "-"}</p>
            </div>
          </div>
          <div class="col">
            <h2>Seller</h2>
            <div class="box">
              <p><strong>${storeInfo.storeName}</strong></p>
              <p>${storeInfo.storeAddress}</p>
              <p>Phone: ${storeInfo.storePhone}</p>
              <p><strong>Coupon:</strong> ${safeOrder.couponCode || "-"}</p>
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Line</th></tr>
          </thead>
          <tbody>
            ${invoiceItems.map((item) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const lineTotal = (qty * price).toFixed(2);
      return `<tr><td>${item.name || "Item"}</td><td>${qty}</td><td>INR ${price.toFixed(2)}</td><td>INR ${lineTotal}</td></tr>`;
    }).join("")}
            ${remainingCount > 0 ? `<tr><td colspan="4" class="muted">+ ${remainingCount} more item(s) not shown</td></tr>` : ""}
          </tbody>
        </table>
        <div class="totals">
          <p><span>Subtotal</span><span>INR ${subtotal.toFixed(2)}</span></p>
          <p><span>Discount</span><span>- INR ${discount.toFixed(2)}</span></p>
          <p class="grand"><span>Total</span><span>INR ${total.toFixed(2)}</span></p>
        </div>
      </div>
    `;
  };

  const handlePrintInvoicesBatch = (ordersToPrint) => {
    const printableOrders = Array.isArray(ordersToPrint) ? ordersToPrint.filter(Boolean) : [];
    if (!printableOrders.length) {
      setError("Select at least one order to print invoices.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to print invoice.");
      return;
    }

    const invoicesHtml = printableOrders
      .map((order) => `<div class="sheet-wrap">${buildInvoiceSheetMarkup(order)}</div>`)
      .reduce((pages, sheetHtml, idx) => {
        if (idx % 2 === 0) pages.push([sheetHtml]);
        else pages[pages.length - 1].push(sheetHtml);
        return pages;
      }, [])
      .map((pageSheets, pageIdx) => {
        const first = pageSheets[0] || `<div class="sheet-wrap"></div>`;
        const second = pageSheets[1] || `<div class="sheet-wrap placeholder"></div>`;
        return `
          <div class="${pageIdx > 0 ? "page-break" : ""}">
            <div class="two-up">
              ${first}
              ${second}
            </div>
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoices (${printableOrders.length})</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111827; background: #fff; }
            .two-up { display: grid; grid-template-rows: 1fr 1fr; gap: 8mm; }
            .sheet-wrap { height: 136.5mm; overflow: hidden; }
            .sheet-wrap.placeholder { border: 1px dashed #d1d5db; border-radius: 10px; }
            .sheet { width: 100%; max-width: 194mm; margin: 0 auto; border: 1.5px solid #d1d5db; padding: 6mm; box-sizing: border-box; }
            .page-break { page-break-before: always; break-before: page; }
            .top-banner { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
            .brand { display: flex; align-items: center; gap: 8px; }
            .logo-dot { width: 28px; height: 28px; border-radius: 999px; background: #1d4ed8; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
            .store-logo { width: 32px; height: 32px; object-fit: contain; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; padding: 2px; }
            .brand-name { margin: 0; font-size: 12px; font-weight: 700; }
            .pay-stamp { border: 2px solid; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; }
            .pay-stamp.paid { color: #047857; border-color: #047857; background: #ecfdf5; }
            .pay-stamp.cod { color: #9a3412; border-color: #9a3412; background: #fff7ed; }
            .row { display: flex; gap: 8mm; align-items: flex-start; }
            .col { flex: 1; }
            h1 { margin: 0 0 6px; font-size: 18px; letter-spacing: 0.4px; }
            h2 { margin: 0 0 5px; font-size: 12px; text-transform: uppercase; color: #374151; }
            p { margin: 3px 0; font-size: 11px; line-height: 1.32; }
            .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 6px; min-height: 56px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 6px 3px; font-size: 11px; }
            th { color: #4b5563; font-weight: 600; }
            .totals { margin-top: 6px; margin-left: auto; width: 220px; }
            .totals p { display: flex; justify-content: space-between; }
            .grand { font-weight: 700; border-top: 1px solid #111827; padding-top: 4px; }
            .muted { color: #6b7280; font-size: 10px; }
          </style>
        </head>
        <body>
          ${invoicesHtml}
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintShippingLabel = (order) => {
    handlePrintShippingLabelsBatch([order]);
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAllVisibleOrders = () => {
    if (allVisibleOrdersSelected) {
      const selectableSet = new Set(selectableVisibleOrderIds);
      setSelectedOrderIds((prev) => prev.filter((orderId) => !selectableSet.has(orderId)));
      return;
    }
    setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...selectableVisibleOrderIds])));
  };

  const handlePrintInvoice = (order) => {
    const safeOrder = order || {};
    const address = safeOrder?.address || {};
    const items = Array.isArray(safeOrder?.products) ? safeOrder.products : [];
    const subtotal = Number(safeOrder?.subtotal || 0);
    const discount = Number(safeOrder?.discountAmount || 0);
    const total = Number(safeOrder?.totalPrice || 0);
    const paymentStamp = getPaymentStampText(safeOrder);
    const logoHtml = storeInfo.storeLogoUrl
      ? `<img src="${storeInfo.storeLogoUrl}" alt="Store Logo" class="store-logo" />`
      : `<div class="logo-dot">N</div>`;

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to print invoice.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${getOrderDisplayId(safeOrder)}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111827; background: #fff; }
            .sheet { width: 100%; max-width: 194mm; margin: 0 auto; border: 1.5px solid #d1d5db; padding: 9mm; box-sizing: border-box; }
            .top-banner { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
            .brand { display: flex; align-items: center; gap: 8px; }
            .logo-dot { width: 30px; height: 30px; border-radius: 999px; background: #1d4ed8; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
            .store-logo { width: 34px; height: 34px; object-fit: contain; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; padding: 2px; }
            .brand-name { margin: 0; font-size: 14px; font-weight: 700; }
            .pay-stamp { border: 2px solid; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.6px; }
            .pay-stamp.paid { color: #047857; border-color: #047857; background: #ecfdf5; }
            .pay-stamp.cod { color: #9a3412; border-color: #9a3412; background: #fff7ed; }
            h1 { margin: 0; font-size: 24px; }
            h2 { margin: 0 0 6px; font-size: 14px; color: #374151; text-transform: uppercase; }
            p { margin: 4px 0; font-size: 13px; line-height: 1.4; }
            .top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
            .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; flex: 1; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px 4px; font-size: 13px; }
            th { color: #4b5563; font-weight: 600; }
            .totals { margin-top: 10px; margin-left: auto; width: 280px; }
            .totals p { display: flex; justify-content: space-between; }
            .grand { font-size: 16px; font-weight: 700; border-top: 1px solid #111827; padding-top: 6px; }
            .muted { color: #6b7280; font-size: 12px; margin-top: 14px; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="top-banner">
              <div class="brand">
                ${logoHtml}
                <div>
                  <p class="brand-name">${storeInfo.storeName || "Niyora Gifts"}</p>
                  <p class="muted">Accounts Copy</p>
                </div>
              </div>
              <div class="pay-stamp ${paymentStamp === "PAID" ? "paid" : "cod"}">${paymentStamp}</div>
            </div>
            <div class="top">
              <div class="box">
                <h1>Tax Invoice</h1>
                <p><strong>${storeInfo.storeName}</strong></p>
                <p>${storeInfo.storeAddress}</p>
                <p>Phone: ${storeInfo.storePhone}</p>
              </div>
              <div class="box">
                <h2>Invoice Details</h2>
                <p><strong>Order ID:</strong> ${getOrderDisplayId(safeOrder)}</p>
                <p><strong>Date:</strong> ${new Date(safeOrder.createdAt || Date.now()).toLocaleString()}</p>
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
            <p class="muted">This is a computer-generated invoice from Admin Dashboard.</p>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const buildCombinedA4Markup = (order) => {
    const safeOrder = order || {};
    const address = safeOrder.address || {};
    const addressLines = getAddressLines(address);
    const items = Array.isArray(safeOrder?.products) ? safeOrder.products : [];
    const itemList = items.map((item) => `${item.name || "Item"} x${Number(item.quantity || 0)}`).join("<br/>");
    const subtotal = Number(safeOrder?.subtotal || 0);
    const discount = Number(safeOrder?.discountAmount || 0);
    const total = Number(safeOrder?.totalPrice || 0);
    const qrValue = encodeURIComponent(safeOrder._id || "");
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrValue}`;
    const paymentStamp = getPaymentStampText(safeOrder);
    const logoHtml = storeInfo.storeLogoUrl
      ? `<img src="${storeInfo.storeLogoUrl}" alt="Store Logo" class="store-logo" />`
      : `<div class="logo-dot">N</div>`;

    const invoiceItems = items.slice(0, 8);
    const remainingCount = Math.max(0, items.length - invoiceItems.length);

    return `
      <div class="sheet">
        <div class="combined">
          <div class="top-banner">
            <div class="brand">
              ${logoHtml}
              <div>
                <p class="brand-name">${storeInfo.storeName || "Niyora Gifts"}</p>
                <p class="muted">Label + Invoice (single A4)</p>
              </div>
            </div>
            <div class="pay-stamp ${paymentStamp === "PAID" ? "paid" : "cod"}">${paymentStamp}</div>
          </div>

          <div class="panel label-panel">
            <div class="panel-head">
              <h1>Shipping Label</h1>
              <p class="panel-meta"><strong>Order:</strong> ${getOrderDisplayId(safeOrder)} • <strong>Status:</strong> ${safeOrder.status || "Pending"} • <strong>Amount:</strong> INR ${Number(safeOrder.totalPrice || 0).toFixed(2)}</p>
            </div>
            <div class="label-grid">
              <div class="label-col">
                <h2>From</h2>
                <div class="box">
                  <p><strong>${storeInfo.storeName}</strong></p>
                  <p>${storeInfo.storeAddress}</p>
                  <p>Phone: ${storeInfo.storePhone}</p>
                </div>
              </div>
              <div class="label-col">
                <h2>To</h2>
                <div class="box">
                  <p><strong>${address.fullName || "N/A"}</strong></p>
                  <p>${address.phone || "-"}</p>
                  ${addressLines.map((line) => `<p>${line}</p>`).join("")}
                </div>
              </div>
              <div class="label-qr">
                <img src="${qrUrl}" alt="Order QR" />
                <p class="muted">Scan for Order</p>
                <p class="barcode">*${getOrderDisplayId(safeOrder)}*</p>
              </div>
            </div>
            <p class="muted"><strong>Items:</strong> ${itemList || "N/A"}</p>
          </div>

          <div class="cutline">
            <span>Cut / Tear here</span>
          </div>

          <div class="panel invoice-panel">
            <div class="panel-head">
              <h1>Tax Invoice</h1>
              <p class="panel-meta"><strong>Date:</strong> ${new Date(safeOrder.createdAt || Date.now()).toLocaleString()} • <strong>Coupon:</strong> ${safeOrder.couponCode || "-"}</p>
            </div>
            <table>
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Price</th><th>Line</th></tr>
              </thead>
              <tbody>
                ${invoiceItems
        .map((item) => {
          const qty = Number(item.quantity || 0);
          const price = Number(item.price || 0);
          const lineTotal = (qty * price).toFixed(2);
          return `<tr><td>${item.name || "Item"}</td><td>${qty}</td><td>INR ${price.toFixed(2)}</td><td>INR ${lineTotal}</td></tr>`;
        })
        .join("")}
                ${remainingCount > 0
        ? `<tr><td colspan="4" class="muted">+ ${remainingCount} more item(s) not shown</td></tr>`
        : ""
      }
              </tbody>
            </table>
            <div class="totals">
              <p><span>Subtotal</span><span>INR ${subtotal.toFixed(2)}</span></p>
              <p><span>Discount</span><span>- INR ${discount.toFixed(2)}</span></p>
              <p class="grand"><span>Total</span><span>INR ${total.toFixed(2)}</span></p>
            </div>
            <p class="muted">Generated from Admin Dashboard</p>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrintCombinedA4Batch = (ordersToPrint) => {
    const printableOrders = Array.isArray(ordersToPrint) ? ordersToPrint.filter(Boolean) : [];
    if (!printableOrders.length) {
      setError("Select at least one order to print combined Shipping + Invoice.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to print combined A4.");
      return;
    }

    const combinedHtml = printableOrders
      .map(
        (order, index) => `
          <div class="${index > 0 ? "page-break" : ""}">
            ${buildCombinedA4Markup(order)}
          </div>
        `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Shipping + Invoice (${printableOrders.length})</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
            .sheet { width: 100%; max-width: 194mm; margin: 0 auto; box-sizing: border-box; border: 1.5px solid #d1d5db; padding: 8mm; }
            .page-break { page-break-before: always; break-before: page; }
            .combined { display: block; }
            .panel { border: 1px solid #d1d5db; border-radius: 10px; padding: 8px; background: #fff; }
            .label-panel { }
            .invoice-panel { }
            .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 6px; }
            .panel-meta { margin: 0; color: #374151; font-size: 10px; }
            .top-banner { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
            .brand { display: flex; align-items: center; gap: 8px; }
            .logo-dot { width: 28px; height: 28px; border-radius: 999px; background: #0f766e; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
            .store-logo { width: 32px; height: 32px; object-fit: contain; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; padding: 2px; }
            .brand-name { margin: 0; font-size: 12px; font-weight: 700; }
            .pay-stamp { border: 2px solid; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; }
            .pay-stamp.paid { color: #047857; border-color: #047857; background: #ecfdf5; }
            .pay-stamp.cod { color: #9a3412; border-color: #9a3412; background: #fff7ed; }
            .label-grid { display: grid; grid-template-columns: 1fr 1fr 150px; gap: 8px; align-items: start; }
            .label-col { min-width: 0; }
            .label-qr { text-align: center; }
            .cutline { position: relative; text-align: center; color: #6b7280; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
            .cutline:before { content: ""; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dashed #9ca3af; }
            .cutline span { position: relative; background: #fff; padding: 0 10px; }
            h1 { margin: 0 0 6px; font-size: 18px; }
            h2 { margin: 0 0 4px; font-size: 12px; color: #374151; text-transform: uppercase; }
            p { margin: 3px 0; font-size: 11px; line-height: 1.35; }
            .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px; min-height: 70px; }
            .label-qr img { width: 110px; height: 110px; border: 1px solid #d1d5db; padding: 3px; border-radius: 6px; }
            .barcode { margin-top: 6px; font-family: "Courier New", monospace; letter-spacing: 1.6px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 6px 3px; font-size: 11px; }
            th { color: #4b5563; font-weight: 600; }
            .totals { margin-top: 8px; margin-left: auto; width: 240px; }
            .totals p { display: flex; justify-content: space-between; }
            .grand { font-weight: 700; border-top: 1px solid #111827; padding-top: 5px; }
            .muted { color: #6b7280; font-size: 10px; }
          </style>
        </head>
        <body>
          ${combinedHtml}
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintCombinedA4 = (order) => {
    handlePrintCombinedA4Batch([order]);
  };

  const handleReviewCancellation = async (order, action) => {
    if (!order?._id) return;
    try {
      setError("");
      setSuccess("");
      const adminNote =
        action === "reject"
          ? window.prompt("Reject note (optional):", "") || ""
          : window.prompt("Approval note (optional):", "") || "";
      const { data } = await api.put(
        `/admin/orders/${order._id}/cancellation-request`,
        { action, adminNote },
        authHeader
      );
      const updated = data.order;
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      setArchivedOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      setSuccess(data.message || "Cancellation updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to review cancellation request");
    }
  };

  const saveCoupon = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (!couponForm.code.trim()) {
        setError("Coupon code is required");
        return;
      }
      if (!Number.isFinite(Number(couponForm.value)) || Number(couponForm.value) <= 0) {
        setError("Coupon value must be greater than 0");
        return;
      }
      if (!Number.isFinite(Number(couponForm.minCartValue)) || Number(couponForm.minCartValue) < 0) {
        setError("Minimum cart value must be 0 or greater");
        return;
      }
      const maxRStr = String(couponForm.maxRedemptions ?? "").trim();
      const maxUStr = String(couponForm.maxRedemptionsPerUser ?? "").trim();
      if (
        maxRStr !== "" &&
        (!Number.isFinite(Number(maxRStr)) || Number(maxRStr) < 1 || !Number.isInteger(Number(maxRStr)))
      ) {
        setError("Max total uses must be empty or a whole number ≥ 1");
        return;
      }
      if (
        maxUStr !== "" &&
        (!Number.isFinite(Number(maxUStr)) || Number(maxUStr) < 1 || !Number.isInteger(Number(maxUStr)))
      ) {
        setError("Max per customer must be empty or a whole number ≥ 1");
        return;
      }
      const payload = {
        code: couponForm.code.toUpperCase().trim(),
        type: couponForm.type,
        value: Number(couponForm.value),
        minCartValue: Number(couponForm.minCartValue),
        maxDiscount: Number(couponForm.maxDiscount || 0),
        startDate: couponForm.startDate ? new Date(couponForm.startDate).toISOString() : null,
        endDate: couponForm.endDate ? new Date(couponForm.endDate).toISOString() : null,
        active: couponForm.active,
        maxRedemptions: maxRStr === "" ? null : Number(maxRStr),
        maxRedemptionsPerUser: maxUStr === "" ? null : Number(maxUStr),
        activeDays: Array.isArray(couponForm.activeDays) ? couponForm.activeDays : [],
      };
      if (editingCouponId) {
        await api.put(`/admin/coupons/${editingCouponId}`, payload, authHeader);
      } else {
        await api.post("/admin/coupons", payload, authHeader);
      }
      await fetchCoupons();
      setCouponForm(emptyCouponForm);
      setEditingCouponId("");
      setEditingCouponIsSpecial(false);
      setSuccess(editingCouponId ? "Coupon updated successfully." : "Coupon created successfully.");
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      const status = err.response?.status;
      const statusText = err.response?.statusText;
      setError(apiMessage ? `Failed to save coupon: ${apiMessage}` : `Failed to save coupon (Status: ${status || "Network Error"} ${statusText || ""})`);
    }
  };

  const startEditCoupon = (coupon) => {
    setEditingCouponId(coupon._id);
    setEditingCouponIsSpecial(Boolean(coupon.isSpecial));
    setCouponForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minCartValue: String(coupon.minCartValue),
      maxDiscount: String(coupon.maxDiscount || ""),
      startDate: coupon.startDate ? toDatetimeLocalString(coupon.startDate) : "",
      endDate: coupon.endDate ? toDatetimeLocalString(coupon.endDate) : "",
      active: coupon.active,
      maxRedemptions: coupon.maxRedemptions != null ? String(coupon.maxRedemptions) : "",
      maxRedemptionsPerUser: coupon.maxRedemptionsPerUser != null ? String(coupon.maxRedemptionsPerUser) : "",
      activeDays: Array.isArray(coupon.activeDays) ? coupon.activeDays : [],
    });
  };

  const generateSpecialRetentionCoupon = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLastGeneratedSpecialCode("");
    if (!Number.isFinite(Number(specialCouponForm.value)) || Number(specialCouponForm.value) <= 0) {
      setError("Special coupon value must be greater than 0");
      return;
    }
    if (!Number.isFinite(Number(specialCouponForm.minCartValue)) || Number(specialCouponForm.minCartValue) < 0) {
      setError("Minimum cart value must be 0 or greater");
      return;
    }
    const maxRStr = String(specialCouponForm.maxRedemptions ?? "").trim();
    const maxUStr = String(specialCouponForm.maxRedemptionsPerUser ?? "").trim();
    if (
      maxRStr !== "" &&
      (!Number.isFinite(Number(maxRStr)) || Number(maxRStr) < 1 || !Number.isInteger(Number(maxRStr)))
    ) {
      setError("Max total uses must be empty or a whole number ≥ 1");
      return;
    }
    if (
      maxUStr !== "" &&
      (!Number.isFinite(Number(maxUStr)) || Number(maxUStr) < 1 || !Number.isInteger(Number(maxUStr)))
    ) {
      setError("Max per customer must be empty or a whole number ≥ 1");
      return;
    }
    try {
      setGeneratingSpecial(true);
      const payload = {
        type: specialCouponForm.type,
        value: Number(specialCouponForm.value),
        minCartValue: Number(specialCouponForm.minCartValue),
        maxDiscount: Number(specialCouponForm.maxDiscount || 0),
        endDate: specialCouponForm.endDate ? String(specialCouponForm.endDate).trim() : "",
        active: specialCouponForm.active,
        maxRedemptions: maxRStr === "" ? undefined : Number(maxRStr),
        maxRedemptionsPerUser: maxUStr === "" ? undefined : Number(maxUStr),
        customerEmail: String(specialCouponForm.customerEmail || "").trim() || undefined,
        customerName: String(specialCouponForm.customerName || "").trim() || undefined,
        emailMessage: String(specialCouponForm.emailMessage || "").trim() || undefined,
      };
      const { data } = await api.post("/admin/coupons/generate-special", payload, authHeader);
      setLastGeneratedSpecialCode(data.code || "");
      setSpecialCouponForm(emptySpecialCouponForm);
      await fetchCoupons();
      let msg = `Special coupon created: ${data.code}. It is not shown in the public checkout list.`;
      if (data.emailSent) {
        msg += " The customer was emailed this code.";
      }
      if (data.previewUrl) {
        msg += ` (Dev Sandbox Email Preview: ${data.previewUrl})`;
      }
      if (data.emailWarning && !data.emailSent) {
        setError(data.emailWarning);
      }
      setSuccess(msg);
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      const status = err.response?.status;
      const statusText = err.response?.statusText;
      setError(apiMessage ? `Failed to generate special coupon: ${apiMessage}` : `Failed to generate special coupon (Status: ${status || "Network Error"} ${statusText || ""})`);
    } finally {
      setGeneratingSpecial(false);
    }
  };

  const removeCoupon = async (id) => {
    try {
      await api.delete(`/admin/coupons/${id}`, authHeader);
      await fetchCoupons();
      setSuccess("Coupon deleted successfully.");
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      const status = err.response?.status;
      const statusText = err.response?.statusText;
      setError(apiMessage ? `Failed to delete coupon: ${apiMessage}` : `Failed to delete coupon (Status: ${status || "Network Error"} ${statusText || ""})`);
    }
  };

  const openCouponEmailPanel = (coupon) => {
    setError("");
    setSuccess("");
    setCouponEmailTargetId(coupon._id);
    setCouponEmailForm(emptyCouponEmailForm);
  };

  const submitCouponEmail = async (event) => {
    event.preventDefault();
    if (!couponEmailTargetId) return;
    setError("");
    setSuccess("");
    const to = couponEmailForm.to.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setError("Enter a valid customer email address.");
      return;
    }
    try {
      setSendingCouponEmail(true);
      const { data } = await api.post(
        `/admin/coupons/${couponEmailTargetId}/send-email`,
        {
          to,
          customerName: couponEmailForm.customerName.trim(),
          message: couponEmailForm.message.trim(),
        },
        authHeader
      );
      if (data && data.previewUrl) {
        setSuccess(`Coupon code email sent (dev preview): ${data.previewUrl}`);
      } else {
        setSuccess("Coupon code email sent successfully.");
      }
      setCouponEmailTargetId("");
      setCouponEmailForm(emptyCouponEmailForm);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send email");
    } finally {
      setSendingCouponEmail(false);
    }
  };
  const renderOverviewTab = () => {
    const lowStockItems = products.filter(p => Number(p.stock ?? 0) <= 5);
    const myLogs = logs.filter(l => String(l.userId || l._id) === String(adminAuth?.id || adminAuth?._id));
    const totalRev = orders.filter((order) => order.status !== "Cancelled").reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);

    if (fetchingOverview) {
      return <DashboardSkeleton />;
    }

    return (
      <div className="space-y-8 animate-page-enter">
        {/* Welcome Header */}
        <div className="rounded-3xl bg-gradient-to-br from-[#1C1C1C] via-[#2A2A2A] to-[#1C1C1C] p-6 text-white md:p-8 shadow-xl relative overflow-hidden border border-gold-900/30">
          <div className="absolute right-[-10%] top-[-10%] w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-[-10%] w-32 h-32 bg-gold-400/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold-400">Management Console</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-serif text-gold-100 tracking-wide">
              Welcome back, {adminAuth?.name || "Administrator"}
            </h1>
            <p className="mt-1.5 text-xs text-gray-300 font-light">
              You are signed in as <strong className="font-semibold text-gold-400">{adminAuth?.designation || "Console Administrator"}</strong> in the {adminAuth?.department?.name || "General"} department.
            </p>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-xs hover-float hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-400">Total Products</p>
                <p className="mt-2 text-3xl font-sans font-semibold text-luxury-black dark:text-white">{products.length}</p>
              </div>
              <span className="text-xl p-2 rounded-lg bg-gold-500/10 text-gold-600">🛍️</span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px]">
              <span className="font-semibold text-success-lux">↑ 12%</span>
              <span className="text-gray-400">new additions</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-xs hover-float hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-400">Total Orders</p>
                <p className="mt-2 text-3xl font-sans font-semibold text-luxury-black dark:text-white">{orders.length}</p>
              </div>
              <span className="text-xl p-2 rounded-lg bg-gold-500/10 text-gold-600">📦</span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px]">
              <span className="font-semibold text-success-lux">↑ 8%</span>
              <span className="text-gray-400">growth this week</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-xs hover-float hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-400">Total Revenue</p>
                <p className="mt-2 text-2xl font-sans font-semibold text-gold-500">INR {totalRev.toLocaleString()}</p>
              </div>
              <span className="text-xl p-2 rounded-lg bg-gold-500/10 text-gold-600">👑</span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px]">
              <span className="font-semibold text-success-lux">↑ 15%</span>
              <span className="text-gray-400">growth in sales</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-xs hover-float hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-400">Active Coupons</p>
                <p className="mt-2 text-3xl font-sans font-semibold text-luxury-black dark:text-white">
                  {coupons.filter((coupon) => coupon.active).length}
                </p>
              </div>
              <span className="text-xl p-2 rounded-lg bg-gold-500/10 text-gold-600">🎟️</span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px]">
              <span className="font-semibold text-warning-lux">4</span>
              <span className="text-gray-400">expiring soon</span>
            </div>
          </div>

        </div>

        {/* Dual Panel Split */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Panel */}
          {hasPermission("BUSINESS_ANALYTICS_VIEW") ? (
            <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm">
              <h3 className="text-base font-serif font-medium text-luxury-black dark:text-white mb-4">Team Action Performance</h3>
              <div className="space-y-4">
                {teamStats.map((member) => (
                  <div key={member._id} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-luxury-black dark:text-white">{member.userName || "Unknown Employee"}</span>
                      <span className="text-gray-lux dark:text-gray-400 font-bold">{member.totalActions} activities</span>
                    </div>
                    <div className="w-full bg-cream dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gold-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (member.totalActions / (Math.max(...teamStats.map(m => m.totalActions), 1))) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {teamStats.length === 0 && (
                  <p className="text-xs text-gray-400 font-light">No team analytics logged yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm">
              <h3 className="text-base font-serif font-medium text-luxury-black dark:text-white mb-4">Personal Dashboard Summary</h3>
              <div className="space-y-3.5 text-xs text-gray-lux dark:text-gray-300">
                <div className="flex justify-between py-2 border-b border-gold-200/10 dark:border-gold-900/10">
                  <span className="font-medium">Employee sequential ID:</span>
                  <span className="font-semibold text-luxury-black dark:text-white">{adminAuth?.employeeId || "EMP-N/A"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gold-200/10 dark:border-gold-900/10">
                  <span className="font-medium">Designated Role:</span>
                  <span className="font-semibold text-luxury-black dark:text-white">{adminAuth?.designation || "Administrator"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gold-200/10 dark:border-gold-900/10">
                  <span className="font-medium">Department context:</span>
                  <span className="font-semibold text-luxury-black dark:text-white">{adminAuth?.department?.name || "Unassigned"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Right Panel */}
          {hasPermission("ACTIVITY_LOGS_VIEW") ? (
            <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm">
              <h3 className="text-base font-serif font-medium text-luxury-black dark:text-white mb-4">Latest System Activities</h3>
              <div className="space-y-3.5">
                {logs.slice(0, 5).map((log) => (
                  <div key={log._id} className="flex justify-between text-xs items-start gap-2 border-b border-gold-200/10 dark:border-gold-900/10 pb-2.5 last:border-b-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-luxury-black dark:text-white">{log.action}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-0.5">{log.details}</p>
                    </div>
                    <div className="text-right text-[10px] text-gray-400 shrink-0">
                      <p className="font-medium text-gold-600 dark:text-gold-450">{log.userName}</p>
                      <p className="mt-0.5 font-light">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-xs text-gray-400 font-light">No activity records recorded.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm">
              <h3 className="text-base font-serif font-medium text-luxury-black dark:text-white mb-4">Stock Alerts & Warnings</h3>
              <div className="space-y-2.5">
                {lowStockItems.slice(0, 5).map((p) => (
                  <div key={p._id} className="flex justify-between items-center text-xs py-1 border-b border-gold-200/10 dark:border-gold-900/10 last:border-b-0">
                    <span className="font-medium text-luxury-black dark:text-white truncate pr-2">{p.name}</span>
                    <span className={`font-semibold shrink-0 text-xs px-2 py-0.5 rounded-full ${p.stock <= 0 ? "bg-danger-lux/10 text-danger-lux border border-danger-lux/20" : "bg-warning-lux/10 text-warning-lux border border-warning-lux/20"}`}>
                      {p.stock <= 0 ? "OUT OF STOCK" : `${p.stock} units`}
                    </span>
                  </div>
                ))}
                {lowStockItems.length === 0 && (
                  <div className="py-6 text-center text-xs text-success-lux font-semibold">
                    ✨ No stock warnings. All inventories are healthy!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTicketsTab = () => {
    // Calculate counts
    const totalCount = adminTickets.length;
    const openCount = adminTickets.filter(t => t.status === "Open").length;
    const progressCount = adminTickets.filter(t => t.status === "In Progress").length;
    const resolvedCount = adminTickets.filter(t => t.status === "Resolved").length;

    return (
      <div className="space-y-6 animate-page-enter">
        <div className="rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm">
          <h3 className="text-xl font-serif font-light text-luxury-black dark:text-white mb-2">Customer Support Ticket Center</h3>
          <p className="text-xs text-gray-lux dark:text-gray-400 mb-4 font-light">
            Respond to customer queries, resolve order issues, and maintain communication threads.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-xs hover-float hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-400">Total Tickets</p>
                <p className="mt-2 text-3xl font-sans font-semibold text-luxury-black dark:text-white">{totalCount}</p>
              </div>
              <span className="text-xl p-2 rounded-lg bg-gold-500/10 text-gold-600">💬</span>
            </div>
          </div>
          <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-xs hover-float hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-warning-lux">Open Queries</p>
                <p className="mt-2 text-3xl font-sans font-semibold text-warning-lux">{openCount}</p>
              </div>
              <span className="text-xl p-2 rounded-lg bg-warning-lux/10 text-warning-lux">⚠️</span>
            </div>
          </div>
          <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-xs hover-float hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold-500">In Progress</p>
                <p className="mt-2 text-3xl font-sans font-semibold text-gold-500">{progressCount}</p>
              </div>
              <span className="text-xl p-2 rounded-lg bg-gold-500/10 text-gold-600">⏳</span>
            </div>
          </div>
          <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-xs hover-float hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-success-lux">Resolved</p>
                <p className="mt-2 text-3xl font-sans font-semibold text-success-lux">{resolvedCount}</p>
              </div>
              <span className="text-xl p-2 rounded-lg bg-success-lux/10 text-success-lux">✓</span>
            </div>
          </div>
        </div>

        {/* Split Console View or General List */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Tickets List Column */}
          <div className={`${selectedTicket ? "lg:col-span-1" : "lg:col-span-3"} space-y-4`}>
            <div className="rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-5 shadow-sm space-y-4">

              {/* Header search & filters */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                <div className="flex flex-wrap gap-1.5">
                  {["All", "Open", "In Progress", "Resolved"].map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => {
                        setTicketStatusFilter(filter);
                        fetchAdminTickets(filter, ticketSearchQuery);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${ticketStatusFilter === filter
                        ? "bg-[#1C1C1C] dark:bg-gold-500 text-white dark:text-black border border-[#1C1C1C] dark:border-gold-500 shadow-sm"
                        : "bg-cream dark:bg-white/5 border border-gold-200/20 dark:border-gold-900/10 text-gray-lux dark:text-gray-300 hover:border-gold-500"
                        }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search code, subject or user..."
                  value={ticketSearchQuery}
                  onChange={(e) => {
                    setTicketSearchQuery(e.target.value);
                    fetchAdminTickets(ticketStatusFilter, e.target.value);
                  }}
                  className="rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-1.5 text-xs text-luxury-black dark:text-white transition focus:border-gold-500 outline-none"
                />
              </div>

              {/* Tickets Table / List */}
              {loadingTickets && adminTickets.length === 0 ? (
                <ChatSkeleton />
              ) : adminTickets.length > 0 ? (
                <div className="overflow-x-auto">
                  {selectedTicket ? (
                    /* Compact list for split screen */
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {adminTickets.map((t) => (
                        <div
                          key={t._id}
                          onClick={() => fetchAdminTicketDetails(t._id)}
                          className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${selectedTicket._id === t._id
                            ? "border-gold-500 bg-gold-500/5 dark:bg-gold-500/10 shadow-sm shadow-gold-500/5"
                            : "border-gold-200/10 dark:border-gold-900/10 hover:border-gold-500 bg-[#FAF7F2]/50 dark:bg-white/5"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] font-bold text-luxury-black dark:text-white">{t.ticketCode}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${t.status === "Open" ? "bg-warning-lux/10 border-warning-lux/20 text-warning-lux" :
                              t.status === "In Progress" ? "bg-gold-500/10 border-gold-500/20 text-gold-600" :
                                "bg-success-lux/10 border-success-lux/20 text-success-lux"
                              }`}>
                              {t.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold mt-1 truncate text-luxury-black dark:text-white">{t.subject}</h4>
                          <p className="text-[10px] text-gray-lux truncate font-light">By {t.user?.name || "Customer"}</p>
                          <p className="text-[9px] text-gray-400 text-right mt-1">Updated {new Date(t.updatedAt).toLocaleDateString("en-IN")}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Large detailed table */
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gold-200/10 dark:border-gold-900/10 text-xs text-gray-lux dark:text-gray-400 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4 font-sans">Code</th>
                          <th className="py-3 px-4 font-sans">Customer</th>
                          <th className="py-3 px-4 font-sans">Subject</th>
                          <th className="py-3 px-4 font-sans">Associated Order</th>
                          <th className="py-3 px-4 font-sans">Status</th>
                          <th className="py-3 px-4 font-sans">Created Date</th>
                          <th className="py-3 px-4 text-right font-sans">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold-200/10 dark:divide-gold-900/10 text-xs">
                        {adminTickets.map((t) => (
                          <tr key={t._id} className="hover:bg-gold-500/5 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-luxury-black dark:text-white">{t.ticketCode}</td>
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-luxury-black dark:text-white">{t.user?.name || "Unknown User"}</p>
                              <p className="text-[10px] text-gray-lux font-light">{t.user?.email || ""}</p>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-luxury-black dark:text-white max-w-xs truncate">{t.subject}</td>
                            <td className="py-3.5 px-4 font-mono text-[10px]">
                              {t.order ? `ORD-${t.order.orderCode || t.order._id?.slice(-8)}` : <span className="text-gray-400">&mdash;</span>}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${t.status === "Open" ? "bg-warning-lux/10 border-warning-lux/20 text-warning-lux" :
                                t.status === "In Progress" ? "bg-gold-500/10 border-gold-500/20 text-gold-600" :
                                  "bg-success-lux/10 border-success-lux/20 text-success-lux"
                                }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-gray-lux font-light">{new Date(t.createdAt).toLocaleDateString("en-IN")}</td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => fetchAdminTicketDetails(t._id)}
                                className="px-3.5 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/5 hover:bg-gold-500 text-gold-700 hover:text-white transition-all duration-300 cursor-pointer text-[10px] font-bold uppercase tracking-wider"
                              >
                                View Chat &rarr;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-lux text-xs font-light">
                  No support tickets found matching the selected filter.
                </div>
              )}
            </div>
          </div>

          {/* Ticket Detail & Messaging Console */}
          {selectedTicket && (
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm flex flex-col min-h-[550px]">

                {/* Header info */}
                <div className="border-b border-gold-200/10 dark:border-gold-900/10 pb-4 mb-4 flex flex-wrap justify-between items-start gap-4 text-luxury-black dark:text-white">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold bg-gold-500/10 px-2 py-0.5 rounded text-gold-600 border border-gold-500/20">
                        {selectedTicket.ticketCode}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${selectedTicket.status === "Open" ? "bg-warning-lux/10 border-warning-lux/20 text-warning-lux" :
                        selectedTicket.status === "In Progress" ? "bg-gold-500/10 border-gold-500/20 text-gold-600" :
                          "bg-success-lux/10 border-success-lux/20 text-success-lux"
                        }`}>
                        {selectedTicket.status}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold">{selectedTicket.subject}</h3>

                    {/* User profile info */}
                    <div className="mt-2 text-[10px] text-gray-lux dark:text-gray-400 font-light space-y-1">
                      <p>
                        <span className="font-bold text-luxury-black dark:text-gray-300">Customer:</span> {selectedTicket.user?.name} ({selectedTicket.user?.email})
                      </p>
                      {selectedTicket.order && (
                        <p>
                          <span className="font-bold text-luxury-black dark:text-gray-300">Associated Order:</span> Order #{selectedTicket.order.orderCode} (INR {selectedTicket.order.totalPrice}) - {selectedTicket.order.status}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* Actions dropdown */}
                    {selectedTicket.status !== "Resolved" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateTicketStatus("Resolved")}
                        disabled={updatingTicketStatus}
                        className="px-4 py-2 rounded-full bg-[#1C1C1C] dark:bg-gold-500 hover:bg-[#2A2A2A] dark:hover:bg-gold-hover text-white dark:text-black font-bold text-[10px] uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-sm"
                      >
                        Resolve Ticket
                      </button>
                    )}
                    {selectedTicket.status === "Resolved" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateTicketStatus("Open")}
                        disabled={updatingTicketStatus}
                        className="px-4 py-2 rounded-full bg-gold-500 hover:bg-gold-hover text-white font-bold text-[10px] uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-sm"
                      >
                        Reopen Ticket
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(null)}
                      className="px-4 py-2 rounded-full border border-gold-200/50 hover:bg-gold-500/10 text-gray-lux dark:text-gray-300 font-bold text-[10px] uppercase tracking-wider transition-all duration-300 cursor-pointer"
                    >
                      Close Pane
                    </button>
                  </div>
                </div>

                {/* Messages Chat Box */}
                <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px] pr-2 mb-4 scroll-smooth">
                  {selectedTicket.messages?.map((msg, index) => {
                    const isSystem = msg.senderName === "System Note";
                    if (isSystem) {
                      return (
                        <div key={index} className="rounded-full bg-gold-500/5 border border-gold-500/15 py-1.5 px-4 text-[10px] text-center max-w-md mx-auto text-gold-700 dark:text-gold-450 font-light">
                          {msg.message}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={index}
                        className={`flex flex-col ${msg.isAdmin ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-2 mb-1 text-[9px] text-gray-lux dark:text-gray-400 font-light">
                          <span className="font-bold text-luxury-black dark:text-gray-300">
                            {msg.senderName} {msg.isAdmin ? "(Admin/Staff)" : "(Customer)"}
                          </span>
                          <span>&bull;</span>
                          <span>
                            {new Date(msg.createdAt).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl p-3 text-xs leading-relaxed max-w-lg ${msg.isAdmin
                            ? "bg-[#1C1C1C] dark:bg-gold-500 text-white dark:text-black rounded-tr-none shadow-sm border border-gold-900/10"
                            : "bg-cream/40 dark:bg-white/5 text-luxury-black dark:text-gray-250 border border-gold-200/15 dark:border-gold-900/10 rounded-tl-none"
                            }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Admin Reply Input */}
                {selectedTicket.status !== "Resolved" ? (
                  <form onSubmit={handleSendAdminReply} className="border-t border-gold-200/10 dark:border-gold-900/10 pt-4 mt-auto">
                    <div className="flex items-end gap-3">
                      <textarea
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        placeholder="Type response to customer..."
                        rows={2}
                        className="flex-1 rounded-2xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-4 py-2.5 text-xs text-luxury-black dark:text-white transition focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 outline-none resize-none"
                        required
                      />
                      <button
                        type="submit"
                        disabled={sendingAdminReply || !adminReplyText.trim()}
                        className="rounded-xl bg-[#1C1C1C] dark:bg-gold-500 hover:bg-[#2A2A2A] dark:hover:bg-gold-hover text-white dark:text-black px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0 cursor-pointer"
                      >
                        {sendingAdminReply ? "Sending..." : "Send Reply"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="border-t border-gold-200/10 dark:border-gold-900/10 pt-4 mt-auto text-center text-xs text-gray-lux dark:text-gray-400 font-light">
                    This ticket is resolved. Reopen the ticket first to reply.
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLoginLogsTable = () => {
    return (
      <>
        <h3 className="text-xl font-serif font-light text-luxury-black dark:text-white mb-2">Login History Logs</h3>
        <p className="text-xs text-gray-lux dark:text-gray-400 mb-6 font-light">Trace admin and employee login attempts, session durations, and IP origins.</p>

        {/* Table */}
        {fetchingLogs ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gold-200/10 dark:border-gold-900/10 text-gray-lux dark:text-gray-400">
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Login Time</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Employee / Email</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">IP Address</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Device & Browser</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Status</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Logout Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-200/10 dark:divide-gold-900/10 text-luxury-black dark:text-white">
                {loginLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-gold-500/5 transition-colors">
                    <td className="py-3 text-gray-lux dark:text-gray-400 font-light">{new Date(log.loginTime || log.createdAt).toLocaleString()}</td>
                    <td className="py-3 font-medium">
                      <div className="text-luxury-black dark:text-white">{log.userName}</div>
                      <div className="text-[10px] text-gray-lux dark:text-gray-400 font-light">{log.email}</div>
                    </td>
                    <td className="py-3 text-luxury-black dark:text-gray-300 font-light">{log.ipAddress || "Unknown"}</td>
                    <td className="py-3 text-gray-lux dark:text-gray-400 font-light">
                      <div>{log.device || "Unknown Device"}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{log.browser || "Unknown Browser"}</div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${log.status === "Success"
                        ? "bg-success-lux/10 border-success-lux/20 text-success-lux"
                        : log.status === "Failed"
                          ? "bg-danger-lux/10 border-danger-lux/20 text-danger-lux"
                          : "bg-warning-lux/10 border-warning-lux/20 text-warning-lux"
                        }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-lux dark:text-gray-400 font-light">
                      {log.logoutTime ? new Date(log.logoutTime).toLocaleString() : (log.status === "Success" ? "Active Session" : "-")}
                    </td>
                  </tr>
                ))}
                {loginLogs.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-gray-lux font-light" colSpan={6}>No login history logs found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {loginLogsTotalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gold-200/10 dark:border-gold-900/10 pt-4 mt-4 text-xs text-gray-lux">
            <span className="font-light">Page {loginLogsPage} of {loginLogsTotalPages} ({loginLogsTotalCount} total logs)</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loginLogsPage <= 1}
                onClick={() => setLoginLogsPage(p => Math.max(1, p - 1))}
                className="rounded-full border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-700 dark:text-gray-300 hover:border-gold-500 cursor-pointer transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={loginLogsPage >= loginLogsTotalPages}
                onClick={() => setLoginLogsPage(p => Math.min(loginLogsTotalPages, p + 1))}
                className="rounded-full border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-700 dark:text-gray-300 hover:border-gold-500 cursor-pointer transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderLogsTab = () => {
    return (
      <div className="rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm animate-page-enter">
        {adminAuth?.isMasterAdmin && (
          <div className="flex border-b border-gold-200/20 dark:border-gold-900/20 mb-6">
            <button
              type="button"
              onClick={() => setLogsSubTab("audit")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${logsSubTab === "audit"
                ? "border-gold-500 text-gold-500 font-bold"
                : "border-transparent text-gray-lux dark:text-gray-400 hover:text-gold-500"
                }`}
            >
              System Audit Logs
            </button>
            <button
              type="button"
              onClick={() => setLogsSubTab("login")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${logsSubTab === "login"
                ? "border-gold-500 text-gold-500 font-bold"
                : "border-transparent text-gray-lux dark:text-gray-400 hover:text-gold-500"
                }`}
            >
              Login History Logs
            </button>
          </div>
        )}

        {logsSubTab === "audit" || !adminAuth?.isMasterAdmin ? (
          <>
            <h3 className="text-xl font-serif font-light text-luxury-black dark:text-white mb-2">System Audit Logs</h3>
            <p className="text-xs text-gray-lux dark:text-gray-400 mb-6 font-light">Trace employee actions, configuration revisions, and security actions.</p>

            {/* Filters */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 mb-6 text-luxury-black dark:text-white">
              <input
                type="text"
                placeholder="Search details..."
                value={logsSearch}
                onChange={(e) => { setLogsSearch(e.target.value); setLogsPage(1); }}
                className="rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
              />
              <select
                value={logsUserFilter}
                onChange={(e) => { setLogsUserFilter(e.target.value); setLogsPage(1); }}
                className="rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 font-sans"
              >
                <option value="">All Employees</option>
                {employees.map(e => (
                  <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>
                ))}
              </select>
              <input
                type="date"
                placeholder="Start Date"
                value={logsStartDate}
                onChange={(e) => { setLogsStartDate(e.target.value); setLogsPage(1); }}
                className="rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
              />
              <input
                type="date"
                placeholder="End Date"
                value={logsEndDate}
                onChange={(e) => { setLogsEndDate(e.target.value); setLogsPage(1); }}
                className="rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
              />
              <button
                type="button"
                onClick={() => {
                  setLogsSearch("");
                  setLogsUserFilter("");
                  setLogsActionFilter("");
                  setLogsStartDate("");
                  setLogsEndDate("");
                  setLogsPage(1);
                }}
                className="rounded-xl border border-gold-500/30 bg-gold-500/5 hover:bg-gold-500 hover:text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-gold-700 transition-all duration-300 cursor-pointer shadow-2xs"
              >
                Clear Filters
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gold-200/10 dark:border-gold-900/10 text-gray-lux dark:text-gray-400">
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Timestamp</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Employee</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Action</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Details</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">IP & Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-200/10 dark:divide-gold-900/10 text-luxury-black dark:text-white">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gold-500/5 transition-colors">
                      <td className="py-3 text-gray-lux dark:text-gray-400 font-light">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3 font-medium text-luxury-black dark:text-white">{log.userName}</td>
                      <td className="py-3">
                        <span className="inline-flex rounded-full bg-gold-500/10 border border-gold-500/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-600">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-gray-lux dark:text-gray-300 font-light max-w-[320px] truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="py-3 text-gray-400 dark:text-gray-500 font-light text-[10px]">
                        <div>{log.ipAddress || "N/A"}</div>
                        <div className="truncate max-w-[200px] mt-0.5" title={log.userAgent}>{log.device || log.userAgent || "N/A"}</div>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 ? (
                    <tr>
                      <td className="py-8 text-center text-gray-lux font-light" colSpan={5}>No activity logs found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gold-200/10 dark:border-gold-900/10 pt-4 mt-4 text-xs text-gray-lux">
                <span className="font-light">Page {logsPage} of {logsTotalPages} ({logsTotalCount} total logs)</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={logsPage <= 1}
                    onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                    className="rounded-full border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-700 dark:text-gray-300 hover:border-gold-500 cursor-pointer transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={logsPage >= logsTotalPages}
                    onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
                    className="rounded-full border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-700 dark:text-gray-300 hover:border-gold-500 cursor-pointer transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          renderLoginLogsTable()
        )}
      </div>
    );
  };

  const renderNewsletterTab = () => {
    return (
      <div className="animate-page-enter">
        <NewsletterSubscribersSection authHeader={authHeader} />
      </div>
    );
  };

  const renderEmployeesTab = () => {
    const groupedPermissions = {};
    permissionsConfig.forEach((p) => {
      const g = p.group || "Other";
      if (!groupedPermissions[g]) groupedPermissions[g] = [];
      groupedPermissions[g].push(p);
    });

    if (fetchingEmployees) {
      return (
        <div className="space-y-6 animate-page-enter">
          {/* Sub Navigation mock to preserve layout */}
          <div className="flex border-b border-gold-200/20 dark:border-gold-900/20">
            <button type="button" className="px-4 py-2.5 text-xs font-semibold border-b-2 border-gold-500 text-gold-500 font-bold">Employees List</button>
            <button type="button" className="px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-gray-lux dark:text-gray-400">Custom Roles Matrix</button>
            <button type="button" className="px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-gray-lux dark:text-gray-400">Departments</button>
          </div>
          <TableSkeleton rows={5} cols={5} />
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-page-enter">
        {/* Sub Navigation */}
        <div className="flex border-b border-gold-200/20 dark:border-gold-900/20">
          <button
            type="button"
            onClick={() => setEmployeesSubTab("employees")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${employeesSubTab === "employees"
              ? "border-gold-500 text-gold-500 font-bold"
              : "border-transparent text-gray-lux dark:text-gray-400 hover:text-gold-500"
              }`}
          >
            Employees List
          </button>
          <button
            type="button"
            onClick={() => setEmployeesSubTab("roles")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${employeesSubTab === "roles"
              ? "border-gold-500 text-gold-500 font-bold"
              : "border-transparent text-gray-lux dark:text-gray-400 hover:text-gold-500"
              }`}
          >
            Custom Roles Matrix
          </button>
          <button
            type="button"
            onClick={() => setEmployeesSubTab("departments")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${employeesSubTab === "departments"
              ? "border-gold-500 text-gold-500 font-bold"
              : "border-transparent text-gray-lux dark:text-gray-400 hover:text-gold-500"
              }`}
          >
            Departments
          </button>
        </div>

        {employeesSubTab === "employees" && (
          <div className="rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="text-lg font-serif font-light text-luxury-black dark:text-white">Admin Employee Accounts</h3>
                <p className="text-xs text-gray-lux dark:text-gray-400 font-light">Create, edit, suspend or delete console manager accounts.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingEmployeeId("");
                  setEmployeeForm(emptyEmployeeForm);
                  setShowEmployeeModal(true);
                }}
                className="rounded-full bg-[#1C1C1C] dark:bg-gold-500 hover:bg-[#2A2A2A] dark:hover:bg-gold-hover px-4 py-2 text-xs font-bold text-white dark:text-black shadow-sm transition-all duration-300 cursor-pointer"
              >
                Add Employee Account
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gold-200/10 dark:border-gold-900/10 text-gray-lux dark:text-gray-400">
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Employee</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Designation / Dept</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Roles</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Security Status</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-200/10 dark:divide-gold-900/10 text-luxury-black dark:text-white">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-gold-500/5 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gold-500/10 text-gold-600 border border-gold-500/20 flex items-center justify-center font-bold text-xs select-none">
                            {emp.name?.[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-luxury-black dark:text-white">{emp.name} {emp.isMasterAdmin && <span className="text-[9px] bg-gold-500/10 text-gold-600 px-1.5 py-0.5 rounded font-bold ml-1 uppercase border border-gold-500/20">Master</span>}</p>
                            <p className="text-[10px] text-gray-lux dark:text-gray-400 font-light mt-0.5">{emp.email} · ID: {emp.employeeId || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <p className="font-medium text-luxury-black dark:text-white">{emp.designation || "Executive"}</p>
                        <p className="text-[10px] text-gray-lux dark:text-gray-400 font-light mt-0.5">{emp.department?.name || "General/Unassigned"}</p>
                      </td>
                      <td className="py-3 max-w-[200px] truncate" title={emp.roles?.map(r => r.name).join(", ")}>
                        {emp.roles?.map(r => (
                          <span key={r._id} className="inline-block bg-[#FAF7F2] dark:bg-white/5 border border-gold-200/20 dark:border-gold-900/10 text-gray-lux dark:text-gray-300 px-2 py-0.5 rounded text-[9px] font-medium mr-1 mb-1">
                            {r.name}
                          </span>
                        ))}
                        {(!emp.roles || emp.roles.length === 0) && <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${emp.status === "Active" ? "bg-success-lux/10 border-success-lux/20 text-success-lux" : "bg-danger-lux/10 border-danger-lux/20 text-danger-lux"}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-3">
                        <button
                          type="button"
                          onClick={() => startEditEmployee(emp)}
                          className="text-xs font-semibold text-gold-600 hover:text-gold-700 hover:underline transition cursor-pointer"
                        >
                          Edit
                        </button>
                        {!emp.isMasterAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleEmployeeStatus(emp)}
                              className={`text-xs font-semibold transition cursor-pointer ${emp.status === "Active" ? "text-warning-lux hover:underline" : "text-gold-600 hover:underline"}`}
                            >
                              {emp.status === "Active" ? "Suspend" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp._id)}
                              className="text-xs font-semibold text-danger-lux hover:underline transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {employeesSubTab === "roles" && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Roles List */}
            <div className="lg:col-span-1 rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm space-y-4 h-fit">
              <div>
                <h3 className="text-base font-serif font-semibold text-luxury-black dark:text-white">Security Roles</h3>
                <p className="text-[11px] text-gray-lux dark:text-gray-400 font-light">Customizable matrices map permissions to employee tasks.</p>
              </div>
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {roles.map((r) => (
                  <div
                    key={r._id}
                    onClick={() => startEditRole(r)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${editingRoleId === r._id
                      ? "border-gold-500 bg-gold-500/5 dark:bg-gold-500/10 shadow-sm"
                      : "border-gold-200/10 dark:border-gold-900/10 hover:border-gold-500 bg-[#FAF7F2]/50 dark:bg-white/5"
                      }`}
                  >
                    <div className="flex justify-between items-start text-xs">
                      <span className="font-bold text-luxury-black dark:text-white">{r.name}</span>
                      {!r.isCustom && <span className="text-[8px] bg-gold-500/10 border border-gold-500/20 text-gold-600 px-1 py-0.5 rounded uppercase font-semibold">System</span>}
                    </div>
                    <p className="text-[10px] text-gray-lux dark:text-gray-400 mt-1 font-light line-clamp-2">{r.description || "No description provided."}</p>
                    <div className="flex justify-between items-center mt-2.5">
                      <span className="text-[9px] font-semibold text-gold-600 uppercase">{r.permissions?.length || 0} permissions</span>
                      {r.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(r._id);
                          }}
                          className="text-[9px] font-bold text-danger-lux hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Role Builder Form */}
            <div className="lg:col-span-2 rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm">
              <h3 className="text-base font-serif font-semibold text-luxury-black dark:text-white mb-1">
                {editingRoleId ? `Edit Custom Permissions Matrix: ${roleForm.name}` : "Create Custom Security Role"}
              </h3>
              <p className="text-xs text-gray-lux dark:text-gray-400 mb-4 font-light">Toggle granular access capabilities across features.</p>

              <form onSubmit={handleSaveRole} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    disabled={editingRoleId && !roles.find(x => x._id === editingRoleId)?.isCustom}
                    value={roleForm.name}
                    onChange={(e) => setRoleForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Role Name (e.g. Stock Lead)"
                    className="rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
                  />
                  <input
                    type="text"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Brief Role Description"
                    className="rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
                  />
                </div>

                <div className="border-t border-gold-200/10 dark:border-gold-900/10 pt-4 space-y-4 max-h-[350px] overflow-y-auto text-luxury-black dark:text-white pr-2">
                  {Object.keys(groupedPermissions).map((groupName) => (
                    <div key={groupName} className="space-y-2">
                      <h4 className="text-xs font-semibold text-gold-600 tracking-wider uppercase">{groupName}</h4>
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 text-[11px]">
                        {groupedPermissions[groupName].map((perm) => (
                          <label key={perm.code} className="flex items-start gap-2.5 p-2 rounded-lg border border-gold-200/10 dark:border-gold-900/10 hover:bg-gold-505/5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(perm.code)}
                              onChange={() => handleTogglePermissionInForm(perm.code)}
                              className="rounded text-gold-505 focus:ring-gold-500 cursor-pointer h-4 w-4 shrink-0 mt-0.5"
                            />
                            <div>
                              <p className="font-semibold text-luxury-black dark:text-white">{perm.name}</p>
                              <p className="text-[9px] text-gray-lux dark:text-gray-500 mt-0.5">{perm.code}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-gold-200/10 dark:border-gold-900/10">
                  {editingRoleId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoleId("");
                        setRoleForm(emptyRoleForm);
                      }}
                      className="rounded-full border border-gold-200/50 dark:border-gold-900/30 px-4 py-2 text-xs font-semibold text-gray-lux dark:text-white"
                    >
                      Clear Selection
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-full bg-[#1C1C1C] dark:bg-gold-500 hover:bg-[#2A2A2A] dark:hover:bg-gold-hover text-white dark:text-black px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
                  >
                    {editingRoleId ? "Update Role Matrix" : "Save Role"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {employeesSubTab === "departments" && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Dept List */}
            <div className="md:col-span-2 rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-serif font-semibold text-luxury-black dark:text-white">Store Departments</h3>
                <p className="text-xs text-gray-lux dark:text-gray-400 font-light">Structure the administrative division within your organization.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gold-200/10 dark:border-gold-900/10 text-gray-lux dark:text-gray-400">
                      <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Department Name</th>
                      <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Description</th>
                      <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold-200/10 dark:divide-gold-900/10 text-luxury-black dark:text-white">
                    {departments.map((dept) => (
                      <tr key={dept._id} className="hover:bg-gold-500/5 transition-colors">
                        <td className="py-3 font-semibold">{dept.name}</td>
                        <td className="py-3 text-gray-lux dark:text-gray-400 font-light max-w-[280px] truncate" title={dept.description}>{dept.description}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteDept(dept._id)}
                            className="text-xs font-semibold text-danger-lux hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create Dept */}
            <div className="rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm h-fit">
              <h3 className="text-base font-serif font-semibold text-luxury-black dark:text-white mb-3">Add Department</h3>
              <form onSubmit={handleSaveDept} className="space-y-3.5">
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Department Name (e.g. Sales)"
                  className="w-full rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
                />
                <textarea
                  value={deptForm.description}
                  onChange={(e) => setDeptForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Department Description"
                  rows={3}
                  className="w-full rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
                />
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#1C1C1C] dark:bg-gold-500 hover:bg-[#2A2A2A] dark:hover:bg-gold-hover text-white dark:text-black py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
                >
                  Create Department
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Employee Add/Edit Modal */}
        {showEmployeeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
              onClick={() => {
                setShowEmployeeModal(false);
                setEditingEmployeeId("");
                setEmployeeForm(emptyEmployeeForm);
              }}
            />

            {/* Modal Content Box */}
            <div className="relative w-full max-w-lg rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-2xl z-10 overflow-y-auto max-h-[90vh] text-left animate-page-enter">
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-gold-200/10 dark:border-gold-900/10">
                <h3 className="text-lg font-serif font-semibold text-luxury-black dark:text-white">
                  {editingEmployeeId ? "Edit Employee Account" : "Add New Employee"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmployeeModal(false);
                    setEditingEmployeeId("");
                    setEmployeeForm(emptyEmployeeForm);
                  }}
                  className="text-gray-400 hover:text-gold-500 text-xl font-bold cursor-pointer transition-colors"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveEmployee} className="space-y-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-450">Full Name</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Jane Doe"
                    className="w-full rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-450">Email Address</label>
                  <input
                    type="email"
                    required
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="jane.doe@example.com"
                    className="w-full rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
                  />
                </div>

                {/* Mobile Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-450">Mobile Number</label>
                  <input
                    type="text"
                    value={employeeForm.mobileNumber}
                    onChange={(e) => setEmployeeForm(p => ({ ...p, mobileNumber: e.target.value }))}
                    placeholder="+91-98765-43210"
                    className="w-full rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
                  />
                </div>

                {/* Designation */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-450">Designation</label>
                  <input
                    type="text"
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm(p => ({ ...p, designation: e.target.value }))}
                    placeholder="Store Manager"
                    className="w-full rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
                  />
                </div>

                {/* Department Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-450">Department</label>
                  <select
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm(p => ({ ...p, department: e.target.value }))}
                    className="w-full rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 font-sans"
                  >
                    <option value="">Select Department (Optional)</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-450">Password</label>
                    {editingEmployeeId && <span className="text-[9px] text-gray-500 dark:text-gray-500">(leave blank to keep current)</span>}
                  </div>
                  <input
                    type="password"
                    required={!editingEmployeeId}
                    value={employeeForm.password}
                    onChange={(e) => setEmployeeForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={editingEmployeeId ? "••••••••" : "Password (min 6 chars)"}
                    className="w-full rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
                  />
                </div>

                {/* Roles Checklist */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-450">Assign Roles</label>
                  <div className="grid gap-2 grid-cols-2 text-[11px] max-h-36 overflow-y-auto border border-gold-200/10 dark:border-gold-900/10 rounded-xl p-2.5 bg-gold-500/5 dark:bg-[#1C1C1C]">
                    {roles.map((role) => (
                      <label key={role._id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={employeeForm.roles.includes(role._id)}
                          onChange={() => {
                            setEmployeeForm(prev => {
                              const rList = [...prev.roles];
                              if (rList.includes(role._id)) {
                                return { ...prev, roles: rList.filter(r => r !== role._id) };
                              } else {
                                return { ...prev, roles: [...rList, role._id] };
                              }
                            });
                          }}
                          className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="text-luxury-black dark:text-white font-medium truncate" title={role.name}>
                          {role.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-lux dark:text-gray-450">Account Status</label>
                  <select
                    value={employeeForm.status}
                    onChange={(e) => setEmployeeForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full rounded-xl border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3.5 py-2 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 font-sans"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end pt-3 border-t border-gold-200/10 dark:border-gold-900/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmployeeModal(false);
                      setEditingEmployeeId("");
                      setEmployeeForm(emptyEmployeeForm);
                    }}
                    className="rounded-full border border-gold-200/50 dark:border-gold-900/30 bg-white dark:bg-[#1C1C1C] text-gray-lux dark:text-white px-4 py-2 text-xs font-semibold hover:bg-gold-500/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-[#1C1C1C] dark:bg-gold-500 hover:bg-[#2A2A2A] dark:hover:bg-gold-hover text-white dark:text-black px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-sm"
                  >
                    {editingEmployeeId ? "Update Employee" : "Create Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProductsTab = () => {
    return (
      <div className="space-y-6 animate-page-enter">
        <div className="flex border-b border-gold-200/20 dark:border-gold-900/20">
          <button
            type="button"
            onClick={() => setProductsSubTab("inventory")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${productsSubTab === "inventory"
              ? "border-gold-500 text-gold-500 font-bold"
              : "border-transparent text-gray-lux dark:text-gray-400 hover:text-gold-500"
              }`}
          >
            Inventory List
          </button>
          <button
            type="button"
            onClick={() => setProductsSubTab("add-edit-product")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${productsSubTab === "add-edit-product"
              ? "border-gold-500 text-gold-500 font-bold"
              : "border-transparent text-gray-lux dark:text-gray-400 hover:text-gold-500"
              }`}
          >
            {editingId ? "Edit Product Details" : "Add New Product"}
          </button>
        </div>

        {productsSubTab === "inventory" && (
          <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm space-y-6">
            {/* Header / Export */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold-200/10 dark:border-gold-900/10 pb-4">
              <div>
                <h3 className="text-xl font-serif text-luxury-black dark:text-white">Stock Management</h3>
                <p className="mt-1 text-xs text-gray-lux dark:text-gray-400 font-light">Monitor and adjust product inventory levels.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-full bg-cream dark:bg-white/5 border border-gold-200/10 dark:border-gold-900/10 px-3.5 py-1.5 font-medium text-luxury-black dark:text-white shadow-2xs">
                  Total Units: <strong className="font-semibold text-gold-600">{stockSummary.units}</strong>
                </span>
                <span className="rounded-full bg-warning-lux/10 border border-warning-lux/20 px-3.5 py-1.5 font-medium text-warning-lux">
                  Low: <strong className="font-semibold">{stockSummary.low}</strong>
                </span>
                <span className="rounded-full bg-danger-lux/10 border border-danger-lux/20 px-3.5 py-1.5 font-medium text-danger-lux">
                  Out of Stock: <strong className="font-semibold">{stockSummary.out}</strong>
                </span>
                <div className="flex items-center gap-2 ml-2 border-l border-gold-200/20 dark:border-gold-900/20 pl-3">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="rounded-full border border-gold-500/30 bg-gold-500/5 hover:bg-gold-500 text-gold-700 hover:text-white px-3.5 py-1.5 font-bold uppercase tracking-wider text-[10px] cursor-pointer shadow-2xs transition-all duration-300"
                  >
                    Export Excel
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="rounded-full border border-danger-lux/30 bg-danger-lux/5 hover:bg-danger-lux text-danger-lux hover:text-white px-3.5 py-1.5 font-bold uppercase tracking-wider text-[10px] cursor-pointer shadow-2xs transition-all duration-300"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Categories filters */}
            <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 whitespace-nowrap scroll-smooth w-full text-xs">
              <button
                type="button"
                onClick={() => changeProductCategory("All")}
                className={`shrink-0 rounded-full px-4 py-1.5 font-bold uppercase tracking-wider transition-all duration-300 ${selectedCategory === "All"
                  ? "bg-[#1C1C1C] dark:bg-gold-500 text-white dark:text-black border border-[#1C1C1C] dark:border-gold-500 shadow-sm"
                  : "bg-cream dark:bg-white/5 border border-gold-200/20 dark:border-gold-900/10 text-gray-lux dark:text-gray-300 hover:border-gold-500 cursor-pointer"
                  }`}
              >
                All ({products.length})
              </button>
              {productCategories.map((category) => {
                const count = products.filter((product) => {
                  const productCat = String(product.category || "").toLowerCase();
                  const selectedCat = category.toLowerCase();
                  const categoriesList = productCat.split(",").map(c => c.trim());
                  return categoriesList.includes(selectedCat);
                }).length;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => changeProductCategory(category)}
                    className={`shrink-0 rounded-full px-4 py-1.5 font-bold uppercase tracking-wider transition-all duration-300 ${selectedCategory === category
                      ? "bg-[#1C1C1C] dark:bg-gold-500 text-white dark:text-black border border-[#1C1C1C] dark:border-gold-500 shadow-sm"
                      : "bg-cream dark:bg-white/5 border border-gold-200/20 dark:border-gold-900/10 text-gray-lux dark:text-gray-300 hover:border-gold-500 cursor-pointer"
                      }`}
                  >
                    {category} ({count})
                  </button>
                );
              })}
            </div>

            {fetchingProducts ? (
              <>
                <div className="hidden md:block">
                  <TableSkeleton rows={6} cols={7} />
                </div>
                <div className="block md:hidden space-y-4">
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              </>
            ) : (
              <>
                {/* Table layout (desktop) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gold-200/10 dark:border-gold-900/10 text-gray-400">
                        <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Product Name</th>
                        <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Category</th>
                        <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Price</th>
                        <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Stock</th>
                        <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Status</th>
                        <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans text-center">Adjust Stock</th>
                        <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold-200/10 dark:divide-gold-900/10 text-luxury-black dark:text-white">
                      {filteredProducts.map((product) => {
                        const s = Number(product.stock ?? 0);
                        const statusBadge =
                          s <= 0 ? (
                            <span className="inline-flex rounded-full bg-danger-lux/10 border border-danger-lux/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-danger-lux">
                              Out of stock
                            </span>
                          ) : s <= 5 ? (
                            <span className="inline-flex rounded-full bg-warning-lux/10 border border-warning-lux/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning-lux">
                              Low
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-success-lux/10 border border-success-lux/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success-lux">
                              In Stock
                            </span>
                          );
                        return (
                          <tr key={product._id} className="hover:bg-gold-500/5 transition-colors">
                            <td className="py-3.5 pr-3 font-serif text-sm font-medium">{product.name}</td>
                            <td className="py-3.5 px-1 text-gray-lux dark:text-gray-400 font-light">{product.category}</td>
                            <td className="py-3.5 px-1 font-light">INR {Number(product.price).toLocaleString()}</td>
                            <td className="py-3.5 px-1 tabular-nums font-semibold">{s}</td>
                            <td className="py-3.5 px-1">{statusBadge}</td>
                            <td className="py-3.5 px-1">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={stockInputValue(product)}
                                  onChange={(e) =>
                                    setStockDrafts((prev) => ({ ...prev, [product._id]: e.target.value }))
                                  }
                                  className="w-16 rounded-lg border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-2 py-1 text-center text-xs text-luxury-black dark:text-white transition focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 outline-none"
                                />
                                <button
                                  type="button"
                                  disabled={savingStockId === product._id}
                                  onClick={() => saveProductStock(product._id)}
                                  className="rounded-lg bg-gold-500 hover:bg-gold-hover px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition disabled:opacity-50 cursor-pointer"
                                >
                                  {savingStockId === product._id ? "…" : "Save"}
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 pl-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  startEditProduct(product);
                                  setProductsSubTab("add-edit-product");
                                }}
                                className="text-xs font-semibold text-gold-600 hover:text-gold-700 hover:underline cursor-pointer"
                              >
                                Edit Details
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(product._id)}
                                className="text-xs font-semibold text-danger-lux hover:underline cursor-pointer ml-3"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="mt-4 space-y-3.5 md:hidden text-luxury-black dark:text-white">
                  {filteredProducts.map((product) => {
                    const s = Number(product.stock ?? 0);
                    const statusBadge =
                      s <= 0 ? (
                        <span className="inline-flex rounded-full bg-danger-lux/10 border border-danger-lux/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-danger-lux">
                          Out of stock
                        </span>
                      ) : s <= 5 ? (
                        <span className="inline-flex rounded-full bg-warning-lux/10 border border-warning-lux/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning-lux">
                          Low
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-success-lux/10 border border-success-lux/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success-lux">
                          In Stock
                        </span>
                      );
                    return (
                      <article key={product._id} className="rounded-xl border border-gold-200/15 dark:border-gold-900/10 bg-white/70 dark:bg-white/5 p-4 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-sm font-serif font-medium">{product.name}</p>
                            <p className="mt-0.5 text-[10px] text-gray-lux dark:text-gray-400 tracking-wider uppercase font-light">
                              {product.category} · INR {Number(product.price).toLocaleString()}
                            </p>
                          </div>
                          {statusBadge}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gold-200/15 dark:border-gold-900/10 pt-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-lux dark:text-gray-400 font-light">Stock:</span>
                            <input
                              type="number"
                              min="0"
                              value={stockInputValue(product)}
                              onChange={(e) =>
                                setStockDrafts((prev) => ({ ...prev, [product._id]: e.target.value }))
                              }
                              className="w-16 rounded-lg border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-2 py-1 text-center text-xs text-luxury-black dark:text-white transition focus:border-gold-500 outline-none"
                            />
                            <button
                              type="button"
                              disabled={savingStockId === product._id}
                              onClick={() => saveProductStock(product._id)}
                              className="rounded-lg bg-gold-500 hover:bg-gold-hover px-3 py-1 text-[10px] font-bold uppercase text-white transition cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                          <div className="space-x-3">
                            <button
                              type="button"
                              onClick={() => {
                                startEditProduct(product);
                                setProductsSubTab("add-edit-product");
                              }}
                              className="text-xs font-semibold text-gold-600 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product._id)}
                              className="text-xs font-semibold text-danger-lux cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {productsSubTab === "add-edit-product" && (
          <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white/70 dark:bg-[#1C1C1C] p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gold-200/10 dark:border-gold-900/10 text-luxury-black dark:text-white">
              <h3 className="text-lg font-serif">
                {editingId ? "Modify Product Listing" : "Add New Catalog Entry"}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId("");
                    setForm(emptyForm);
                    setProductsSubTab("inventory");
                  }}
                  className="rounded-full border border-gold-250 dark:border-gold-700 px-3.5 py-1.5 text-xs text-gray-lux dark:text-white hover:bg-gold-500/10 transition cursor-pointer"
                >
                  Exit Edit Mode
                </button>
              )}
            </div>
            {/* Note: The actual full form content is rendered inside the tab routing logic to minimize redundancy */}
            <p className="text-xs text-gray-lux dark:text-gray-400 font-light">Configure details, attributes, images, categories, personalization settings, and stock levels below.</p>
          </div>
        )}
      </div>
    );
  };

  const renderOrdersTab = () => {
    return (
      <div className="space-y-6 animate-page-enter">
        {/* Note: The actual tables, selectors, and details forms will be routed dynamically in the JSX return */}
        <div className="rounded-3xl border border-gray-150/40 dark:border-gray-700 bg-white/70 dark:bg-gray-800/80 backdrop-blur-md p-6 shadow-sm">
          <h3 className="text-xl font-serif font-light text-gray-955 dark:text-white mb-2">Order Fulfillment Management</h3>
          <p className="text-xs text-gray-500 mb-4 font-light">Process invoices, track courier packages, and audit customer order cancellations.</p>
        </div>
      </div>
    );
  };

  const renderCouponsTab = () => {
    return (
      <div className="space-y-6 animate-page-enter">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setCouponsSubTab("public")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${couponsSubTab === "public"
              ? "border-gold-600 text-gold-600 dark:text-gold-450"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
          >
            Public Checkout Coupons
          </button>
          <button
            type="button"
            onClick={() => setCouponsSubTab("special")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${couponsSubTab === "special"
              ? "border-gold-600 text-gold-600 dark:text-gold-450"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
          >
            Retention & Special Coupons
          </button>
          <button
            type="button"
            onClick={() => setCouponsSubTab("store-settings")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${couponsSubTab === "store-settings"
              ? "border-gold-600 text-gold-600 dark:text-gold-450"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
          >
            Store Settings
          </button>
        </div>

        {couponsSubTab === "store-settings" && (
          <div className="rounded-3xl border border-gray-150/40 dark:border-gray-700 bg-white/70 dark:bg-gray-800/80 backdrop-blur-md p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-serif font-light text-gray-955 dark:text-white">Store Information Settings</h3>
            <p className="text-xs text-gray-405 font-light">Set default sender details for shipping bills and invoices.</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <PremiumRingLoader text="Loading management database..." />;
  }

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: "📊", permission: null },
    { id: "products", label: "Products & Stock", icon: "🛍️", permission: ["PRODUCTS_VIEW", "INVENTORY_VIEW"] },
    { id: "orders", label: "Orders", icon: "📦", permission: "ORDERS_VIEW" },
    { id: "returns-replacements", label: "Returns & Replacements", icon: "🔄", permission: "ORDERS_RETURNS" },
    { id: "customers", label: "Customers", icon: "👤", permission: "CUSTOMERS_VIEW" },
    { id: "tickets", label: "Support Tickets", icon: "💬", permission: ["TICKETS_MANAGE", "SUPPORT_CHAT"] },
    { id: "coupons", label: "Coupons & Settings", icon: "🎟️", permission: ["COUPONS_MANAGE", "BUSINESS_ANALYTICS_VIEW", "CONTENT_HOMEPAGE"] },
    { id: "newsletter", label: "Newsletter", icon: "✉️", permission: "MARKETING_CAMPAIGNS" },
    { id: "employees", label: "Employees & Roles", icon: "👥", permission: ["EMPLOYEES_MANAGE", "ROLES_MANAGE", "DEPARTMENTS_MANAGE"] },
    { id: "logs", label: "Activity Logs", icon: "📋", permission: "ACTIVITY_LOGS_VIEW" },
    { id: "cms", label: "Content Management", icon: "📝", permission: ["CONTENT_HOMEPAGE", "CONTENT_BLOGS", "CONTENT_SEO", "BANNER_MANAGE"] }
  ];

  const visibleSidebarItems = sidebarItems.filter(item => {
    if (!item.permission) return true;
    if (Array.isArray(item.permission)) {
      return item.permission.some(p => hasPermission(p));
    }
    return hasPermission(item.permission);
  });

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${darkMode ? "dark bg-luxury-black text-white" : "bg-[#FAF7F2] text-luxury-black"}`}>
      <SEO title={activeTitle} description="Niyora Gifts Admin Console - Manage products, stock alerts, invoices, customer support, campaigns and employee accounts." />
      <LoadingOverlay active={isBusy} text={busyText} />
      {showInactivityWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div className="relative w-full max-w-md rounded-3xl border border-gold-500/30 bg-[#1C1C1C] text-white p-8 shadow-2xl z-10 text-center animate-page-enter">
            <h3 className="text-xl font-serif text-gold-500 mb-2 font-bold tracking-wide">Session Timeout Warning</h3>
            <p className="text-xs text-gray-300 font-light mb-6">
              You have been inactive for 55 minutes. For security, your session will expire in 5 minutes.
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={handleStayLoggedIn}
                className="px-6 py-2.5 rounded-full bg-gold-500 hover:bg-gold-hover text-black font-bold uppercase tracking-widest text-[10px] shadow-md transition-all cursor-pointer"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={() => handleLogout("Manual")}
                className="px-6 py-2.5 rounded-full border border-gold-500/50 hover:bg-gold-500/10 text-gold-500 font-medium uppercase tracking-widest text-[10px] transition-all cursor-pointer"
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-30 ${sidebarCollapsed ? "w-20" : "w-64"} bg-[#1C1C1C] text-white border-r border-gold-900/10 transform transition-all duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-64"}`}>
        <div className="h-full flex flex-col justify-between">
          <div>
            <div className={`h-16 flex items-center justify-between border-b border-gold-900/10 ${sidebarCollapsed ? "px-4" : "px-6"}`}>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-sm font-serif font-bold text-white shadow-md">N</span>
                {!sidebarCollapsed && (
                  <div className="flex flex-col">
                    <span className="text-sm font-serif font-bold tracking-widest text-gold-500">Niyora Gifts</span>
                    <span className="text-[7px] uppercase tracking-[0.25em] text-gray-400 font-semibold -mt-0.5">Console</span>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="hidden md:block text-gray-400 hover:text-gold-500 transition cursor-pointer text-xs"
                >
                  ◀
                </button>
              )}
            </div>

            {/* Profile Widget */}
            <div className="p-4 border-b border-gold-900/10 flex items-center gap-3 bg-white/5">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gold-500/10 text-gold-505 flex items-center justify-center font-bold text-xs ring-1 ring-gold-500/30 select-none">
                {adminAuth?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "A"}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-white">{adminAuth?.name}</p>
                  <p className="text-[9px] text-gray-400 truncate tracking-wider uppercase font-light mt-0.5">{adminAuth?.designation || "Executive"}</p>
                </div>
              )}
            </div>

            <nav className="p-3 space-y-1">
              {visibleSidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${sidebarCollapsed ? "justify-center py-3" : "gap-3 px-4 py-2.5"} ${activeTab === item.id
                    ? "bg-gold-500 text-white shadow-md shadow-gold-500/15 font-semibold"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  title={sidebarCollapsed ? item.label : ""}
                >
                  <span className="text-sm shrink-0">{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3.5 border-t border-gold-900/10 bg-[#171717] flex items-center justify-between flex-wrap gap-2">
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-full text-center text-xs text-gray-400 hover:text-gold-500 transition cursor-pointer py-1"
                title="Expand sidebar"
              >
                ▶
              </button>
            ) : (
              <>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <span>{darkMode ? "☀️ Light" : "🌙 Dark"}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-danger-lux/10 text-gold-505 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Panel Content Container */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? "md:pl-20" : "md:pl-64"}`}>

        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-[#1C1C1C]/80 backdrop-blur-md border-b border-gold-200/20 dark:border-gold-900/20 sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gold-50 dark:hover:bg-white/5 md:hidden cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-xs font-semibold text-luxury-black dark:text-white capitalize flex items-center gap-2">
              <span className="font-serif tracking-wider font-bold">Niyora Console</span>
              <span className="text-gold-400">/</span>
              <span className="text-gray-500 dark:text-gray-400 font-light">{activeTab}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative block">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 text-[10px]">🔍</span>
              <input
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-24 xs:w-36 sm:w-48 xl:w-64 rounded-full border border-gold-200/50 dark:border-gold-900/40 bg-white/50 dark:bg-white/5 pl-7 pr-3 py-1.5 text-[10px] sm:text-[11px] text-luxury-black dark:text-white transition-all focus:border-gold-500 focus:w-28 xs:focus:w-40 sm:focus:w-56 xl:focus:w-72 outline-none"
              />
            </div>

            <button className="p-2 rounded-full hover:bg-gold-100/50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition cursor-pointer relative text-sm">
              <span>🔔</span>
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-danger-lux animate-pulse" />
            </button>

            <div className="hidden sm:flex items-center gap-2 border-l border-gold-200/20 dark:border-gold-900/20 pl-4">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse" />
              <span className="text-[9px] uppercase font-bold text-gold-600 dark:text-gold-400 tracking-wider">Secured</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-gold-500 text-white flex items-center justify-center font-bold text-xs ring-2 ring-gold-200/20">
              {adminAuth?.name?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Mobile menu backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/45 z-20 md:hidden animate-fade-in-backdrop"
          />
        )}

        <main className="p-6 md:p-8 flex-1 space-y-6 max-w-7xl w-full mx-auto">
          {error && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/50 p-4 text-xs text-red-750 dark:text-red-300 flex items-start gap-2.5">
              <span>⚠️</span>
              <p className="font-medium">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/50 p-4 text-xs text-emerald-850 dark:text-emerald-300 flex items-start gap-2.5">
              <span>✓</span>
              <p className="font-medium">{success}</p>
            </div>
          )}
          {uploadWarning && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-150 dark:border-amber-900/50 p-4 text-xs text-amber-850 dark:text-amber-300 flex items-start gap-2.5">
              <span>⚡</span>
              <p className="font-medium">{uploadWarning}</p>
            </div>
          )}

          {activeTab === "overview" && renderOverviewTab()}
          {activeTab === "newsletter" && renderNewsletterTab()}
          {activeTab === "logs" && renderLogsTab()}
          {activeTab === "employees" && renderEmployeesTab()}
          {activeTab === "products" && renderProductsTab()}
          {activeTab === "coupons" && renderCouponsTab()}
          {activeTab === "orders" && renderOrdersTab()}
          {activeTab === "tickets" && renderTicketsTab()}
          {activeTab === "returns-replacements" && <ReturnsReplacementsTab />}
          {activeTab === "customers" && <CustomersSection authHeader={authHeader} adminAuth={adminAuth} globalSearchQuery={globalSearchQuery} />}
          {activeTab === "cms" && <CmsManager authHeader={authHeader} adminAuth={adminAuth} />}

          {activeTab === "coupons" && couponsSubTab === "store-settings" && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Store Settings (Sender Details)</h3>
              <p className="mt-1 text-sm text-gray-500">Used in shipping labels and invoices.</p>
              <form onSubmit={saveStoreInfo} className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  name="storeName"
                  value={storeInfo.storeName}
                  onChange={handleStoreInfoChange}
                  placeholder="Store name"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  required
                />
                <input
                  name="storePhone"
                  value={storeInfo.storePhone}
                  onChange={handleStoreInfoChange}
                  placeholder="Store phone"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  required
                />
                <textarea
                  name="storeAddress"
                  value={storeInfo.storeAddress}
                  onChange={handleStoreInfoChange}
                  placeholder="Store address"
                  rows={3}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
                  required
                />
                <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50/30 p-4 shadow-xs">
                  <label className="flex items-center gap-2.5 text-sm font-semibold text-gray-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="codEnabled"
                      checked={storeInfo.codEnabled !== undefined ? Boolean(storeInfo.codEnabled) : true}
                      onChange={(e) => setStoreInfo((prev) => ({ ...prev, codEnabled: e.target.checked }))}
                      className="rounded text-emerald-600 focus:ring-emerald-600 cursor-pointer h-4 w-4"
                    />
                    Enable Cash on Delivery (COD) website-wide
                  </label>
                </div>
                <div className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Store Logo</p>
                  <p className="mb-3 text-xs text-emerald-700">Used on shipping labels and invoices.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {storeInfo.storeLogoUrl ? (
                      <img
                        src={storeInfo.storeLogoUrl}
                        alt="Store logo preview"
                        className="h-14 w-14 rounded-lg border border-emerald-200 bg-white object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-emerald-200 bg-white text-sm font-semibold text-emerald-700">
                        G
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleStoreLogoUpload}
                      disabled={uploadingStoreLogo}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      name="storeLogoUrl"
                      value={storeInfo.storeLogoUrl}
                      onChange={handleStoreInfoChange}
                      placeholder="Or paste logo URL"
                      className="min-w-[280px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                  <p className="text-sm font-semibold text-teal-900">Top Special Offer Banner</p>
                  <p className="mb-3 text-xs text-teal-700">Shown at top of home page for festivals/events.</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      value={storeInfo.specialOffer?.eventName || ""}
                      onChange={(e) => handleSpecialOfferChange("eventName", e.target.value)}
                      placeholder="Event name (e.g., Diwali Special)"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={storeInfo.specialOffer?.code || ""}
                      onChange={(e) => handleSpecialOfferChange("code", e.target.value.toUpperCase())}
                      placeholder="Offer code"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={storeInfo.specialOffer?.title || ""}
                      onChange={(e) => handleSpecialOfferChange("title", e.target.value)}
                      placeholder="Banner title"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
                    />
                    <textarea
                      value={storeInfo.specialOffer?.subtitle || ""}
                      onChange={(e) => handleSpecialOfferChange("subtitle", e.target.value)}
                      placeholder="Banner subtitle"
                      rows={2}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
                    />
                    <input
                      value={storeInfo.specialOffer?.ctaText || ""}
                      onChange={(e) => handleSpecialOfferChange("ctaText", e.target.value)}
                      placeholder="Button text"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={storeInfo.specialOffer?.startDate ? String(storeInfo.specialOffer.startDate).slice(0, 10) : ""}
                      onChange={(e) => handleSpecialOfferChange("startDate", e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={storeInfo.specialOffer?.endDate ? String(storeInfo.specialOffer.endDate).slice(0, 10) : ""}
                      onChange={(e) => handleSpecialOfferChange("endDate", e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(storeInfo.specialOffer?.active)}
                        onChange={(e) => handleSpecialOfferChange("active", e.target.checked)}
                      />
                      Active on homepage top
                    </label>
                  </div>
                </div>
                <div className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Homepage Offer Cards</p>
                      <p className="text-xs text-emerald-700">These offers appear in a featured section on home page.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addOffer}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      + Add Offer
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(storeInfo.offers || []).map((offer, index) => (
                      <div key={`${offer.code || "offer"}-${index}`} className="rounded-lg border border-emerald-100 bg-white p-3">
                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            value={offer.title || ""}
                            onChange={(e) => handleOfferChange(index, "title", e.target.value)}
                            placeholder="Offer title"
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                          <input
                            value={offer.code || ""}
                            onChange={(e) => handleOfferChange(index, "code", e.target.value.toUpperCase())}
                            placeholder="Code (optional)"
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                          <input
                            value={offer.ctaText || ""}
                            onChange={(e) => handleOfferChange(index, "ctaText", e.target.value)}
                            placeholder="Button text (e.g. Shop Now)"
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={Boolean(offer.active)}
                              onChange={(e) => handleOfferChange(index, "active", e.target.checked)}
                            />
                            Active on homepage
                          </label>
                          <textarea
                            value={offer.subtitle || ""}
                            onChange={(e) => handleOfferChange(index, "subtitle", e.target.value)}
                            placeholder="Offer subtitle"
                            rows={2}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
                          />
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => removeOffer(index)}
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={savingStoreInfo}
                    className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {savingStoreInfo ? "Saving..." : "Save Store Settings"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "coupons" && couponsSubTab === "special" && (
            <div className="rounded-3xl border border-violet-150/40 bg-gradient-to-br from-violet-50/20 via-white/80 to-violet-50/10 backdrop-blur-md p-6 shadow-sm">
              <h3 className="text-xl font-serif font-light tracking-tight text-gray-950">Special Retention Coupons</h3>
              <p className="mt-1 text-xs text-gray-500 font-light leading-relaxed">
                Generate secure, random coupon codes (prefixed with <span className="font-mono text-xs font-semibold text-violet-800">GN-SP-</span>) for VIP clients or win-back campaigns. These codes remain hidden from the public checkout lists.
              </p>
              {lastGeneratedSpecialCode ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200/60 bg-white px-4 py-2.5 shadow-2xs animate-fade-in">
                  <span className="text-xs font-medium text-gray-600">Generated Code:</span>
                  <code className="rounded-md bg-violet-50 border border-violet-100 px-2.5 py-1 font-mono text-sm font-bold text-violet-900">
                    {lastGeneratedSpecialCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(lastGeneratedSpecialCode);
                      setSuccess("Code copied to clipboard.");
                    }}
                    className="rounded-full bg-violet-950 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-violet-900 transition-all hover-float"
                  >
                    Copy Code
                  </button>
                </div>
              ) : null}
              <form onSubmit={generateSpecialRetentionCoupon} className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Coupon Type</label>
                  <select
                    value={specialCouponForm.type}
                    onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, type: e.target.value }))}
                    className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-violet-650 focus:ring-1 focus:ring-violet-650 transition-all"
                  >
                    <option value="percent">Percentage Off</option>
                    <option value="flat">Flat Discount</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Value</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 15 or 500"
                    value={specialCouponForm.value}
                    onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, value: e.target.value }))}
                    className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-violet-650 focus:ring-1 focus:ring-violet-650 transition-all"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Min Cart Value</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1000"
                    value={specialCouponForm.minCartValue}
                    onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, minCartValue: e.target.value }))}
                    className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-violet-650 focus:ring-1 focus:ring-violet-650 transition-all"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Max Discount (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 150"
                    value={specialCouponForm.maxDiscount}
                    onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, maxDiscount: e.target.value }))}
                    className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-violet-650 focus:ring-1 focus:ring-violet-650 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Max Global Uses</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited if empty"
                    value={specialCouponForm.maxRedemptions}
                    onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, maxRedemptions: e.target.value }))}
                    className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-violet-650 focus:ring-1 focus:ring-violet-650 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Max Uses Per Customer</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited if empty"
                    value={specialCouponForm.maxRedemptionsPerUser}
                    onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, maxRedemptionsPerUser: e.target.value }))}
                    className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-violet-650 focus:ring-1 focus:ring-violet-650 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Valid Until</label>
                  <input
                    type="date"
                    value={specialCouponForm.endDate || ""}
                    onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-violet-650 focus:ring-1 focus:ring-violet-650 transition-all"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={specialCouponForm.active}
                      onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, active: e.target.checked }))}
                      className="rounded text-violet-600 focus:ring-violet-600 cursor-pointer"
                    />
                    <span className="font-medium text-gray-800">Coupon Active</span>
                  </label>
                </div>

                <div className="md:col-span-3 border-t border-violet-100/50 my-2 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-900 mb-3">
                    Direct Email Delivery (Optional)
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Recipient Email</label>
                      <input
                        type="email"
                        autoComplete="off"
                        placeholder="customer@example.com"
                        value={specialCouponForm.customerEmail}
                        onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
                        className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-violet-650 focus:ring-1 focus:ring-violet-650 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Recipient Name</label>
                      <input
                        placeholder="e.g. John Doe"
                        value={specialCouponForm.customerName}
                        onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, customerName: e.target.value }))}
                        className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-violet-650 focus:ring-1 focus:ring-violet-650 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Personal Note</label>
                      <input
                        placeholder="e.g. Enjoy this exclusive VIP offer!"
                        value={specialCouponForm.emailMessage}
                        onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, emailMessage: e.target.value }))}
                        className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-violet-650 focus:ring-1 focus:ring-violet-650 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3 pt-2">
                  <button
                    type="submit"
                    disabled={generatingSpecial}
                    className="rounded-full bg-violet-900 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-violet-800 transition-all duration-300 disabled:opacity-70 hover-float"
                  >
                    {generatingSpecial ? "Generating…" : "Generate Secure Code & Dispatch"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "coupons" && couponsSubTab === "public" && (
            <>
              <div className="rounded-3xl border border-gray-150/40 bg-white/70 backdrop-blur-md p-6 shadow-sm">
                <h3 className="text-xl font-serif font-light tracking-tight text-gray-950">
                  {editingCouponId ? "Edit Coupon Rule" : "Create Public Coupon"}
                </h3>
                <p className="mt-1 text-xs text-gray-500 font-light mb-4">
                  Define standard promotional campaign parameters. These coupons display on active checkout promo lists.
                </p>
                <form onSubmit={saveCoupon} className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Coupon Code</label>
                    <input
                      placeholder="e.g. FESTIVE15"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all disabled:bg-gray-100 disabled:text-gray-550"
                      required
                      disabled={editingCouponIsSpecial}
                      title={editingCouponIsSpecial ? "System-generated codes cannot be changed" : undefined}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Coupon Type</label>
                    <select
                      value={couponForm.type}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, type: e.target.value }))}
                      className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
                    >
                      <option value="percent">Percentage Off</option>
                      <option value="flat">Flat Discount</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Discount Value</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 10 or 250"
                      value={couponForm.value}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, value: e.target.value }))}
                      className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Min Cart Value</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1500"
                      value={couponForm.minCartValue}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, minCartValue: e.target.value }))}
                      className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Max Discount (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 300"
                      value={couponForm.maxDiscount}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, maxDiscount: e.target.value }))}
                      className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active From (Date & Time)</label>
                    <input
                      type="datetime-local"
                      value={couponForm.startDate || ""}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
                      title="Active start date and time (optional)"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Expires At (Date & Time)</label>
                    <input
                      type="datetime-local"
                      value={couponForm.endDate || ""}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
                      title="Expiration date and time (optional)"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Max Global Redemptions</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited if empty"
                      value={couponForm.maxRedemptions}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, maxRedemptions: e.target.value }))}
                      className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
                      title="Empty = unlimited redemptions globally"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Max Uses Per Customer</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited if empty"
                      value={couponForm.maxRedemptionsPerUser}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, maxRedemptionsPerUser: e.target.value }))}
                      className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
                      title="Empty = unlimited uses per account"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs text-gray-655 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={couponForm.active}
                        onChange={(e) => setCouponForm((prev) => ({ ...prev, active: e.target.checked }))}
                        className="rounded text-emerald-900 focus:ring-emerald-900 cursor-pointer"
                      />
                      <span className="font-medium text-gray-800">Coupon Active</span>
                    </label>
                  </div>

                  <div className="md:col-span-3 rounded-2xl border border-gray-200 bg-gray-50/30 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 font-sans">Selective Days of Operation</span>
                        <p className="text-[10px] text-gray-400 font-light mt-0.5 font-sans">Select specific days the coupon is valid. Uncheck all to make it valid every day.</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCouponForm((prev) => ({ ...prev, activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] }))}
                          className="rounded-full bg-white border border-gray-200 hover:bg-gray-50 px-2.5 py-1 text-[9px] font-bold text-gray-600 transition cursor-pointer"
                        >
                          Weekdays
                        </button>
                        <button
                          type="button"
                          onClick={() => setCouponForm((prev) => ({ ...prev, activeDays: ["Saturday", "Sunday"] }))}
                          className="rounded-full bg-white border border-gray-200 hover:bg-gray-50 px-2.5 py-1 text-[9px] font-bold text-gray-600 transition cursor-pointer"
                        >
                          Weekends
                        </button>
                        <button
                          type="button"
                          onClick={() => setCouponForm((prev) => ({ ...prev, activeDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] }))}
                          className="rounded-full bg-white border border-gray-200 hover:bg-gray-50 px-2.5 py-1 text-[9px] font-bold text-gray-600 transition cursor-pointer"
                        >
                          All Days
                        </button>
                        <button
                          type="button"
                          onClick={() => setCouponForm((prev) => ({ ...prev, activeDays: [] }))}
                          className="rounded-full bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 px-2.5 py-1 text-[9px] font-bold text-gray-600 transition cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                        const activeDays = couponForm.activeDays || [];
                        const isSelected = activeDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              setCouponForm((prev) => {
                                const current = prev.activeDays || [];
                                const next = current.includes(day)
                                  ? current.filter((d) => d !== day)
                                  : [...current, day];
                                return { ...prev, activeDays: next };
                              });
                            }}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition duration-200 cursor-pointer ${isSelected
                              ? "bg-emerald-950 border-emerald-950 text-white shadow-xs"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="md:col-span-3 flex items-center gap-2.5 pt-2">
                    <button
                      type="submit"
                      className="rounded-full bg-emerald-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-900 transition-all duration-300 hover-float"
                    >
                      {editingCouponId ? "Update Coupon Rule" : "Create Coupon"}
                    </button>
                    {editingCouponId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCouponId("");
                          setEditingCouponIsSpecial(false);
                          setCouponForm(emptyCouponForm);
                        }}
                        className="rounded-full border border-gray-200 bg-white/50 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>

              <div className="rounded-3xl border border-gray-150/40 bg-white/70 backdrop-blur-md p-6 shadow-sm">
                <h3 className="text-xl font-serif font-light tracking-tight text-gray-950">Manage Coupons</h3>
                <p className="mt-1 text-xs text-gray-500 font-light mb-4">
                  Monitor campaign redemptions and usage stats. Use &quot;Email&quot; to send specific codes directly to customer inboxes.
                </p>

                {fetchingCoupons ? (
                  <TableSkeleton rows={5} cols={8} />
                ) : (
                  <>
                    {couponEmailTargetId ? (
                      <form
                        onSubmit={submitCouponEmail}
                        className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/20 p-5 animate-fade-in"
                      >
                        <p className="text-sm font-serif font-medium text-gray-900">
                          Email Coupon Code:{" "}
                          <span className="font-mono text-violet-800 font-semibold">
                            {coupons.find((c) => c._id === couponEmailTargetId)?.code || "—"}
                          </span>
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Customer Email</label>
                            <input
                              type="email"
                              required
                              placeholder="recipient@example.com"
                              value={couponEmailForm.to}
                              onChange={(e) => setCouponEmailForm((prev) => ({ ...prev, to: e.target.value }))}
                              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-light focus:border-sky-650 focus:ring-1 focus:ring-sky-650 transition-all"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Customer Name (Optional)</label>
                            <input
                              placeholder="e.g. Sarah"
                              value={couponEmailForm.customerName}
                              onChange={(e) => setCouponEmailForm((prev) => ({ ...prev, customerName: e.target.value }))}
                              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-light focus:border-sky-650 focus:ring-1 focus:ring-sky-650 transition-all"
                            />
                          </div>
                          <div className="sm:col-span-2 flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Personal Note (Optional)</label>
                            <textarea
                              placeholder="Add a custom note to the email..."
                              value={couponEmailForm.message}
                              onChange={(e) => setCouponEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                              rows={2}
                              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-light focus:border-sky-650 focus:ring-1 focus:ring-sky-650 transition-all"
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2.5">
                          <button
                            type="submit"
                            disabled={sendingCouponEmail}
                            className="rounded-full bg-sky-700 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-sky-600 transition-all disabled:opacity-70 hover-float"
                          >
                            {sendingCouponEmail ? "Sending…" : "Send Email"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCouponEmailTargetId("");
                              setCouponEmailForm(emptyCouponEmailForm);
                            }}
                            className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : null}

                    <div className="mt-4 space-y-3 md:hidden">
                      {filteredCoupons.map((coupon) => (
                        <article key={coupon._id} className="rounded-2xl border border-gray-150/40 bg-white/50 p-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-serif font-bold text-gray-950 tracking-wide">{coupon.code}</span>
                              {coupon.isSpecial ? (
                                <span className="rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-violet-800">
                                  Special
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{coupon.type}</span>
                          </div>
                          <div className="text-xs space-y-1 font-light text-gray-600">
                            <p>Value: <strong className="font-medium text-gray-900">{coupon.value}</strong> • Min Cart: INR {coupon.minCartValue}</p>
                            <p>Max Discount: {coupon.maxDiscount ? `INR ${coupon.maxDiscount}` : "None"} • Status: {coupon.active ? (
                              <span className="font-semibold text-emerald-800">Active</span>
                            ) : (
                              <span className="font-semibold text-gray-500">Inactive</span>
                            )}</p>
                            <p className="text-[11px] text-gray-500">{formatCouponUsage(coupon)}</p>
                            <p className="text-[11px] text-gray-400">
                              Expiry:{" "}
                              {coupon.endDate
                                ? new Date(coupon.endDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                                : "No expiry"}
                            </p>
                          </div>
                          <div className="mt-2.5 flex flex-wrap gap-4 border-t border-gray-100 pt-2.5 text-xs font-semibold">
                            <button
                              type="button"
                              onClick={() => startEditCoupon(coupon)}
                              className="text-emerald-800 hover:text-emerald-950 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => openCouponEmailPanel(coupon)}
                              disabled={!coupon.active}
                              className="text-sky-800 hover:text-sky-950 transition-colors disabled:opacity-40"
                            >
                              Email
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCoupon(coupon._id)}
                              className="text-rose-800 hover:text-rose-950 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      ))}
                      {coupons.length === 0 ? <p className="text-xs text-gray-400 font-light">No coupons defined yet.</p> : null}
                    </div>

                    <div className="mt-4 hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[960px] text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-150/40">
                            <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Coupon Code</th>
                            <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Type</th>
                            <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Value</th>
                            <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Min Cart</th>
                            <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Max Discount</th>
                            <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Redemptions Status</th>
                            <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Valid Until</th>
                            <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Status</th>
                            <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredCoupons.map((coupon) => (
                            <tr key={coupon._id} className="hover:bg-gray-50/40 transition-colors">
                              <td className="py-3.5 pr-2">
                                <span className="font-serif font-bold text-sm text-gray-955 tracking-wide">{coupon.code}</span>
                                {coupon.isSpecial ? (
                                  <span className="ml-2 inline-flex rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-violet-800">
                                    Special
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3.5 px-1 uppercase font-light text-gray-500">{coupon.type}</td>
                              <td className="py-3.5 px-1 font-semibold text-gray-955">{coupon.value}</td>
                              <td className="py-3.5 px-1 font-light text-gray-650">INR {coupon.minCartValue}</td>
                              <td className="py-3.5 px-1 font-light text-gray-650">{coupon.maxDiscount ? `INR ${coupon.maxDiscount}` : "—"}</td>
                              <td className="max-w-[220px] py-3.5 px-1 text-xs text-gray-500 font-light">{formatCouponUsage(coupon)}</td>
                              <td className="py-3.5 px-1 text-gray-500 font-light">
                                {coupon.endDate
                                  ? new Date(coupon.endDate).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                  : "—"}
                              </td>
                              <td className="py-3.5 px-1">
                                {coupon.active ? (
                                  <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full bg-gray-50 border border-gray-150/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 pl-2 text-right">
                                <div className="flex items-center justify-end gap-3.5 font-semibold text-xs">
                                  <button
                                    type="button"
                                    onClick={() => startEditCoupon(coupon)}
                                    className="text-emerald-800 hover:text-emerald-950 hover:underline transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openCouponEmailPanel(coupon)}
                                    disabled={!coupon.active}
                                    className="text-sky-800 hover:text-sky-950 hover:underline transition-colors disabled:opacity-40"
                                  >
                                    Email
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeCoupon(coupon._id)}
                                    className="text-rose-800 hover:text-rose-950 hover:underline transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredCoupons.length === 0 ? (
                            <tr>
                              <td className="py-8 text-center text-gray-400 font-light" colSpan={9}>
                                No coupons created yet matching the search filter.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {activeTab === "products" && productsSubTab === "add-edit-product" && (
            <div className="animate-page-enter">
              <AddProduct
                initialData={editingId ? products.find(p => p._id === editingId) : duplicateData}
                onSuccess={async () => {
                  try {
                    const { data } = await api.get("/admin/products", authHeader);
                    setProducts(data);
                  } catch (err) {
                    console.error("Failed to refresh products", err);
                  }
                  setEditingId("");
                  setDuplicateData(null);
                  setProductsSubTab("inventory");
                }}
                onCancel={() => {
                  setEditingId("");
                  setDuplicateData(null);
                  setProductsSubTab("inventory");
                }}
              />
            </div>
          )}

          {activeTab === "orders" && (
            <div className="rounded-2xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-serif tracking-wide text-luxury-black dark:text-white">Manage Orders</h3>
              {fetchingOrders ? (
                <TableSkeleton rows={5} cols={8} />
              ) : (
                <>
                  <div className="mt-3 flex overflow-x-auto items-center gap-2.5 no-scrollbar whitespace-nowrap scroll-smooth w-full pb-1">
                    {["all", "active", "archived"].map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setOrderViewFilter(view)}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${orderViewFilter === view
                          ? "bg-gold-500 text-white shadow-sm"
                          : "bg-cream dark:bg-white/5 border border-gold-200/10 dark:border-gold-900/10 text-gold-700 dark:text-gray-300 hover:bg-gold-500/10"
                          }`}
                      >
                        {view === "all"
                          ? `All (${orders.length + archivedOrders.length})`
                          : view === "active"
                            ? `Active (${orders.length})`
                            : `Archived (${archivedOrders.length})`}
                      </button>
                    ))}
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="shrink-0 rounded-full border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-gold-700 dark:text-gray-300 outline-none focus:border-gold-500"
                      aria-label="Filter orders by status"
                      title="Filter orders by status"
                    >
                      <option value="all">All statuses</option>
                      {orderStatuses.map((status) => (
                        <option key={status} value={status.toLowerCase()}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <select
                      value={orderPaymentFilter}
                      onChange={(e) => setOrderPaymentFilter(e.target.value)}
                      className="shrink-0 rounded-full border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-gold-700 dark:text-gray-300 outline-none focus:border-gold-500"
                      aria-label="Filter orders by payment mode"
                      title="Filter orders by payment mode"
                    >
                      <option value="all">All payment modes</option>
                      <option value="online">Online</option>
                      <option value="cod">COD</option>
                    </select>
                  </div>

                  {/* Batch Print Bar */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold-200/30 bg-gold-50/30 dark:bg-white/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gold-700 dark:text-gold-450 mr-2">
                      {selectedOrderIds.length} Selected ({selectedOrdersForPrint.length} Print-Ready)
                    </p>
                    <select
                      value={labelPrintFilter}
                      onChange={(event) => setLabelPrintFilter(event.target.value)}
                      className="rounded-full border border-gold-200/50 dark:border-gold-900/30 bg-white dark:bg-[#1C1C1C] px-3.5 py-1 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500"
                      aria-label="Filter selected orders for label printing"
                    >
                      <option value="all">All selected</option>
                      <option value="ready">Shipped/Delivered only</option>
                      <option value="shipped">Shipped only</option>
                      <option value="delivered">Delivered only</option>
                    </select>

                    <button
                      type="button"
                      onClick={toggleSelectAllVisibleOrders}
                      className="rounded-full border border-gold-200/50 hover:border-gold-500 bg-white dark:bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-700 dark:text-gray-250 hover:bg-gold-500/10 cursor-pointer transition-all duration-300"
                    >
                      {selectAllButtonLabel}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOrderIds([])}
                      disabled={selectedOrderIds.length === 0}
                      className="rounded-full border border-gray-200 bg-white dark:bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintShippingLabelsBatch(selectedOrdersForPrint)}
                      disabled={selectedOrdersForPrint.length === 0}
                      className="rounded-full bg-gold-500 hover:bg-gold-hover px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-all duration-300 shadow-sm"
                    >
                      Print Labels ({selectedOrdersForPrint.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintInvoicesBatch(selectedOrdersForPrint)}
                      disabled={selectedOrdersForPrint.length === 0}
                      className="rounded-full bg-gold-600 hover:bg-gold-700 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-all duration-300 shadow-sm"
                    >
                      Print Invoices ({selectedOrdersForPrint.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintCombinedA4Batch(selectedOrdersForPrint)}
                      disabled={selectedOrdersForPrint.length === 0}
                      className="rounded-full bg-luxury-black dark:bg-white text-white dark:text-black hover:bg-gold-500 hover:text-white dark:hover:bg-gold-500 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-all duration-300 shadow-sm border border-gold-900/10"
                    >
                      Print Shipping + Invoice ({selectedOrdersForPrint.length})
                    </button>
                  </div>
                  <div className="mt-3 space-y-3 md:hidden">
                    {ordersForViewFiltered.map((order) => (
                      <article key={order._id} className="rounded-xl border border-gold-200/15 dark:border-gold-900/10 bg-white/70 dark:bg-white/5 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedOrderIds.includes(order._id)}
                              onChange={() => toggleOrderSelection(order._id)}
                              aria-label={`Select order ${getOrderDisplayId(order)}`}
                            />
                            <p className="text-sm font-semibold text-luxury-black dark:text-white">{getOrderDisplayId(order)}</p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${order.__isArchived ? "bg-warning-lux/10 border border-warning-lux/20 text-warning-lux" : "bg-success-lux/10 border border-success-lux/20 text-success-lux"
                              }`}
                          >
                            {order.__isArchived ? "Archived" : "Active"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-lux dark:text-gray-400">{order.address?.fullName || "Guest"} • INR {Number(order.totalPrice || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-lux dark:text-gray-400">Status: {order.status} | Mode: <span className="font-semibold text-gold-600 uppercase">{order.paymentMethod || "Online"}</span></p>
                        <p className="text-xs text-gray-lux dark:text-gray-400 break-all">Tracking: {order.trackingId || "-"}</p>
                        {order.products?.some(p => p.customization?.text || p.customization?.uploadedImage) ? (
                          <div className="mt-3 space-y-2 rounded-xl bg-cream/40 dark:bg-white/5 p-2.5 border border-gold-200/15">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-gold-600">Customizations</p>
                            {order.products?.filter(p => p.customization?.text || p.customization?.uploadedImage).map((p, idx) => (
                              <div key={idx} className="text-xs space-y-1 mt-1.5 border-t border-gold-200/15 pt-1.5 first:border-0 first:pt-0">
                                <p className="font-semibold text-luxury-black dark:text-white line-clamp-1">{p.name}</p>
                                {p.customization?.text && (
                                  <p className="text-gray-lux">Text: <span className="text-gold-600 font-medium">"{p.customization.text}"</span></p>
                                )}
                                {p.customization?.uploadedImage && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <img
                                      src={p.customization.uploadedImage}
                                      alt="Custom uploaded"
                                      className="h-10 w-10 rounded object-cover border border-gold-200/30"
                                      onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/200x200?text=Error';
                                      }}
                                    />
                                    <a
                                      href={p.customization.uploadedImage}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-lg border border-gold-300/35 bg-gold-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-600 hover:bg-gold-500/20"
                                    >
                                      View Image
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button onClick={() => handlePrintShippingLabel(order)} className="rounded-lg border border-gold-200/50 dark:border-gold-900/30 px-3 py-1.5 text-xs text-gold-600">Label</button>
                          <button onClick={() => handlePrintInvoice(order)} className="rounded-lg border border-gold-200/50 dark:border-gold-900/30 px-3 py-1.5 text-xs text-gold-600">Invoice</button>
                          {order.__isArchived ? (
                            <button onClick={() => handleRestoreOrder(order)} className="rounded-lg border border-success-lux/50 bg-success-lux/10 px-3 py-1.5 text-xs text-success-lux">Restore</button>
                          ) : (
                            <button
                              onClick={() => handleArchiveOrder(order)}
                              disabled={order.status === "Cancelled"}
                              className="rounded-lg border border-warning-lux/50 bg-warning-lux/10 px-3 py-1.5 text-xs text-warning-lux disabled:opacity-50"
                            >
                              Archive
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            disabled={order.status !== "Cancelled" || order.__isArchived}
                            className="rounded-lg bg-danger-lux px-3 py-1.5 text-xs text-white disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                    {ordersForView.length === 0 ? <p className="text-sm text-gray-lux font-light text-center py-4">No orders found for this filter.</p> : null}
                  </div>

                  {/* Desktop View */}
                  <div className="mt-3 hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1480px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gold-200/10 dark:border-gold-900/10 text-gray-400">
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">
                            <input
                              type="checkbox"
                              checked={allVisibleOrdersSelected}
                              onChange={toggleSelectAllVisibleOrders}
                              aria-label="Select all visible orders"
                            />
                          </th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Order ID</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Status</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Payment Mode</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Customization</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Customer</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Shipping Address</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Total</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Update Status</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Tracking ID</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Cancellation</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Shipping Label</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Invoice</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">A4 Combined</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Archive</th>
                          <th className="pb-3 text-[10px] font-bold uppercase tracking-wider font-sans">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold-200/10 dark:divide-gold-900/10 text-luxury-black dark:text-white">
                        {ordersForViewFiltered.map((order) => (
                          <tr key={order._id} className="hover:bg-gold-500/5 transition-colors">
                            <td className="py-3">
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(order._id)}
                                onChange={() => toggleOrderSelection(order._id)}
                                aria-label={`Select order ${getOrderDisplayId(order)}`}
                              />
                            </td>
                            <td className="py-3 font-medium">{getOrderDisplayId(order)}</td>
                            <td className="py-3">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${order.__isArchived ? "bg-warning-lux/10 border border-warning-lux/20 text-warning-lux" : "bg-success-lux/10 border border-success-lux/20 text-success-lux"
                                  }`}
                              >
                                {order.__isArchived ? "Archived" : "Active"}
                              </span>
                            </td>
                            <td className="py-3">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${String(order.paymentMethod).toLowerCase() === "cod" ? "bg-warning-lux/10 border border-warning-lux/20 text-warning-lux" : "bg-gold-500/10 border border-gold-500/20 text-gold-600"
                                  }`}
                              >
                                {order.paymentMethod || "Online"}
                              </span>
                            </td>
                            <td className="py-3">
                              {order.products?.some(p => p.customization?.text || p.customization?.uploadedImage) ? (
                                <div className="space-y-3 max-w-[200px]">
                                  {order.products?.filter(p => p.customization?.text || p.customization?.uploadedImage).map((p, idx) => (
                                    <div key={idx} className="text-xs space-y-1 mt-1.5 border-t border-gold-200/10 pt-1.5 first:border-0 first:pt-0">
                                      <p className="font-semibold text-luxury-black dark:text-white line-clamp-1">{p.name}</p>
                                      {p.customization?.text && (
                                        <p className="text-gray-lux text-[10px]">Text: <span className="text-gold-600 font-medium">"{p.customization.text}"</span></p>
                                      )}
                                      {p.customization?.uploadedImage && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <img
                                            src={p.customization.uploadedImage}
                                            alt="Custom uploaded"
                                            className="h-10 w-10 rounded object-cover border border-gold-200/20"
                                            onError={(e) => {
                                              e.target.src = 'https://via.placeholder.com/200x200?text=Error';
                                            }}
                                          />
                                          <a
                                            href={p.customization.uploadedImage}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-lg border border-gold-300/35 bg-gold-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-600 hover:bg-gold-500/20"
                                          >
                                            View
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 font-light">—</span>
                              )}
                            </td>
                            <td className="py-3 font-medium">{order.address?.fullName || "Guest"}</td>
                            <td className="py-3">
                              <div className="space-y-0.5 text-[11px] text-gray-lux dark:text-gray-400">
                                <p className="font-medium text-luxury-black dark:text-white">{order.address?.line1 || "-"}</p>
                                <p>
                                  {[order.address?.city, order.address?.state, order.address?.postalCode]
                                    .filter(Boolean)
                                    .join(", ") || "-"}
                                </p>
                                <p>{order.address?.country || "-"}</p>
                                <p className="font-mono">{order.address?.phone || "-"}</p>
                              </div>
                            </td>
                            <td className="py-3 font-semibold">INR {Number(order.totalPrice || 0).toLocaleString()}</td>
                            <td className="py-3 text-[11px] font-semibold text-gold-600">{order.status}</td>
                            <td className="py-3">
                              <select
                                value={order.status}
                                disabled={order.__isArchived}
                                onChange={(e) => handleOrderStatusChange(order._id, e.target.value)}
                                className="rounded-lg border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-2 py-1 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {orderStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <select
                                  value={trackingCarriersByOrder[order._id] || order.trackingCarrier || "generic"}
                                  onChange={(e) => handleTrackingCarrierChange(order._id, e.target.value)}
                                  disabled={order.__isArchived || !isTrackingEditable(order.status)}
                                  className="rounded-lg border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-[#1C1C1C] px-2 py-1 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-white/5"
                                >
                                  {trackingCarriers.map((carrier) => (
                                    <option key={carrier.value} value={carrier.value}>
                                      {carrier.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  value={trackingInputs[order._id] ?? order.trackingId ?? ""}
                                  onChange={(e) => handleTrackingInputChange(order._id, e.target.value)}
                                  placeholder={isTrackingEditable(order.status) ? "Enter tracking ID" : "Status: Shipped required"}
                                  disabled={order.__isArchived || !isTrackingEditable(order.status)}
                                  className="w-40 rounded-lg border border-gold-200/50 dark:border-gold-900/30 bg-white/50 dark:bg-white/5 px-2 py-1 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-white/5"
                                />
                                <button
                                  onClick={() => handleSaveTrackingId(order)}
                                  disabled={order.__isArchived || !isTrackingEditable(order.status)}
                                  className="rounded-lg border border-gold-300 bg-gold-500/10 hover:bg-gold-500 px-3 py-1 text-xs font-semibold text-gold-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300"
                                >
                                  Save
                                </button>
                              </div>
                            </td>
                            <td className="py-3">
                              {order.cancellationRequest?.status === "Pending" ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-warning-lux">Pending</p>
                                  <p className="max-w-[220px] text-xs text-gray-lux">{order.cancellationRequest.reason}</p>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleReviewCancellation(order, "approve")}
                                      className="rounded-lg bg-success-lux px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-success-lux/95 transition cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReviewCancellation(order, "reject")}
                                      className="rounded-lg bg-danger-lux px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-danger-lux/95 transition cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              ) : order.cancellationRequest?.status && order.cancellationRequest.status !== "None" ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-gray-lux">{order.cancellationRequest.status}</p>
                                  {order.cancellationRequest.reason ? (
                                    <p className="max-w-[220px] text-xs text-gray-lux font-light">{order.cancellationRequest.reason}</p>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 font-light">—</span>
                              )}
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => handlePrintShippingLabel(order)}
                                className="w-full rounded-lg border border-gold-200/50 hover:border-gold-500 bg-white dark:bg-white/5 px-3 py-2 text-xs font-semibold text-gold-600 hover:text-gold-700 transition cursor-pointer"
                              >
                                Print Label
                              </button>
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => handlePrintInvoice(order)}
                                className="w-full rounded-lg border border-gold-200/50 hover:border-gold-500 bg-white dark:bg-white/5 px-3 py-2 text-xs font-semibold text-gold-600 hover:text-gold-700 transition cursor-pointer"
                              >
                                Print Invoice
                              </button>
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => handlePrintCombinedA4(order)}
                                className="w-full rounded-lg border border-gold-200/50 hover:border-gold-500 bg-white dark:bg-white/5 px-3 py-2 text-xs font-semibold text-gold-600 hover:text-gold-700 transition cursor-pointer"
                              >
                                Print A4 Both
                              </button>
                            </td>
                            <td className="py-3">
                              {order.status !== "Cancelled" ? (
                                <button
                                  onClick={() => handleArchiveOrder(order)}
                                  disabled={order.__isArchived}
                                  className="rounded-full border border-warning-lux/40 bg-warning-lux/5 px-3 py-1 text-xs font-semibold text-warning-lux hover:bg-warning-lux hover:text-white transition cursor-pointer"
                                >
                                  Archive
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400 font-light">-</span>
                              )}
                            </td>
                            <td className="py-3">
                              {order.__isArchived ? (
                                <button
                                  onClick={() => handleRestoreOrder(order)}
                                  className="rounded-full border border-success-lux/40 bg-success-lux/5 px-3 py-1 text-xs font-semibold text-success-lux hover:bg-success-lux hover:text-white transition cursor-pointer"
                                >
                                  Restore
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeleteOrder(order)}
                                  disabled={order.status !== "Cancelled"}
                                  className="rounded-full bg-danger-lux px-3 py-1 text-xs font-semibold text-white hover:bg-danger-lux/95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {ordersForViewFiltered.length === 0 ? (
                          <tr>
                            <td className="py-6 text-gray-500 text-center font-light" colSpan={16}>
                              No orders found for this filter.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

const NewsletterSubscribersSection = ({ authHeader }) => {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/newsletter/subscribers", authHeader);
      setSubscribers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authHeader]);

  const handleDeleteSubscriber = async (id) => {
    const confirmed = window.confirm("Are you sure you want to remove this subscriber?");
    if (!confirmed) return;

    // Optimistic Update: instantly update state to make UI feel very fast
    const originalSubscribers = [...subscribers];
    setSubscribers((prev) => prev.filter((item) => item._id !== id));
    setSuccess("Subscriber removed successfully.");
    setTimeout(() => setSuccess(""), 3500);

    try {
      await api.delete(`/admin/newsletter/subscribers/${id}`, authHeader);
    } catch (err) {
      // Revert state if API call fails
      setSubscribers(originalSubscribers);
      setError(err.response?.data?.message || "Failed to delete subscriber");
      setTimeout(() => setError(""), 4000);
    }
  };

  const handleCopyAllEmails = () => {
    if (subscribers.length === 0) {
      setError("No subscribers to copy.");
      setTimeout(() => setError(""), 3500);
      return;
    }
    const emailsList = subscribers.map((sub) => sub.email).join(", ");

    // Quick copy to clipboard
    navigator.clipboard.writeText(emailsList)
      .then(() => {
        setSuccess("Copied all emails to clipboard!");
        setTimeout(() => setSuccess(""), 3500);
      })
      .catch((err) => {
        setError("Failed to copy emails.");
        setTimeout(() => setError(""), 3500);
      });
  };

  return (
    <div className="rounded-3xl border border-gold-200/20 dark:border-gold-900/10 bg-white dark:bg-[#1C1C1C] p-6 shadow-sm relative">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-200/10 dark:border-gold-900/10 pb-4">
        <div>
          <h3 className="text-lg font-serif font-light text-luxury-black dark:text-white flex items-center gap-2">
            <svg className="h-5 w-5 text-gold-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Newsletter Subscribers
          </h3>
          <p className="mt-1 text-xs text-gray-lux dark:text-gray-400 font-light">
            Manage email subscriptions and export addresses for campaigns.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyAllEmails}
          disabled={subscribers.length === 0}
          className="flex items-center gap-1.5 rounded-full bg-gold-500 hover:bg-gold-hover px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition disabled:cursor-not-allowed disabled:opacity-50 shadow-sm cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy All Emails ({subscribers.length})
        </button>
      </div>

      {/* Local Feedback Alerts */}
      {success && (
        <div className="my-3 rounded-xl bg-success-lux/10 border border-success-lux/20 p-3 text-xs text-success-lux flex items-center gap-2 transition animate-fade-in shadow-2xs">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="my-3 rounded-xl bg-danger-lux/10 border border-danger-lux/20 p-3 text-xs text-danger-lux flex items-center gap-2 transition animate-fade-in shadow-2xs">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gold-200/10 dark:border-gold-900/10 text-gray-lux dark:text-gray-400">
                <th className="py-3 px-4 font-sans font-bold uppercase tracking-wider">Email Address</th>
                <th className="py-3 px-4 font-sans font-bold uppercase tracking-wider">Subscribed Date</th>
                <th className="py-3 px-4 text-center font-sans font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-200/10 dark:divide-gold-900/10 text-luxury-black dark:text-white">
              {subscribers.map((sub) => (
                <tr key={sub._id} className="hover:bg-gold-500/5 transition-colors">
                  <td className="py-3 px-4 font-medium">{sub.email}</td>
                  <td className="py-3 px-4 text-gray-lux dark:text-gray-400">
                    {new Date(sub.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteSubscriber(sub._id)}
                      className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-danger-lux border border-danger-lux/30 bg-danger-lux/5 hover:bg-danger-lux hover:text-white transition-all duration-300 cursor-pointer shadow-2xs"
                      title="Remove Subscriber"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-gray-lux font-light" colSpan={3}>
                    No newsletter subscribers yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
