const crypto = require("crypto");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const { isEmailConfigured, sendCouponEmailToCustomer } = require("../services/couponEmail");
const { logActivity } = require("../services/logService");

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

const sanitizeActiveDays = (days) => {
  if (!Array.isArray(days)) return [];
  const allowed = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days
    .map(d => String(d).trim())
    .filter(d => allowed.includes(d));
};

const createCoupon = async (req, res) => {
  try {
    const { code, type, value, minCartValue, maxDiscount, active, startDate, endDate, maxRedemptions, maxRedemptionsPerUser, activeDays } =
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
      startDate: parseOptionalEndDate(startDate),
      endDate: parseOptionalEndDate(endDate),
      activeDays: sanitizeActiveDays(activeDays),
      isSpecial: false,
      maxRedemptions: parseOptionalPositiveInt(maxRedemptions),
      maxRedemptionsPerUser: parseOptionalPositiveInt(maxRedemptionsPerUser),
    });

    if (req.user) {
      await logActivity(
        req.user._id,
        req.user.name,
        "COUPON_CREATED",
        `Created public coupon: ${coupon.code} (Value: ${coupon.value} ${coupon.type})`,
        req
      );
    }

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
      startDate,
      endDate,
      maxRedemptions,
      maxRedemptionsPerUser,
      activeDays,
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
      startDate: parseOptionalEndDate(startDate),
      endDate: parseOptionalEndDate(endDate),
      activeDays: sanitizeActiveDays(activeDays),
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
          if (mailErr && mailErr.code === "EMAIL_NOT_CONFIGURED") {
            emailWarning =
              "Coupon was created but the email was not sent because email delivery is not configured. Configure SMTP, Resend, or Brevo in the backend and retry using Email customer.";
          } else if (mailErr && mailErr.code === "RESEND_SEND_FAILED") {
            emailWarning =
              `Coupon was created but customer email delivery failed via Resend: ${mailErr.message || "Unknown error"}. Use \"Email customer\" in Manage coupons to try again.`;
          } else if (mailErr && mailErr.code === "BREVO_SEND_FAILED") {
            emailWarning =
              `Coupon was created but customer email delivery failed via Brevo: ${mailErr.message || "Unknown error"}. Use \"Email customer\" in Manage coupons to try again.`;
          } else {
            emailWarning =
              `Coupon was created but the email could not be sent: ${mailErr.message || mailErr}. Use \"Email customer\" in Manage coupons to try again.`;
          }
        }
      }
    }

    if (req.user) {
      await logActivity(
        req.user._id,
        req.user.name,
        "COUPON_GENERATED_SPECIAL",
        `Generated special coupon: ${coupon.code} for customer: ${customerEmail || "N/A"}`,
        req
      );
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
    if (payload.startDate !== undefined) {
      payload.startDate = parseOptionalEndDate(payload.startDate);
    }
    if (payload.endDate !== undefined) {
      payload.endDate = parseOptionalEndDate(payload.endDate);
    }
    if (payload.activeDays !== undefined) {
      payload.activeDays = sanitizeActiveDays(payload.activeDays);
    }

    const coupon = await Coupon.findByIdAndUpdate(id, payload, { returnDocument: 'after', runValidators: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    if (req.user) {
      await logActivity(
        req.user._id,
        req.user.name,
        "COUPON_UPDATED",
        `Updated coupon details: ${coupon.code}`,
        req
      );
    }

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

    if (req.user) {
      await logActivity(
        req.user._id,
        req.user.name,
        "COUPON_DELETED",
        `Deleted coupon: ${coupon.code}`,
        req
      );
    }

    return res.status(200).json({ message: "Coupon deleted" });
  } catch (error) {
    console.error("Delete coupon error:", error);
    return res.status(500).json({ message: `Failed to delete coupon: ${error.message || error}` });
  }
};

const pushCouponToUserByEmail = async (req, res) => {
  try {
    const { couponCode, pushTarget, customerEmail, segmentId, remainingUses } = req.body;
    if (!couponCode) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const User = require("../models/User");
    const CouponAssignment = require("../models/CouponAssignment");
    const CustomerTimeline = require("../models/CustomerTimeline");

    // Find coupon
    const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim() });
    if (!coupon) {
      return res.status(404).json({ message: "Coupon code not found" });
    }

    let targetUserIds = [];
    let targetLabel = "";

    if (pushTarget === "segment") {
      if (!segmentId) {
        return res.status(400).json({ message: "Segment/Category selection is required for segment push" });
      }

      if (segmentId === "all") {
        targetUserIds = await User.find({ isAdmin: { $ne: true }, status: { $ne: "Deleted" } }).distinct("_id");
        targetLabel = "All Customers";
      } else if (segmentId === "newsletter") {
        const Newsletter = require("../models/Newsletter");
        const newsletterEmails = await Newsletter.find().distinct("email");
        targetUserIds = await User.find({ email: { $in: newsletterEmails }, isAdmin: { $ne: true }, status: { $ne: "Deleted" } }).distinct("_id");
        targetLabel = "Newsletter Subscribers";
      } else {
        const CustomerSegment = require("../models/CustomerSegment");
        const segment = await CustomerSegment.findById(segmentId);
        if (!segment) {
          return res.status(404).json({ message: "Selected category/segment not found" });
        }
        const { resolveSegmentMembers } = require("../services/segmentService");
        targetUserIds = await resolveSegmentMembers(segment.filters);
        targetLabel = `Segment: ${segment.name}`;
      }
    } else {
      // Default: single customer email
      if (!customerEmail) {
        return res.status(400).json({ message: "Customer email is required" });
      }
      const user = await User.findOne({ email: String(customerEmail).toLowerCase().trim() });
      if (!user) {
        return res.status(404).json({ message: "Customer account not found with this email" });
      }
      targetUserIds = [user._id];
      targetLabel = `${user.name} (${user.email})`;
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ message: "No customer profiles found matching this category" });
    }

    // Now, push/assign coupon to all targeted users
    let assignedCount = 0;
    let skippedCount = 0;

    for (const userId of targetUserIds) {
      // Check if already assigned and unused
      const existing = await CouponAssignment.findOne({ userId, couponId: coupon._id, status: "Unused" });
      if (existing) {
        skippedCount++;
        continue;
      }

      // Create assignment
      await CouponAssignment.create({
        userId,
        couponId: coupon._id,
        assignedBy: req.user.name,
        assignmentType: pushTarget === "segment" ? "segment" : "manual",
        remainingUses: remainingUses ? Number(remainingUses) : 1,
      });

      // Log to customer timeline
      if (CustomerTimeline) {
        try {
          await CustomerTimeline.create({
            userId,
            event: "Coupon Assigned",
            title: `Coupon Pushed: ${coupon.code}`,
            description: `Pushed by admin: ${req.user.name} (${pushTarget === "segment" ? "Bulk category push" : "Individual push"})`,
            metadata: { couponCode: coupon.code }
          });
        } catch (err) {
          // ignore timeline logging errors for individual loops
        }
      }
      assignedCount++;
    }

    // Log admin activity
    await logActivity(
      req.user._id,
      req.user.name,
      pushTarget === "segment" ? "COUPON_PUSHED_BULK" : "COUPON_PUSHED",
      `Pushed coupon ${coupon.code} to ${targetLabel}. Assigned: ${assignedCount}, Skipped: ${skippedCount}`,
      req
    );

    let message = `Successfully pushed coupon "${coupon.code}" to ${assignedCount} user(s).`;
    if (skippedCount > 0) {
      message += ` (${skippedCount} already had this coupon active and were skipped.)`;
    }

    return res.status(201).json({
      message,
      assignedCount,
      skippedCount
    });
  } catch (error) {
    console.error("Push coupon error:", error);
    return res.status(500).json({ message: `Failed to push coupon: ${error.message || error}` });
  }
};

module.exports = {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  generateSpecialCoupon,
  sendCouponEmail,
  pushCouponToUserByEmail,
};
