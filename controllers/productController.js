const mongoose = require("mongoose");
const crypto = require("crypto");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { logActivity } = require("../services/logService");

const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const sanitizeHighlights = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 12);
};

const sanitizeSpecifications = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      label: String(item?.label || "").trim(),
      value: String(item?.value || "").trim(),
    }))
    .filter((item) => item.label && item.value)
    .slice(0, 20);
};

const parseDelimitedList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  return ["true", "1", "yes", "on"].includes(normalized);
};

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const generateSku = (name) => {
  const base = slugify(name).replace(/-/g, "").toUpperCase().slice(0, 8) || "ITEM";
  return `NG-${base}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
};

const normalizeProductPayload = (source = {}, existingProduct = null) => {
  const categoryList = parseDelimitedList(source.categories ?? source.category);
  const tagList = parseDelimitedList(source.tags);
  const inputTypes = parseDelimitedList(source.personalizationInputTypes);
  const priceNum = toNumber(source.price, existingProduct?.price ?? 0);
  const originalPriceNum = source.originalPrice !== undefined && source.originalPrice !== ""
    ? toNumber(source.originalPrice, priceNum)
    : priceNum;
  const sku = String(source.sku || "").trim() || existingProduct?.sku || generateSku(source.name || existingProduct?.name || "Product");

  return {
    name: String(source.name || existingProduct?.name || "").trim(),
    price: priceNum,
    originalPrice: originalPriceNum,
    category: categoryList.length ? categoryList.join(", ") : String(source.category || existingProduct?.category || "").trim(),
    categories: categoryList,
    tags: tagList,
    sku,
    brand: String(source.brand || existingProduct?.brand || "Niyora Gifts").trim(),
    productType: String(source.productType || existingProduct?.productType || "").trim(),
    codEnabled: toBoolean(source.codEnabled, existingProduct?.codEnabled ?? true),
    isPersonalized: toBoolean(source.isPersonalized, existingProduct?.isPersonalized ?? false),
    personalizationTextLabel: source.personalizationTextLabel !== undefined ? String(source.personalizationTextLabel || "").trim() : (existingProduct?.personalizationTextLabel || ""),
    personalizationTextLimit: Math.max(1, Math.floor(toNumber(source.personalizationTextLimit, existingProduct?.personalizationTextLimit ?? 20))),
    personalizationImageRequired: toBoolean(source.personalizationImageRequired, existingProduct?.personalizationImageRequired ?? false),
    personalizationImageLabel: source.personalizationImageLabel !== undefined ? String(source.personalizationImageLabel || "").trim() : (existingProduct?.personalizationImageLabel || ""),
    personalizationInputTypes: inputTypes.length ? inputTypes : (existingProduct?.personalizationInputTypes || ["Text"]),
    stock: Math.max(0, Math.floor(toNumber(source.stock, existingProduct?.stock ?? 10))),
    lowStockAlert: Math.max(0, Math.floor(toNumber(source.lowStockAlert, existingProduct?.lowStockAlert ?? 5))),
    stockStatus: source.stockStatus !== undefined ? String(source.stockStatus || "In Stock").trim() : (existingProduct?.stockStatus || "In Stock"),
    outOfStockNotification: toBoolean(source.outOfStockNotification, existingProduct?.outOfStockNotification ?? false),
    gst: toNumber(source.gst, existingProduct?.gst ?? 0),
    shippingCharges: toNumber(source.shippingCharges, existingProduct?.shippingCharges ?? 0),
    returnShipping: source.returnShipping !== undefined ? String(source.returnShipping || "Customer Pays").trim() : (existingProduct?.returnShipping || "Customer Pays"),
    replacementShipping: source.replacementShipping !== undefined ? String(source.replacementShipping || "Customer Pays").trim() : (existingProduct?.replacementShipping || "Customer Pays"),
    weight: source.weight !== undefined ? String(source.weight || "").trim() : (existingProduct?.weight || ""),
    length: source.length !== undefined ? String(source.length || "").trim() : (existingProduct?.length || ""),
    width: source.width !== undefined ? String(source.width || "").trim() : (existingProduct?.width || ""),
    height: source.height !== undefined ? String(source.height || "").trim() : (existingProduct?.height || ""),
    deliveryTime: source.deliveryTime !== undefined ? String(source.deliveryTime || "").trim() : (existingProduct?.deliveryTime || ""),
    returnAvailable: toBoolean(source.returnAvailable, existingProduct?.returnAvailable ?? false),
    replacementAvailable: toBoolean(source.replacementAvailable, existingProduct?.replacementAvailable ?? false),
    returnWindow: source.returnWindow !== undefined ? String(source.returnWindow || "No Return").trim() : (existingProduct?.returnWindow || "No Return"),
    replacementWindow: source.replacementWindow !== undefined ? String(source.replacementWindow || "No Replacement").trim() : (existingProduct?.replacementWindow || "No Replacement"),
    returnConditions: parseDelimitedList(source.returnConditions),
    replacementConditions: parseDelimitedList(source.replacementConditions),
    nonReturnableConditions: parseDelimitedList(source.nonReturnableConditions),
    returnInstructions: source.returnInstructions !== undefined ? String(source.returnInstructions || "").trim() : (existingProduct?.returnInstructions || ""),
    replacementInstructions: source.replacementInstructions !== undefined ? String(source.replacementInstructions || "").trim() : (existingProduct?.replacementInstructions || ""),
    careInstructions: source.careInstructions !== undefined ? String(source.careInstructions || "").trim() : (existingProduct?.careInstructions || ""),
  };
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

const hasPurchasedProduct = async (userId, productId) => {
  if (!userId || !productId) return false;
  const order = await Order.findOne({
    userId,
    status: { $ne: "Cancelled" },
    "products.productId": String(productId),
  }).select("_id");
  return Boolean(order);
};

const recalculateReviewStats = (product) => {
  product.numReviews = product.reviews.length;
  product.rating =
    product.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
    Math.max(1, product.reviews.length);
};

const getProductByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const normalizedValue = String(idOrSlug || "").trim();
    const product = mongoose.Types.ObjectId.isValid(normalizedValue)
      ? (await Product.findById(normalizedValue)) ||
        (await Product.findOne({ slug: normalizedValue.toLowerCase() }))
      : await Product.findOne({ slug: normalizedValue.toLowerCase() });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json(product);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch product" });
  }
};

const addProductReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();
    if (!Number.isFinite(rating) || rating < 1 || rating > 5 || !comment) {
      return res.status(400).json({ message: "Rating (1-5) and comment are required" });
    }

    const alreadyReviewed = product.reviews.some(
      (review) => String(review.user) === String(req.user._id)
    );
    if (alreadyReviewed) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    const purchased = await hasPurchasedProduct(req.user._id, product._id);
    if (!purchased) {
      return res.status(403).json({ message: "Only customers who purchased this product can review it" });
    }

    product.reviews.push({
      user: req.user._id,
      name: req.user.name,
      rating,
      comment,
      verifiedPurchase: true,
    });
    recalculateReviewStats(product);

    await product.save();
    return res.status(201).json({
      message: "Review added",
      reviews: product.reviews,
      rating: product.rating,
      numReviews: product.numReviews,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add review" });
  }
};

const updateMyProductReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const review = product.reviews.find((item) => String(item.user) === String(req.user._id));
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();
    if (!Number.isFinite(rating) || rating < 1 || rating > 5 || !comment) {
      return res.status(400).json({ message: "Rating (1-5) and comment are required" });
    }

    review.rating = rating;
    review.comment = comment;
    recalculateReviewStats(product);
    await product.save();
    return res.status(200).json({
      message: "Review updated",
      reviews: product.reviews,
      rating: product.rating,
      numReviews: product.numReviews,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update review" });
  }
};

const deleteMyProductReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existingCount = product.reviews.length;
    product.reviews = product.reviews.filter((item) => String(item.user) !== String(req.user._id));
    if (product.reviews.length === existingCount) {
      return res.status(404).json({ message: "Review not found" });
    }

    recalculateReviewStats(product);
    await product.save();
    return res.status(200).json({
      message: "Review deleted",
      reviews: product.reviews,
      rating: product.rating,
      numReviews: product.numReviews,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete review" });
  }
};

const getReviewEligibility = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const purchased = await hasPurchasedProduct(req.user._id, product._id);
    return res.status(200).json({
      canReview: purchased,
      reason: purchased ? "" : "Purchase required",
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to check review eligibility" });
  }
};

const createProduct = async (req, res) => {
  try {
    const normalized = normalizeProductPayload(req.body);
    const {
      name,
      price,
      originalPrice,
      image,
      images,
      description,
      category,
      stock,
      highlights,
      specifications,
      isPersonalized,
      personalizationTextLabel,
      personalizationTextLimit,
      personalizationImageRequired,
      personalizationImageLabel,
      personalizationInputTypes,
      codEnabled,
      sku,
      brand,
      tags,
      productType,
      gst,
      shippingCharges,
      lowStockAlert,
      stockStatus,
      outOfStockNotification,
      weight,
      length,
      width,
      height,
      deliveryTime,
      returnAvailable,
      replacementAvailable,
      returnWindow,
      replacementWindow,
      returnConditions,
      replacementConditions,
      nonReturnableConditions,
      returnInstructions,
      replacementInstructions,
      careInstructions,
      returnShipping,
      replacementShipping,
    } = {
      ...req.body,
      ...normalized,
    };
    const normalizedImages = Array.isArray(images)
      ? images.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const primaryImage = String(image || normalizedImages[0] || "").trim();

    if (!name || !price || !primaryImage || !description || !category) {
      return res.status(400).json({ message: "All product fields are required" });
    }

    const stockNum =
      stock !== undefined && stock !== null && stock !== ""
        ? Math.max(0, Math.floor(Number(stock)))
        : 10;

    if (!Number.isFinite(stockNum)) {
      return res.status(400).json({ message: "Stock must be a valid number" });
    }

    const priceNum = Number(price);
    const origPriceNum = originalPrice ? Number(originalPrice) : priceNum;
    const discPct = priceNum && origPriceNum && origPriceNum > priceNum 
      ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100) 
      : 0;

    const product = await Product.create({
      name,
      price: priceNum,
      slug: slugify(name),
      image: primaryImage,
      images: [primaryImage, ...normalizedImages.filter((item) => item !== primaryImage)],
      description,
      highlights: sanitizeHighlights(highlights),
      specifications: sanitizeSpecifications(specifications),
      category,
      stock: stockNum,
      customisable: true,
      isPersonalized: Boolean(isPersonalized),
      personalizationTextLabel: String(personalizationTextLabel || "").trim(),
      personalizationTextLimit: personalizationTextLimit ? Number(personalizationTextLimit) : 20,
      personalizationImageRequired: Boolean(personalizationImageRequired),
      personalizationImageLabel: String(personalizationImageLabel || "").trim(),
      personalizationInputTypes: Array.isArray(personalizationInputTypes) && personalizationInputTypes.length
        ? personalizationInputTypes
        : ["Text"],
      codEnabled: codEnabled !== undefined ? Boolean(codEnabled) : true,
      sku: String(sku || "").trim(),
      brand: String(brand || "Niyora Gifts").trim(),
      tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
      productType: String(productType || "").trim(),
      originalPrice: origPriceNum,
      discountPercentage: discPct,
      gst: gst ? Number(gst) : 0,
      shippingCharges: shippingCharges ? Number(shippingCharges) : 0,
      returnShipping: String(returnShipping || "Customer Pays").trim(),
      replacementShipping: String(replacementShipping || "Customer Pays").trim(),
      lowStockAlert: lowStockAlert ? Number(lowStockAlert) : 5,
      stockStatus: String(stockStatus || "In Stock").trim(),
      outOfStockNotification: Boolean(outOfStockNotification),
      weight: String(weight || "").trim(),
      length: String(length || "").trim(),
      width: String(width || "").trim(),
      height: String(height || "").trim(),
      deliveryTime: String(deliveryTime || "").trim(),
      returnAvailable: Boolean(returnAvailable),
      replacementAvailable: Boolean(replacementAvailable),
      returnWindow: String(returnWindow || "No Return").trim(),
      replacementWindow: String(replacementWindow || "No Replacement").trim(),
      returnConditions: Array.isArray(returnConditions) ? returnConditions.map(c => String(c).trim()).filter(Boolean) : [],
      replacementConditions: Array.isArray(replacementConditions) ? replacementConditions.map(c => String(c).trim()).filter(Boolean) : [],
      nonReturnableConditions: Array.isArray(nonReturnableConditions) ? nonReturnableConditions.map(c => String(c).trim()).filter(Boolean) : [],
      returnInstructions: String(returnInstructions || "").trim(),
      replacementInstructions: String(replacementInstructions || "").trim(),
      careInstructions: String(careInstructions || "").trim(),
    });

    if (req.user) {
      await logActivity(
        req.user._id,
        req.user.name,
        "PRODUCT_CREATED",
        `Created product: ${product.name} (Price: INR ${product.price}, Category: ${product.category})`,
        req
      );
    }

    return res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    console.error("Create product error:", error.message);
    return res.status(500).json({ message: "Failed to create product" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates._id;
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    const normalized = normalizeProductPayload({ ...existingProduct.toObject(), ...updates }, existingProduct);
    Object.assign(updates, normalized);
    if (updates.name) updates.slug = slugify(updates.name);
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.images !== undefined) {
      updates.images = Array.isArray(updates.images)
        ? updates.images.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    }
    if (updates.image !== undefined) {
      updates.image = String(updates.image || "").trim();
    }
    if (!updates.image && Array.isArray(updates.images) && updates.images.length > 0) {
      updates.image = updates.images[0];
    }
    if (updates.image && (!Array.isArray(updates.images) || !updates.images.length)) {
      updates.images = [updates.image];
    }
    if (updates.stock !== undefined) {
      const s = Math.floor(Number(updates.stock));
      if (!Number.isFinite(s) || s < 0) {
        return res.status(400).json({ message: "Stock must be zero or a positive whole number" });
      }
      updates.stock = s;
    }
    if (updates.highlights !== undefined) {
      updates.highlights = sanitizeHighlights(updates.highlights);
    }
    if (updates.specifications !== undefined) {
      updates.specifications = sanitizeSpecifications(updates.specifications);
    }

    // Auto-calculate discount percentage on update
    if (existingProduct) {
      const updatedPrice = updates.price !== undefined ? Number(updates.price) : existingProduct.price;
      const updatedOriginalPrice = updates.originalPrice !== undefined ? Number(updates.originalPrice) : existingProduct.originalPrice;
      updates.discountPercentage = updatedPrice && updatedOriginalPrice && updatedOriginalPrice > updatedPrice
        ? Math.round(((updatedOriginalPrice - updatedPrice) / updatedOriginalPrice) * 100)
        : 0;
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (req.user) {
      await logActivity(
        req.user._id,
        req.user.name,
        "PRODUCT_UPDATED",
        `Updated product: ${product.name} (ID: ${product._id})`,
        req
      );
    }

    return res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Update product error:", error.message);
    return res.status(500).json({ message: "Failed to update product" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (req.user) {
      await logActivity(
        req.user._id,
        req.user.name,
        "PRODUCT_DELETED",
        `Deleted product: ${product.name} (ID: ${product._id})`,
        req
      );
    }

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error.message);
    return res.status(500).json({ message: "Failed to delete product" });
  }
};

module.exports = {
  getProducts,
  getProductByIdOrSlug,
  addProductReview,
  updateMyProductReview,
  deleteMyProductReview,
  getReviewEligibility,
  createProduct,
  updateProduct,
  deleteProduct,
};
