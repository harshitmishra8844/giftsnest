const mongoose = require("mongoose");
const crypto = require("crypto");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const StoreCreditReservation = require("../models/StoreCreditReservation");
const StoreCreditExpiryLog = require("../models/StoreCreditExpiryLog");
const StoreCreditCounter = require("../models/StoreCreditCounter");
const EmployeeActivityLog = require("../models/EmployeeActivityLog");
const { createAndDispatchNotification } = require("./notificationService");

/**
 * Helper: Extract IP and User-Agent from Express request
 */
const getClientMeta = (req) => {
  const ipAddress =
    req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req?.socket?.remoteAddress ||
    "127.0.0.1";
  const userAgent = req?.headers?.["user-agent"] || "System Process";
  return { ipAddress, userAgent };
};

/**
 * 1. Get or atomically initialize customer's store credit account
 */
const getOrCreateAccount = async (userId) => {
  if (!userId) throw new Error("User ID is required");
  const account = await StoreCreditAccount.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        balance: 0,
        reservedBalance: 0,
        currency: "INR",
        status: "Active",
        totalCredited: 0,
        totalDebited: 0,
        totalExpired: 0,
        version: 0,
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  return account;
};

/**
 * 2. Get customer account balance and active status
 */
const getAccountBalance = async (userId) => {
  const account = await getOrCreateAccount(userId);
  return {
    accountId: account._id,
    userId: account.userId,
    balance: account.balance,
    reservedBalance: account.reservedBalance,
    availableBalance: Math.max(0, account.balance),
    status: account.status,
    currency: account.currency,
    isFrozen: account.status === "Frozen",
    totalCredited: account.totalCredited,
    totalDebited: account.totalDebited,
    totalExpired: account.totalExpired,
  };
};

/**
 * 3. Add Credit to Account (Refund, Bonus, Restoration, etc.)
 * Atomic update with idempotency protection and sequential transaction ID.
 */
const addCredit = async ({
  userId,
  amount,
  referenceType = "REFUND",
  referenceId = "",
  orderId = null,
  refundId = null,
  description = "",
  expiresAt = null,
  performedBy = null,
  performedByName = "System",
  performedByRole = "System",
  idempotencyKey = null,
  req = null,
}) => {
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error("Credit amount must be greater than zero");
  }

  // Idempotency check: prevent duplicate transactions
  if (idempotencyKey) {
    const existingTxn = await StoreCreditTransaction.findOne({ idempotencyKey });
    if (existingTxn) {
      console.log(`[StoreCredit] Idempotent request hit for key: ${idempotencyKey}`);
      return {
        success: true,
        isDuplicate: true,
        transaction: existingTxn,
        balanceAfter: existingTxn.balanceAfter,
      };
    }
  }

  const { ipAddress, userAgent } = getClientMeta(req);

  // Atomically credit the account
  const account = await StoreCreditAccount.findOneAndUpdate(
    { userId, status: { $ne: "Suspended" } },
    {
      $inc: { balance: numAmount, totalCredited: numAmount, version: 1 },
      $setOnInsert: {
        userId,
        reservedBalance: 0,
        currency: "INR",
        status: "Active",
      },
    },
    { returnDocument: "after", upsert: true }
  );

  const balanceBefore = Number((account.balance - numAmount).toFixed(2));
  const balanceAfter = Number(account.balance.toFixed(2));

  // Generate atomic sequential transaction ID
  const transactionId = await StoreCreditCounter.getNextTransactionCode();

  // Create immutable transaction ledger record
  const transaction = await StoreCreditTransaction.create({
    transactionId,
    accountId: account._id,
    userId,
    type: "CREDIT",
    amount: numAmount,
    balanceBefore,
    balanceAfter,
    referenceType,
    referenceId,
    orderId,
    refundId,
    description: description || `Credited ₹${numAmount} via ${referenceType}`,
    issuedAt: new Date(),
    expiresAt,
    isExpired: false,
    remainingCreditAmount: numAmount, // Available for FIFO consumption
    ...(idempotencyKey ? { idempotencyKey: String(idempotencyKey).trim() } : {}),
    performedBy,
    performedByName,
    performedByRole,
    ipAddress,
    userAgent,
  });

  // Track expiry log if applicable
  if (expiresAt) {
    await StoreCreditExpiryLog.create({
      transactionId: transaction._id,
      userId,
      originalAmount: numAmount,
      remainingAmount: numAmount,
      expiresAt,
    }).catch((e) => console.warn("[StoreCredit] Expiry log creation warning:", e.message));
  }

  // Dispatch customer notification
  createAndDispatchNotification({
    recipient: userId,
    role: "customer",
    category: "PAYMENT",
    event: "STORE_CREDIT_ADDED",
    title: "Store Credit Added",
    message: `₹${numAmount} has been credited to your Niyora Store Credit wallet. Available Balance: ₹${balanceAfter}.`,
    priority: "Medium",
    link: "profile",
    metadata: { transactionId, amount: numAmount, balanceAfter, referenceType, referenceId },
  }).catch((err) => console.error("[StoreCredit] Notification error:", err.message));

  return {
    success: true,
    transaction,
    account,
    balanceBefore,
    balanceAfter,
  };
};

/**
 * 4. Reserve Credit for Checkout Session (Split or Full)
 * Atomically deducts from `balance` and places into `reservedBalance` with a TTL.
 * Zero risk of race conditions or negative balances.
 */
const reserveCredit = async ({
  userId,
  amount,
  orderId = null,
  ttlMinutes = 15,
  req = null,
}) => {
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error("Reservation amount must be greater than zero");
  }

  const { ipAddress, userAgent } = getClientMeta(req);

  // Atomic Conditional Deduct: Must have active status and balance >= numAmount
  const account = await StoreCreditAccount.findOneAndUpdate(
    {
      userId,
      balance: { $gte: numAmount },
      status: "Active",
    },
    {
      $inc: { balance: -numAmount, reservedBalance: numAmount, version: 1 },
    },
    { returnDocument: "after" }
  );

  if (!account) {
    const existing = await StoreCreditAccount.findOne({ userId });
    if (!existing) {
      throw new Error("Store credit account not found.");
    }
    if (existing.status !== "Active") {
      throw new Error(`Store credit account is currently ${existing.status}. Please contact support.`);
    }
    throw new Error(`Insufficient available store credit balance. Available: ₹${existing.balance}, Requested: ₹${numAmount}.`);
  }

  const reservationId = `RES-SC-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const reservation = await StoreCreditReservation.create({
    reservationId,
    userId,
    orderId,
    amount: numAmount,
    status: "RESERVED",
    expiresAt,
  });

  const transactionId = await StoreCreditCounter.getNextTransactionCode();
  await StoreCreditTransaction.create({
    transactionId,
    accountId: account._id,
    userId,
    type: "RESERVE",
    amount: numAmount,
    balanceBefore: Number((account.balance + numAmount).toFixed(2)),
    balanceAfter: Number(account.balance.toFixed(2)),
    referenceType: "CHECKOUT_RESERVATION",
    referenceId: reservationId,
    orderId,
    description: `Temporarily reserved ₹${numAmount} for checkout session.`,
    performedByName: "Checkout System",
    performedByRole: "System",
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    reservationId,
    reservedAmount: numAmount,
    expiresAt,
    account,
  };
};

/**
 * 5. Commit Reservation (When checkout succeeds)
 * Transfers `reservedBalance` to final debited ledger, consumes FIFO credits.
 */
const commitReservation = async ({
  reservationId,
  orderId = null,
  performedBy = null,
  performedByName = "System",
  performedByRole = "System",
  req = null,
}) => {
  if (!reservationId) throw new Error("Reservation ID is required");

  const reservation = await StoreCreditReservation.findOne({
    reservationId,
    status: "RESERVED",
  });

  if (!reservation) {
    throw new Error(`Active store credit reservation '${reservationId}' not found or already processed.`);
  }

  const { ipAddress, userAgent } = getClientMeta(req);
  const amountToDebit = reservation.amount;

  // Deduct from reserved balance and mark total debited
  const account = await StoreCreditAccount.findOneAndUpdate(
    {
      userId: reservation.userId,
      reservedBalance: { $gte: amountToDebit },
    },
    {
      $inc: { reservedBalance: -amountToDebit, totalDebited: amountToDebit, version: 1 },
    },
    { returnDocument: "after" }
  );

  reservation.status = "COMMITTED";
  reservation.committedAt = new Date();
  if (orderId) reservation.orderId = orderId;
  await reservation.save();

  // FIFO Credit Consumption: deduct remainingCreditAmount from oldest credits
  let remainingToConsume = amountToDebit;
  const activeCredits = await StoreCreditTransaction.find({
    userId: reservation.userId,
    type: "CREDIT",
    remainingCreditAmount: { $gt: 0 },
    isExpired: false,
  }).sort({ expiresAt: 1, createdAt: 1 });

  for (const creditTxn of activeCredits) {
    if (remainingToConsume <= 0) break;
    const deduct = Math.min(creditTxn.remainingCreditAmount, remainingToConsume);
    creditTxn.remainingCreditAmount = Number((creditTxn.remainingCreditAmount - deduct).toFixed(2));
    await creditTxn.save();
    remainingToConsume = Number((remainingToConsume - deduct).toFixed(2));
  }

  // Create Debit Transaction Record
  const transactionId = await StoreCreditCounter.getNextTransactionCode();
  const debitTransaction = await StoreCreditTransaction.create({
    transactionId,
    accountId: account._id,
    userId: reservation.userId,
    type: "DEBIT",
    amount: amountToDebit,
    balanceBefore: Number(account.balance.toFixed(2)),
    balanceAfter: Number(account.balance.toFixed(2)),
    referenceType: "ORDER",
    referenceId: reservationId,
    orderId: orderId || reservation.orderId,
    description: `Debited ₹${amountToDebit} for Order payment.`,
    performedBy,
    performedByName,
    performedByRole,
    ipAddress,
    userAgent,
  });

  // Notify customer: Store Credit Used
  createAndDispatchNotification({
    recipient: reservation.userId,
    role: "customer",
    category: "PAYMENT",
    event: "STORE_CREDIT_USED",
    title: "Store Credit Used",
    message: `₹${amountToDebit} of store credit was applied to your order. Remaining Balance: ₹${account.balance}.`,
    priority: "Medium",
    link: "orders",
    metadata: { transactionId, amount: amountToDebit, orderId },
  }).catch((err) => console.error("[StoreCredit] Notification error:", err.message));

  return {
    success: true,
    reservation,
    debitTransaction,
    account,
  };
};

/**
 * 6. Release Reservation (When payment fails, window closes, or user cancels)
 * Reverts `reservedBalance` back to `balance` immediately.
 */
const releaseReservation = async ({
  reservationId,
  reason = "Payment cancelled or failed",
  req = null,
}) => {
  if (!reservationId) return { success: false, message: "No reservation ID provided" };

  const reservation = await StoreCreditReservation.findOne({
    reservationId,
    status: "RESERVED",
  });

  if (!reservation) {
    // Already released, committed, or not found
    return { success: false, message: "Reservation not in reserved state" };
  }

  const { ipAddress, userAgent } = getClientMeta(req);
  const amountToRelease = reservation.amount;

  // Revert atomically
  const account = await StoreCreditAccount.findOneAndUpdate(
    { userId: reservation.userId },
    {
      $inc: { balance: amountToRelease, reservedBalance: -amountToRelease, version: 1 },
    },
    { returnDocument: "after" }
  );

  reservation.status = "RELEASED";
  reservation.releasedAt = new Date();
  reservation.releaseReason = reason;
  await reservation.save();

  const transactionId = await StoreCreditCounter.getNextTransactionCode();
  await StoreCreditTransaction.create({
    transactionId,
    accountId: account._id,
    userId: reservation.userId,
    type: "RELEASE",
    amount: amountToRelease,
    balanceBefore: Number((account.balance - amountToRelease).toFixed(2)),
    balanceAfter: Number(account.balance.toFixed(2)),
    referenceType: "CHECKOUT_RESERVATION",
    referenceId: reservationId,
    description: `Released ₹${amountToRelease} reservation back to available balance. Reason: ${reason}`,
    performedByName: "Checkout System",
    performedByRole: "System",
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    releasedAmount: amountToRelease,
    balanceAfter: account.balance,
  };
};

/**
 * 7. Direct Debit (For 100% Store Credit Checkout without reservation)
 */
const deductCreditDirect = async ({
  userId,
  amount,
  referenceType = "ORDER",
  referenceId = "",
  orderId = null,
  description = "",
  performedBy = null,
  performedByName = "Customer",
  performedByRole = "Customer",
  idempotencyKey = null,
  req = null,
}) => {
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error("Debit amount must be greater than zero");
  }

  if (idempotencyKey) {
    const existing = await StoreCreditTransaction.findOne({ idempotencyKey });
    if (existing) {
      return { success: true, isDuplicate: true, transaction: existing };
    }
  }

  const { ipAddress, userAgent } = getClientMeta(req);

  // Atomic condition: balance must be >= numAmount and status must be Active
  const account = await StoreCreditAccount.findOneAndUpdate(
    {
      userId,
      balance: { $gte: numAmount },
      status: "Active",
    },
    {
      $inc: { balance: -numAmount, totalDebited: numAmount, version: 1 },
    },
    { returnDocument: "after" }
  );

  if (!account) {
    const existing = await StoreCreditAccount.findOne({ userId });
    if (!existing) throw new Error("Store credit account not found.");
    if (existing.status !== "Active") throw new Error(`Store credit account is ${existing.status}.`);
    throw new Error(`Insufficient store credit balance. Available: ₹${existing.balance}, Requested: ₹${numAmount}.`);
  }

  const balanceBefore = Number((account.balance + numAmount).toFixed(2));
  const balanceAfter = Number(account.balance.toFixed(2));

  // FIFO consumption
  let remainingToConsume = numAmount;
  const activeCredits = await StoreCreditTransaction.find({
    userId,
    type: "CREDIT",
    remainingCreditAmount: { $gt: 0 },
    isExpired: false,
  }).sort({ expiresAt: 1, createdAt: 1 });

  for (const creditTxn of activeCredits) {
    if (remainingToConsume <= 0) break;
    const deduct = Math.min(creditTxn.remainingCreditAmount, remainingToConsume);
    creditTxn.remainingCreditAmount = Number((creditTxn.remainingCreditAmount - deduct).toFixed(2));
    await creditTxn.save();
    remainingToConsume = Number((remainingToConsume - deduct).toFixed(2));
  }

  const transactionId = await StoreCreditCounter.getNextTransactionCode();
  const transaction = await StoreCreditTransaction.create({
    transactionId,
    accountId: account._id,
    userId,
    type: "DEBIT",
    amount: numAmount,
    balanceBefore,
    balanceAfter,
    referenceType,
    referenceId,
    orderId,
    description: description || `Debited ₹${numAmount} for order ${referenceId}`,
    ...(idempotencyKey ? { idempotencyKey: String(idempotencyKey).trim() } : {}),
    performedBy,
    performedByName,
    performedByRole,
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    transaction,
    balanceBefore,
    balanceAfter,
  };
};

/**
 * 8. Expire Credit (FIFO expiry processor)
 */
const expireSingleCredit = async ({ transactionId, req = null }) => {
  const creditTxn = await StoreCreditTransaction.findById(transactionId);
  if (!creditTxn || creditTxn.isExpired || creditTxn.remainingCreditAmount <= 0) {
    return { success: false, message: "Credit is already expired or consumed" };
  }

  const amountToExpire = creditTxn.remainingCreditAmount;
  const userId = creditTxn.userId;

  // Deduct from account balance atomically
  const account = await StoreCreditAccount.findOneAndUpdate(
    { userId, balance: { $gte: amountToExpire } },
    {
      $inc: { balance: -amountToExpire, totalExpired: amountToExpire, version: 1 },
    },
    { returnDocument: "after" }
  );

  creditTxn.isExpired = true;
  creditTxn.remainingCreditAmount = 0;
  await creditTxn.save();

  const expiryCode = await StoreCreditCounter.getNextTransactionCode();
  await StoreCreditTransaction.create({
    transactionId: expiryCode,
    accountId: creditTxn.accountId,
    userId,
    type: "EXPIRE",
    amount: amountToExpire,
    balanceBefore: account ? Number((account.balance + amountToExpire).toFixed(2)) : amountToExpire,
    balanceAfter: account ? Number(account.balance.toFixed(2)) : 0,
    referenceType: "EXPIRY",
    referenceId: creditTxn.transactionId,
    description: `Expired ₹${amountToExpire} from credit transaction ${creditTxn.transactionId}`,
    performedByName: "Expiry Scheduler",
    performedByRole: "System",
  });

  // Notify customer
  createAndDispatchNotification({
    recipient: userId,
    role: "customer",
    category: "PAYMENT",
    event: "STORE_CREDIT_EXPIRED",
    title: "Store Credit Expired",
    message: `₹${amountToExpire} of your store credit expired on ${new Date().toLocaleDateString("en-IN")}.`,
    priority: "Medium",
    link: "profile",
    metadata: { transactionId: creditTxn.transactionId, expiredAmount: amountToExpire },
  }).catch((err) => console.error("[StoreCredit] Notification error:", err.message));

  return {
    success: true,
    expiredAmount: amountToExpire,
    userId,
  };
};

/**
 * 9. Admin Controls: Freeze / Unfreeze Account
 */
const setAccountStatus = async ({ userId, status, reason = "", adminUser, req = null }) => {
  if (!["Active", "Frozen", "Suspended"].includes(status)) {
    throw new Error("Invalid status");
  }

  const { ipAddress } = getClientMeta(req);
  const account = await getOrCreateAccount(userId);

  account.status = status;
  if (status === "Frozen") {
    account.frozenReason = reason;
    account.frozenAt = new Date();
    account.frozenBy = adminUser?._id || null;
  } else if (status === "Active") {
    account.frozenReason = "";
    account.frozenAt = null;
    account.frozenBy = null;
  }
  await account.save();

  // Audit log
  await EmployeeActivityLog.create({
    employeeId: adminUser?._id || null,
    employeeName: adminUser?.name || "Administrator",
    role: adminUser?.designation || adminUser?.role || "Admin",
    action: `STORE_CREDIT_${status.toUpperCase()}`,
    targetType: "StoreCredit",
    targetCode: userId.toString(),
    details: `${status} store credit account for user ${userId}. Reason: ${reason} (IP: ${ipAddress})`,
  }).catch((e) => console.warn("[StoreCredit] Activity log warning:", e.message));

  return { success: true, account };
};

/**
 * 10. Admin Manual Adjustment (Credit or Debit)
 */
const adjustCreditManual = async ({
  userId,
  amount,
  adjustmentType, // "CREDIT" or "DEBIT"
  reason,
  adminUser,
  req = null,
}) => {
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error("Adjustment amount must be greater than zero");
  }
  if (!reason || !reason.trim()) {
    throw new Error("A mandatory adjustment reason is required for compliance audit logs");
  }

  const adminName = adminUser?.name || "Admin Executive";
  const adminRole = adminUser?.designation || adminUser?.role || "Finance Manager";

  if (adjustmentType === "CREDIT") {
    const result = await addCredit({
      userId,
      amount: numAmount,
      referenceType: "ADMIN_ADJUSTMENT",
      referenceId: `ADJ-${Date.now()}`,
      description: `Admin manual credit: ${reason}`,
      performedBy: adminUser?._id,
      performedByName: adminName,
      performedByRole: adminRole,
      req,
    });

    await EmployeeActivityLog.create({
      employeeId: adminUser?._id || null,
      employeeName: adminName,
      role: adminRole,
      action: "STORE_CREDIT_MANUAL_CREDIT",
      targetType: "StoreCredit",
      targetCode: userId.toString(),
      details: `Credited ₹${numAmount} to user ${userId}. Reason: ${reason}`,
    }).catch(() => {});

    return result;
  } else if (adjustmentType === "DEBIT") {
    const result = await deductCreditDirect({
      userId,
      amount: numAmount,
      referenceType: "ADMIN_ADJUSTMENT",
      referenceId: `ADJ-${Date.now()}`,
      description: `Admin manual deduction: ${reason}`,
      performedBy: adminUser?._id,
      performedByName: adminName,
      performedByRole: adminRole,
      req,
    });

    await EmployeeActivityLog.create({
      employeeId: adminUser?._id || null,
      employeeName: adminName,
      role: adminRole,
      action: "STORE_CREDIT_MANUAL_DEBIT",
      targetType: "StoreCredit",
      targetCode: userId.toString(),
      details: `Debited ₹${numAmount} from user ${userId}. Reason: ${reason}`,
    }).catch(() => {});

    return result;
  } else {
    throw new Error("Invalid adjustment type: must be 'CREDIT' or 'DEBIT'");
  }
};

module.exports = {
  getOrCreateAccount,
  getAccountBalance,
  addCredit,
  reserveCredit,
  commitReservation,
  releaseReservation,
  deductCreditDirect,
  expireSingleCredit,
  setAccountStatus,
  adjustCreditManual,
};
