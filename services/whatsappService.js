const WhatsAppLog = require("../models/WhatsAppLog");

/**
 * Send a WhatsApp Message.
 * Supports template dispatches, catalog details sharing, PDF/Image media, and simulation fallback.
 */
const sendWhatsAppMessage = async ({
  to,
  message,
  templateName = "",
  mediaUrl = "",
  catalogProductId = null,
  sentBy = null,
  campaignId = null,
}) => {
  let logEntry = null;
  try {
    if (!to || !message) {
      throw new Error("Missing recipient (to) or WhatsApp message content.");
    }

    logEntry = await WhatsAppLog.create({
      to: to.trim(),
      message: message.trim(),
      templateName: templateName.trim(),
      mediaUrl: mediaUrl.trim(),
      catalogProductId,
      status: "Pending",
      attempts: 1,
      sentBy,
      campaignId,
    });

    console.info(`[whatsappService] Dispatching WhatsApp to ${to}: "${message.substring(0, 50)}..." [Template: ${templateName || "None"}]`);

    // In a real environment, integrate Facebook Graph/WhatsApp Business API:
    // axios.post(`https://graph.facebook.com/v17.0/${phoneId}/messages`, { ... })

    // Simulate successful transmission
    logEntry.status = "Delivered";
    logEntry.sentAt = new Date();
    await logEntry.save();

    return logEntry;
  } catch (error) {
    console.error(`[whatsappService] Failed to send WhatsApp to ${to}:`, error.message);
    if (logEntry) {
      logEntry.status = "Failed";
      logEntry.lastError = error.message;
      await logEntry.save();
    }
    return logEntry;
  }
};

module.exports = { sendWhatsAppMessage };
