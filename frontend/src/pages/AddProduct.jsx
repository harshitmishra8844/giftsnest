import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { resolveMediaUrl } from "../services/api";
import { getAdminAuth } from "../services/adminAuth";

const DRAFT_KEY = "niyora_add_product_draft_v3";

const categorySuggestions = [
  "Birthday",
  "Anniversary",
  "Wedding",
  "Festive",
  "Personalized",
  "Corporate",
  "Home Decor",
  "Flowers",
  "Cakes",
  "Mugs",
  "Plants",
  "Combo Gifts",
];

const tagSuggestions = [
  "premium",
  "gift-ready",
  "handmade",
  "luxury",
  "personalized",
  "best-seller",
  "new-arrival",
  "fast-delivery",
];

const windowOptions = [
  "No Return",
  "3 Days",
  "7 Days",
  "10 Days",
  "15 Days",
  "30 Days",
];

const reasonOptions = [
  "Damaged Product",
  "Wrong Product",
  "Missing Item",
  "Manufacturing Defect",
  "Quality Issue",
  "Parcel Damaged",
];

const nonReturnableOptions = [
  "Personalized Products",
  "Used Products",
  "Opened Products",
  "Gift Cards",
  "Sale Items",
];

const shippingOptions = [
  { value: "Customer Pays", label: "Customer Pays" },
  { value: "Seller Pays", label: "Seller Pays" },
  { value: "Free Return", label: "Free Return" },
  { value: "Free Replacement", label: "Free Replacement" },
];

const personalizationInputs = [
  "Text",
  "Image Upload",
  "Custom Message",
  "Name Engraving",
];

const emptyForm = {
  name: "",
  sku: "",
  brand: "Niyora Gifts",
  productType: "",
  categoriesText: "",
  tagsText: "",
  price: "",
  originalPrice: "",
  gst: "0",
  shippingCharges: "0",
  codEnabled: true,
  stock: "10",
  lowStockAlert: "5",
  stockStatus: "In Stock",
  outOfStockNotification: false,
  imagesText: "",
  description: "",
  highlightsText: "",
  specificationsText: "",
  careInstructions: "",
  isPersonalized: false,
  personalizationTextLabel: "",
  personalizationTextLimit: "20",
  personalizationImageRequired: false,
  personalizationImageLabel: "",
  personalizationInputTypes: ["Text"],
  personalizationInstructions: "",
  returnAvailable: false,
  replacementAvailable: false,
  returnWindow: "7 Days",
  replacementWindow: "7 Days",
  returnConditions: [],
  replacementConditions: [],
  nonReturnableConditions: [],
  returnShipping: "Customer Pays",
  replacementShipping: "Customer Pays",
  returnInstructions: "",
  replacementInstructions: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  deliveryTime: "",
};

const parseDelimitedList = (value) =>
  String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const joinDelimitedList = (items) => Array.from(new Set(items.filter(Boolean))).join(", ");

const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const generateSku = (name) => {
  const base = slugify(name).replace(/-/g, "").toUpperCase().slice(0, 8) || "ITEM";
  const stamp = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NG-${base}-${stamp}`;
};

const getDiscountPercentage = (sellingPrice, originalPrice) => {
  const price = Number(sellingPrice);
  const mrp = Number(originalPrice);
  if (!Number.isFinite(price) || !Number.isFinite(mrp) || !price || !mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

const compressImage = async (file) => {
  if (!file?.type?.startsWith("image/")) return file;
  if (typeof window === "undefined") return file;

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

  const maxDimension = 1800;
  const scale = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.84)
  );

  URL.revokeObjectURL(image.src);

  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
};

const Section = ({ eyebrow, title, description, children, accent = "gold" }) => (
  <section className="overflow-hidden rounded-[28px] border border-gold-200/40 bg-white/85 shadow-[0_20px_70px_rgba(120,90,25,0.08)]">
    <div className="border-b border-gold-100/80 bg-gradient-to-r from-gold-50/80 via-white to-ivory px-5 py-4 md:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${accent === "rose" ? "text-rose-700" : "text-gold-700"}`}>
            {eyebrow}
          </p>
          <h3 className="mt-1 text-lg font-serif font-semibold text-luxury-black md:text-xl">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-6 text-text-secondary font-light">
            {description}
          </p>
        </div>
        <div className={`hidden h-10 w-10 shrink-0 rounded-full border md:grid place-items-center ${accent === "rose" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-gold-200 bg-gold-50 text-gold-700"}`}>
          <span className="text-sm font-bold">•</span>
        </div>
      </div>
    </div>
    <div className="p-5 md:p-6">{children}</div>
  </section>
);

const Field = ({ label, hint, children, className = "" }) => (
  <div className={className}>
    <div className="mb-1.5 flex items-end justify-between gap-3">
      <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">
        {label}
      </label>
      {hint ? <span className="text-[10px] text-text-secondary font-light">{hint}</span> : null}
    </div>
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className={`w-full rounded-2xl border border-champagne bg-white px-4 py-3 text-sm text-luxury-black outline-none transition placeholder:text-gray-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/15 ${props.className || ""}`}
  />
);

const Textarea = (props) => (
  <textarea
    {...props}
    className={`w-full rounded-2xl border border-champagne bg-white px-4 py-3 text-sm text-luxury-black outline-none transition placeholder:text-gray-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/15 ${props.className || ""}`}
  />
);

const Toggle = ({ checked, onChange, label, description }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex w-full items-start gap-3 rounded-3xl border px-4 py-4 text-left transition ${
      checked
        ? "border-gold-300 bg-gold-50/60"
        : "border-champagne bg-white hover:border-gold-200/70"
    }`}
  >
    <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${checked ? "border-gold-500 bg-gold-500 text-white" : "border-gray-300 bg-white text-transparent"}`}>
      ✓
    </span>
    <span>
      <span className="block text-sm font-semibold text-luxury-black">{label}</span>
      {description ? <span className="mt-0.5 block text-xs text-text-secondary font-light">{description}</span> : null}
    </span>
  </button>
);

const mapInitialDataToForm = (data) => {
  if (!data) return emptyForm;
  return {
    ...emptyForm,
    ...data,
    categoriesText: Array.isArray(data.categories) ? data.categories.join(", ") : (data.category || ""),
    tagsText: Array.isArray(data.tags) ? data.tags.join(", ") : "",
    imagesText: Array.isArray(data.images) ? data.images.join("\n") : (data.image || ""),
    highlightsText: Array.isArray(data.highlights) ? data.highlights.join("\n") : "",
    specificationsText: Array.isArray(data.specifications) 
      ? data.specifications.map(s => `${s.label}: ${s.value}`).join("\n") 
      : "",
    price: String(data.price || ""),
    originalPrice: String(data.originalPrice || ""),
    gst: String(data.gst || "0"),
    shippingCharges: String(data.shippingCharges || "0"),
    stock: String(data.stock ?? "10"),
    lowStockAlert: String(data.lowStockAlert ?? "5"),
    personalizationTextLimit: String(data.personalizationTextLimit ?? "20"),
    personalizationInputTypes: Array.isArray(data.personalizationInputTypes) && data.personalizationInputTypes.length 
      ? data.personalizationInputTypes 
      : ["Text"],
    returnConditions: Array.isArray(data.returnConditions) ? data.returnConditions : [],
    replacementConditions: Array.isArray(data.replacementConditions) ? data.replacementConditions : [],
    nonReturnableConditions: Array.isArray(data.nonReturnableConditions) ? data.nonReturnableConditions : [],
  };
};

const AddProduct = ({ initialData, onSuccess, onCancel }) => {
  const auth = getAdminAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(() => mapInitialDataToForm(initialData));
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [skuAutoMode, setSkuAutoMode] = useState(!initialData?.sku);
  const [dragActive, setDragActive] = useState(false);
  const [devUploadWarning, setDevUploadWarning] = useState("");

  useEffect(() => {
    if (initialData) return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.form) {
        setForm({ ...emptyForm, ...parsed.form });
      }
      if (typeof parsed?.skuAutoMode === "boolean") {
        setSkuAutoMode(parsed.skuAutoMode);
      }
      if (parsed?.draftSavedAt) {
        setDraftSavedAt(parsed.draftSavedAt);
      }
    } catch {
      // Ignore corrupt drafts.
    }
  }, [initialData]);

  useEffect(() => {
    if (initialData) return;
    const timer = setTimeout(() => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          form,
          skuAutoMode,
          draftSavedAt: new Date().toISOString(),
        })
      );
      setDraftSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 250);
    return () => clearTimeout(timer);
  }, [form, skuAutoMode, initialData]);

  useEffect(() => {
    if (!skuAutoMode) return;
    setForm((prev) => {
      const nextSku = generateSku(prev.name);
      if (prev.sku === nextSku) return prev;
      return { ...prev, sku: nextSku };
    });
  }, [form.name, skuAutoMode]);

  const authHeader = useMemo(() => {
    const headers = {};
    if (auth?.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return { headers };
  }, [auth]);

  const parsedImages = useMemo(() => parseDelimitedList(form.imagesText), [form.imagesText]);
  const discountPercentage = useMemo(
    () => getDiscountPercentage(form.price, form.originalPrice),
    [form.price, form.originalPrice]
  );

  const progress = useMemo(() => {
    const checks = [
      form.name,
      form.sku,
      form.categoriesText,
      form.price,
      form.originalPrice,
      parsedImages.length > 0,
      form.description,
      form.deliveryTime,
      form.returnAvailable || form.replacementAvailable,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, parsedImages.length]);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (name === "sku") {
      setSkuAutoMode(false);
    }
  };

  const updateDelimitedField = (key, nextValues) => {
    setForm((prev) => ({
      ...prev,
      [key]: joinDelimitedList(nextValues),
    }));
  };

  const appendDelimitedValue = (key, value) => {
    const clean = String(value || "").trim();
    if (!clean) return;
    setForm((prev) => {
      const nextValues = parseDelimitedList(prev[key]);
      if (nextValues.some((item) => item.toLowerCase() === clean.toLowerCase())) {
        return prev;
      }
      return { ...prev, [key]: joinDelimitedList([...nextValues, clean]) };
    });
  };

  const removeDelimitedValue = (key, value) => {
    setForm((prev) => {
      const nextValues = parseDelimitedList(prev[key]).filter((item) => item !== value);
      return { ...prev, [key]: joinDelimitedList(nextValues) };
    });
  };

  const updateImagesText = (nextImages) => {
    const unique = Array.from(new Set(nextImages.map((item) => String(item || "").trim()).filter(Boolean)));
    setForm((prev) => ({ ...prev, imagesText: unique.join("\n") }));
  };

  const moveImage = (index, direction) => {
    const next = [...parsedImages];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    updateImagesText(next);
  };

  const setFeaturedImage = (url) => {
    const next = [url, ...parsedImages.filter((item) => item !== url)];
    updateImagesText(next);
  };

  const removeImage = (url) => {
    updateImagesText(parsedImages.filter((item) => item !== url));
  };

  const handleFiles = async (files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    setUploading(true);
    setError("");
    setDevUploadWarning("");

    try {
      const uploadedUrls = [];
      for (const file of selectedFiles) {
        const compressed = await compressImage(file);
        const uploadData = new FormData();
        uploadData.append("image", compressed);
        const response = await api.post("/upload", uploadData, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...authHeader.headers,
          },
        });
        const url = response.data?.imageUrl || response.data?.url || "";
        if (url) uploadedUrls.push(url);
        if (response.data?.message && !response.data.message.toLowerCase().includes("successfully")) {
          setDevUploadWarning(response.data.message);
        }
      }
      updateImagesText([...parsedImages, ...uploadedUrls]);
    } catch (err) {
      const status = err?.response?.status;
      const apiMessage = String(err?.response?.data?.message || "").trim();
      if (status === 503) {
        setError(
          "Image upload failed because Cloudinary is not configured on the server. Add the credentials and retry."
        );
      } else {
        setError(apiMessage || err.message || "Failed to upload images.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = async (event) => {
    await handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragActive(false);
    await handleFiles(event.dataTransfer.files);
  };

  const getValidationMessage = () => {
    if (!auth?.token) return "Admin login is required to create products.";
    if (!form.name.trim()) return "Product name is required.";
    if (!form.categoriesText?.trim()) return "At least one category is required.";
    if (!form.price || Number(form.price) <= 0) return "Selling price must be greater than zero.";
    if (!form.originalPrice || Number(form.originalPrice) <= 0) return "Original price is required.";
    if (Number(form.originalPrice) < Number(form.price)) return "Original price should be greater than or equal to selling price.";
    if (!form.description.trim()) return "Product description is required.";
    if (!parsedImages.length) return "Please upload at least one product image.";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setDevUploadWarning("");

    const validationMessage = getValidationMessage();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        brand: form.brand.trim() || "Niyora Gifts",
        productType: form.productType.trim(),
        category: parseDelimitedList(form.categoriesText).join(", "),
        categories: parseDelimitedList(form.categoriesText),
        tags: parseDelimitedList(form.tagsText),
        price: Number(form.price),
        originalPrice: Number(form.originalPrice),
        gst: Number(form.gst || 0),
        shippingCharges: Number(form.shippingCharges || 0),
        codEnabled: Boolean(form.codEnabled),
        stock: Number(form.stock || 0),
        lowStockAlert: Number(form.lowStockAlert || 0),
        stockStatus: form.stockStatus,
        outOfStockNotification: Boolean(form.outOfStockNotification),
        image: parsedImages[0],
        images: parsedImages,
        description: form.description.trim(),
        highlights: parseDelimitedList(form.highlightsText),
        specifications: parseDelimitedList(form.specificationsText).map((line) => {
          const separatorIndex = line.indexOf(":");
          if (separatorIndex === -1) return null;
          return {
            label: line.slice(0, separatorIndex).trim(),
            value: line.slice(separatorIndex + 1).trim(),
          };
        }).filter(Boolean),
        careInstructions: form.careInstructions.trim(),
        isPersonalized: Boolean(form.isPersonalized),
        personalizationTextLabel: form.personalizationTextLabel.trim(),
        personalizationTextLimit: Number(form.personalizationTextLimit || 20),
        personalizationImageRequired: Boolean(form.personalizationImageRequired),
        personalizationImageLabel: form.personalizationImageLabel.trim(),
        personalizationInputTypes: form.personalizationInputTypes,
        personalizationInstructions: form.personalizationInstructions.trim(),
        returnAvailable: Boolean(form.returnAvailable),
        replacementAvailable: Boolean(form.replacementAvailable),
        returnWindow: form.returnWindow,
        replacementWindow: form.replacementWindow,
        returnConditions: form.returnConditions,
        replacementConditions: form.replacementConditions,
        nonReturnableConditions: form.nonReturnableConditions,
        returnShipping: form.returnShipping,
        replacementShipping: form.replacementShipping,
        returnInstructions: form.returnInstructions.trim(),
        replacementInstructions: form.replacementInstructions.trim(),
        weight: form.weight.trim(),
        length: form.length.trim(),
        width: form.width.trim(),
        height: form.height.trim(),
        deliveryTime: form.deliveryTime.trim(),
      };

      let responseData;
      if (initialData?._id) {
        const response = await api.put(`/admin/products/${initialData._id}`, payload, authHeader);
        responseData = response.data;
        setMessage(`Product updated successfully: ${responseData.product?.name || form.name}`);
      } else {
        const response = await api.post("/admin/products", payload, authHeader);
        responseData = response.data;
        setMessage(`Product added successfully: ${responseData.product?.name || form.name}`);
      }

      setForm({ ...emptyForm, sku: skuAutoMode ? generateSku("") : "" });
      setSkuAutoMode(!initialData?.sku);
      localStorage.removeItem(DRAFT_KEY);
      setDraftSavedAt("");
      setDevUploadWarning("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (onSuccess) {
        setTimeout(() => onSuccess(responseData.product), 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add product.");
    } finally {
      setLoading(false);
    }
  };

  const togglePolicyCondition = (field, value) => {
    const current = form[field] || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setForm((prev) => ({ ...prev, [field]: next }));
  };

  const toggleInputType = (value) => {
    const current = form.personalizationInputTypes || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setForm((prev) => ({ ...prev, personalizationInputTypes: next.length ? next : ["Text"] }));
  };

  const clearDraft = () => {
    setForm({ ...emptyForm, sku: generateSku("") });
    setSkuAutoMode(true);
    setMessage("");
    setError("");
    setDevUploadWarning("");
    setDraftSavedAt("");
    localStorage.removeItem(DRAFT_KEY);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sections = [
    "Basic",
    "Pricing",
    "Inventory",
    "Images",
    "Details",
    "Personalization",
    "Shipping",
    "Policy",
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6 rounded-[30px] border border-gold-200/50 bg-gradient-to-br from-ivory via-white to-gold-50/40 p-5 shadow-[0_25px_80px_rgba(120,90,25,0.08)] md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gold-700">
              Luxury Catalog Studio
            </p>
            <h2 className="mt-2 text-3xl font-serif text-luxury-black md:text-4xl">
              {initialData ? "Edit Product" : "Add Product"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary font-light">
              Build a premium product listing with structured pricing, inventory, personalization, shipping, and
              return/replacement policy controls.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:w-[34rem]">
            <div className="rounded-2xl border border-gold-200 bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-text-secondary font-bold">Progress</p>
              <p className="mt-1 text-2xl font-serif text-luxury-black">{progress}%</p>
            </div>
            <div className="rounded-2xl border border-gold-200 bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-text-secondary font-bold">Draft</p>
              <p className="mt-1 text-sm font-semibold text-luxury-black">
                {draftSavedAt || "Not yet saved"}
              </p>
            </div>
            <div className="rounded-2xl border border-gold-200 bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-text-secondary font-bold">Status</p>
              <p className="mt-1 text-sm font-semibold text-luxury-black">
                {skuAutoMode ? "Auto SKU" : "Manual SKU"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {sections.map((item) => (
            <span
              key={item}
              className="rounded-full border border-gold-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-700"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {!auth?.token ? (
        <div className="mb-6 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
          Admin login is required to create products.{" "}
          <Link to="/niyora-admin-portal-2026/login" className="font-bold underline decoration-amber-400">
            Go to admin login
          </Link>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section
          eyebrow="Basic Product Information"
          title="Identity and classification"
          description="Start with the product's identity, pricing anchor, categories, tags, and SKU controls."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Product Name">
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Personalized Gold Frame"
                required
              />
            </Field>
            <Field label="SKU" hint={skuAutoMode ? "Auto-generated" : "Manual override"}>
              <div className="flex gap-2">
                <Input
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="NG-XXXX-1234"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSkuAutoMode(true);
                    setForm((prev) => ({ ...prev, sku: generateSku(prev.name) }));
                  }}
                  className="shrink-0 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-gold-700 transition hover:bg-gold-100"
                >
                  Regenerate
                </button>
              </div>
            </Field>
            <Field label="Brand">
              <Input name="brand" value={form.brand} onChange={handleChange} />
            </Field>
            <Field label="Product Type">
              <Input
                name="productType"
                value={form.productType}
                onChange={handleChange}
                placeholder="Gift, Decor, Personalizable"
              />
            </Field>
            <Field label="Categories" hint="Comma-separated or use chips below" className="md:col-span-2">
              <Input
                name="categoriesText"
                value={form.categoriesText}
                onChange={handleChange}
                placeholder="Birthday, Anniversary, Personalized"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {categorySuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => appendDelimitedValue("categoriesText", item)}
                    className="rounded-full border border-gold-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-700 transition hover:bg-gold-50"
                  >
                    + {item}
                  </button>
                ))}
              </div>
              {parseDelimitedList(form.categoriesText).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {parseDelimitedList(form.categoriesText).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => removeDelimitedValue("categoriesText", item)}
                      className="rounded-full bg-gold-50 px-3 py-1 text-[11px] font-semibold text-gold-700 transition hover:bg-gold-100"
                    >
                      {item} ×
                    </button>
                  ))}
                </div>
              ) : null}
            </Field>
            <Field label="Tags" hint="Optional SEO / search tags">
              <Input
                name="tagsText"
                value={form.tagsText}
                onChange={handleChange}
                placeholder="premium, gift-ready, luxury"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {tagSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => appendDelimitedValue("tagsText", item)}
                    className="rounded-full border border-champagne bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary transition hover:border-gold-200 hover:text-gold-700"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        <Section
          eyebrow="Pricing"
          title="Selling price and charges"
          description="Keep price, MRP, discounts, GST, and shipping charges aligned."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Selling Price">
              <Input type="number" min="0" step="0.01" name="price" value={form.price} onChange={handleChange} />
            </Field>
            <Field label="Original Price / MRP">
              <Input type="number" min="0" step="0.01" name="originalPrice" value={form.originalPrice} onChange={handleChange} />
            </Field>
            <Field label="Discount" hint="Auto calculated">
              <Input value={`${discountPercentage}%`} readOnly />
            </Field>
            <Field label="GST / Tax">
              <Input type="number" min="0" step="0.01" name="gst" value={form.gst} onChange={handleChange} />
            </Field>
            <Field label="Shipping Charges">
              <Input type="number" min="0" step="0.01" name="shippingCharges" value={form.shippingCharges} onChange={handleChange} />
            </Field>
            <Field label="COD">
              <Toggle
                checked={Boolean(form.codEnabled)}
                onChange={(next) => setForm((prev) => ({ ...prev, codEnabled: next }))}
                label={form.codEnabled ? "COD enabled" : "COD disabled"}
                description="Enable or disable cash on delivery for this product."
              />
            </Field>
          </div>
        </Section>

        <Section
          eyebrow="Inventory"
          title="Stock management"
          description="Set stock controls and alert thresholds so the admin team can respond quickly."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Stock Quantity">
              <Input type="number" min="0" name="stock" value={form.stock} onChange={handleChange} />
            </Field>
            <Field label="Low Stock Alert">
              <Input type="number" min="0" name="lowStockAlert" value={form.lowStockAlert} onChange={handleChange} />
            </Field>
            <Field label="Stock Status">
              <select
                name="stockStatus"
                value={form.stockStatus}
                onChange={handleChange}
                className="w-full rounded-2xl border border-champagne bg-white px-4 py-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/15"
              >
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
                <option>Preorder</option>
              </select>
            </Field>
            <Field label="Out-of-stock Alerts">
              <Toggle
                checked={Boolean(form.outOfStockNotification)}
                onChange={(next) => setForm((prev) => ({ ...prev, outOfStockNotification: next }))}
                label={form.outOfStockNotification ? "Alerts enabled" : "Alerts disabled"}
                description="Notify staff when the product goes out of stock."
              />
            </Field>
          </div>
        </Section>

        <Section
          eyebrow="Product Images"
          title="Gallery upload, preview, reorder"
          description="Drag and drop images, upload with compression, set the featured image, and reorder the gallery."
        >
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`rounded-[24px] border-2 border-dashed p-6 text-center transition ${
              dragActive
                ? "border-gold-500 bg-gold-50/60"
                : "border-gold-200 bg-gold-50/30"
            }`}
          >
            <p className="text-sm font-semibold text-luxury-black">Drop images here or upload from your device</p>
            <p className="mt-1 text-xs text-text-secondary font-light">
              Images are compressed in the browser before upload for faster loading.
            </p>
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInput}
                className="w-full max-w-xs rounded-2xl border border-champagne bg-white px-4 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-luxury-black px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-gold-600"
              >
                Choose Files
              </button>
            </div>

            {uploading ? (
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-gold-700">
                Uploading and compressing images...
              </p>
            ) : null}
          </div>

          <Field label="Image URLs" hint="One URL per line or comma separated" className="mt-5">
            <Textarea
              name="imagesText"
              value={form.imagesText}
              onChange={handleChange}
              rows={4}
              placeholder="Paste uploaded image URLs here"
            />
          </Field>

          {parsedImages.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {parsedImages.map((url, index) => {
                const isFeatured = index === 0;
                return (
                  <article
                    key={`${url}-${index}`}
                    className="overflow-hidden rounded-[24px] border border-gold-200 bg-white shadow-sm"
                  >
                    <div className="relative aspect-square bg-ivory">
                      <img
                        src={resolveMediaUrl(url)}
                        alt={`Product ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {isFeatured ? (
                        <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                          Featured
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 border-t border-gold-100 p-3">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveImage(index, -1)}
                        className="flex-1 rounded-full border border-champagne px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary transition hover:border-gold-200 hover:text-gold-700 disabled:opacity-40"
                      >
                        Left
                      </button>
                      <button
                        type="button"
                        disabled={index === parsedImages.length - 1}
                        onClick={() => moveImage(index, 1)}
                        className="flex-1 rounded-full border border-champagne px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary transition hover:border-gold-200 hover:text-gold-700 disabled:opacity-40"
                      >
                        Right
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeaturedImage(url)}
                        className="flex-1 rounded-full bg-gold-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gold-700 transition hover:bg-gold-100"
                      >
                        Featured
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="rounded-full bg-rose-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-rose-700 transition hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </Section>

        <Section
          eyebrow="Product Details"
          title="Content that sells"
          description="Add copy that customers see on the product page and in specs."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <Field label="Short Description">
              <Textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                placeholder="Use a concise premium description"
                required
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Highlights">
                <Textarea
                  name="highlightsText"
                  value={form.highlightsText}
                  onChange={handleChange}
                  rows={5}
                  placeholder="One highlight per line"
                />
              </Field>
              <Field label="Specifications">
                <Textarea
                  name="specificationsText"
                  value={form.specificationsText}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Label: Value"
                />
              </Field>
            </div>
            <Field label="Care Instructions">
              <Textarea
                name="careInstructions"
                value={form.careInstructions}
                onChange={handleChange}
                rows={3}
                placeholder="How should the customer care for this product?"
              />
            </Field>
          </div>
        </Section>

        <Section
          eyebrow="Personalization"
          title="Customer input rules"
          description="Control personalization fields, limit characters, and guide the customer experience."
        >
          <div className="space-y-5">
            <Toggle
              checked={Boolean(form.isPersonalized)}
              onChange={(next) => setForm((prev) => ({ ...prev, isPersonalized: next }))}
              label="Personalization required"
              description="Turn on when the customer must add custom text or upload an image."
            />

            {form.isPersonalized ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Text Label">
                  <Input
                    name="personalizationTextLabel"
                    value={form.personalizationTextLabel}
                    onChange={handleChange}
                    placeholder="e.g. Name on product"
                  />
                </Field>
                <Field label="Character Limit">
                  <Input
                    type="number"
                    min="1"
                    name="personalizationTextLimit"
                    value={form.personalizationTextLimit}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Image Upload Label">
                  <Input
                    name="personalizationImageLabel"
                    value={form.personalizationImageLabel}
                    onChange={handleChange}
                    placeholder="e.g. Upload your photo"
                  />
                </Field>
                <Field label="Personalization Instructions" className="md:col-span-2">
                  <Textarea
                    name="personalizationInstructions"
                    value={form.personalizationInstructions}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Tell customers how to personalize the product"
                  />
                </Field>

                <div className="md:col-span-2">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">
                    Supported input types
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {personalizationInputs.map((item) => {
                      const active = (form.personalizationInputTypes || []).includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleInputType(item)}
                          className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition ${
                            active
                              ? "bg-gold-500 text-white shadow-sm"
                              : "border border-champagne bg-white text-text-secondary hover:border-gold-200 hover:text-gold-700"
                          }`}
                        >
                          {active ? `✓ ${item}` : item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </Section>

        <Section
          eyebrow="Shipping"
          title="Packaging and delivery"
          description="Capture dimensions and estimated fulfillment time for the product listing."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Weight">
              <Input name="weight" value={form.weight} onChange={handleChange} placeholder="e.g. 450g" />
            </Field>
            <Field label="Length">
              <Input name="length" value={form.length} onChange={handleChange} placeholder="e.g. 10 in" />
            </Field>
            <Field label="Width">
              <Input name="width" value={form.width} onChange={handleChange} placeholder="e.g. 8 in" />
            </Field>
            <Field label="Height">
              <Input name="height" value={form.height} onChange={handleChange} placeholder="e.g. 4 in" />
            </Field>
            <Field label="Estimated Delivery Time" className="md:col-span-2">
              <Input
                name="deliveryTime"
                value={form.deliveryTime}
                onChange={handleChange}
                placeholder="e.g. 2-4 business days"
              />
            </Field>
          </div>
        </Section>

        <Section
          eyebrow="Return & Replacement Policy"
          title="Per-product policy controls"
          description="Define whether this product can be returned or replaced, plus the allowed windows and reasons."
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Toggle
                  checked={Boolean(form.returnAvailable)}
                  onChange={(next) => setForm((prev) => ({ ...prev, returnAvailable: next }))}
                  label="Return available"
                  description="Customers can request a return for this product."
                />
                <Toggle
                  checked={Boolean(form.replacementAvailable)}
                  onChange={(next) => setForm((prev) => ({ ...prev, replacementAvailable: next }))}
                  label="Replacement available"
                  description="Customers can request a replacement for this product."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Return Window">
                  <select
                    name="returnWindow"
                    value={form.returnWindow}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-champagne bg-white px-4 py-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/15"
                  >
                    {windowOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Replacement Window">
                  <select
                    name="replacementWindow"
                    value={form.replacementWindow}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-champagne bg-white px-4 py-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/15"
                  >
                    {windowOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Return Shipping">
                  <select
                    name="returnShipping"
                    value={form.returnShipping}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-champagne bg-white px-4 py-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/15"
                  >
                    {shippingOptions.slice(0, 3).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Replacement Shipping">
                  <select
                    name="replacementShipping"
                    value={form.replacementShipping}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-champagne bg-white px-4 py-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/15"
                  >
                    {shippingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-gold-200 bg-gradient-to-br from-gold-50/80 via-white to-ivory p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-700">Eligible reasons</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {reasonOptions.map((item) => {
                    const activeReturn = (form.returnConditions || []).includes(item);
                    const activeReplacement = (form.replacementConditions || []).includes(item);
                    return (
                      <div key={item} className="rounded-2xl border border-gold-100 bg-white p-3">
                        <p className="text-sm font-semibold text-luxury-black">{item}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => togglePolicyCondition("returnConditions", item)}
                            className={`flex-1 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition ${
                              activeReturn
                                ? "bg-gold-500 text-white"
                                : "border border-champagne text-text-secondary hover:border-gold-200 hover:text-gold-700"
                            }`}
                          >
                            {activeReturn ? "Selected" : "Return"}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePolicyCondition("replacementConditions", item)}
                            className={`flex-1 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition ${
                              activeReplacement
                                ? "bg-luxury-black text-white"
                                : "border border-champagne text-text-secondary hover:border-gold-200 hover:text-gold-700"
                            }`}
                          >
                            {activeReplacement ? "Selected" : "Replace"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-champagne bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-text-secondary">
                  Non-returnable conditions
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {nonReturnableOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => togglePolicyCondition("nonReturnableConditions", item)}
                      className={`rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition ${
                        (form.nonReturnableConditions || []).includes(item)
                          ? "bg-rose-500 text-white"
                          : "border border-champagne text-text-secondary hover:border-rose-300 hover:text-rose-700"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Return Instructions">
                  <Textarea
                    name="returnInstructions"
                    value={form.returnInstructions}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Add a human-friendly return process note"
                  />
                </Field>
                <Field label="Replacement Instructions">
                  <Textarea
                    name="replacementInstructions"
                    value={form.replacementInstructions}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Add a replacement process note"
                  />
                </Field>
              </div>
            </div>
          </div>
        </Section>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {devUploadWarning ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {devUploadWarning}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="sticky bottom-4 z-10 rounded-[28px] border border-gold-200 bg-[rgba(250,247,242,0.92)] p-4 shadow-[0_20px_80px_rgba(120,90,25,0.18)] backdrop-blur-md">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-text-secondary">
                Save changes
              </p>
              <p className="mt-1 text-sm text-luxury-black font-light">
                Draft autosaves locally while you work. Use the primary button when ready.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={clearDraft}
                className="rounded-full border border-champagne bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-text-secondary transition hover:border-gold-200 hover:text-gold-700"
              >
                Clear Draft
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-full border border-champagne bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-text-secondary transition hover:border-gold-200 hover:text-gold-700"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-luxury-black px-6 py-3.5 text-xs font-bold uppercase tracking-[0.25em] text-white transition hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Saving product..." : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
};

export default AddProduct;
