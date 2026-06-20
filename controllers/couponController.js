const crypto = require("crypto");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const { isEmailConfigured, sendCouponEmailToCustomer } = require("../services/couponEmail");

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    const redemptionAgg = await Order.aggregate([
      { $match: { paymentStatus: "Paid", couponCode: { $nin: [null, ""] } } },
      { $group: { _id: "$couponCode", count: { $sum: 1 } } },
    ]);
    const countByCode = Object.fromEntries(
      redemptionAgg.map((r) => [String(r._id || "").toUpperCase(), r.count])
    );
    const withCounts = coupons.map((c) => ({
      ...c,
      paidRedemptionsCount: countByCode[String(c.code || "").toUpperCase()] || 0,
    }));
    return res.status(200).json(withCounts);
  } catch (error) {
    console.error("Fetch coupons error:", error);
    return res.status(500).json({ message: `Failed to fetch coupons: ${error.message || error}` });
  }
};

const parseOptionalEndDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseOptionalPositiveInt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
};

const createCoupon = async (req, res) => {
  try {
    const { code, type, value, minCartValue, maxDiscount, active, endDate, maxRedemptions, maxRedemptionsPerUser } =
      req.body;
    if (!code || !type || value === undefined || minCartValue === undefined) {
      return res.status(400).json({ message: "code, type, value and minCartValue are required" });
    }

    const normalizedCode = String(code).toUpperCase().trim();
    const exists = await Coupon.findOne({ code: normalizedCode });
    if (exists) return res.status(400).json({ message: "Coupon code already exists" });

    const coupon = await Coupon.create({
      code: normalizedCode,
      type,
      value: Number(value),
      minCartValue: Number(minCartValue),
      maxDiscount: Number(maxDiscount || 0),
      active: active !== false,
      endDate: parseOptionalEndDate(endDate),
      isSpecial: false,
      maxRedemptions: parseOptionalPositiveInt(maxRedemptions),
      maxRedemptionsPerUser: parseOptionalPositiveInt(maxRedemptionsPerUser),
    });

    return res.status(201).json({ ...coupon.toObject(), paidRedemptionsCount: 0 });
  } catch (error) {
    console.error("Create coupon error:", error);
    return res.status(500).json({ message: `Failed to create coupon: ${error.message || error}` });
  }
};

const generateSpecialCoupon = async (req, res) => {
  try {
    const {
      type,
      value,
      minCartValue,
      maxDiscount,
      active,
      endDate,
      maxRedemptions,
      maxRedemptionsPerUser,
      customerEmail,
      customerName,
      emailMessage,
    } = req.body;
    if (!type || value === undefined || minCartValue === undefined) {
      return res.status(400).json({ message: "type, value and minCartValue are required" });
    }

    let code;
    for (let i = 0; i < 12; i += 1) {
      const candidate = `GN-SP-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
      const exists = await Coupon.findOne({ code: candidate });
      if (!exists) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return res.status(500).json({ message: "Could not generate a unique coupon code" });
    }

    const maxR = parseOptionalPositiveInt(maxRedemptions);
    const maxPerUser = parseOptionalPositiveInt(maxRedemptionsPerUser);

    const coupon = await Coupon.create({
      code,
      type,
      value: Number(value),
      minCartValue: Number(minCartValue),
      maxDiscount: Number(maxDiscount || 0),
      active: active !== false,
      endDate: parseOptionalEndDate(endDate),
      isSpecial: true,
      maxRedemptions: maxR,
      maxRedemptionsPerUser: maxPerUser,
    });

    let emailSent = false;
    let emailWarning = null;
    let previewUrl = null;
    const ce = String(customerEmail || "").trim().toLowerCase();
    if (ce) {
      if (!isValidEmail(ce)) {
        emailWarning = "Coupon was created but email was not sent: invalid email address.";
      } else {
        try {
          const sendResult = await sendCouponEmailToCustomer(coupon, {
            to: ce,
            customerName: String(customerName || "").trim(),
            personalNote: String(emailMessage || "").trim(),
          });
          if (sendResult && sendResult.previewUrl) {
            previewUrl = sendResult.previewUrl;
          }
          emailSent = true;
        } catch (mailErr) {
          console.error("Special coupon email error:", mailErr);
          emailWarning =
            `Coupon was created but the email could not be sent: ${mailErr.message || mailErr}. Use "Email customer" in Manage coupons to try again.`;
        }
      }
    }

    return res.status(201).json({
      ...coupon.toObject(),
      paidRedemptionsCount: 0,
      emailSent,
      previewUrl: previewUrl || undefined,
      emailWarning: emailWarning || undefined,
    });
  } catch (error) {
    console.error("Generate special coupon error:", error);
    return res.status(500).json({
      message: `Failed to generate special coupon: ${error ? error.message || error : "Unknown error"}`
    });
  }
};

const sendCouponEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { to, customerName, message } = req.body;
    const email = String(to || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "A valid recipient email address is required" });
    }
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    if (!coupon.active) {
      return res.status(400).json({ message: "Cannot email an inactive coupon" });
    }
    try {
      const result = await sendCouponEmailToCustomer(coupon, {
        to: email,
        customerName: String(customerName || "").trim(),
        personalNote: String(message || "").trim(),
      });
      if (result && result.previewUrl) {
        return res.status(200).json({ message: "Email sent (test SMTP)", previewUrl: result.previewUrl });
      }
      return res.status(200).json({ message: "Email sent successfully" });
    } catch (err) {
      if (err.code === "EMAIL_NOT_CONFIGURED") {
        return res.status(503).json({
          message:
            "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server (optional: SMTP_PORT, SMTP_SECURE, SMTP_FROM).",
        });
      }
      throw err;
    }
  } catch (error) {
    if (error.code === "EMAIL_NOT_CONFIGURED") {
      return res.status(503).json({ message: "Email service is not configured" });
    }
    console.error("Send coupon email error:", error);
    return res.status(500).json({ message: `Failed to send email: ${error.message || error}` });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Coupon.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    const payload = { ...req.body };
    delete payload.isSpecial;
    if (existing.isSpecial) {
      delete payload.code;
    } else if (payload.code) {
      payload.code = String(payload.code).toUpperCase().trim();
    }
    if (payload.value !== undefined) payload.value = Number(payload.value);
    if (payload.minCartValue !== undefined) payload.minCartValue = Number(payload.minCartValue);
    if (payload.maxDiscount !== undefined) payload.maxDiscount = Number(payload.maxDiscount);
    if (payload.maxRedemptions !== undefined) {
      payload.maxRedemptions = parseOptionalPositiveInt(payload.maxRedemptions);
    }
    if (payload.maxRedemptionsPerUser !== undefined) {
      payload.maxRedemptionsPerUser = parseOptionalPositiveInt(payload.maxRedemptionsPerUser);
    }
    if (payload.endDate !== undefined) {
      payload.endDate = parseOptionalEndDate(payload.endDate);
    }

    const coupon = await Coupon.findByIdAndUpdate(id, payload, { returnDocument: 'after', runValidators: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    const paid = await Order.countDocuments({ couponCode: coupon.code, paymentStatus: "Paid" });
    return res.status(200).json({ ...coupon.toObject(), paidRedemptionsCount: paid });
  } catch (error) {
    console.error("Update coupon error:", error);
    return res.status(500).json({ message: `Failed to update coupon: ${error.message || error}` });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    return res.status(200).json({ message: "Coupon deleted" });
  } catch (error) {
    console.error("Delete coupon error:", error);
    return res.status(500).json({ message: `Failed to delete coupon: ${error.message || error}` });
  }
};

module.exports = {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  generateSpecialCoupon,
  sendCouponEmail,
};
