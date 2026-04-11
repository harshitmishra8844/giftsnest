const Product = require("../models/Product");

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

const createProduct = async (req, res) => {
  try {
    const { name, price, image, description, category, stock } = req.body;

    if (!name || !price || !image || !description || !category) {
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
      image,
      images: [image],
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
    if (updates.price !== undefined) updates.price = Number(updates.price);
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
  createProduct,
  updateProduct,
  deleteProduct,
};
