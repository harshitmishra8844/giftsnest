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
  storeName: "Gift Store",
  storePhone: "+91-90000-00000",
  storeAddress: "123 Commerce Street, Mumbai, Maharashtra 400001, India",
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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [orderViewFilter, setOrderViewFilter] = useState("active");
  const [storeInfo, setStoreInfo] = useState(defaultStoreInfo);
  const [savingStoreInfo, setSavingStoreInfo] = useState(false);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [trackingCarriersByOrder, setTrackingCarriersByOrder] = useState({});
  const [stockDrafts, setStockDrafts] = useState({});
  const [savingStockId, setSavingStockId] = useState("");

  const authHeader = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${adminAuth?.token || ""}` },
    }),
    [adminAuth]
  );

  const productCategories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => String(product.category || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      selectedCategory === "All"
        ? products
        : products.filter(
            (product) =>
              String(product.category || "").toLowerCase() === selectedCategory.toLowerCase()
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
      .map((item) => item.replace(/^[\-\u2022]\s*/, "").trim())
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
      if (String(data?.message || "").toLowerCase().includes("development mode")) {
        setUploadWarning(
          "Cloudinary is not configured yet. Image was uploaded and saved locally (development mode)."
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Image upload failed");
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

  const getAddressLines = (address = {}) => {
    const lineOne = [address.line1, address.city].filter(Boolean).join(", ");
    const lineTwo = [address.state, address.postalCode, address.country].filter(Boolean).join(", ");
    return [lineOne, lineTwo].filter(Boolean);
  };

  const getOrderDisplayId = (order) => order?.orderCode || order?._id || "N/A";

  const handlePrintShippingLabel = (order) => {
    const address = order?.address || {};
    const addressLines = getAddressLines(address);
    const items = Array.isArray(order?.products) ? order.products : [];
    const itemList = items
      .map((item) => `${item.name || "Item"} x${Number(item.quantity || 0)}`)
      .join("<br/>");

    const qrValue = encodeURIComponent(order._id || "");
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrValue}`;
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to print shipping label.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Shipping Label - ${getOrderDisplayId(order)}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111827; background: #fff; }
            .sheet { width: 100%; max-width: 190mm; margin: 0 auto; border: 2px solid #111827; padding: 10mm; box-sizing: border-box; }
            .row { display: flex; gap: 10mm; align-items: flex-start; }
            .col { flex: 1; }
            h1 { margin: 0 0 8px; font-size: 24px; letter-spacing: 0.5px; }
            h2 { margin: 0 0 6px; font-size: 14px; text-transform: uppercase; color: #374151; }
            p { margin: 4px 0; font-size: 13px; line-height: 1.35; }
            .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; min-height: 92px; }
            .meta { margin: 8px 0 10px; border-top: 1px dashed #6b7280; border-bottom: 1px dashed #6b7280; padding: 8px 0; }
            .items { margin-top: 10px; }
            .qr { text-align: center; min-width: 150px; }
            .qr img { width: 140px; height: 140px; border: 1px solid #d1d5db; padding: 4px; border-radius: 6px; }
            .barcode { margin-top: 8px; font-family: "Courier New", monospace; letter-spacing: 2px; font-size: 14px; }
            .muted { color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1>Shipping Label</h1>
            <div class="meta">
              <p><strong>Order ID:</strong> ${getOrderDisplayId(order)}</p>
              <p><strong>Status:</strong> ${order.status || "Pending"} | <strong>Amount:</strong> INR ${Number(order.totalPrice || 0).toFixed(2)}</p>
              <p><strong>Date:</strong> ${new Date(order.createdAt || Date.now()).toLocaleString()}</p>
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
                <p class="barcode">*${getOrderDisplayId(order)}*</p>
              </div>
            </div>
            <div class="items">
              <h2>Package Items</h2>
              <p>${itemList || "N/A"}</p>
            </div>
            <p class="muted">Generated from Admin Dashboard</p>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintInvoice = (order) => {
    const address = order?.address || {};
    const items = Array.isArray(order?.products) ? order.products : [];
    const subtotal = Number(order?.subtotal || 0);
    const discount = Number(order?.discountAmount || 0);
    const total = Number(order?.totalPrice || 0);

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to print invoice.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${getOrderDisplayId(order)}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111827; background: #fff; }
            .sheet { width: 100%; max-width: 190mm; margin: 0 auto; border: 1px solid #d1d5db; padding: 10mm; box-sizing: border-box; }
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
            <div class="top">
              <div class="box">
                <h1>Tax Invoice</h1>
                <p><strong>${storeInfo.storeName}</strong></p>
                <p>${storeInfo.storeAddress}</p>
                <p>Phone: ${storeInfo.storePhone}</p>
              </div>
              <div class="box">
                <h2>Invoice Details</h2>
                <p><strong>Order ID:</strong> ${getOrderDisplayId(order)}</p>
                <p><strong>Date:</strong> ${new Date(order.createdAt || Date.now()).toLocaleString()}</p>
                <p><strong>Status:</strong> ${order.status || "Pending"}</p>
                <p><strong>Coupon:</strong> ${order.couponCode || "-"}</p>
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
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map((item) => {
                    const qty = Number(item.quantity || 0);
                    const price = Number(item.price || 0);
                    const lineTotal = (qty * price).toFixed(2);
                    return `
                      <tr>
                        <td>${item.name || "Item"}</td>
                        <td>${qty}</td>
                        <td>INR ${price.toFixed(2)}</td>
                        <td>INR ${lineTotal}</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
            <div class="totals">
              <p><span>Subtotal</span><span>INR ${subtotal.toFixed(2)}</span></p>
              <p><span>Discount</span><span>- INR ${discount.toFixed(2)}</span></p>
              <p class="grand"><span>Total</span><span>INR ${total.toFixed(2)}</span></p>
            </div>
            <p class="muted">This is a computer-generated invoice from Admin Dashboard.</p>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintCombinedA4 = (order) => {
    const address = order?.address || {};
    const addressLines = getAddressLines(address);
    const items = Array.isArray(order?.products) ? order.products : [];
    const itemList = items
      .map((item) => `${item.name || "Item"} x${Number(item.quantity || 0)}`)
      .join("<br/>");
    const subtotal = Number(order?.subtotal || 0);
    const discount = Number(order?.discountAmount || 0);
    const total = Number(order?.totalPrice || 0);
    const qrValue = encodeURIComponent(order._id || "");
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrValue}`;

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to print combined A4.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Print - ${getOrderDisplayId(order)}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
            .sheet { width: 100%; max-width: 190mm; margin: 0 auto; box-sizing: border-box; }
            .section { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px; margin-bottom: 8px; }
            .split { display: flex; gap: 8px; align-items: flex-start; }
            .col { flex: 1; }
            h1 { margin: 0 0 6px; font-size: 18px; }
            h2 { margin: 0 0 4px; font-size: 12px; color: #374151; text-transform: uppercase; }
            p { margin: 3px 0; font-size: 11px; line-height: 1.35; }
            .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px; min-height: 70px; }
            .qr { text-align: center; min-width: 130px; }
            .qr img { width: 110px; height: 110px; border: 1px solid #d1d5db; padding: 3px; border-radius: 6px; }
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
          <div class="sheet">
            <div class="section">
              <h1>Shipping Label</h1>
              <p><strong>Order ID:</strong> ${getOrderDisplayId(order)} | <strong>Status:</strong> ${order.status || "Pending"}</p>
              <div class="split">
                <div class="col">
                  <h2>From</h2>
                  <div class="box">
                    <p><strong>${storeInfo.storeName}</strong></p>
                    <p>${storeInfo.storeAddress}</p>
                    <p>Phone: ${storeInfo.storePhone}</p>
                  </div>
                </div>
                <div class="col">
                  <h2>To</h2>
                  <div class="box">
                    <p><strong>${address.fullName || "N/A"}</strong></p>
                    <p>${address.phone || "-"}</p>
                    ${addressLines.map((line) => `<p>${line}</p>`).join("")}
                  </div>
                </div>
                <div class="qr">
                  <img src="${qrUrl}" alt="Order QR" />
                  <p class="muted">Order QR</p>
                </div>
              </div>
              <p><strong>Items:</strong> ${itemList || "N/A"}</p>
            </div>

            <div class="section">
              <h1>Tax Invoice</h1>
              <div class="split">
                <div class="col">
                  <p><strong>${storeInfo.storeName}</strong></p>
                  <p>${storeInfo.storeAddress}</p>
                  <p>Phone: ${storeInfo.storePhone}</p>
                </div>
                <div class="col">
                  <p><strong>Invoice Date:</strong> ${new Date(order.createdAt || Date.now()).toLocaleString()}</p>
                  <p><strong>Coupon:</strong> ${order.couponCode || "-"}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items
                    .map((item) => {
                      const qty = Number(item.quantity || 0);
                      const price = Number(item.price || 0);
                      const lineTotal = (qty * price).toFixed(2);
                      return `
                        <tr>
                          <td>${item.name || "Item"}</td>
                          <td>${qty}</td>
                          <td>INR ${price.toFixed(2)}</td>
                          <td>INR ${lineTotal}</td>
                        </tr>
                      `;
                    })
                    .join("")}
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
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      setError(err.response?.data?.message || "Failed to save coupon");
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
      setSuccess(msg);
      if (data.emailWarning) {
        setError(data.emailWarning);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate special coupon");
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
      setError(err.response?.data?.message || "Failed to delete coupon");
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
      await api.post(
        `/admin/coupons/${couponEmailTargetId}/send-email`,
        {
          to,
          customerName: couponEmailForm.customerName.trim(),
          message: couponEmailForm.message.trim(),
        },
        authHeader
      );
      setSuccess("Coupon code email sent successfully.");
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
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <button
          onClick={handleLogout}
          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Logout
        </button>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}
      {uploadWarning ? <p className="text-sm text-amber-700">{uploadWarning}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Products</p>
          <p className="text-2xl font-bold text-gray-900">{products.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Orders</p>
          <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            INR {orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Active Coupons</p>
          <p className="text-2xl font-bold text-gray-900">{coupons.filter((coupon) => coupon.active).length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-5 shadow-sm ring-1 ring-amber-100">
        <h3 className="text-lg font-semibold text-gray-900">Stock management</h3>
        <p className="mt-1 text-sm text-gray-600">
          Track inventory for products on the site. Stock is checked at checkout and reduced when payment succeeds.
          Set initial quantity when you add a product, or adjust counts here anytime.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white px-3 py-1 font-medium text-gray-800 ring-1 ring-gray-200">
            Total units: <strong>{stockSummary.units}</strong>
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-900">
            Low (1–5): <strong>{stockSummary.low}</strong>
          </span>
          <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-900">
            Out of stock: <strong>{stockSummary.out}</strong>
          </span>
        </div>
        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="py-2">Product</th>
                <th className="py-2">Category</th>
                <th className="py-2">Price</th>
                <th className="py-2">Stock</th>
                <th className="py-2">Status</th>
                <th className="py-2">Update</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productsByStock.map((product) => {
                const s = Number(product.stock ?? 0);
                const status =
                  s <= 0 ? (
                    <span className="font-semibold text-red-600">Out of stock</span>
                  ) : s <= 5 ? (
                    <span className="font-semibold text-amber-700">Low</span>
                  ) : (
                    <span className="text-emerald-700">In stock</span>
                  );
                return (
                  <tr key={product._id} className="border-t border-gray-100">
                    <td className="py-2 font-medium text-gray-900">{product.name}</td>
                    <td className="py-2 text-gray-600">{product.category}</td>
                    <td className="py-2">INR {product.price}</td>
                    <td className="py-2 tabular-nums">{s}</td>
                    <td className="py-2">{status}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={stockInputValue(product)}
                          onChange={(e) =>
                            setStockDrafts((prev) => ({ ...prev, [product._id]: e.target.value }))
                          }
                          className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          disabled={savingStockId === product._id}
                          onClick={() => saveProductStock(product._id)}
                          className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                        >
                          {savingStockId === product._id ? "…" : "Save"}
                        </button>
                      </div>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => startEditProduct(product)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit product
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 ? (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={7}>
                    No products yet. Add a product below to manage stock.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-2 md:hidden">
          {productsByStock.map((product) => {
            const s = Number(product.stock ?? 0);
            return (
              <article key={product._id} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                <p className="text-xs text-gray-600">
                  {product.category} · INR {product.price} · Stock {s}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={stockInputValue(product)}
                    onChange={(e) =>
                      setStockDrafts((prev) => ({ ...prev, [product._id]: e.target.value }))
                    }
                    className="w-24 rounded border border-gray-200 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    disabled={savingStockId === product._id}
                    onClick={() => saveProductStock(product._id)}
                    className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Save stock
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditProduct(product)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
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

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-5 shadow-sm ring-1 ring-violet-100">
        <h3 className="text-lg font-semibold text-gray-900">Special retention coupons</h3>
        <p className="mt-1 text-sm text-gray-600">
          Generate a cryptographically random code (prefix <span className="font-mono text-xs">GN-SP-</span>) for
          VIP or win-back offers. These codes are hidden from the public &quot;active coupons&quot; list on checkout.
          Limits apply only after payment succeeds. Leave max fields empty for unlimited (total and/or per customer).
          Optional: enter the customer&apos;s email below to send the new code automatically (requires SMTP in server
          <span className="font-mono text-xs"> .env</span>).
        </p>
        {lastGeneratedSpecialCode ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2">
            <span className="text-xs font-medium text-gray-600">Latest code:</span>
            <code className="rounded bg-violet-100 px-2 py-1 font-mono text-sm font-bold text-violet-900">
              {lastGeneratedSpecialCode}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(lastGeneratedSpecialCode);
                setSuccess("Code copied to clipboard.");
              }}
              className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700"
            >
              Copy
            </button>
          </div>
        ) : null}
        <form onSubmit={generateSpecialRetentionCoupon} className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            value={specialCouponForm.type}
            onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, type: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="percent">Percent</option>
            <option value="flat">Flat</option>
          </select>
          <input
            type="number"
            min="1"
            placeholder="Value"
            value={specialCouponForm.value}
            onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, value: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            min="0"
            placeholder="Minimum cart value"
            value={specialCouponForm.minCartValue}
            onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, minCartValue: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            min="0"
            placeholder="Max discount (optional)"
            value={specialCouponForm.maxDiscount}
            onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, maxDiscount: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="1"
            placeholder="Max total paid uses (empty = unlimited)"
            value={specialCouponForm.maxRedemptions}
            onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, maxRedemptions: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="1"
            placeholder="Max per customer (empty = unlimited)"
            value={specialCouponForm.maxRedemptionsPerUser}
            onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, maxRedemptionsPerUser: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={specialCouponForm.endDate || ""}
            onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, endDate: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            title="Valid until (optional)"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={specialCouponForm.active}
              onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, active: e.target.checked }))}
            />
            Active
          </label>
          <p className="md:col-span-3 text-xs font-semibold uppercase tracking-wide text-violet-900">
            Email to customer (optional)
          </p>
          <input
            type="email"
            autoComplete="off"
            placeholder="Customer email"
            value={specialCouponForm.customerEmail}
            onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-1"
          />
          <input
            placeholder="Customer name (optional)"
            value={specialCouponForm.customerName}
            onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, customerName: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-1"
          />
          <input
            placeholder="Short personal note (optional)"
            value={specialCouponForm.emailMessage}
            onChange={(e) => setSpecialCouponForm((prev) => ({ ...prev, emailMessage: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-1"
          />
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={generatingSpecial}
              className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-70"
            >
              {generatingSpecial ? "Generating…" : "Generate secure code & create"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">
          {editingCouponId ? "Edit Coupon" : "Create Coupon"} (Minimum cart value rule)
        </h3>
        <form onSubmit={saveCoupon} className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            placeholder="Code (e.g. GIFT10)"
            value={couponForm.code}
            onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-600"
            required
            disabled={editingCouponIsSpecial}
            title={editingCouponIsSpecial ? "System-generated codes cannot be changed" : undefined}
          />
          <select
            value={couponForm.type}
            onChange={(e) => setCouponForm((prev) => ({ ...prev, type: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="percent">Percent</option>
            <option value="flat">Flat</option>
          </select>
          <input
            type="number"
            min="1"
            placeholder="Value"
            value={couponForm.value}
            onChange={(e) => setCouponForm((prev) => ({ ...prev, value: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            min="0"
            placeholder="Minimum cart value"
            value={couponForm.minCartValue}
            onChange={(e) => setCouponForm((prev) => ({ ...prev, minCartValue: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            min="0"
            placeholder="Max discount (optional)"
            value={couponForm.maxDiscount}
            onChange={(e) => setCouponForm((prev) => ({ ...prev, maxDiscount: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={couponForm.endDate || ""}
            onChange={(e) => setCouponForm((prev) => ({ ...prev, endDate: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            title="Valid until (optional)"
          />
          <input
            type="number"
            min="1"
            placeholder="Max total paid uses (optional)"
            value={couponForm.maxRedemptions}
            onChange={(e) => setCouponForm((prev) => ({ ...prev, maxRedemptions: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            title="Empty = unlimited redemptions globally"
          />
          <input
            type="number"
            min="1"
            placeholder="Max per customer (optional)"
            value={couponForm.maxRedemptionsPerUser}
            onChange={(e) => setCouponForm((prev) => ({ ...prev, maxRedemptionsPerUser: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            title="Empty = unlimited uses per account"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={couponForm.active}
              onChange={(e) => setCouponForm((prev) => ({ ...prev, active: e.target.checked }))}
            />
            Active
          </label>
          <div className="md:col-span-3 flex items-center gap-2">
            <button type="submit" className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              {editingCouponId ? "Update Coupon" : "Create Coupon"}
            </button>
            {editingCouponId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingCouponId("");
                  setEditingCouponIsSpecial(false);
                  setCouponForm(emptyCouponForm);
                }}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Manage Coupons</h3>
        <p className="mt-1 text-sm text-gray-600">
          Use &quot;Email customer&quot; to send any active coupon code by email (configure SMTP on the server).
        </p>
        {couponEmailTargetId ? (
          <form
            onSubmit={submitCouponEmail}
            className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4"
          >
            <p className="text-sm font-semibold text-gray-900">
              Email coupon{" "}
              <span className="font-mono text-violet-800">
                {coupons.find((c) => c._id === couponEmailTargetId)?.code || "—"}
              </span>
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                type="email"
                required
                placeholder="Customer email"
                value={couponEmailForm.to}
                onChange={(e) => setCouponEmailForm((prev) => ({ ...prev, to: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                placeholder="Customer name (optional)"
                value={couponEmailForm.customerName}
                onChange={(e) => setCouponEmailForm((prev) => ({ ...prev, customerName: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Personal note (optional)"
                value={couponEmailForm.message}
                onChange={(e) => setCouponEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                rows={2}
                className="sm:col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={sendingCouponEmail}
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
              >
                {sendingCouponEmail ? "Sending…" : "Send email"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCouponEmailTargetId("");
                  setCouponEmailForm(emptyCouponEmailForm);
                }}
                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
        <div className="mt-3 space-y-3 md:hidden">
          {coupons.map((coupon) => (
            <article key={coupon._id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{coupon.code}</p>
                <div className="flex flex-wrap items-center gap-1">
                  {coupon.isSpecial ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-800">
                      Special
                    </span>
                  ) : null}
                  <span className="text-xs uppercase text-gray-600">{coupon.type}</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Value: {coupon.value} • Min Cart: INR {coupon.minCartValue}
              </p>
              <p className="text-xs text-gray-600">
                Max Discount: {coupon.maxDiscount ? `INR ${coupon.maxDiscount}` : "-"} • {coupon.active ? "Active" : "Inactive"}
              </p>
              <p className="text-xs text-gray-700">{formatCouponUsage(coupon)}</p>
              <p className="text-xs text-gray-600">
                Valid until:{" "}
                {coupon.endDate
                  ? new Date(coupon.endDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "No expiry"}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <button onClick={() => startEditCoupon(coupon)} className="text-blue-600 hover:underline">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => openCouponEmailPanel(coupon)}
                  disabled={!coupon.active}
                  className="text-sky-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Email customer
                </button>
                <button onClick={() => removeCoupon(coupon._id)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </article>
          ))}
          {coupons.length === 0 ? <p className="text-sm text-gray-500">No coupons found.</p> : null}
        </div>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="py-2">Code</th>
                <th className="py-2">Type</th>
                <th className="py-2">Value</th>
                <th className="py-2">Min Cart</th>
                <th className="py-2">Max Discount</th>
                <th className="py-2">Paid usage</th>
                <th className="py-2">Valid until</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon._id} className="border-t border-gray-100">
                  <td className="py-2">
                    <span className="font-semibold">{coupon.code}</span>
                    {coupon.isSpecial ? (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-800">
                        Special
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 uppercase">{coupon.type}</td>
                  <td className="py-2">{coupon.value}</td>
                  <td className="py-2">INR {coupon.minCartValue}</td>
                  <td className="py-2">{coupon.maxDiscount ? `INR ${coupon.maxDiscount}` : "-"}</td>
                  <td className="max-w-[220px] py-2 text-xs text-gray-700">{formatCouponUsage(coupon)}</td>
                  <td className="py-2 text-gray-700">
                    {coupon.endDate
                      ? new Date(coupon.endDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-2">{coupon.active ? "Active" : "Inactive"}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => startEditCoupon(coupon)} className="text-blue-600 hover:underline">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openCouponEmailPanel(coupon)}
                        disabled={!coupon.active}
                        className="text-sky-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Email
                      </button>
                      <button onClick={() => removeCoupon(coupon._id)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 ? (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={9}>
                    No coupons found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Product Categories</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("All");
              if (!editingId) {
                setForm((prev) => ({ ...prev, category: "" }));
              }
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              selectedCategory === "All"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            All ({products.length})
          </button>
          {productCategories.map((category) => {
            const count = products.filter((product) => product.category === category).length;
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
                className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                  selectedCategory === category
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
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
            placeholder={"Specifications (one per line: Label: Value)\nBrand: GiftNest\nMaterial: Ceramic\nOccasion: Birthday"}
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
        <div className="mt-3 flex flex-wrap gap-2">
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
        </div>
        <div className="mt-3 space-y-3 md:hidden">
          {ordersForView.map((order) => (
            <article key={order._id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{getOrderDisplayId(order)}</p>
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
          <table className="w-full min-w-[1400px] text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="py-2">Order ID</th>
                <th className="py-2">Status</th>
                <th className="py-2">Custom Image</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Shipping Address</th>
                <th className="py-2">Total</th>
                <th className="py-2">Update Status</th>
                <th className="py-2">Tracking ID</th>
                <th className="py-2">Shipping Label</th>
                <th className="py-2">Invoice</th>
                <th className="py-2">A4 Combined</th>
                <th className="py-2">Archive</th>
                <th className="py-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {ordersForView.map((order) => (
                <tr key={order._id} className="border-t border-gray-100">
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
              {ordersForView.length === 0 ? (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={13}>
                    No orders found for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default AdminDashboard;
