const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");

// @desc    Get logged in user's wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res) => {
  try {
    const wishlistItems = await Wishlist.find({ user_id: req.user._id })
      .populate("product_id");
    
    // Filter out items where the product no longer exists in database
    const validItems = wishlistItems.filter(item => item.product_id !== null);
    
    res.status(200).json(validItems);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch wishlist" });
  }
};

// @desc    Add a product to user's wishlist
// @route   POST /api/wishlist/add
// @access  Private
const addToWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Verify the product exists
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if it already exists in the wishlist for this user
    const existingItem = await Wishlist.findOne({ user_id: req.user._id, product_id });
    if (existingItem) {
      return res.status(400).json({ message: "Product is already in wishlist" });
    }

    const wishlistItem = await Wishlist.create({
      user_id: req.user._id,
      product_id,
    });

    const populated = await Wishlist.findById(wishlistItem._id).populate("product_id");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add to wishlist" });
  }
};

// @desc    Remove a product from user's wishlist
// @route   DELETE /api/wishlist/remove
// @access  Private
const removeFromWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    const prodId = product_id || req.query.product_id;

    if (!prodId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const wishlistItem = await Wishlist.findOneAndDelete({
      user_id: req.user._id,
      product_id: prodId,
    });

    if (!wishlistItem) {
      return res.status(404).json({ message: "Product not found in your wishlist" });
    }

    res.status(200).json({ message: "Product removed from wishlist", product_id: prodId });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to remove from wishlist" });
  }
};

// @desc    Get count of items in wishlist
// @route   GET /api/wishlist/count
// @access  Private
const getWishlistCount = async (req, res) => {
  try {
    const count = await Wishlist.countDocuments({ user_id: req.user._id });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to get wishlist count" });
  }
};

// @desc    Check if a product is in user's wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private
const checkWishlistStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const item = await Wishlist.findOne({ user_id: req.user._id, product_id: productId });
    res.status(200).json({ inWishlist: !!item });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to check wishlist status" });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getWishlistCount,
  checkWishlistStatus,
};
