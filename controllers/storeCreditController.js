const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const StoreCreditExpiryLog = require("../models/StoreCreditExpiryLog");
const User = require("../models/User");
const storeCreditService = require("../services/storeCreditService");

/**
 * RBAC Helper: Only administrators with FINANCE_MANAGE or Master Admin can adjust/freeze
 */
const canManageStoreCredit = (user) => {
  if (!user) return false;
  if (user.isMasterAdmin || user.role === "admin" || user.isAdmin === true) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.includes("ALL") || perms.includes("FINANCE_MANAGE")) return true;
  const designation = (user.designation || "").toLowerCase();
  const role = (user.role || "").toLowerCase();
  if (designation.includes("finance") || designation.includes("refund") || role.includes("finance")) return true;
  return false;
};

/**
 * Customer: Get My Store Credit Balance
 * GET /api/store-credit/my-balance
 */
const getMyBalance = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const balanceData = await storeCreditService.getAccountBalance(userId);

    // Calculate credits expiring within 30 days
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringCredits = await StoreCreditTransaction.find({
      userId,
      type: "CREDIT",
      remainingCreditAmount: { $gt: 0 },
      isExpired: false,
      expiresAt: { $ne: null, $lte: thirtyDaysFromNow },
    }).sort({ expiresAt: 1 });

    const expiringAmount = expiringCredits.reduce(
      (sum, item) => sum + Number(item.remainingCreditAmount || 0),
      0
    );

    const nearestExpiry = expiringCredits.length > 0 ? expiringCredits[0].expiresAt : null;

    return res.status(200).json({
      success: true,
      ...balanceData,
      expiringAmount: Number(expiringAmount.toFixed(2)),
      nearestExpiry,
      expiringCreditsCount: expiringCredits.length,
    });
  } catch (error) {
    console.error("getMyBalance error:", error);
    return res.status(500).json({ message: "Failed to fetch store credit balance: " + error.message });
  }
};

/**
 * Customer: Get My Transaction History
 * GET /api/store-credit/my-transactions
 */
const getMyTransactions = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const query = { userId };
    if (req.query.type) {
      query.type = req.query.type;
    }

    const [transactions, totalCount] = await Promise.all([
      StoreCreditTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("orderId", "orderCode totalPrice")
        .populate("refundId", "refundId refundAmount")
        .lean(),
      StoreCreditTransaction.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
      },
    });
  } catch (error) {
    console.error("getMyTransactions error:", error);
    return res.status(500).json({ message: "Failed to fetch transaction history: " + error.message });
  }
};

/**
 * Admin: Get All Customer Accounts
 * GET /api/store-credit/admin/accounts
 */
const adminGetAccounts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    let userMatch = {};
    if (search) {
      userMatch = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { mobileNumber: { $regex: search, $options: "i" } },
        ],
      };
    }

    const matchedUsers = search ? await User.find(userMatch).select("_id").lean() : null;
    let query = {};
    if (matchedUsers) {
      query.userId = { $in: matchedUsers.map((u) => u._id) };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const [accounts, totalCount] = await Promise.all([
      StoreCreditAccount.find(query)
        .populate("userId", "name email mobileNumber isGuest")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StoreCreditAccount.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      accounts,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
      },
    });
  } catch (error) {
    console.error("adminGetAccounts error:", error);
    return res.status(500).json({ message: "Failed to fetch store credit accounts: " + error.message });
  }
};

/**
 * Admin: Get Customer Account Details
 * GET /api/store-credit/admin/accounts/:userId
 */
const adminGetAccountDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const account = await StoreCreditAccount.findOne({ userId })
      .populate("userId", "name email mobileNumber createdAt")
      .populate("frozenBy", "name designation");

    if (!account) {
      return res.status(404).json({ message: "Store credit account not found for this customer." });
    }

    const [transactions, expiryLogs] = await Promise.all([
      StoreCreditTransaction.find({ userId }).sort({ createdAt: -1 }).limit(100).lean(),
      StoreCreditExpiryLog.find({ userId }).sort({ expiresAt: 1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      account,
      transactions,
      expiryLogs,
    });
  } catch (error) {
    console.error("adminGetAccountDetails error:", error);
    return res.status(500).json({ message: "Failed to load account details: " + error.message });
  }
};

/**
 * Admin: Freeze / Unfreeze Customer Store Credit
 * PUT /api/store-credit/admin/status/:userId
 */
const adminUpdateStatus = async (req, res) => {
  try {
    if (!canManageStoreCredit(req.user)) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to modify customer store credit accounts.",
      });
    }

    const { userId } = req.params;
    const { status, reason = "" } = req.body;

    if (!["Active", "Frozen"].includes(status)) {
      return res.status(400).json({ message: "Status must be either 'Active' or 'Frozen'." });
    }

    if (status === "Frozen" && !reason.trim()) {
      return res.status(400).json({ message: "A mandatory freeze reason is required for audit compliance." });
    }

    const result = await storeCreditService.setAccountStatus({
      userId,
      status,
      reason,
      adminUser: req.user,
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Store credit account for customer has been set to ${status}.`,
      account: result.account,
    });
  } catch (error) {
    console.error("adminUpdateStatus error:", error);
    return res.status(500).json({ message: "Failed to update account status: " + error.message });
  }
};

/**
 * Admin: Manual Adjustment (Add Credit / Deduct Credit)
 * POST /api/store-credit/admin/adjust
 */
const adminAdjustCredit = async (req, res) => {
  try {
    if (!canManageStoreCredit(req.user)) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to execute financial adjustments.",
      });
    }

    const { userId, amount, adjustmentType, reason } = req.body;

    if (!userId) return res.status(400).json({ message: "User ID is required" });
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Adjustment amount must be greater than zero" });
    }
    if (!["CREDIT", "DEBIT"].includes(adjustmentType)) {
      return res.status(400).json({ message: "adjustmentType must be 'CREDIT' or 'DEBIT'" });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "A mandatory reason is required for compliance audit trails" });
    }

    const result = await storeCreditService.adjustCreditManual({
      userId,
      amount: Number(amount),
      adjustmentType,
      reason: reason.trim(),
      adminUser: req.user,
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully adjusted Store Credit for customer: ${adjustmentType} ₹${amount}.`,
      result,
    });
  } catch (error) {
    console.error("adminAdjustCredit error:", error);
    return res.status(500).json({ message: "Manual adjustment failed: " + error.message });
  }
};

/**
 * Admin: Expiry Report
 * GET /api/store-credit/admin/expiry-report
 */
const adminGetExpiryReport = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const expiringCredits = await StoreCreditTransaction.find({
      type: "CREDIT",
      remainingCreditAmount: { $gt: 0 },
      isExpired: false,
      expiresAt: { $ne: null, $lte: futureDate },
    })
      .populate("userId", "name email mobileNumber")
      .sort({ expiresAt: 1 })
      .lean();

    const totalAtRisk = expiringCredits.reduce(
      (sum, item) => sum + Number(item.remainingCreditAmount || 0),
      0
    );

    return res.status(200).json({
      success: true,
      timeframeDays: days,
      totalExpiringAmount: Number(totalAtRisk.toFixed(2)),
      count: expiringCredits.length,
      records: expiringCredits,
    });
  } catch (error) {
    console.error("adminGetExpiryReport error:", error);
    return res.status(500).json({ message: "Failed to generate expiry report: " + error.message });
  }
};

/**
 * Admin: Trigger Automated Expiry Cycle
 * POST /api/store-credit/admin/run-expiry-worker
 */
const adminRunExpiryWorker = async (req, res) => {
  try {
    if (!canManageStoreCredit(req.user)) {
      return res.status(403).json({
        message: "Forbidden: Only finance managers can execute the store credit expiry cycle.",
      });
    }

    const { runExpiryCycle } = require("../services/storeCreditExpiryService");
    const result = await runExpiryCycle();

    return res.status(200).json({
      success: true,
      message: `Expiry cycle executed. Expired ${result.expirations.expiredCount} credits (₹${result.expirations.totalExpiredAmount}).`,
      result,
    });
  } catch (error) {
    console.error("adminRunExpiryWorker error:", error);
    return res.status(500).json({ message: "Failed to run expiry cycle: " + error.message });
  }
};

module.exports = {
  getMyBalance,
  getMyTransactions,
  adminGetAccounts,
  adminGetAccountDetails,
  adminUpdateStatus,
  adminAdjustCredit,
  adminGetExpiryReport,
  adminRunExpiryWorker,
};
