const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getMyBalance,
  getMyTransactions,
  adminGetAccounts,
  adminGetAccountDetails,
  adminUpdateStatus,
  adminAdjustCredit,
  adminGetExpiryReport,
  adminRunExpiryWorker,
} = require("../controllers/storeCreditController");

// Customer Endpoints
router.get("/my/balance", protect, getMyBalance);
router.get("/my-balance", protect, getMyBalance);
router.get("/balance", protect, getMyBalance);

router.get("/my/transactions", protect, getMyTransactions);
router.get("/my-transactions", protect, getMyTransactions);
router.get("/transactions", protect, getMyTransactions);

// Admin Endpoints
router.get("/admin/accounts", protect, adminOnly, adminGetAccounts);
router.get("/admin/accounts/:userId", protect, adminOnly, adminGetAccountDetails);
router.put("/admin/status/:userId", protect, adminOnly, adminUpdateStatus);
router.post("/admin/adjust", protect, adminOnly, adminAdjustCredit);
router.get("/admin/expiry-report", protect, adminOnly, adminGetExpiryReport);
router.post("/admin/run-expiry-worker", protect, adminOnly, adminRunExpiryWorker);

// Aliases for convenience
router.post("/admin/accounts/:userId/adjust", protect, adminOnly, (req, res, next) => {
  req.body.userId = req.params.userId;
  if (!req.body.adjustmentType && req.body.amount) {
    req.body.adjustmentType = Number(req.body.amount) < 0 ? "DEBIT" : "CREDIT";
    req.body.amount = Math.abs(req.body.amount);
  }
  return adminAdjustCredit(req, res, next);
});
router.post("/admin/accounts/:userId/freeze", protect, adminOnly, (req, res, next) => {
  req.body.status = "Frozen";
  return adminUpdateStatus(req, res, next);
});
router.post("/admin/accounts/:userId/unfreeze", protect, adminOnly, (req, res, next) => {
  req.body.status = "Active";
  return adminUpdateStatus(req, res, next);
});
router.post("/admin/process-expiry", protect, adminOnly, adminRunExpiryWorker);

module.exports = router;
