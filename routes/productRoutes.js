const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getProducts,
  getProductByIdOrSlug,
  addProductReview,
  updateMyProductReview,
  deleteMyProductReview,
  getReviewEligibility,
  createProduct,
} = require("../controllers/productController");

const router = express.Router();

router.get("/", getProducts);
router.get("/:id/review-eligibility", protect, getReviewEligibility);
router.post("/:id/reviews", protect, addProductReview);
router.put("/:id/reviews/me", protect, updateMyProductReview);
router.delete("/:id/reviews/me", protect, deleteMyProductReview);
router.get("/:idOrSlug", getProductByIdOrSlug);
router.post("/", createProduct);

module.exports = router;
