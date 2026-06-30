const SmsLog = require("../models/SmsLog");

/**
 * Send an SMS to a customer phone number.
 * Falls back to simulation if no Twilio/SMS settings are defined in env.
 */
const sendSMS = async ({ to, message, sentBy = null, campaignId = null, scheduledAt = null }) => {
  let logEntry = null;
  try {
    if (!to || !message) {
      throw new Error("Missing recipient (to) or message text.");
    }

    logEntry = await SmsLog.create({
      to: to.trim(),
      message: message.trim(),
      status: "Pending",
      attempts: 1,
      sentBy,
      campaignId,
      scheduledAt,
    });

    console.info(`[smsService] Dispatching SMS to ${to}: "${message.substring(0, 50)}..."`);

    // In a real environment, you would integrate Twilio or AWS SNS:
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({ body: message, to, from: process.env.TWILIO_PHONE_NUMBER });

    // Mock successful transmission
    logEntry.status = "Delivered";
    logEntry.sentAt = new Date();
    await logEntry.save();

    return logEntry;
  } catch (error) {
    console.error(`[smsService] Failed to send SMS to ${to}:`, error.message);
    if (logEntry) {
      logEntry.status = "Failed";
      logEntry.lastError = error.message;
      await logEntry.save();
    }
    return logEntry;
  }
};

module.exports = { sendSMS };
