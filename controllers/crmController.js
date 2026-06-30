const User = require("../models/User");
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");
const CouponAssignment = require("../models/CouponAssignment");
const Campaign = require("../models/Campaign");
const CustomerSegment = require("../models/CustomerSegment");
const CustomerAlert = require("../models/CustomerAlert");
const CustomerTimeline = require("../models/CustomerTimeline");
const MessageQueue = require("../models/MessageQueue");
const EmailLog = require("../models/EmailLog");
const SmsLog = require("../models/SmsLog");
const WhatsAppLog = require("../models/WhatsAppLog");
const PushLog = require("../models/PushLog");
const Notification = require("../models/Notification");

const { sendSMS } = require("../services/smsService");
const { sendWhatsAppMessage } = require("../services/whatsappService");
const { sendPushNotification } = require("../services/pushNotificationService");
const { logTimelineEvent } = require("../services/timelineService");
const { resolveSegmentMembers } = require("../services/segmentService");
const { checkCustomerAlerts } = require("../services/alertService");
const { logActivity } = require("../services/logService");

// 1. Dashboard Metrics and Analytics
const getCrmDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Communication counts sent today
    const emailsSent = await EmailLog.countDocuments({ status: "Sent", createdAt: { $gte: today } });
    const smsSent = await SmsLog.countDocuments({ status: "Delivered", createdAt: { $gte: today } });
    const whatsappSent = await WhatsAppLog.countDocuments({ status: "Delivered", createdAt: { $gte: today } });
    const pushSent = await PushLog.countDocuments({ status: "Sent", createdAt: { $gte: today } });
    const inAppSent = await Notification.countDocuments({ status: "Sent", createdAt: { $gte: today } });

    // Coupons assigned vs redeemed
    const couponsAssigned = await CouponAssignment.countDocuments({ createdAt: { $gte: today } });
    const couponsRedeemed = await CouponAssignment.countDocuments({ status: "Redeemed", updatedAt: { $gte: today } });

    // Revenue calculations
    const campaignsCount = await Campaign.countDocuments();
    const campaignRevenueGroup = await Campaign.aggregate([
      { $group: { _id: null, total: { $sum: "$metrics.revenueGenerated" } } },
    ]);
    const campaignRevenue = campaignRevenueGroup[0]?.total || 0;

    const couponRevenueGroup = await Order.aggregate([
      { $match: { paymentStatus: "Paid", couponCode: { $ne: "" } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const couponRevenue = couponRevenueGroup[0]?.total || 0;

    // Delivery success rate calculations
    const totalDispatches = emailsSent + smsSent + whatsappSent + pushSent;
    const successfulDispatches = emailsSent + smsSent + whatsappSent + pushSent; // In simulation, all count as successful
    const deliverySuccessRate = totalDispatches > 0 ? Math.round((successfulDispatches / totalDispatches) * 100) : 100;

    // Active vs Inactive ratio
    const activeShoppersCount = await User.countDocuments({ isAdmin: { $ne: true }, status: "Active" });
    const suspendedShoppersCount = await User.countDocuments({ isAdmin: { $ne: true }, status: "Suspended" });

    // Highest performing campaigns
    const topCampaigns = await Campaign.find().sort({ "metrics.revenueGenerated": -1 }).limit(3).lean();

    return res.status(200).json({
      metrics: {
        emailsSent,
        smsSent,
        whatsappSent,
        pushSent,
        inAppSent,
        couponsAssigned,
        couponsRedeemed,
        campaignRevenue,
        couponRevenue,
        deliverySuccessRate,
        activeShoppersCount,
        suspendedShoppersCount,
        campaignsCount,
      },
      topCampaigns,
    });
  } catch (error) {
    console.error("Get CRM dashboard stats error:", error.message);
    return res.status(500).json({ message: "Failed to load CRM dashboard metrics." });
  }
};

// 2. Campaign CRUD & Analytics
const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json(campaigns);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve marketing campaigns." });
  }
};

const createCampaign = async (req, res) => {
  try {
    const { name, channel, subject, content, segmentId, scheduledAt } = req.body;
    if (!name || !channel || !content) {
      return res.status(400).json({ message: "Campaign name, channel, and content template are required." });
    }

    const campaign = await Campaign.create({
      name: name.trim(),
      channel,
      subject: subject ? subject.trim() : "",
      content,
      segmentId: segmentId || "All",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? "Scheduled" : "Draft",
      createdBy: req.user._id,
    });

    // If campaign is scheduled to run immediately (no scheduled date, or scheduled date <= now), queue it
    if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
      campaign.status = "Running";
      campaign.startedAt = new Date();
      await campaign.save();

      // Resolve segment targets
      let targetUserIds = [];
      if (segmentId === "All" || !segmentId) {
        targetUserIds = await User.find({ isAdmin: { $ne: true }, status: "Active" }).distinct("_id");
      } else {
        const segment = await CustomerSegment.findById(segmentId);
        if (segment) {
          targetUserIds = await resolveSegmentMembers(segment.filters);
        }
      }

      // Populate queue
      const queueEntries = [];
      for (const uId of targetUserIds) {
        const u = await User.findById(uId).select("email mobileNumber").lean();
        if (u) {
          const toAddress = channel === "Email" ? u.email : u.mobileNumber;
          if (toAddress) {
            queueEntries.push({
              channel,
              recipientId: uId,
              to: toAddress,
              payload: {
                subject: campaign.subject,
                bodyHtml: campaign.content,
                bodyText: campaign.content.replace(/<[^>]*>/g, ""), // simple strip html tags
                message: campaign.content,
                content: campaign.content,
                title: campaign.name,
              },
              campaignId: campaign._id,
              status: "Pending",
            });
          }
        }
      }

      if (queueEntries.length > 0) {
        await MessageQueue.insertMany(queueEntries);
      }
    }

    await logActivity(req.user._id, req.user.name, "CRM_CAMPAIGN_CREATED", `Created campaign "${name}" on channel ${channel}`, req);

    return res.status(201).json(campaign);
  } catch (error) {
    console.error("Create campaign error:", error.message);
    return res.status(500).json({ message: "Failed to create campaign." });
  }
};

const updateCampaignStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Draft", "Scheduled", "Running", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid campaign status code." });
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    campaign.status = status;
    if (status === "Cancelled") {
      // Remove any pending queue items for this campaign
      await MessageQueue.deleteMany({ campaignId: campaign._id, status: "Pending" });
    }

    await campaign.save();
    return res.status(200).json(campaign);
  } catch (error) {
    return res.status(500).json({ message: "Failed to adjust campaign status." });
  }
};

// 3. Segment CRUD & Builder
const getSegments = async (req, res) => {
  try {
    const segments = await CustomerSegment.find().sort({ createdAt: -1 }).lean();
    
    // Dynamically calculate live membership counts for display
    const enriched = [];
    for (const seg of segments) {
      const memberIds = await resolveSegmentMembers(seg.filters);
      enriched.push({
        ...seg,
        memberCount: memberIds.length,
      });
    }

    return res.status(200).json(enriched);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load CRM segments." });
  }
};

const createSegment = async (req, res) => {
  try {
    const { name, description, filters } = req.body;
    if (!name || !filters) {
      return res.status(400).json({ message: "Segment name and rule filters are required." });
    }

    const exists = await CustomerSegment.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ message: "Segment name already exists." });

    const memberIds = await resolveSegmentMembers(filters);

    const segment = await CustomerSegment.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      filters,
      isDynamic: true,
      memberCount: memberIds.length,
      createdBy: req.user._id,
    });

    await logActivity(req.user._id, req.user.name, "CRM_SEGMENT_CREATED", `Created segment "${name}" with ${memberIds.length} members.`, req);

    return res.status(201).json(segment);
  } catch (error) {
    console.error("Create segment error:", error.message);
    return res.status(500).json({ message: "Failed to save dynamic segment." });
  }
};

const deleteSegment = async (req, res) => {
  try {
    const segment = await CustomerSegment.findById(req.params.id);
    if (!segment) return res.status(404).json({ message: "Segment not found." });

    await CustomerSegment.deleteOne({ _id: segment._id });
    return res.status(200).json({ message: "Segment deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete segment." });
  }
};

// 4. Alert Panel & Resolutions
const getAlerts = async (req, res) => {
  try {
    // Dynamic role permission checks
    let roleQuery = {};
    if (!req.user.isMasterAdmin) {
      // Find role strings
      const userRoles = req.user.roles.map((r) => r.name);
      roleQuery = {
        $or: [
          { assignedRoles: { $size: 0 } },
          { assignedRoles: { $in: userRoles } },
        ]
      };
    }

    const alerts = await CustomerAlert.find(roleQuery)
      .populate("userId", "name email mobileNumber")
      .sort({ severity: -1, createdAt: -1 })
      .lean();

    return res.status(200).json(alerts);
  } catch (error) {
    console.error("Get alerts error:", error.message);
    return res.status(500).json({ message: "Failed to fetch dashboard alerts." });
  }
};

const resolveAlert = async (req, res) => {
  try {
    const { notes } = req.body;
    const alert = await CustomerAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: "Alert not found." });

    alert.status = "Resolved";
    alert.notes = notes ? notes.trim() : "Resolved by system administrator.";
    alert.resolvedBy = req.user._id;
    alert.resolvedAt = new Date();
    await alert.save();

    await logActivity(req.user._id, req.user.name, "CRM_ALERT_RESOLVED", `Resolved CRM alert ID ${alert._id}`, req);

    return res.status(200).json(alert);
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark alert as resolved." });
  }
};

// 5. Customer Dossier API Integrations
const getCustomerTimeline = async (req, res) => {
  try {
    const timeline = await CustomerTimeline.find({ userId: req.params.id })
      .sort({ timestamp: -1 })
      .lean();
    return res.status(200).json(timeline);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load timeline records." });
  }
};

const getCustomerCoupons = async (req, res) => {
  try {
    const assignments = await CouponAssignment.find({ userId: req.params.id })
      .populate("couponId")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(assignments);
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve shopper coupon assignments." });
  }
};

const assignCouponToCustomer = async (req, res) => {
  try {
    const { couponCode, type, value, minCartValue, maxDiscount, remainingUses, expiryDays, reason } = req.body;
    const userId = req.params.id;

    let coupon;
    if (couponCode) {
      // Using an existing coupon
      coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim() });
      if (!coupon) return res.status(404).json({ message: "Coupon code not found." });
    } else {
      // Auto generate coupon
      if (!type || value === undefined) {
        return res.status(400).json({ message: "Discount type and value are required to generate coupon." });
      }

      const crypto = require("crypto");
      const generatedCode = `CRM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (expiryDays ? Number(expiryDays) : 30));

      coupon = await Coupon.create({
        code: generatedCode,
        type,
        value: Number(value),
        minCartValue: Number(minCartValue || 0),
        maxDiscount: Number(maxDiscount || 0),
        active: true,
        endDate: expiry,
        isSpecial: true,
      });
    }

    const assignment = await CouponAssignment.create({
      userId,
      couponId: coupon._id,
      assignedBy: req.user.name,
      assignmentType: reason || "manual",
      remainingUses: remainingUses ? Number(remainingUses) : 1,
    });

    // Write event to timeline
    await logTimelineEvent(userId, "Coupon Assigned", `Coupon Assigned: ${coupon.code}`, `Assigned discount value of ${coupon.value} (${coupon.type})`, { couponCode: coupon.code }, req);

    return res.status(201).json(assignment);
  } catch (error) {
    console.error("Assign coupon error:", error.message);
    return res.status(500).json({ message: "Failed to assign coupon code." });
  }
};

const getCustomerCommunicationHistory = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await User.findById(customerId).select("email mobileNumber").lean();
    if (!customer) return res.status(404).json({ message: "Shopper not found." });

    const emailLogs = await EmailLog.find({ to: customer.email.toLowerCase() }).sort({ createdAt: -1 }).lean();
    
    let smsLogs = [];
    let whatsappLogs = [];
    if (customer.mobileNumber) {
      smsLogs = await SmsLog.find({ to: customer.mobileNumber }).sort({ createdAt: -1 }).lean();
      whatsappLogs = await WhatsAppLog.find({ to: customer.mobileNumber }).sort({ createdAt: -1 }).lean();
    }

    const pushLogs = await PushLog.find({ recipient: customerId }).sort({ createdAt: -1 }).lean();
    const inAppLogs = await Notification.find({ recipient: customerId }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      emails: emailLogs,
      sms: smsLogs,
      whatsapp: whatsappLogs,
      push: pushLogs,
      inApp: inAppLogs,
    });
  } catch (error) {
    console.error("Get communication history error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve message logs." });
  }
};

const sendIndividualMessage = async (req, res) => {
  try {
    const { channel, message, subject, templateName, mediaUrl, image, icon, ctaButtonLabel, deepLink } = req.body;
    const userId = req.params.id;

    const customer = await User.findById(userId).select("name email mobileNumber").lean();
    if (!customer) return res.status(404).json({ message: "Shopper not found." });

    let result = null;

    if (channel === "Email") {
      const { queueEmail } = require("../services/emailService");
      if (!subject || !message) {
        return res.status(400).json({ message: "Email subject and message body are required." });
      }

      // Generate HTML wrapping
      const { buildBrandedEmail, getStoreDetails } = require("../services/emailService");
      const storeInfo = await getStoreDetails();
      const brandedHtml = buildBrandedEmail(subject, subject, `<p>${message.replace(/\n/g, "<br/>")}</p>`, "", "", storeInfo);

      result = await queueEmail(customer.email, subject, brandedHtml, message, "Concierge Custom Alert", userId, "User");

    } else if (channel === "SMS") {
      if (!customer.mobileNumber) {
        return res.status(400).json({ message: "Shopper profile lacks a mobile number." });
      }
      result = await sendSMS({
        to: customer.mobileNumber,
        message,
        sentBy: req.user._id,
      });

    } else if (channel === "WhatsApp") {
      if (!customer.mobileNumber) {
        return res.status(400).json({ message: "Shopper profile lacks a mobile number." });
      }
      result = await sendWhatsAppMessage({
        to: customer.mobileNumber,
        message,
        templateName,
        mediaUrl,
        sentBy: req.user._id,
      });

    } else if (channel === "Push") {
      result = await sendPushNotification({
        recipientId: customer._id,
        title: subject || "Update from Concierge Desk",
        message,
        image,
        icon,
        ctaButtonLabel,
        deepLink,
        sentBy: req.user._id,
      });

    } else if (channel === "Website Notification") {
      const Notification = require("../models/Notification");
      result = await Notification.create({
        recipient: customer._id,
        title: subject || "Message from Niyora Support",
        message,
        type: "Information",
        status: "Sent",
        sentBy: req.user._id,
      });

    } else {
      return res.status(400).json({ message: "Invalid message delivery channel." });
    }

    // Write to timeline
    await logTimelineEvent(userId, `${channel} Sent`, `Direct message: ${channel}`, message, { channel }, req);
    
    // Evaluate alerts trigger to check dynamic updates (e.g. VIP thresholds, activity alerts)
    await checkCustomerAlerts(userId);

    return res.status(200).json({ message: "Concierge message dispatched successfully.", logs: result });
  } catch (error) {
    console.error("Send individual message error:", error.message);
    return res.status(500).json({ message: "Failed to dispatch concierge message." });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    // Cancel pending queue messages
    await MessageQueue.deleteMany({ campaignId: campaign._id });

    await Campaign.deleteOne({ _id: campaign._id });
    await logActivity(req.user._id, req.user.name, "CRM_CAMPAIGN_DELETED", `Deleted campaign "${campaign.name}"`, req);

    return res.status(200).json({ message: "Campaign deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete campaign." });
  }
};

const deleteAlert = async (req, res) => {
  try {
    const alert = await CustomerAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: "Alert not found." });

    await CustomerAlert.deleteOne({ _id: alert._id });
    await logActivity(req.user._id, req.user.name, "CRM_ALERT_DELETED", `Deleted CRM alert "${alert.title}"`, req);

    return res.status(200).json({ message: "Alert deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete alert." });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found." });

    await Notification.deleteOne({ _id: notification._id });
    await logActivity(req.user._id, req.user.name, "CRM_NOTIFICATION_DELETED", `Deleted in-app notification "${notification.title}"`, req);

    return res.status(200).json({ message: "Notification deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete notification." });
  }
};

module.exports = {
  getCrmDashboardStats,
  getCampaigns,
  createCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getSegments,
  createSegment,
  deleteSegment,
  getAlerts,
  resolveAlert,
  deleteAlert,
  getCustomerTimeline,
  getCustomerCoupons,
  assignCouponToCustomer,
  getCustomerCommunicationHistory,
  sendIndividualMessage,
  deleteNotification,
};
