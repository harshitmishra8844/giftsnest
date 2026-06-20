import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { clearAdminAuth, getAdminAuth } from "../services/adminAuth";

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
};
const emptyCouponForm = {
  code: "",
  type: "percent",
  value: "",
  minCartValue: "",
  maxDiscount: "",
  endDate: "",
  active: true,
  maxRedemptions: "",
  maxRedemptionsPerUser: "",
};

const emptySpecialCouponForm = {
  type: "percent",
  value: "",
  minCartValue: "0",
  maxDiscount: "",
  endDate: "",
  active: true,
  maxRedemptions: "",
  maxRedemptionsPerUser: "1",
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
  const [storeInfo, setStoreInfo] = useState(defaultStoreInfo);
  const [savingStoreInfo, setSavingStoreInfo] = useState(false);
  const [uploadingStoreLogo, setUploadingStoreLogo] = useState(false);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [trackingCarriersByOrder, setTrackingCarriersByOrder] = useState({});
  const [stockDrafts, setStockDrafts] = useState({});
  const [savingStockId, setSavingStockId] = useState("");
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
    () =>
      selectedCategory === "All"
        ? products
        : products.filter(
            (product) => {
              const productCat = String(product.category || "").toLowerCase();
              const selectedCat = selectedCategory.toLowerCase();
              const categoriesList = productCat.split(",").map(c => c.trim());
              return categoriesList.includes(selectedCat);
            }
          ),
    [products, selectedCategory]
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
    if (orderStatusFilter === "all") return ordersForView;
    const normalizedFilter = String(orderStatusFilter || "").trim().toLowerCase();
    return ordersForView.filter(
      (order) => String(order?.status || "").trim().toLowerCase() === normalizedFilter
    );
  }, [ordersForView, orderStatusFilter]);

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

  useEffect(() => {
    const visibleSet = new Set(visibleOrderIds);
    setSelectedOrderIds((prev) => prev.filter((orderId) => visibleSet.has(orderId)));
  }, [visibleOrderIds]);

  const findOrderCustomImage = (order) =>
    order.products?.find((product) => product.customization?.uploadedImage)?.customization?.uploadedImage || "";

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
      navigate("/admin/login");
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

  const handleLogout = () => {
    clearAdminAuth();
    setAdminAuth(null);
    navigate("/admin/login");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
                ${
                  remainingCount > 0
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
        endDate: couponForm.endDate ? String(couponForm.endDate).trim() : "",
        active: couponForm.active,
        maxRedemptions: maxRStr === "" ? null : Number(maxRStr),
        maxRedemptionsPerUser: maxUStr === "" ? null : Number(maxUStr),
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
      endDate: coupon.endDate ? String(coupon.endDate).slice(0, 10) : "",
      active: coupon.active,
      maxRedemptions: coupon.maxRedemptions != null ? String(coupon.maxRedemptions) : "",
      maxRedemptionsPerUser: coupon.maxRedemptionsPerUser != null ? String(coupon.maxRedemptionsPerUser) : "",
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

  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="h-24 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-100" />
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 p-6 text-white md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">Management Console</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-serif font-light tracking-tight text-white">Niyora Gifts Administrator</h1>
          </div>
          <button
            onClick={handleLogout}
            className="self-start md:self-auto rounded-full bg-white px-5 py-2.5 text-xs font-bold text-emerald-950 shadow-sm transition duration-300 hover:bg-red-50 hover:text-red-700 hover:scale-105"
          >
            Logout Console
          </button>
        </div>
      </div>

      {error ? <p className="text-xs text-red-650 font-medium">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-800 font-medium">{success}</p> : null}
      {uploadWarning ? <p className="text-xs text-amber-800 font-medium">{uploadWarning}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-150/40 bg-white/70 backdrop-blur-md p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Products</p>
          <p className="mt-1.5 text-2xl font-serif font-light text-gray-950">{products.length}</p>
        </div>
        <div className="rounded-3xl border border-gray-150/40 bg-white/70 backdrop-blur-md p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Orders</p>
          <p className="mt-1.5 text-2xl font-serif font-light text-gray-950">{orders.length}</p>
        </div>
        <div className="rounded-3xl border border-gray-150/40 bg-white/70 backdrop-blur-md p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Revenue</p>
          <p className="mt-1.5 text-2xl font-serif font-light text-emerald-800">
            INR {orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)}
          </p>
        </div>
        <div className="rounded-3xl border border-gray-150/40 bg-white/70 backdrop-blur-md p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Coupons</p>
          <p className="mt-1.5 text-2xl font-serif font-light text-gray-950">{coupons.filter((coupon) => coupon.active).length}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-150/40 bg-white/70 backdrop-blur-md p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-xl font-serif font-light tracking-tight text-gray-950">Stock Management</h3>
            <p className="mt-1 text-xs text-gray-500 font-light">
              Monitor and adjust product inventory. Stock values dynamically decrement upon completed customer orders.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/80 border border-gray-200/60 px-3.5 py-1.5 font-medium text-gray-700 shadow-2xs">
              Total Units: <strong className="font-semibold text-gray-955">{stockSummary.units}</strong>
            </span>
            <span className="rounded-full bg-amber-50/50 border border-amber-200/50 px-3.5 py-1.5 font-medium text-amber-900">
              Low: <strong className="font-semibold text-amber-955">{stockSummary.low}</strong>
            </span>
            <span className="rounded-full bg-rose-50/50 border border-rose-200/30 px-3.5 py-1.5 font-medium text-rose-900">
              Out of Stock: <strong className="font-semibold text-rose-955">{stockSummary.out}</strong>
            </span>
          </div>
        </div>

        <div className="mt-6 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-150/40">
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Product Name</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Category</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Price</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Stock</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Status</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans text-center">Adjust Stock</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productsByStock.map((product) => {
                const s = Number(product.stock ?? 0);
                const statusBadge =
                  s <= 0 ? (
                    <span className="inline-flex rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                      Out of stock
                    </span>
                  ) : s <= 5 ? (
                    <span className="inline-flex rounded-full bg-amber-50 border border-amber-200/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                      Low
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                      In Stock
                    </span>
                  );
                return (
                  <tr key={product._id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="py-3.5 pr-3 font-serif text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="py-3.5 px-1 text-gray-500 font-light">{product.category}</td>
                    <td className="py-3.5 px-1 font-light text-gray-600">INR {product.price}</td>
                    <td className="py-3.5 px-1 tabular-nums font-semibold text-gray-900">{s}</td>
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
                          className="w-16 rounded-full border border-gray-200/80 bg-white px-2.5 py-1 text-center text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
                        />
                        <button
                          type="button"
                          disabled={savingStockId === product._id}
                          onClick={() => saveProductStock(product._id)}
                          className="rounded-full bg-emerald-950 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-900 transition-all duration-300 disabled:opacity-50 hover-float"
                        >
                          {savingStockId === product._id ? "…" : "Save"}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEditProduct(product)}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors hover:underline"
                      >
                        Edit Details
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-gray-400 font-light" colSpan={7}>
                    No products cataloged yet. Add products below to begin.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-3.5 md:hidden">
          {productsByStock.map((product) => {
            const s = Number(product.stock ?? 0);
            const statusBadge =
              s <= 0 ? (
                <span className="inline-flex rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                  Out of stock
                </span>
              ) : s <= 5 ? (
                <span className="inline-flex rounded-full bg-amber-50 border border-amber-200/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                  Low
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                  In Stock
                </span>
              );
            return (
              <article key={product._id} className="rounded-2xl border border-gray-150/40 bg-white/50 p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-sm font-serif font-medium text-gray-950">{product.name}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400 tracking-wider uppercase font-light">
                      {product.category} · INR {product.price}
                    </p>
                  </div>
                  {statusBadge}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-500 font-light">Stock:</span>
                    <input
                      type="number"
                      min="0"
                      value={stockInputValue(product)}
                      onChange={(e) =>
                        setStockDrafts((prev) => ({ ...prev, [product._id]: e.target.value }))
                      }
                      className="w-16 rounded-full border border-gray-200/80 bg-white px-2.5 py-1 text-center text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
                    />
                    <button
                      type="button"
                      disabled={savingStockId === product._id}
                      onClick={() => saveProductStock(product._id)}
                      className="rounded-full bg-emerald-950 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-900 transition-all duration-300 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditProduct(product)}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
                  >
                    Edit Details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

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
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Valid Until</label>
            <input
              type="date"
              value={couponForm.endDate || ""}
              onChange={(e) => setCouponForm((prev) => ({ ...prev, endDate: e.target.value }))}
              className="rounded-full border border-gray-200 bg-white/50 px-4 py-2 text-xs font-light text-gray-800 focus:border-emerald-950 focus:ring-1 focus:ring-emerald-950 transition-all"
              title="Valid until (optional)"
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
          {coupons.map((coupon) => (
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
              {coupons.map((coupon) => (
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
              {coupons.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-gray-400 font-light" colSpan={9}>
                    No coupons created yet. Use form above to add your first promotion.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200/40 bg-white/70 backdrop-blur-md p-6 shadow-sm">
        <h3 className="text-xl font-serif font-light tracking-tight text-gray-950">Catalog Categories</h3>
        <p className="mt-1 text-xs text-gray-500 font-light mb-4">Filter visible products below or set default category configuration for new entries.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("All");
              if (!editingId) {
                setForm((prev) => ({ ...prev, category: "" }));
              }
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              selectedCategory === "All"
                ? "bg-emerald-950 text-white border border-emerald-950 shadow-sm scale-102"
                : "bg-white/50 border border-gray-200 text-gray-650 hover:border-emerald-950/40 hover:text-emerald-950 cursor-pointer"
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
                onClick={() => {
                  setSelectedCategory(category);
                  if (!editingId) {
                    setForm((prev) => ({ ...prev, category }));
                  }
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  selectedCategory === category
                    ? "bg-emerald-950 text-white border border-emerald-950 shadow-sm scale-102"
                    : "bg-white/50 border border-gray-200 text-gray-650 hover:border-emerald-950/40 hover:text-emerald-950 cursor-pointer"
                }`}
              >
                {category} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">
          {editingId ? "Edit Product" : "Add Product"} {selectedCategory !== "All" ? `- ${selectedCategory}` : ""}
        </h3>
        <form onSubmit={handleSaveProduct} className="mt-3 grid gap-3 md:grid-cols-2">
          <input name="name" value={form.name} onChange={handleFormChange} placeholder="Name" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input name="price" type="number" min="1" value={form.price} onChange={handleFormChange} placeholder="Price" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input
            name="stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={handleFormChange}
            placeholder="Stock quantity"
            required
            title="Units available to sell"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="category"
            value={form.category}
            onChange={handleFormChange}
            placeholder={selectedCategory !== "All" ? `Category (${selectedCategory})` : "Category"}
            required
            list="category-suggestions"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <datalist id="category-suggestions">
            {productCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Select Categories (click to toggle multiple)
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-white/40 rounded-2xl border border-gray-200/40 shadow-inner">
              {productCategories.map((cat) => {
                const isSelected = String(form.category || "")
                  .split(",")
                  .map((item) => item.trim())
                  .includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleToggleCategorySelection(cat)}
                    className={`rounded-full px-3.5 py-1 text-xs transition cursor-pointer select-none border ${
                      isSelected
                        ? "bg-emerald-950 text-white border-emerald-950 shadow-sm font-semibold"
                        : "bg-white/80 border-gray-200 text-gray-650 font-light hover:border-emerald-900/40 hover:text-emerald-900"
                    }`}
                  >
                    {isSelected ? `✓ ${cat}` : `+ ${cat}`}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Upload Product Images</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              {imageFile ? (
                <p className="text-xs text-gray-600">Selected: {imageFile.name}</p>
              ) : null}
              <button
                type="button"
                onClick={handleImageUpload}
                disabled={uploadingImage}
                className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-70"
              >
                {uploadingImage ? "Uploading..." : "Upload Image"}
              </button>
            </div>
            {form.image ? (
              <p className="mt-2 text-xs text-gray-500">Primary image set. You can upload more images.</p>
            ) : (
              <p className="mt-2 text-xs text-amber-600">Upload at least one image to continue.</p>
            )}
          </div>
          
          {allFormImages.length > 0 ? (
            <div className="md:col-span-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Image Gallery Previews</p>
              <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                {allFormImages.map((url, idx) => {
                  const isPrimary = form.image === url;
                  return (
                    <div key={idx} className="relative group w-24 h-24 md:w-28 md:h-28 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center shadow-sm">
                      <img src={url} alt={`Preview ${idx + 1}`} className="max-w-full max-h-full object-contain p-1" />
                      {isPrimary && (
                        <span className="absolute top-0 left-0 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg shadow-sm">
                          Primary
                        </span>
                      )}
                      {/* Hover controls */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryFormImage(url)}
                            title="Set as primary image"
                            className="p-1.5 rounded-full bg-white text-emerald-600 hover:bg-emerald-50 transition shadow"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteFormImage(url)}
                          title="Remove image"
                          className="p-1.5 rounded-full bg-white text-red-600 hover:bg-red-50 transition shadow"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <textarea
            name="imagesText"
            value={form.imagesText}
            onChange={handleFormChange}
            placeholder="Additional image URLs (one per line or comma separated)"
            rows={3}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleFormChange}
            placeholder="Description"
            required
            rows={3}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
          />
          <textarea
            name="highlightsText"
            value={form.highlightsText}
            onChange={handleFormChange}
            placeholder={"Highlights (one point per line)\nPremium finish\nSame-day gifting option\nCustom message included"}
            rows={4}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <textarea
            name="specificationsText"
            value={form.specificationsText}
            onChange={handleFormChange}
            placeholder={"Specifications (one per line: Label: Value)\nBrand: Niyora Gifts\nMaterial: Ceramic\nOccasion: Birthday"}
            rows={4}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="deliveryTime"
            value={form.deliveryTime}
            onChange={handleFormChange}
            placeholder="Delivery time (e.g. 2-4 days)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="material"
            value={form.material}
            onChange={handleFormChange}
            placeholder="Material (e.g. Ceramic, MDF Wood)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="dimensions"
            value={form.dimensions}
            onChange={handleFormChange}
            placeholder="Dimensions (e.g. 10 x 8 x 4 inch)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="weight"
            value={form.weight}
            onChange={handleFormChange}
            placeholder="Weight (e.g. 450g)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="occasion"
            value={form.occasion}
            onChange={handleFormChange}
            placeholder="Occasion (e.g. Birthday, Anniversary)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <textarea
            name="careInstructions"
            value={form.careInstructions}
            onChange={handleFormChange}
            placeholder="Care instructions (e.g. Keep away from water, wipe with dry cloth)"
            rows={2}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
          />
          <div className="flex items-center gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {saving ? "Saving..." : editingId ? "Update Product" : "Create Product"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId("");
                  setForm(emptyForm);
                  setImageFile(null);
                }}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">
          Manage Products {selectedCategory !== "All" ? `- ${selectedCategory}` : ""}
        </h3>
        <div className="mt-3 space-y-3 md:hidden">
          {filteredProducts.map((product) => (
            <article key={product._id} className="rounded-xl border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-900">{product.name}</p>
              <p className="mt-1 text-xs text-gray-600">
                {product.category} • INR {product.price} • Stock: {product.stock ?? 0}
              </p>
              <div className="mt-2 flex gap-3 text-xs">
                <button onClick={() => startEditProduct(product)} className="text-blue-600 hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDeleteProduct(product._id)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </article>
          ))}
          {filteredProducts.length === 0 ? <p className="text-sm text-gray-500">No products in this category.</p> : null}
        </div>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Category</th>
                <th className="py-2">Price</th>
                <th className="py-2">Stock</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product._id} className="border-t border-gray-100">
                  <td className="py-2">{product.name}</td>
                  <td className="py-2">{product.category}</td>
                  <td className="py-2">INR {product.price}</td>
                  <td className="py-2 tabular-nums">{product.stock ?? 0}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button onClick={() => startEditProduct(product)} className="text-blue-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteProduct(product._id)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 ? (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={5}>
                    No products in this category.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Manage Orders</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {["all", "active", "archived"].map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setOrderViewFilter(view)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                orderViewFilter === view
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800"
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
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            {selectedOrderIds.length} selected ({selectedOrdersForPrint.length} print-ready)
          </p>
          <select
            value={labelPrintFilter}
            onChange={(event) => setLabelPrintFilter(event.target.value)}
            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800"
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
            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            {selectAllButtonLabel}
          </button>
          <button
            type="button"
            onClick={() => setSelectedOrderIds([])}
            disabled={selectedOrderIds.length === 0}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear selection
          </button>
          <button
            type="button"
            onClick={() => handlePrintShippingLabelsBatch(selectedOrdersForPrint)}
            disabled={selectedOrdersForPrint.length === 0}
            className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Print Selected Labels ({selectedOrdersForPrint.length})
          </button>
          <button
            type="button"
            onClick={() => handlePrintInvoicesBatch(selectedOrdersForPrint)}
            disabled={selectedOrdersForPrint.length === 0}
            className="rounded-full bg-sky-700 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Print Selected Invoices ({selectedOrdersForPrint.length})
          </button>
          <button
            type="button"
            onClick={() => handlePrintCombinedA4Batch(selectedOrdersForPrint)}
            disabled={selectedOrdersForPrint.length === 0}
            className="rounded-full bg-indigo-700 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Print Shipping + Invoice ({selectedOrdersForPrint.length})
          </button>
        </div>
        <div className="mt-3 space-y-3 md:hidden">
          {ordersForViewFiltered.map((order) => (
            <article key={order._id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.includes(order._id)}
                    onChange={() => toggleOrderSelection(order._id)}
                    aria-label={`Select order ${getOrderDisplayId(order)}`}
                  />
                  <p className="text-sm font-semibold text-gray-900">{getOrderDisplayId(order)}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                    order.__isArchived ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {order.__isArchived ? "Archived" : "Active"}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600">{order.address?.fullName || "Guest"} • INR {order.totalPrice}</p>
              <p className="text-xs text-gray-600">Status: {order.status}</p>
              <p className="text-xs text-gray-600 break-all">Tracking: {order.trackingId || "-"}</p>
              {findOrderCustomImage(order) ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={findOrderCustomImage(order)}
                    alt="Uploaded custom"
                    className="h-14 w-14 rounded-lg object-cover border"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200x200?text=Image+Error';
                      e.target.alt = 'Image failed to load';
                    }}
                  />
                  <a
                    href={findOrderCustomImage(order)}
                    download={`order-${order.orderCode || order._id}-custom-image.png`}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    onClick={(e) => {
                      // If it's a base64 image, create a download link
                      const imageSrc = findOrderCustomImage(order);
                      if (imageSrc.startsWith('data:image/')) {
                        e.preventDefault();
                        const link = document.createElement('a');
                        link.href = imageSrc;
                        link.download = `order-${order.orderCode || order._id}-custom-image.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                  >
                    Download image
                  </a>
                </div>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => handlePrintShippingLabel(order)} className="rounded-full border border-gray-200 px-3 py-1 text-xs">Label</button>
                <button onClick={() => handlePrintInvoice(order)} className="rounded-full border border-gray-200 px-3 py-1 text-xs">Invoice</button>
                {order.__isArchived ? (
                  <button onClick={() => handleRestoreOrder(order)} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">Restore</button>
                ) : (
                  <button
                    onClick={() => handleArchiveOrder(order)}
                    disabled={order.status === "Cancelled"}
                    className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-700 disabled:opacity-50"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => handleDeleteOrder(order)}
                  disabled={order.status !== "Cancelled" || order.__isArchived}
                  className="rounded-full bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {ordersForView.length === 0 ? <p className="text-sm text-gray-500">No orders found for this filter.</p> : null}
        </div>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1480px] text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleOrdersSelected}
                    onChange={toggleSelectAllVisibleOrders}
                    aria-label="Select all visible orders"
                  />
                </th>
                <th className="py-2">Order ID</th>
                <th className="py-2">Status</th>
                <th className="py-2">Custom Image</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Shipping Address</th>
                <th className="py-2">Total</th>
                <th className="py-2">Update Status</th>
                <th className="py-2">Tracking ID</th>
                <th className="py-2">Cancellation</th>
                <th className="py-2">Shipping Label</th>
                <th className="py-2">Invoice</th>
                <th className="py-2">A4 Combined</th>
                <th className="py-2">Archive</th>
                <th className="py-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {ordersForViewFiltered.map((order) => (
                <tr key={order._id} className="border-t border-gray-100">
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order._id)}
                      onChange={() => toggleOrderSelection(order._id)}
                      aria-label={`Select order ${getOrderDisplayId(order)}`}
                    />
                  </td>
                  <td className="py-2">{getOrderDisplayId(order)}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        order.__isArchived ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {order.__isArchived ? "Archived" : "Active"}
                    </span>
                  </td>
                  <td className="py-2">
                    {findOrderCustomImage(order) ? (
                      <div className="flex flex-col gap-2">
                        <img
                          src={findOrderCustomImage(order)}
                          alt="Uploaded custom"
                          className="h-16 w-16 rounded-lg object-cover border"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/200x200?text=Image+Error';
                            e.target.alt = 'Image failed to load';
                          }}
                        />
                        <a
                          href={findOrderCustomImage(order)}
                          download={`order-${order.orderCode || order._id}-custom-image.png`}
                          className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          onClick={(e) => {
                            // If it's a base64 image, create a download link
                            const imageSrc = findOrderCustomImage(order);
                            if (imageSrc.startsWith('data:image/')) {
                              e.preventDefault();
                              const link = document.createElement('a');
                              link.href = imageSrc;
                              link.download = `order-${order.orderCode || order._id}-custom-image.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }
                          }}
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">No custom image</span>
                    )}
                  </td>
                  <td className="py-2">{order.address?.fullName || "Guest"}</td>
                  <td className="py-2">
                    <div className="space-y-0.5">
                      <p>{order.address?.line1 || "-"}</p>
                      <p className="text-gray-500">
                        {[order.address?.city, order.address?.state, order.address?.postalCode]
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </p>
                      <p className="text-gray-500">{order.address?.country || "-"}</p>
                      <p className="text-gray-500">{order.address?.phone || "-"}</p>
                    </div>
                  </td>
                  <td className="py-2">INR {order.totalPrice}</td>
                  <td className="py-2">{order.status}</td>
                  <td className="py-2">
                    <select
                      value={order.status}
                      disabled={order.__isArchived}
                      onChange={(e) => handleOrderStatusChange(order._id, e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={trackingCarriersByOrder[order._id] || order.trackingCarrier || "generic"}
                        onChange={(e) => handleTrackingCarrierChange(order._id, e.target.value)}
                        disabled={order.__isArchived || !isTrackingEditable(order.status)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-gray-50"
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
                        placeholder={isTrackingEditable(order.status) ? "Enter tracking ID" : "Status must be Shipped"}
                        disabled={order.__isArchived || !isTrackingEditable(order.status)}
                        className="w-40 rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-gray-50"
                      />
                      <button
                        onClick={() => handleSaveTrackingId(order)}
                        disabled={order.__isArchived || !isTrackingEditable(order.status)}
                        className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="py-2">
                    {order.cancellationRequest?.status === "Pending" ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-amber-700">Pending</p>
                        <p className="max-w-[220px] text-xs text-gray-600">{order.cancellationRequest.reason}</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleReviewCancellation(order, "approve")}
                            className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewCancellation(order, "reject")}
                            className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : order.cancellationRequest?.status && order.cancellationRequest.status !== "None" ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-800">{order.cancellationRequest.status}</p>
                        {order.cancellationRequest.reason ? (
                          <p className="max-w-[220px] text-xs text-gray-600">{order.cancellationRequest.reason}</p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handlePrintShippingLabel(order)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Print Label
                    </button>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handlePrintInvoice(order)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Print Invoice
                    </button>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handlePrintCombinedA4(order)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Print A4 Both
                    </button>
                  </td>
                  <td className="py-2">
                    {order.status !== "Cancelled" ? (
                      <button
                        onClick={() => handleArchiveOrder(order)}
                        disabled={order.__isArchived}
                        className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                      >
                        Archive
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-2">
                    {order.__isArchived ? (
                      <button
                        onClick={() => handleRestoreOrder(order)}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Restore
                      </button>
                    ) : (
                    <button
                      onClick={() => handleDeleteOrder(order)}
                      disabled={order.status !== "Cancelled"}
                      className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                    )}
                  </td>
                </tr>
              ))}
              {ordersForViewFiltered.length === 0 ? (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={15}>
                    No orders found for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <NewsletterSubscribersSection authHeader={authHeader} />
    </section>
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
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 relative">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Newsletter Subscribers
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage email subscriptions and export addresses for campaigns.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyAllEmails}
          disabled={subscribers.length === 0}
          className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy All Emails ({subscribers.length})
        </button>
      </div>

      {/* Local Feedback Alerts */}
      {success && (
        <div className="my-3 rounded-lg bg-emerald-50 border border-emerald-100 p-2.5 text-xs text-emerald-800 flex items-center gap-2 transition animate-fade-in shadow-xs">
          <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="my-3 rounded-lg bg-red-50 border border-red-100 p-2.5 text-xs text-red-800 flex items-center gap-2 transition animate-fade-in shadow-xs">
          <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading subscribers...
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="py-2">Email Address</th>
                <th className="py-2">Subscribed Date</th>
                <th className="py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => (
                <tr key={sub._id} className="border-t border-gray-100">
                  <td className="py-2 font-medium text-gray-900">{sub.email}</td>
                  <td className="py-2 text-gray-600">
                    {new Date(sub.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteSubscriber(sub._id)}
                      className="rounded-full px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition cursor-pointer"
                      title="Remove Subscriber"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 ? (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={3}>
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
