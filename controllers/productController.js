const Product = require("../models/Product");
const Order = require("../models/Order");

const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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
    const product =
      (await Product.findById(idOrSlug)) ||
      (await Product.findOne({ slug: String(idOrSlug || "").toLowerCase() }));

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
    const { name, price, image, images, description, category, stock } = req.body;
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

    const product = await Product.create({
      name,
      price: Number(price),
      slug: slugify(name),
      image: primaryImage,
      images: [primaryImage, ...normalizedImages.filter((item) => item !== primaryImage)],
      description,
      category,
      stock: stockNum,
      customisable: true,
    });

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
    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
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
