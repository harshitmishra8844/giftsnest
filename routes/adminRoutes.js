const express = require("express");
const { adminLogin, getStoreInfo, updateStoreInfo } = require("../controllers/adminController");
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const {
  getOrders,
  getArchivedOrders,
  updateOrderStatus,
  updateTrackingId,
  deleteOrder,
  archiveOrder,
  unarchiveOrder,
} = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  generateSpecialCoupon,
  sendCouponEmail,
} = require("../controllers/couponController");

const router = express.Router();

router.post("/login", adminLogin);
router.get("/store-info", protect, adminOnly, getStoreInfo);
router.put("/store-info", protect, adminOnly, updateStoreInfo);

router.get("/products", protect, adminOnly, getProducts);
router.post("/products", protect, adminOnly, createProduct);
router.put("/products/:id", protect, adminOnly, updateProduct);
router.delete("/products/:id", protect, adminOnly, deleteProduct);

router.get("/orders", protect, adminOnly, getOrders);
router.get("/orders/archived", protect, adminOnly, getArchivedOrders);
router.put("/orders/:id/status", protect, adminOnly, updateOrderStatus);
router.put("/orders/:id/tracking", protect, adminOnly, updateTrackingId);
router.put("/orders/:id/archive", protect, adminOnly, archiveOrder);
router.put("/orders/:id/unarchive", protect, adminOnly, unarchiveOrder);
router.delete("/orders/:id", protect, adminOnly, deleteOrder);

router.get("/coupons", protect, adminOnly, getCoupons);
router.post("/coupons/generate-special", protect, adminOnly, generateSpecialCoupon);
router.post("/coupons/:id/send-email", protect, adminOnly, sendCouponEmail);
router.post("/coupons", protect, adminOnly, createCoupon);
router.put("/coupons/:id", protect, adminOnly, updateCoupon);
router.delete("/coupons/:id", protect, adminOnly, deleteCoupon);

module.exports = router;
