const PushLog = require("../models/PushLog");
const Notification = require("../models/Notification");

/**
 * Dispatch browser/device Push Notifications.
 * Falls back to simulation/logging.
 */
const sendPushNotification = async ({
  recipientId = null,
  title,
  message,
  image = "",
  icon = "",
  ctaButtonLabel = "",
  deepLink = "",
  sentBy = null,
  campaignId = null,
}) => {
  try {
    if (!title || !message) {
      throw new Error("Missing notification title or message description.");
    }

    const logEntry = await PushLog.create({
      recipient: recipientId,
      title: title.trim(),
      message: message.trim(),
      image: image.trim(),
      icon: icon.trim(),
      ctaButtonLabel: ctaButtonLabel.trim(),
      deepLink: deepLink.trim(),
      status: "Sent",
      sentBy,
      campaignId,
      sentAt: new Date(),
    });

    if (recipientId) {
      await Notification.create({
        recipient: recipientId,
        title: title.trim(),
        message: message.trim(),
        type: "Promotion",
        status: "Sent",
        sentBy,
      });
    }

    console.info(`[pushService] Dispatched push notification: "${title}" to ${recipientId || "All Broadcast"}`);

    // In a real environment, integrate web-push or FCM (Firebase Cloud Messaging):
    // const webpush = require("web-push");
    // await webpush.sendNotification(subscription, JSON.stringify({ title, message, ... }));

    return logEntry;
  } catch (error) {
    console.error("[pushService] Push notification dispatch failed:", error.message);
    throw error;
  }
};

module.exports = { sendPushNotification };
