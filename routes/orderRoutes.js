const express = require("express");
const {
  createOrder,
  applyCoupon,
  getMyOrders,
  trackOrder,
  listActiveCouponsPublic,
  requestOrderCancellation,
} = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { getOrders, updateOrderStatus } = require("../controllers/orderController");

const router = express.Router();

router.get("/active-coupons", listActiveCouponsPublic);
router.post("/", protect, createOrder);
router.post("/apply-coupon", protect, applyCoupon);
router.post("/track", trackOrder);
router.get("/my", protect, getMyOrders);
router.post("/:id/cancellation-request", protect, requestOrderCancellation);
router.get("/", protect, adminOnly, getOrders);
router.put("/:id/status", protect, adminOnly, updateOrderStatus);

module.exports = router;
