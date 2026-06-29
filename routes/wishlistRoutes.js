const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getWishlistCount,
  checkWishlistStatus,
} = require("../controllers/wishlistController");

const router = express.Router();

// All wishlist routes require authentication
router.use(protect);

router.get("/", getWishlist);
router.post("/add", addToWishlist);
router.delete("/remove", removeFromWishlist);
router.get("/count", getWishlistCount);
router.get("/check/:productId", checkWishlistStatus);

module.exports = router;
