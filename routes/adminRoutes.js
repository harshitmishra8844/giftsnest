const express = require("express");
const { adminLogin, getStoreInfo, updateStoreInfo, getEmailDiagnostics, setup2FA, enable2FA, disable2FA, verify2FA } = require("../controllers/adminController");
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
  reviewOrderCancellation,
} = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");
const {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  generateSpecialCoupon,
  sendCouponEmail,
} = require("../controllers/couponController");
const {
  getNewsletterSubscribers,
  deleteNewsletterSubscriber,
} = require("../controllers/newsletterController");


const router = express.Router();

router.post("/login", adminLogin);
router.post("/verify-2fa", verify2FA);
router.post("/2fa/setup", protect, setup2FA);
router.post("/2fa/enable", protect, enable2FA);
router.post("/2fa/disable", protect, disable2FA);

router.get("/store-info", protect, checkPermission(["BUSINESS_ANALYTICS_VIEW", "CONTENT_HOMEPAGE"]), getStoreInfo);
router.put("/store-info", protect, checkPermission(["BUSINESS_ANALYTICS_VIEW", "CONTENT_HOMEPAGE"]), updateStoreInfo);

router.get("/products", protect, checkPermission(["PRODUCTS_VIEW", "INVENTORY_VIEW"]), getProducts);
router.post("/products", protect, checkPermission("PRODUCTS_CREATE"), createProduct);
router.put("/products/:id", protect, checkPermission(["PRODUCTS_EDIT", "INVENTORY_MANAGE"]), updateProduct);
router.delete("/products/:id", protect, checkPermission("PRODUCTS_DELETE"), deleteProduct);

router.get("/orders", protect, checkPermission("ORDERS_VIEW"), getOrders);
router.get("/orders/archived", protect, checkPermission("ORDERS_VIEW"), getArchivedOrders);
router.put("/orders/:id/status", protect, checkPermission("ORDERS_STATUS"), updateOrderStatus);
router.put("/orders/:id/tracking", protect, checkPermission("ORDERS_SHIPPING"), updateTrackingId);
router.put("/orders/:id/cancellation-request", protect, checkPermission("ORDERS_RETURNS"), reviewOrderCancellation);
router.put("/orders/:id/archive", protect, checkPermission("ORDERS_VIEW"), archiveOrder);
router.put("/orders/:id/unarchive", protect, checkPermission("ORDERS_VIEW"), unarchiveOrder);
router.delete("/orders/:id", protect, checkPermission("ORDERS_RETURNS"), deleteOrder);

router.get("/coupons", protect, checkPermission("COUPONS_MANAGE"), getCoupons);
router.post("/coupons/generate-special", protect, checkPermission("COUPONS_MANAGE"), generateSpecialCoupon);
router.post("/coupons/:id/send-email", protect, checkPermission("COUPONS_MANAGE"), sendCouponEmail);
router.post("/coupons", protect, checkPermission("COUPONS_MANAGE"), createCoupon);
router.put("/coupons/:id", protect, checkPermission("COUPONS_MANAGE"), updateCoupon);
router.delete("/coupons/:id", protect, checkPermission("COUPONS_MANAGE"), deleteCoupon);

router.get("/newsletter/subscribers", protect, checkPermission("MARKETING_CAMPAIGNS"), getNewsletterSubscribers);
router.delete("/newsletter/subscribers/:id", protect, checkPermission("MARKETING_CAMPAIGNS"), deleteNewsletterSubscriber);
router.get("/email-diagnostics", protect, checkPermission("MARKETING_CAMPAIGNS"), getEmailDiagnostics);

module.exports = router;
