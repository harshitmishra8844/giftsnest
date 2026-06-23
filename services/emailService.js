const EmailLog = require("../models/EmailLog");
const EmailSetting = require("../models/EmailSetting");
const StoreSetting = require("../models/StoreSetting");
const User = require("../models/User");
const Order = require("../models/Order");
const Return = require("../models/Return");
const { sendMailWithRetries, getSmtpConfig } = require("./emailTransporter");

// Helper to escape HTML characters
const escapeHtml = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// Helper to get store details from database
const getStoreDetails = async () => {
  try {
    const dbStoreInfo = await StoreSetting.findOne({ singletonKey: "store" }).lean();
    return {
      storeName: dbStoreInfo?.storeName || process.env.STORE_NAME || "Niyora Gifts",
      storePhone: dbStoreInfo?.storePhone || process.env.STORE_PHONE || "+91-90000-00000",
      storeAddress: dbStoreInfo?.storeAddress || process.env.STORE_ADDRESS || "123 Commerce Street, Mumbai, Maharashtra 400001, India",
      storeLogoUrl: dbStoreInfo?.storeLogoUrl || "",
    };
  } catch (error) {
    console.error("[emailService] Error fetching store details:", error);
    return {
      storeName: "Niyora Gifts",
      storePhone: "+91-90000-00000",
      storeAddress: "123 Commerce Street, Mumbai, Maharashtra 400001, India",
      storeLogoUrl: "",
    };
  }
};

// Helper to get active email settings
const getEmailSettings = async () => {
  try {
    let settings = await EmailSetting.findOne({ singletonKey: "email" });
    if (!settings) {
      // Seed default on-demand if missing
      settings = await EmailSetting.create({
        singletonKey: "email",
        adminEmails: [process.env.ADMIN_EMAIL || "niyoragifts@gmail.com"],
        supportEmails: [process.env.ADMIN_EMAIL || "niyoragifts@gmail.com"],
      });
    }
    return settings;
  } catch (error) {
    console.error("[emailService] Error getting email settings:", error);
    return {
      adminEmails: [process.env.ADMIN_EMAIL || "niyoragifts@gmail.com"],
      supportEmails: [process.env.ADMIN_EMAIL || "niyoragifts@gmail.com"],
      notificationsEnabled: true,
      customerOrderConfirmation: true,
      customerOrderShipped: true,
      customerOrderDelivered: true,
      customerOrderCancelled: true,
      customerReturnRequest: true,
      customerReturnApproved: true,
      adminNewOrderAlert: true,
      adminCancelRequestAlert: true,
      adminReturnRequestAlert: true,
      supportNewOrderAlert: true,
      supportCancelRequestAlert: true,
      supportReturnRequestAlert: true,
      supportReturnApprovedAlert: true,
      supportRefundProcessAlert: true,
    };
  }
};

// Helper to resolve frontend URLs
const getShopUrl = () => {
  const raw = String(process.env.FRONTEND_URL || "").split(",")[0].trim();
  if (!raw || raw.includes("your-vercel-url") || raw.includes("vercel.app") || raw.includes("localhost")) {
    return "https://www.niyoragifts.in";
  }
  return raw;
};

/**
 * Unifies HTML wrapping inside the Premium Luxury Gold & Ivory Brand Theme
 */
const buildBrandedEmail = (title, headerTitle, cardBodyHtml, actionBtnHtml = "", orderSummaryTableHtml = "", storeInfo) => {
  const logoSection = storeInfo.storeLogoUrl
    ? `<img src="${encodeURI(storeInfo.storeLogoUrl)}" alt="${escapeHtml(storeInfo.storeName)}" style="height: 50px; object-fit: contain;" />`
    : `<span style="font-size: 26px; font-weight: 800; color: #1C1C1C; font-family: Georgia, serif; letter-spacing: 0.05em;">Niyora <span style="color: #D4AF37;">Gifts</span></span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FCF9F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FCF9F2; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Premium Boxed Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 30px rgba(212, 175, 55, 0.08); overflow: hidden; max-width: 600px; text-align: left; border: 1px solid #E7D29E;">
          
          <!-- Top Luxury Gold Bar -->
          <tr>
            <td height="8" style="background-color: #D4AF37;"></td>
          </tr>
          
          <!-- Branded Premium Header -->
          <tr>
            <td align="center" style="padding: 30px 20px; border-bottom: 1px solid #FAF4E5; background-color: #FAF6ED;">
              ${logoSection}
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #785D19; margin-top: 6px; font-weight: 700; font-family: 'Montserrat', sans-serif;">Curated Celebrations</div>
            </td>
          </tr>
          
          <!-- Title / Headline Banner -->
          <tr>
            <td style="padding: 30px 30px 10px 30px;">
              <h2 style="margin: 0; font-size: 22px; font-weight: 400; color: #1C1C1C; font-family: Georgia, serif; line-height: 1.3;">${headerTitle}</h2>
            </td>
          </tr>
          
          <!-- Main Content Card Body -->
          <tr>
            <td style="padding: 10px 30px 20px 30px; font-size: 14px; color: #4B4B4B; line-height: 1.65; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
              ${cardBodyHtml}
            </td>
          </tr>

          <!-- Dynamic Order Summary Table (If provided) -->
          ${orderSummaryTableHtml ? `
          <tr>
            <td style="padding: 10px 30px 25px 30px;">
              <div style="border: 1px solid #FAF4E5; border-radius: 16px; overflow: hidden; background-color: #FCFAF5; padding: 15px;">
                ${orderSummaryTableHtml}
              </div>
            </td>
          </tr>
          ` : ''}
          
          <!-- Call To Action Button (If provided) -->
          ${actionBtnHtml ? `
          <tr>
            <td align="center" style="padding: 10px 30px 30px 30px;">
              ${actionBtnHtml}
            </td>
          </tr>
          ` : ''}
          
          <!-- Premium Footer Section -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #1C1C1C; color: #FAF4E5; border-top: 1px solid #E7D29E; text-align: center;">
              <div style="font-size: 15px; font-family: Georgia, serif; font-style: italic; color: #D4AF37; margin-bottom: 12px;">Niyora Gifts</div>
              <p style="margin: 0 0 16px 0; font-size: 11px; line-height: 1.6; color: #C2BCA8; max-width: 400px;">
                ${escapeHtml(storeInfo.storeAddress)}<br/>
                Call / WhatsApp: ${escapeHtml(storeInfo.storePhone)} &bull; Email: <a href="mailto:niyoragifts@gmail.com" style="color: #D4AF37; text-decoration: none;">niyoragifts@gmail.com</a>
              </p>
              
              <!-- Social Media Icon Links -->
              <div style="margin-bottom: 20px;">
                <a href="https://www.facebook.com" target="_blank" style="color: #FAF4E5; text-decoration: none; font-size: 11px; margin: 0 8px; border: 1px solid #C2BCA8; padding: 4px 8px; border-radius: 4px; background-color: #2D2D2D;">Facebook</a>
                <a href="https://www.instagram.com" target="_blank" style="color: #FAF4E5; text-decoration: none; font-size: 11px; margin: 0 8px; border: 1px solid #C2BCA8; padding: 4px 8px; border-radius: 4px; background-color: #2D2D2D;">Instagram</a>
                <a href="https://www.pinterest.com" target="_blank" style="color: #FAF4E5; text-decoration: none; font-size: 11px; margin: 0 8px; border: 1px solid #C2BCA8; padding: 4px 8px; border-radius: 4px; background-color: #2D2D2D;">Pinterest</a>
              </div>

              <div style="font-size: 9.5px; color: #8F8B7D; border-top: 1px solid #333333; padding-top: 15px;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(storeInfo.storeName)}. Crafted for Memorable Moments.<br/>
                This is a transactional confirmation notification.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Builds HTML table rows for order items listing
 */
const buildItemsTableHtml = (products) => {
  const itemsHtml = (products || []).map((item) => {
    const itemName = escapeHtml(item.name);
    const itemQty = Number(item.quantity || 1);
    const itemPrice = Number(item.price || 0).toFixed(2);
    const itemTotal = (itemPrice * itemQty).toFixed(2);

    let customizationDetails = "";
    if (item.customization && (item.customization.text || item.customization.uploadedImage || item.customization.textSize || item.customization.position)) {
      const parts = [];
      if (item.customization.text) {
        parts.push(`<strong>Text:</strong> "${escapeHtml(item.customization.text)}"`);
      }
      if (item.customization.uploadedImage) {
        parts.push(`<strong>Photo:</strong> <a href="${encodeURI(item.customization.uploadedImage)}" target="_blank" style="color: #D4AF37; text-decoration: underline;">View Uploaded Photo</a>`);
      }
      if (item.customization.textSize) {
        parts.push(`<strong>Size:</strong> ${escapeHtml(item.customization.textSize)}`);
      }
      if (item.customization.position) {
        parts.push(`<strong>Position:</strong> ${escapeHtml(item.customization.position)}`);
      }
      customizationDetails = `<div style="font-size: 11px; color: #666; background-color: #F8F5EC; border-left: 2px solid #D4AF37; padding: 5px 8px; margin-top: 4px; border-radius: 4px;">${parts.join("<br/>")}</div>`;
    }

    return `
      <tr style="border-bottom: 1px solid #FAF4E5;">
        <td style="padding: 10px 4px; font-size: 13px; color: #1C1C1C; vertical-align: top; text-align: left;">
          <div style="font-weight: bold;">${itemName}</div>
          ${customizationDetails}
        </td>
        <td style="padding: 10px 4px; font-size: 13px; color: #4B4B4B; text-align: center; vertical-align: top;">${itemQty}</td>
        <td style="padding: 10px 4px; font-size: 13px; color: #4B4B4B; text-align: right; vertical-align: top;">₹${itemPrice}</td>
        <td style="padding: 10px 4px; font-size: 13px; color: #1C1C1C; font-weight: bold; text-align: right; vertical-align: top;">₹${itemTotal}</td>
      </tr>
    `;
  }).join("");

  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; text-align: left;">
      <thead>
        <tr style="border-bottom: 2px solid #E7D29E; background-color: #FCFAF5;">
          <th style="padding: 8px 4px; font-size: 11px; font-weight: bold; color: #785D19; text-transform: uppercase; text-align: left;">Item</th>
          <th style="padding: 8px 4px; font-size: 11px; font-weight: bold; color: #785D19; text-transform: uppercase; text-align: center;">Qty</th>
          <th style="padding: 8px 4px; font-size: 11px; font-weight: bold; color: #785D19; text-transform: uppercase; text-align: right;">Price</th>
          <th style="padding: 8px 4px; font-size: 11px; font-weight: bold; color: #785D19; text-transform: uppercase; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
  `;
};

/**
 * Builds HTML table for cost summaries (subtotal, discount, total)
 */
const buildSummaryCardHtml = (order) => {
  const subtotal = Number(order.subtotal || 0).toFixed(2);
  const discount = Number(order.discountAmount || 0).toFixed(2);
  const total = Number(order.totalPrice || 0).toFixed(2);
  const isCod = order.paymentMethod === "COD";

  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #FAF4E5; padding-top: 10px; margin-top: 15px;">
      <tr>
        <td width="70%" style="font-size: 13px; color: #6B6B6B; padding: 4px 0; text-align: right;">Subtotal:</td>
        <td width="30%" style="font-size: 13px; color: #1C1C1C; padding: 4px 0; text-align: right; font-weight: bold;">₹${subtotal}</td>
      </tr>
      ${Number(discount) > 0 ? `
      <tr>
        <td style="font-size: 13px; color: #6B6B6B; padding: 4px 0; text-align: right;">Coupon Discount ${order.couponCode ? `(${escapeHtml(order.couponCode)})` : ""}:</td>
        <td style="font-size: 13px; color: #DC2626; padding: 4px 0; text-align: right; font-weight: bold;">-₹${discount}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="font-size: 15px; color: #1C1C1C; font-weight: bold; padding: 10px 0 0 0; text-align: right; border-top: 1px dashed #E7D29E;">Total ${isCod ? "Payable" : "Paid"}:</td>
        <td style="font-size: 17px; color: #D4AF37; font-weight: bold; padding: 10px 0 0 0; text-align: right; border-top: 1px dashed #E7D29E;">₹${total}</td>
      </tr>
    </table>
  `;
};

/**
 * CENTRAL DISPATCH AND LOGGING QUEUE
 */
const queueEmail = async (to, subject, bodyHtml, bodyText, type, referenceId = null, referenceModel = null) => {
  let logEntry = null;
  try {
    const config = getSmtpConfig();
    const settings = await getEmailSettings();

    // Check general notification switch
    if (!settings.notificationsEnabled) {
      console.info(`[emailService] Email notification disabled globally. Skipping: ${subject}`);
      return null;
    }

    // Check specific template switch
    const switchKey = getSwitchKeyForType(type);
    if (switchKey && !settings[switchKey]) {
      console.info(`[emailService] Notification type '${type}' is disabled in settings. Skipping: ${subject}`);
      return null;
    }

    // Save initial Pending log entry
    logEntry = await EmailLog.create({
      to: to.toLowerCase().trim(),
      subject: subject.trim(),
      bodyHtml,
      bodyText,
      type,
      referenceId,
      referenceModel,
      status: "Pending",
      attempts: 0,
    });

    if (!config.provider) {
      throw new Error("No active email provider (SMTP/Resend/Brevo) configured in environment settings.");
    }

    // Fire sending asynchronously
    sendEmailAsync(logEntry._id).catch((asyncErr) => {
      console.error(`[emailService] Async dispatch failed for log ID ${logEntry._id}:`, asyncErr.message);
    });

    return logEntry;
  } catch (error) {
    console.error(`[emailService] Error queueing email to ${to}:`, error.message);
    if (logEntry) {
      logEntry.status = "Failed";
      logEntry.attempts += 1;
      logEntry.lastError = error.message;
      await logEntry.save();
    }
    return logEntry;
  }
};

// Perform background async sending
const sendEmailAsync = async (logId) => {
  const log = await EmailLog.findById(logId);
  if (!log) return;

  log.attempts += 1;
  const storeInfo = await getStoreDetails();
  const fromAddress = String(process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
  const defaultFrom = `no-reply@${String(process.env.DOMAIN || "example.com").trim()}`;
  const from = fromAddress || defaultFrom;

  const mailOptions = {
    from: `"${storeInfo.storeName}" <${from}>`,
    to: log.to,
    subject: log.subject,
    text: log.bodyText,
    html: log.bodyHtml,
  };

  try {
    await sendMailWithRetries(mailOptions);
    log.status = "Sent";
    log.sentAt = new Date();
    log.lastError = "";
    await log.save();
    console.info(`[emailService] Email sent successfully and logged. Subject: ${log.subject}`);
  } catch (err) {
    log.status = "Failed";
    log.lastError = err.message || "Unknown delivery error";
    await log.save();
    console.error(`[emailService] Attempt ${log.attempts} failed for log ID ${logId}:`, err.message);
  }
};

// Retry a failed email log
const retryEmail = async (logId) => {
  try {
    const log = await EmailLog.findById(logId);
    if (!log) throw new Error("Email log not found.");
    await sendEmailAsync(log._id);
    return await EmailLog.findById(logId);
  } catch (err) {
    console.error(`[emailService] Manual retry failed for log ${logId}:`, err.message);
    throw err;
  }
};

// Map template types to settings toggles
const getSwitchKeyForType = (type) => {
  const mapping = {
    customer_order_confirmation: "customerOrderConfirmation",
    customer_order_shipped: "customerOrderShipped",
    customer_order_delivered: "customerOrderDelivered",
    customer_order_cancelled: "customerOrderCancelled",
    customer_return_request: "customerReturnRequest",
    customer_return_approved: "customerReturnApproved",
    admin_new_order: "adminNewOrderAlert",
    admin_cancel_request: "adminCancelRequestAlert",
    admin_return_request: "adminReturnRequestAlert",
    support_new_order: "supportNewOrderAlert",
    support_cancel_request: "supportCancelRequestAlert",
    support_return_request: "supportReturnRequestAlert",
    support_return_approved: "supportReturnApprovedAlert",
    support_refund_process: "supportRefundProcessAlert",
  };
  return mapping[type] || null;
};

// Background queue worker to auto-retry failed/pending emails
const runBackgroundQueue = async () => {
  try {
    // Find logs that are Pending or Failed with < 3 attempts and older than 1 minute (to avoid overlaps)
    const cutoff = new Date(Date.now() - 60000);
    const retryLogs = await EmailLog.find({
      status: { $in: ["Pending", "Failed"] },
      attempts: { $lt: 3 },
      updatedAt: { $lt: cutoff },
    });

    if (retryLogs.length > 0) {
      console.info(`[emailService Worker] Found ${retryLogs.length} emails to process/retry.`);
      for (const log of retryLogs) {
        await sendEmailAsync(log._id);
      }
    }
  } catch (err) {
    console.error("[emailService Worker] Queue processing error:", err.message);
  }
};

// Start background interval
const startEmailWorker = () => {
  console.info("[emailService] Initializing background email queue worker...");
  // Run every 5 minutes
  setInterval(runBackgroundQueue, 5 * 60 * 1000);
};


/* ==========================================================================
   1. CUSTOMER TEMPLATE GENERATORS
   ========================================================================== */

const sendCustomerOrderConfirmation = async (order) => {
  const storeInfo = await getStoreDetails();
  const orderCode = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" });

  const customerName = order.address?.fullName || "Valued Guest";
  const customerEmail = order.userId?.email || order.email || "";
  if (!customerEmail) return null;

  const fullAddress = [order.address?.line1, order.address?.city, order.address?.state, order.address?.postalCode, order.address?.country || "India"].filter(Boolean).join(", ");
  
  // Format estimated delivery date (7 days after order date)
  const estDelivery = new Date(order.createdAt || Date.now());
  estDelivery.setDate(estDelivery.getDate() + 7);
  const estDeliveryStr = estDelivery.toLocaleDateString("en-IN", { dateStyle: "long" });

  const title = `Order Confirmed: ${orderCode}`;
  const headline = `Thank you for your order!`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(customerName)},</p>
    <p>We are delighted to confirm that your order <strong>#${escapeHtml(orderCode)}</strong> has been successfully placed. Our team is handcrafting your selections with the utmost care.</p>
    
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="40%"><strong>Order Reference:</strong></td>
        <td align="right"><strong>${escapeHtml(orderCode)}</strong></td>
      </tr>
      <tr>
        <td><strong>Date Placed:</strong></td>
        <td align="right">${orderDate}</td>
      </tr>
      <tr>
        <td><strong>Estimated Delivery:</strong></td>
        <td align="right" style="color: #785D19; font-weight: bold;">On or before ${estDeliveryStr}</td>
      </tr>
      <tr>
        <td><strong>Payment Method:</strong></td>
        <td align="right">${order.paymentMethod || "Online"}</td>
      </tr>
      <tr>
        <td><strong>Shipping Address:</strong></td>
        <td align="right">${escapeHtml(fullAddress)}</td>
      </tr>
    </table>
    <p>Should you need to make any alterations before dispatch, please contact our concierge care support team immediately.</p>
  `;

  const orderSummaryTable = buildItemsTableHtml(order.products) + buildSummaryCardHtml(order);
  
  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <div style="margin-top: 15px;">
      <a href="${shopUrl}/track-order?orderId=${orderCode}&email=${encodeURIComponent(customerEmail)}" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 26px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C; margin-right: 10px; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.15);">Track Order</a>
      <a href="mailto:niyoragifts@gmail.com?subject=Inquiry regarding order #${orderCode}" style="display: inline-block; background-color: #1C1C1C; color: #FAF4E5; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 26px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #333333; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">Contact Support</a>
    </div>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, orderSummaryTable, storeInfo);
  const textContent = `Hi ${customerName},\nThank you for your order! Order Code: ${orderCode}.\nEstimated Delivery: ${estDeliveryStr}.\nShipping Address: ${fullAddress}.\nTotal Amount: ₹${order.totalPrice}.\nTrack your order: ${shopUrl}/my-profile.`;

  return queueEmail(customerEmail, title, htmlContent, textContent, "customer_order_confirmation", order._id, "Order");
};

const sendCustomerOrderShipped = async (order) => {
  const storeInfo = await getStoreDetails();
  const orderCode = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  const customerName = order.address?.fullName || "Valued Customer";
  const customerEmail = order.userId?.email || order.email || "";
  if (!customerEmail) return null;

  const trackingId = order.trackingId || "N/A";
  const carrier = order.trackingCarrier ? order.trackingCarrier.toUpperCase() : "Courier Partner";
  
  // Carrier link resolver
  let trackingLink = `https://www.google.com/search?q=${encodeURIComponent(`courier tracking ${trackingId}`)}`;
  if (order.trackingCarrier === "delhivery") {
    trackingLink = `https://www.delhivery.com/track/package/${trackingId}`;
  } else if (order.trackingCarrier === "bluedart") {
    trackingLink = `https://www.bluedart.com/tracking?trackingNo=${trackingId}`;
  } else if (order.trackingCarrier === "xpressbees") {
    trackingLink = `https://www.xpressbees.com/shipment-tracking?awb=${trackingId}`;
  }

  // Format estimated delivery date (4 days after shipped date)
  const estDelivery = new Date();
  estDelivery.setDate(estDelivery.getDate() + 4);
  const estDeliveryStr = estDelivery.toLocaleDateString("en-IN", { dateStyle: "long" });

  const title = `Your Gift Shipment is on the Way: ${orderCode}`;
  const headline = `Your package has been Shipped!`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(customerName)},</p>
    <p>Exceptional news! Your gift box package for order <strong>#${escapeHtml(orderCode)}</strong> has left our design studio and is on its way to you.</p>
    
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="40%"><strong>Order Reference:</strong></td>
        <td align="right"><strong>${escapeHtml(orderCode)}</strong></td>
      </tr>
      <tr>
        <td><strong>Courier Partner:</strong></td>
        <td align="right"><strong>${escapeHtml(carrier)}</strong></td>
      </tr>
      <tr>
        <td><strong>Tracking AWB ID:</strong></td>
        <td align="right" style="color: #785D19; font-weight: bold; font-family: monospace;">${escapeHtml(trackingId)}</td>
      </tr>
      <tr>
        <td><strong>Estimated Delivery:</strong></td>
        <td align="right" style="color: #047857; font-weight: bold;">${estDeliveryStr}</td>
      </tr>
    </table>
    <p>Please note that tracking links may take up to 12-24 hours to display live delivery logs from our logistics partner.</p>
  `;

  const actionBtnHtml = `
    <a href="${trackingLink}" target="_blank" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.15);">Track Shipment</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, "", storeInfo);
  const textContent = `Hi ${customerName},\nYour package for order #${orderCode} has been shipped via ${carrier}.\nAWB Tracking ID: ${trackingId}.\nTracking link: ${trackingLink}.\nEstimated delivery: ${estDeliveryStr}.`;

  return queueEmail(customerEmail, title, htmlContent, textContent, "customer_order_shipped", order._id, "Order");
};

const sendCustomerOrderDelivered = async (order) => {
  const storeInfo = await getStoreDetails();
  const orderCode = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  const customerName = order.address?.fullName || "Valued Customer";
  const customerEmail = order.userId?.email || order.email || "";
  if (!customerEmail) return null;

  const title = `Delivered: Order Confirmed #${orderCode}`;
  const headline = `Your package has been successfully delivered!`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(customerName)},</p>
    <p>Our courier logs show that your package for order <strong>#${escapeHtml(orderCode)}</strong> has been delivered successfully. We hope this package brings delight and sets a magical tone for your celebrations!</p>
    <p>If you have any feedback or if the product requires attention, please use the return or review portal in your profile dashboard.</p>
    <p>Thank you for choosing ${escapeHtml(storeInfo.storeName)} to curate your gifting experiences.</p>
  `;

  const orderSummaryTable = buildItemsTableHtml(order.products);

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <div style="margin-top: 15px;">
      <a href="${shopUrl}/my-profile" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 26px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C; margin-right: 10px; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.15);">Review Product</a>
      <a href="${shopUrl}/my-profile" style="display: inline-block; background-color: #1C1C1C; color: #FAF4E5; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 26px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #333333; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">Request Return</a>
    </div>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, orderSummaryTable, storeInfo);
  const textContent = `Hi ${customerName},\nYour order #${orderCode} has been delivered successfully. We hope you love the handcrafted items. Review or request return at: ${shopUrl}/my-profile.`;

  return queueEmail(customerEmail, title, htmlContent, textContent, "customer_order_delivered", order._id, "Order");
};

const sendCustomerOrderCancelled = async (order, reason = "Not specified", refundTimeline = "5-7 business days") => {
  const storeInfo = await getStoreDetails();
  const orderCode = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  const customerName = order.address?.fullName || "Valued Customer";
  const customerEmail = order.userId?.email || order.email || "";
  if (!customerEmail) return null;

  const isPaid = order.paymentStatus === "Paid";

  const title = `Order Cancelled: #${orderCode}`;
  const headline = `Order cancellation confirmation`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(customerName)},</p>
    <p>As requested, your order <strong>#${escapeHtml(orderCode)}</strong> has been cancelled. Below are the summary details:</p>
    
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="40%"><strong>Order Reference:</strong></td>
        <td align="right"><strong>${escapeHtml(orderCode)}</strong></td>
      </tr>
      <tr>
        <td><strong>Cancellation Reason:</strong></td>
        <td align="right" style="color: #B91C1C;">${escapeHtml(reason)}</td>
      </tr>
      <tr>
        <td><strong>Refund Status:</strong></td>
        <td align="right" style="font-weight: bold;">${isPaid ? `Initiated (${escapeHtml(refundTimeline)})` : "No payment charged / COD"}</td>
      </tr>
    </table>
    <p>If payment was already charged, a refund is processed back to the original payment source and should reflect in your banking statement within 5-7 business days.</p>
  `;

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="mailto:niyoragifts@gmail.com?subject=Cancellation of order #${orderCode}" style="display: inline-block; background-color: #1C1C1C; color: #FAF4E5; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #333333; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">Contact Support</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, "", storeInfo);
  const textContent = `Hi ${customerName},\nYour order #${orderCode} has been cancelled. Reason: ${reason}. Refund Status: ${isPaid ? `Processed within ${refundTimeline}` : 'No payment charged'}.`;

  return queueEmail(customerEmail, title, htmlContent, textContent, "customer_order_cancelled", order._id, "Order");
};

const sendCustomerReturnSubmitted = async (user, order, returnRequest) => {
  const storeInfo = await getStoreDetails();
  const code = returnRequest.returnCode;
  const orderCode = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  
  const title = `Return Request Submitted: ${code}`;
  const headline = `We have received your Return Request`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>Thank you for contacting customer support. We have successfully received your return request <strong>${code}</strong> for order <strong>#${escapeHtml(orderCode)}</strong>. Our quality verification team is reviewing the description and uploaded media.</p>
    
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="45%"><strong>Return ID:</strong></td>
        <td align="right" style="color: #785D19; font-weight: bold;">${code}</td>
      </tr>
      <tr>
        <td><strong>Order Reference:</strong></td>
        <td align="right">${escapeHtml(orderCode)}</td>
      </tr>
      <tr>
        <td><strong>Reason:</strong></td>
        <td align="right">${escapeHtml(returnRequest.reason)}</td>
      </tr>
      <tr>
        <td><strong>Preferred Resolution:</strong></td>
        <td align="right" style="font-weight: bold;">${escapeHtml(returnRequest.preferredResolution)}</td>
      </tr>
      <tr>
        <td><strong>Status:</strong></td>
        <td align="right" style="color: #D4AF37; font-weight: bold;">Under Review</td>
      </tr>
    </table>
    <p>We will update you as soon as pickup is scheduled or if further details are required. In the meantime, you can track progress on your ticket board.</p>
  `;

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="${shopUrl}/my-profile" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.15);">Track Return Status</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, "", storeInfo);
  const textContent = `Hi ${user.name},\nYour return request ${code} for order #${orderCode} is received. Status: Under Review. Resolution: ${returnRequest.preferredResolution}.`;

  return queueEmail(user.email, title, htmlContent, textContent, "customer_return_request", returnRequest._id, "Return");
};

const sendCustomerReturnApproved = async (user, returnRequest) => {
  const storeInfo = await getStoreDetails();
  const code = returnRequest.returnCode;
  
  const title = `Return Request Approved: ${code}`;
  const headline = `Your Return Request has been Approved!`;
  
  const pickupDateStr = returnRequest.pickupDetails?.pickupDate
    ? new Date(returnRequest.pickupDetails.pickupDate).toLocaleDateString("en-IN", { dateStyle: "long" })
    : "Soon (within 1-2 business days)";

  const bodyHtml = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>Your return request <strong>${code}</strong> has been <strong>Approved</strong>. We have coordinated a reverse logistics pickup for your package.</p>
    
    <div style="background-color: #FCFAF5; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0; border-radius: 8px;">
      <h4 style="margin: 0 0 8px 0; color: #785D19; font-size: 13.5px; font-family: Georgia, serif;">Reverse Pickup Instructions</h4>
      <ol style="margin: 0; padding-left: 20px; font-size: 12.5px; line-height: 1.6; color: #4B4B4B;">
        <li>Please wrap the product in its original packaging boxes with tags and customizations intact.</li>
        <li>Print/write the Return ID <strong>${code}</strong> clearly on the outer package.</li>
        <li>Hand over the package to the courier partner when they arrive.</li>
        <li><strong>Scheduled Date:</strong> ${pickupDateStr}</li>
      </ol>
    </div>
    
    <p>Once our fulfillment studio receives the returned package and completes the validation check, we will immediately initiate the selected refund or replacement process.</p>
  `;

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="${shopUrl}/my-profile" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.15);">View Return Details</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, "", storeInfo);
  const textContent = `Hi ${user.name},\nYour return request ${code} is approved. Reverse pickup is scheduled. Please prepare the items in original packaging.`;

  return queueEmail(user.email, title, htmlContent, textContent, "customer_return_approved", returnRequest._id, "Return");
};

const sendCustomerReturnRejected = async (user, returnRequest, note = "") => {
  const storeInfo = await getStoreDetails();
  const code = returnRequest.returnCode;
  
  const title = `Return Request Update: ${code}`;
  const headline = `Return Request Update`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>We are writing to update you regarding your return request <strong>${code}</strong>.</p>
    <p>Following review by our customer support specialists, your request has been <strong>Declined</strong> at this time due to the following reason:</p>
    <div style="background-color: #FCFAF5; border-left: 3px solid #D4AF37; padding: 12px 18px; margin: 15px 0; font-style: italic; color: #1C1C1C; font-size: 13.5px; border-radius: 6px;">
      "${escapeHtml(note || "No specific note provided.")}"
    </div>
    <p>If you believe this is a mistake or have additional details/videos to provide, please reply to the active support ticket from your profile dashboard.</p>
  `;

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="${shopUrl}/my-profile" style="display: inline-block; background-color: #1C1C1C; color: #FAF4E5; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #333333; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">Open Support Ticket</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, "", storeInfo);
  const textContent = `Hi ${user.name},\nYour return request ${code} was declined. Reason: ${note}. Support link: ${shopUrl}/my-profile`;

  return queueEmail(user.email, title, htmlContent, textContent, "customer_return_request", returnRequest._id, "Return");
};

const sendCustomerPickupScheduled = async (user, returnRequest) => {
  const storeInfo = await getStoreDetails();
  const code = returnRequest.returnCode;
  const p = returnRequest.pickupDetails || {};
  const dateStr = p.pickupDate ? new Date(p.pickupDate).toLocaleDateString("en-IN", { dateStyle: "long" }) : "Soon";
  
  const title = `Reverse Pickup Scheduled: ${code}`;
  const headline = `Reverse Pickup Scheduled`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>Your reverse logistics pickup has been scheduled for return request <strong>${code}</strong>.</p>
    
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="40%"><strong>Courier Partner:</strong></td>
        <td align="right"><strong>${escapeHtml(p.courier || "Express Delivery")}</strong></td>
      </tr>
      <tr>
        <td><strong>Tracking AWB ID:</strong></td>
        <td align="right" style="color: #785D19; font-weight: bold; font-family: monospace;">${escapeHtml(p.trackingId || "N/A")}</td>
      </tr>
      <tr>
        <td><strong>Scheduled Date:</strong></td>
        <td align="right" style="color: #047857; font-weight: bold;">${dateStr}</td>
      </tr>
    </table>
    <p>Please keep the return package ready and hand it over to the pickup agent when they arrive.</p>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, "", "", storeInfo);
  const textContent = `Hi ${user.name},\nReverse pickup scheduled for return ${code} via ${p.courier}. AWB: ${p.trackingId}. Date: ${dateStr}`;

  return queueEmail(user.email, title, htmlContent, textContent, "customer_return_request", returnRequest._id, "Return");
};

const sendCustomerProductReceived = async (user, returnRequest) => {
  const storeInfo = await getStoreDetails();
  const code = returnRequest.returnCode;
  
  const title = `Returned Package Received: ${code}`;
  const headline = `Returned Product Received`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>We are writing to confirm that the package containing your returned items for return claim <strong>${code}</strong> has been received at our fulfillment center.</p>
    <p>Our quality verification desk is doing a quick inspection. We will proceed with your selected resolution preference: <strong>${escapeHtml(returnRequest.preferredResolution)}</strong> shortly.</p>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, "", "", storeInfo);
  const textContent = `Hi ${user.name},\nReturned package received for claim ${code}. Processing your selected resolution: ${returnRequest.preferredResolution}.`;

  return queueEmail(user.email, title, htmlContent, textContent, "customer_return_request", returnRequest._id, "Return");
};

const sendCustomerRefundInitiated = async (user, returnRequest, amount) => {
  const storeInfo = await getStoreDetails();
  const code = returnRequest.returnCode;
  
  const title = `Refund Process Initiated: ${code}`;
  const headline = `Refund is being Processed`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>We have initiated the refund process for your return claim <strong>${code}</strong>.</p>
    <p>An amount of <strong>INR ${amount}</strong> is being processed back to your original payment source or store credit account as selected.</p>
    <p>This process usually takes 5-7 business days to reflect in your banking statement depending on bank processing cycles.</p>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, "", "", storeInfo);
  const textContent = `Hi ${user.name},\nRefund of INR ${amount} initiated for return claim ${code}. Funds will reflect in 5-7 business days.`;

  return queueEmail(user.email, title, htmlContent, textContent, "customer_return_request", returnRequest._id, "Return");
};

const sendCustomerRefundCompleted = async (user, returnRequest, amount, reference = "") => {
  const storeInfo = await getStoreDetails();
  const code = returnRequest.returnCode;
  
  const title = `Refund Completed: ${code}`;
  const headline = `Refund Successfully Processed`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>We are pleased to inform you that your refund has been successfully completed for return request <strong>${code}</strong>.</p>
    
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="40%"><strong>Refunded Amount:</strong></td>
        <td align="right" style="color: #D4AF37; font-weight: bold; font-size: 15px;">INR ${amount}</td>
      </tr>
      <tr>
        <td><strong>Transaction Ref:</strong></td>
        <td align="right" style="font-family: monospace;">${escapeHtml(reference || "N/A")}</td>
      </tr>
    </table>
    <p>Should you have any further questions, please feel free to reach out to our concierge service desk.</p>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, "", "", storeInfo);
  const textContent = `Hi ${user.name},\nRefund of INR ${amount} completed for return request ${code}. Transaction Ref: ${reference}`;

  return queueEmail(user.email, title, htmlContent, textContent, "customer_return_request", returnRequest._id, "Return");
};

const sendCustomerReplacementShipped = async (user, returnRequest, replacementOrderCode) => {
  const storeInfo = await getStoreDetails();
  const code = returnRequest.returnCode;
  
  const title = `Replacement Package Shipped: ${code}`;
  const headline = `Replacement Package is on the Way!`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>We have shipped your replacement package matching return request <strong>${code}</strong>.</p>
    <p>Your new replacement order code is: <strong>${escapeHtml(replacementOrderCode)}</strong>.</p>
    <p>You can track the shipment live via the Order Tracking module in your profile dashboard.</p>
  `;

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="${shopUrl}/track-order?orderId=${replacementOrderCode}&email=${encodeURIComponent(user.email)}" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.15);">Track Replacement Order</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, "", storeInfo);
  const textContent = `Hi ${user.name},\nYour replacement order ${replacementOrderCode} has been shipped matching return request ${code}.`;

  return queueEmail(user.email, title, htmlContent, textContent, "customer_return_request", returnRequest._id, "Return");
};

const sendCustomerReturnClosed = async (user, returnRequest) => {
  const storeInfo = await getStoreDetails();
  const code = returnRequest.returnCode;
  
  const title = `Return Case Closed: ${code}`;
  const headline = `Return Case Resolved and Closed`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>This is to notify you that return request case <strong>${code}</strong> has been resolved and is now marked as <strong>Closed</strong>.</p>
    <p>We hope we resolved this issue to your complete satisfaction. Thank you for choosing ${escapeHtml(storeInfo.storeName)}!</p>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, "", "", storeInfo);
  const textContent = `Hi ${user.name},\nYour return case ${code} has been resolved and marked as closed.`;

  return queueEmail(user.email, title, htmlContent, textContent, "customer_return_request", returnRequest._id, "Return");
};

const sendAgentTicketAssigned = async (agent, ticket, returnRequest) => {
  const storeInfo = await getStoreDetails();
  const code = returnRequest ? returnRequest.returnCode : "N/A";
  
  const title = `[ASSIGNED] New Ticket: #${ticket.ticketCode}`;
  const headline = `New Support Ticket Assigned`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(agent.name)},</p>
    <p>A new customer support ticket has been assigned to you. Summary details:</p>
    
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="40%"><strong>Ticket Code:</strong></td>
        <td align="right" style="font-family: monospace;">#${ticket.ticketCode}</td>
      </tr>
      <tr>
        <td><strong>Subject:</strong></td>
        <td align="right" style="font-weight: bold;">${escapeHtml(ticket.subject)}</td>
      </tr>
      <tr>
        <td><strong>Return Reference:</strong></td>
        <td align="right" style="font-weight: bold; color: #785D19;">${code}</td>
      </tr>
    </table>
    <p>Please review the chat attachments and description details, and reply to the customer within the designated SLA.</p>
  `;

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="${shopUrl}/admin/dashboard" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.15);">Open Ticket Console</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, "", storeInfo);
  const textContent = `Hi ${agent.name},\nNew support ticket #${ticket.ticketCode} assigned to you. Subject: ${ticket.subject}`;

  return queueEmail(agent.email, title, htmlContent, textContent, "support_return_request", returnRequest?._id, "Return");
};

/* ==========================================================================
   2. ADMIN ALERTS TEMPLATE GENERATORS
   ========================================================================== */

const sendAdminNewOrderAlert = async (order) => {
  const storeInfo = await getStoreDetails();
  const settings = await getEmailSettings();
  const orderCode = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  
  const customerName = order.address?.fullName || "Guest Customer";
  const customerPhone = order.address?.phone || "N/A";
  const customerEmail = order.userId?.email || order.email || "N/A";
  const total = Number(order.totalPrice || 0).toFixed(2);

  const title = `[NEW ORDER] #${orderCode} - Value: ₹${total}`;
  const headline = `New Order Placed!`;
  const bodyHtml = `
    <p>An order has been placed on the store. Summary details:</p>
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="40%"><strong>Order Reference:</strong></td>
        <td align="right"><strong>${escapeHtml(orderCode)}</strong></td>
      </tr>
      <tr>
        <td><strong>Customer Details:</strong></td>
        <td align="right">${escapeHtml(customerName)} (${escapeHtml(customerPhone)})</td>
      </tr>
      <tr>
        <td><strong>Customer Email:</strong></td>
        <td align="right"><a href="mailto:${escapeHtml(customerEmail)}" style="color: #D4AF37;">${escapeHtml(customerEmail)}</a></td>
      </tr>
      <tr>
        <td><strong>Payment Status:</strong></td>
        <td align="right" style="font-weight: bold; text-transform: uppercase;">${escapeHtml(order.paymentStatus || "Paid")}</td>
      </tr>
    </table>
  `;

  const orderSummaryTable = buildItemsTableHtml(order.products) + buildSummaryCardHtml(order);
  
  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="${shopUrl}/admin/dashboard" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.15);">View Order on Dashboard</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, orderSummaryTable, storeInfo);
  const textContent = `Admin Alert: New Order #${orderCode} received from ${customerName}. Value: ₹${total}.`;

  // Send to all administrators listed in settings
  const results = [];
  for (const email of settings.adminEmails) {
    const res = await queueEmail(email, title, htmlContent, textContent, "admin_new_order", order._id, "Order");
    results.push(res);
  }
  return results;
};

const sendAdminCancelRequestAlert = async (order) => {
  const storeInfo = await getStoreDetails();
  const settings = await getEmailSettings();
  const orderCode = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  const customerName = order.address?.fullName || "Valued Customer";
  const reason = order.cancellationRequest?.reason || "Not specified";
  const details = order.cancellationRequest?.details || "Not specified";

  const title = `[CANCELLATION REQUEST] #${orderCode} - ${customerName}`;
  const headline = `Cancellation Requested by Customer`;
  const bodyHtml = `
    <p>Customer has submitted an order cancellation request. Summary details:</p>
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="40%"><strong>Order Reference:</strong></td>
        <td align="right"><strong>${escapeHtml(orderCode)}</strong></td>
      </tr>
      <tr>
        <td><strong>Customer:</strong></td>
        <td align="right">${escapeHtml(customerName)}</td>
      </tr>
      <tr>
        <td><strong>Reason:</strong></td>
        <td align="right" style="color: #B91C1C; font-weight: bold;">${escapeHtml(reason)}</td>
      </tr>
      <tr>
        <td><strong>Details:</strong></td>
        <td align="right">${escapeHtml(details)}</td>
      </tr>
    </table>
  `;

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="${shopUrl}/admin/dashboard" style="display: inline-block; background-color: #9C1F1F; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #7F1D1D; box-shadow: 0 4px 10px rgba(156, 31, 31, 0.15);">Review Request</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, "", storeInfo);
  const textContent = `Admin Alert: Cancellation requested for order #${orderCode} by ${customerName}. Reason: ${reason}`;

  const results = [];
  for (const email of settings.adminEmails) {
    const res = await queueEmail(email, title, htmlContent, textContent, "admin_cancel_request", order._id, "Order");
    results.push(res);
  }
  return results;
};

const sendAdminReturnRequestAlert = async (returnRequest, order) => {
  const storeInfo = await getStoreDetails();
  const settings = await getEmailSettings();
  const code = returnRequest.returnCode;
  const orderCode = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  const customerName = order.address?.fullName || "Valued Customer";

  const title = `[RETURN REQUEST] ${code} - Order #${orderCode}`;
  const headline = `Return Request Submitted`;
  const bodyHtml = `
    <p>A return request has been submitted by customer. Summary details:</p>
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="40%"><strong>Return ID:</strong></td>
        <td align="right" style="color: #785D19; font-weight: bold;">${code}</td>
      </tr>
      <tr>
        <td><strong>Order Reference:</strong></td>
        <td align="right">${escapeHtml(orderCode)}</td>
      </tr>
      <tr>
        <td><strong>Customer Name:</strong></td>
        <td align="right">${escapeHtml(customerName)}</td>
      </tr>
      <tr>
        <td><strong>Reason:</strong></td>
        <td align="right" style="color: #B91C1C; font-weight: bold;">${escapeHtml(returnRequest.reason)}</td>
      </tr>
      <tr>
        <td><strong>Resolution:</strong></td>
        <td align="right" style="font-weight: bold;">${escapeHtml(returnRequest.preferredResolution)}</td>
      </tr>
    </table>
    <p><strong>Detailed Description:</strong></p>
    <div style="background-color: #FCFAF5; border-left: 2px solid #D4AF37; padding: 12px; font-style: italic; font-size: 12.5px; border-radius: 4px; margin-bottom: 15px;">
      "${escapeHtml(returnRequest.description)}"
    </div>
  `;

  const orderSummaryTable = buildItemsTableHtml(returnRequest.items);

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="${shopUrl}/admin/dashboard" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.15);">Open Admin Panel</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, orderSummaryTable, storeInfo);
  const textContent = `Admin Alert: Return Request ${code} submitted for Order #${orderCode} by ${customerName}.`;

  const results = [];
  for (const email of settings.adminEmails) {
    const res = await queueEmail(email, title, htmlContent, textContent, "admin_return_request", returnRequest._id, "Return");
    results.push(res);
  }
  return results;
};


/* ==========================================================================
   3. SUPPORT TEAM TEMPLATE GENERATOR
   ========================================================================== */

const sendSupportNotification = async (eventType, data) => {
  const storeInfo = await getStoreDetails();
  const settings = await getEmailSettings();
  
  // Format specific content based on support event types
  let subject = `[SUPPORT ALERT] ${eventType} Notification`;
  let headline = `${eventType} Triggered`;
  let bodyHtml = `<p>This is a system-generated operational support notification.</p>`;
  let referenceId = null;
  let referenceModel = null;
  let textContent = `Support Team Alert: ${eventType}.`;

  if (eventType === "New Order") {
    const order = data;
    const code = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
    const name = order.address?.fullName || "Guest";
    const total = Number(order.totalPrice || 0).toFixed(2);
    referenceId = order._id;
    referenceModel = "Order";

    subject = `[SUPPORT ALERT] New Order Received #${code} - ${name}`;
    headline = `Fulfillment Team: New Order Placed`;
    bodyHtml = `
      <p>A new order has been received. Please verify if design customizations are upload-valid and prepare the catalog item packaging.</p>
      <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 15px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
        <tr>
          <td width="40%"><strong>Order Reference:</strong></td>
          <td align="right"><strong>${escapeHtml(code)}</strong></td>
        </tr>
        <tr>
          <td><strong>Customer Name:</strong></td>
          <td align="right">${escapeHtml(name)}</td>
        </tr>
        <tr>
          <td><strong>Total Value:</strong></td>
          <td align="right">₹${total}</td>
        </tr>
      </table>
    `;
    textContent = `Support Alert: Order #${code} needs fulfillment check.`;
  } else if (eventType === "Cancellation Request") {
    const order = data;
    const code = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
    const name = order.address?.fullName || "Customer";
    referenceId = order._id;
    referenceModel = "Order";

    subject = `[SUPPORT ALERT] Cancellation Request #${code} - ${name}`;
    headline = `Customer Support: Cancellation Pending`;
    bodyHtml = `
      <p>Customer has requested cancellation for order #${code}. Please check if the studio has started personalization processing. If not, halt dispatch prep immediately.</p>
      <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 15px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
        <tr>
          <td width="40%"><strong>Order Reference:</strong></td>
          <td align="right"><strong>${escapeHtml(code)}</strong></td>
        </tr>
        <tr>
          <td><strong>Customer Name:</strong></td>
          <td align="right">${escapeHtml(name)}</td>
        </tr>
        <tr>
          <td><strong>Reason:</strong></td>
          <td align="right" style="color: #B91C1C; font-weight: bold;">${escapeHtml(order.cancellationRequest?.reason || "Not specified")}</td>
        </tr>
      </table>
    `;
    textContent = `Support Alert: Order #${code} cancellation request pending review.`;
  } else if (eventType === "Return Request") {
    const returnRequest = data;
    const code = returnRequest.returnCode;
    referenceId = returnRequest._id;
    referenceModel = "Return";

    subject = `[SUPPORT ALERT] Return Claim Submitted ${code}`;
    headline = `Claims Team: New Return Claim`;
    bodyHtml = `
      <p>A return request has been submitted by the customer. A support ticket has been auto-opened.</p>
      <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 15px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
        <tr>
          <td width="40%"><strong>Return Code:</strong></td>
          <td align="right" style="color: #785D19; font-weight: bold;">${code}</td>
        </tr>
        <tr>
          <td><strong>Reason:</strong></td>
          <td align="right" style="color: #B91C1C;">${escapeHtml(returnRequest.reason)}</td>
        </tr>
        <tr>
          <td><strong>Resolution Preference:</strong></td>
          <td align="right" style="font-weight: bold;">${escapeHtml(returnRequest.preferredResolution)}</td>
        </tr>
      </table>
    `;
    textContent = `Support Alert: Return request ${code} submitted by customer.`;
  } else if (eventType === "Return Approval") {
    const returnRequest = data;
    const code = returnRequest.returnCode;
    referenceId = returnRequest._id;
    referenceModel = "Return";

    subject = `[SUPPORT ALERT] Return Approved ${code}`;
    headline = `Logistics Team: Arrange Reverse Pickup`;
    bodyHtml = `
      <p>Return request case <strong>${code}</strong> has been approved. Please assign a reverse pickup courier partner inside the administration console.</p>
    `;
    textContent = `Support Alert: Return case ${code} approved. Reverse pickup required.`;
  } else if (eventType === "Refund Process") {
    const refund = data; // RefundTransaction object
    referenceId = refund.returnId;
    referenceModel = "Return";

    subject = `[SUPPORT ALERT] Refund Initiated/Completed - Claim #${refund.returnId}`;
    headline = `Finance Desk: Refund Processing`;
    bodyHtml = `
      <p>A refund has been initiated or completed for return claim transaction.</p>
      <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 15px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
        <tr>
          <td width="40%"><strong>Amount:</strong></td>
          <td align="right" style="color: #D4AF37; font-weight: bold;">₹${refund.amount || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Refund Method:</strong></td>
          <td align="right">${escapeHtml(refund.method || "Refund")}</td>
        </tr>
        <tr>
          <td><strong>Reference ID:</strong></td>
          <td align="right" style="font-family: monospace;">${escapeHtml(refund.transactionReference || "N/A")}</td>
        </tr>
      </table>
    `;
    textContent = `Support Alert: Refund processed. Value: ₹${refund.amount}.`;
  }

  // Get specific switch trigger
  const switchKey = getSwitchKeyForSupport(eventType);
  if (switchKey && !settings[switchKey]) {
    console.info(`[emailService] Support event '${eventType}' is disabled in settings. Skipping support alerts.`);
    return null;
  }

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="${shopUrl}/admin/dashboard" style="display: inline-block; background-color: #1C1C1C; color: #FAF4E5; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #333333; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">Open Operation Dashboard</a>
  `;

  const htmlContent = buildBrandedEmail(subject, headline, bodyHtml, actionBtnHtml, "", storeInfo);

  // Send to all support team addresses listed in settings
  const results = [];
  for (const email of settings.supportEmails) {
    const res = await queueEmail(email, subject, htmlContent, textContent, switchKey, referenceId, referenceModel);
    results.push(res);
  }
  return results;
};

// Map support event types to settings toggles
const getSwitchKeyForSupport = (eventType) => {
  const mapping = {
    "New Order": "supportNewOrderAlert",
    "Cancellation Request": "supportCancelRequestAlert",
    "Return Request": "supportReturnRequestAlert",
    "Return Approval": "supportReturnApprovedAlert",
    "Refund Process": "supportRefundProcessAlert",
  };
  return mapping[eventType] || null;
};


const sendCustomerCancellationReview = async (order, isApproved, adminNote = "") => {
  const storeInfo = await getStoreDetails();
  const orderCode = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  const customerName = order.address?.fullName || "Valued Customer";
  const customerEmail = order.userId?.email || order.email || "";
  if (!customerEmail) return null;

  const title = isApproved ? `Order Cancelled: #${orderCode}` : `Cancellation Request Update: #${orderCode}`;
  const headline = isApproved ? `Your order cancellation is confirmed` : `Cancellation request update`;

  const bodyHtml = `
    <p>Hi ${escapeHtml(customerName)},</p>
    <p>Here is the status update for your cancellation request on order <strong>#${escapeHtml(orderCode)}</strong>:</p>
    
    <table width="100%" style="background-color: #FCFAF5; border-radius: 12px; padding: 15px; border: 1px solid #FAF4E5; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #1C1C1C;">
      <tr>
        <td width="40%"><strong>Status:</strong></td>
        <td align="right" style="font-weight: bold; color: ${isApproved ? '#B91C1C' : '#D4AF37'}; text-transform: uppercase;">
          ${isApproved ? "Cancelled (Approved)" : "Declined (Rejected)"}
        </td>
      </tr>
      <tr>
        <td><strong>Store Note:</strong></td>
        <td align="right">${escapeHtml(adminNote || (isApproved ? "Cancellation request approved." : "We are unable to cancel this order at this stage."))}</td>
      </tr>
      ${isApproved && order.paymentStatus === "Paid" ? `
      <tr>
        <td><strong>Refund status:</strong></td>
        <td align="right" style="color: #047857; font-weight: bold;">Initiated (5-7 business days)</td>
      </tr>
      ` : ''}
    </table>
    
    <p>${isApproved ? "If payment was charged, it will be refunded shortly." : "Since your request was declined, order processing continues. You can view the current order status in your profile."}</p>
  `;

  const shopUrl = getShopUrl();
  const actionBtnHtml = `
    <a href="${shopUrl}/my-profile" style="display: inline-block; background-color: #D4AF37; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 30px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.15);">My Profile</a>
  `;

  const htmlContent = buildBrandedEmail(title, headline, bodyHtml, actionBtnHtml, "", storeInfo);
  const textContent = `Hi ${customerName},\nYour cancellation request for order #${orderCode} was ${isApproved ? "Approved" : "Rejected"}. Note: ${adminNote}`;

  return queueEmail(customerEmail, title, htmlContent, textContent, "customer_order_cancelled", order._id, "Order");
};

module.exports = {
  queueEmail,
  retryEmail,
  startEmailWorker,
  getEmailSettings,
  
  // Specific templates
  sendCustomerOrderConfirmation,
  sendCustomerOrderShipped,
  sendCustomerOrderDelivered,
  sendCustomerOrderCancelled,
  sendCustomerCancellationReview,
  sendCustomerReturnSubmitted,
  sendCustomerReturnApproved,
  sendCustomerReturnRejected,
  sendCustomerPickupScheduled,
  sendCustomerProductReceived,
  sendCustomerRefundInitiated,
  sendCustomerRefundCompleted,
  sendCustomerReplacementShipped,
  sendCustomerReturnClosed,
  sendAgentTicketAssigned,
  sendAdminNewOrderAlert,
  sendAdminCancelRequestAlert,
  sendAdminReturnRequestAlert,
  sendSupportNotification,
};
