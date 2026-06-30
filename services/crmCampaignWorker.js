const MessageQueue = require("../models/MessageQueue");
const Campaign = require("../models/Campaign");
const EmailLog = require("../models/EmailLog");
const SmsLog = require("../models/SmsLog");
const WhatsAppLog = require("../models/WhatsAppLog");
const PushLog = require("../models/PushLog");
const Notification = require("../models/Notification");
const { sendMailWithRetries, getSmtpConfig } = require("./emailTransporter");
const { sendSMS } = require("./smsService");
const { sendWhatsAppMessage } = require("./whatsappService");
const { sendPushNotification } = require("./pushNotificationService");

const processCampaignQueue = async () => {
  try {
    const cutoff = new Date();
    const pendingMessages = await MessageQueue.find({
      status: "Pending",
      scheduledAt: { $lte: cutoff },
    })
      .limit(50)
      .lean();

    if (pendingMessages.length === 0) return;

    console.info(`[crmCampaignWorker] Found ${pendingMessages.length} pending campaign message(s) to process.`);

    for (const msg of pendingMessages) {
      // Mark as Processing
      await MessageQueue.updateOne({ _id: msg._id }, { $set: { status: "Processing" } });

      try {
        let dispatchResult = null;

        if (msg.channel === "Email") {
          // Send via Nodemailer SMTP config
          const config = getSmtpConfig();
          const fromAddress = String(process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@giftstore.com").trim();
          const mailOptions = {
            from: `"Gift Store CRM" <${fromAddress}>`,
            to: msg.to.toLowerCase().trim(),
            subject: msg.payload.subject || "Promotion Special",
            html: msg.payload.bodyHtml || msg.payload.content,
            text: msg.payload.bodyText || "Please open HTML representation.",
          };

          if (config.provider) {
            await sendMailWithRetries(mailOptions);
          } else {
            console.warn("[crmCampaignWorker] SMTP not configured. Simulating successful email send.");
          }

          // Write to EmailLog for profile logs integrity
          dispatchResult = await EmailLog.create({
            to: msg.to.toLowerCase().trim(),
            subject: mailOptions.subject,
            bodyHtml: mailOptions.html,
            bodyText: mailOptions.text,
            type: "campaign_email",
            status: "Sent",
            sentAt: new Date(),
            attempts: 1,
            referenceModel: "Campaign",
            referenceId: msg.campaignId,
          });

        } else if (msg.channel === "SMS") {
          dispatchResult = await sendSMS({
            to: msg.to,
            message: msg.payload.message || msg.payload.content,
            campaignId: msg.campaignId,
          });

        } else if (msg.channel === "WhatsApp") {
          dispatchResult = await sendWhatsAppMessage({
            to: msg.to,
            message: msg.payload.message || msg.payload.content,
            templateName: msg.payload.templateName || "",
            mediaUrl: msg.payload.mediaUrl || "",
            campaignId: msg.campaignId,
          });

        } else if (msg.channel === "Push") {
          dispatchResult = await sendPushNotification({
            recipientId: msg.recipientId,
            title: msg.payload.title,
            message: msg.payload.message || msg.payload.content,
            image: msg.payload.image || "",
            icon: msg.payload.icon || "",
            ctaButtonLabel: msg.payload.ctaButtonLabel || "",
            deepLink: msg.payload.deepLink || "",
            campaignId: msg.campaignId,
          });

        } else if (msg.channel === "Website Notification") {
          // Website Notification (In-App)
          dispatchResult = await Notification.create({
            recipient: msg.recipientId,
            title: msg.payload.title,
            message: msg.payload.message || msg.payload.content,
            type: msg.payload.type || "Promotion",
            status: "Sent",
          });
        }

        // Complete queue item
        await MessageQueue.updateOne(
          { _id: msg._id },
          { $set: { status: "Sent", attempts: msg.attempts + 1 } }
        );

        // Update campaign metrics
        if (msg.campaignId) {
          await Campaign.updateOne(
            { _id: msg.campaignId },
            {
              $inc: { "metrics.sentCount": 1 },
              $set: { status: "Running", startedAt: new Date() },
            }
          );
        }

      } catch (err) {
        console.error(`[crmCampaignWorker] Error processing message ID ${msg._id}:`, err.message);
        await MessageQueue.updateOne(
          { _id: msg._id },
          {
            $set: {
              status: msg.attempts >= 2 ? "Failed" : "Pending",
              attempts: msg.attempts + 1,
              lastError: err.message || "Dispatch error",
            },
          }
        );
      }
    }

    // Check if running campaigns have completed (no more Pending/Processing entries in queue)
    const activeCampaignIds = await Campaign.find({ status: "Running" }).distinct("_id");
    for (const cId of activeCampaignIds) {
      const remaining = await MessageQueue.countDocuments({
        campaignId: cId,
        status: { $in: ["Pending", "Processing"] },
      });
      if (remaining === 0) {
        await Campaign.updateOne(
          { _id: cId },
          { $set: { status: "Completed", completedAt: new Date() } }
        );
        console.info(`[crmCampaignWorker] Campaign ID ${cId} has completed processing.`);
      }
    }

  } catch (error) {
    console.error("[crmCampaignWorker] Queue loop failed:", error.message);
  }
};

/**
 * Initializes background queue check loop.
 */
const startCrmCampaignWorker = () => {
  console.info("[crmCampaignWorker] Initializing campaign queue background worker...");
  // Run queue checker every 30 seconds
  setInterval(processCampaignQueue, 30 * 1000);
};

module.exports = { startCrmCampaignWorker, processCampaignQueue };
