const User = require("../models/User");
const StoreSetting = require("../models/StoreSetting");
const { sendMailWithRetries, getSmtpConfig } = require("./emailTransporter");

const shopUrl = () => {
  const raw = String(process.env.FRONTEND_URL || "").split(",")[0].trim();
  if (!raw || raw.includes("your-vercel-url") || raw.includes("vercel.app") || raw.includes("localhost")) {
    return "https://www.niyoragifts.in";
  }
  return raw;
};

const escapeHtml = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getAdminEmails = async () => {
  try {
    const admins = await User.find({ isAdmin: true }).select("email").lean();
    const emails = new Set(admins.map(a => String(a.email || "").trim().toLowerCase()).filter(Boolean));

    if (process.env.ADMIN_EMAIL) {
      emails.add(String(process.env.ADMIN_EMAIL).trim().toLowerCase());
    }

    if (emails.size === 0) {
      emails.add("niyoragifts@gmail.com");
    }

    return Array.from(emails);
  } catch (error) {
    console.error("[email] Error querying admin emails:", error);
    return [process.env.ADMIN_EMAIL || "niyoragifts@gmail.com"];
  }
};

const buildAdminOrderEmailContent = (order, { storeName = "Niyora Gifts", adminDashboardUrl = "" } = {}) => {
  const orderCode = order.orderCode || `ORD-${order._id.toString().slice(-8).toUpperCase()}`;
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

  const customerName = order.address?.fullName || "Guest Customer";
  const customerPhone = order.address?.phone || "N/A";
  const customerEmail = order.userId?.email || "N/A";

  // Address lines
  const line1 = order.address?.line1 || "";
  const city = order.address?.city || "";
  const state = order.address?.state || "";
  const postalCode = order.address?.postalCode || "";
  const country = order.address?.country || "India";
  const fullAddress = [line1, city, state, postalCode, country].filter(Boolean).join(", ");

  // Build items rows HTML
  const itemsHtml = (order.products || []).map((item) => {
    const itemName = escapeHtml(item.name);
    const itemQty = Number(item.quantity || 1);
    const itemPrice = Number(item.price || 0).toFixed(2);
    const itemTotal = (itemPrice * itemQty).toFixed(2);
    const itemImage = item.image || "";

    let customizationHtml = "";
    if (item.customization && (item.customization.text || item.customization.uploadedImage || item.customization.textSize || item.customization.position)) {
      const parts = [];
      if (item.customization.text) {
        parts.push(`<strong>Text:</strong> "${escapeHtml(item.customization.text)}"`);
      }
      if (item.customization.uploadedImage) {
        parts.push(`<strong>Photo:</strong> <a href="${encodeURI(item.customization.uploadedImage)}" target="_blank" style="color: #059669; text-decoration: underline;">View Uploaded Photo</a>`);
      }
      if (item.customization.textSize) {
        parts.push(`<strong>Text Size:</strong> ${escapeHtml(item.customization.textSize)}`);
      }
      if (item.customization.position) {
        parts.push(`<strong>Position:</strong> ${escapeHtml(item.customization.position)}`);
      }
      customizationHtml = `<div style="font-size: 12px; color: #4b5563; background-color: #f3f4f6; border-left: 2px solid #059669; padding: 6px 10px; margin-top: 5px; border-radius: 4px;">${parts.join("<br/>")}</div>`;
    }

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; font-size: 14px; color: #374151; vertical-align: top;">
          <div style="font-weight: 700; color: #111827;">${itemName}</div>
          ${customizationHtml}
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #374151; text-align: center; vertical-align: top;">${itemQty}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #374151; text-align: right; vertical-align: top;">₹${itemPrice}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #111827; font-weight: 700; text-align: right; vertical-align: top;">₹${itemTotal}</td>
      </tr>
    `;
  }).join("");

  const subtotal = Number(order.subtotal || 0).toFixed(2);
  const discount = Number(order.discountAmount || 0).toFixed(2);
  const total = Number(order.totalPrice || 0).toFixed(2);
  const couponInfo = order.couponCode ? `<span style="font-size: 12px; color: #047857; background-color: #ecfdf5; border: 1px dashed #a7f3d0; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 5px;">${escapeHtml(order.couponCode)}</span>` : "";

  const dashboardBtn = adminDashboardUrl
    ? `<a href="${encodeURI(adminDashboardUrl)}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2); text-align: center; margin-top: 10px;">Go to Admin Dashboard</a>`
    : "";

  const text = `New Order Placed - Code: ${orderCode}
  
An order has been placed on ${storeName}.

Order Summary:
------------------------------------------
Order Code: ${orderCode}
Date & Time: ${orderDate}
Payment Status: ${order.paymentStatus || "Paid"}
Order Status: ${order.status || "Order Confirmed"}

Customer Info:
------------------------------------------
Name: ${customerName}
Phone: ${customerPhone}
Email: ${customerEmail}

Shipping Address:
------------------------------------------
${fullAddress}

Financial Summary:
------------------------------------------
Subtotal: ₹${subtotal}
Discount: ₹${discount} ${order.couponCode ? `(Code: ${order.couponCode})` : ""}
Total Paid: ₹${total}

Please login to the admin dashboard to process this order.
— ${storeName}
`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Notification - ${escapeHtml(orderCode)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 4px 10px rgba(0,0,0,0.05);overflow:hidden;max-width:600px;text-align:left;">
          <!-- Top Accent Bar -->
          <tr>
            <td height="6" style="background-color:#059669;"></td>
          </tr>
          
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding: 24px 20px; border-bottom: 1px solid #f3f4f6;">
              <span style="font-size: 24px; font-weight: 800; color: #064e3b; letter-spacing: -0.03em;">Niyora <span style="color: #059669;">Gifts</span></span>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #4b5563; margin-top: 4px; font-weight: 600;">New Order Notification</div>
            </td>
          </tr>
          
          <!-- Headline -->
          <tr>
            <td style="padding: 24px 30px 12px 30px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827;">New Order Received!</h2>
              <p style="margin: 6px 0 0 0; font-size: 14px; color: #4b5563; line-height: 1.5;">An order has been placed on the store. Below are the order summary details:</p>
            </td>
          </tr>
          
          <!-- Order Metadata Cards -->
          <tr>
            <td style="padding: 10px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; padding: 16px 20px;">
                <tr>
                  <td width="50%" style="font-size: 13px; color: #4b5563; padding-bottom: 8px;">Order Code:</td>
                  <td width="50%" style="font-size: 13px; color: #111827; font-weight: 700; padding-bottom: 8px; text-align: right;">${escapeHtml(orderCode)}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #4b5563; padding-bottom: 8px;">Date & Time:</td>
                  <td style="font-size: 13px; color: #111827; font-weight: 500; padding-bottom: 8px; text-align: right;">${escapeHtml(orderDate)}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #4b5563; padding-bottom: 8px;">Payment Status:</td>
                  <td style="font-size: 13px; color: #047857; font-weight: 700; padding-bottom: 8px; text-align: right; text-transform: uppercase;">${escapeHtml(order.paymentStatus || "Paid")}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #4b5563;">Order Status:</td>
                  <td style="font-size: 13px; color: #d97706; font-weight: 700; text-align: right; text-transform: uppercase;">${escapeHtml(order.status || "Order Confirmed")}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer Info -->
          <tr>
            <td style="padding: 12px 30px;">
              <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #f3f4f6; pb: 4px;">Customer & Shipping Details</h3>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13.5px; color: #374151; line-height: 1.6;">
                <tr>
                  <td width="30%" style="font-weight: 600; color: #4b5563; padding: 4px 0;">Name:</td>
                  <td width="70%" style="padding: 4px 0;">${escapeHtml(customerName)}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #4b5563; padding: 4px 0;">Phone:</td>
                  <td style="padding: 4px 0;">${escapeHtml(customerPhone)}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #4b5563; padding: 4px 0;">Email:</td>
                  <td style="padding: 4px 0;"><a href="mailto:${escapeHtml(customerEmail)}" style="color:#059669; text-decoration:none;">${escapeHtml(customerEmail)}</a></td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #4b5563; padding: 4px 0; vertical-align: top;">Shipping Address:</td>
                  <td style="padding: 4px 0;">${escapeHtml(fullAddress)}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Order Items Table -->
          <tr>
            <td style="padding: 12px 30px;">
              <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #f3f4f6; pb: 4px;">Ordered Items</h3>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="border-bottom: 2px solid #e5e7eb; background-color: #f9fafb;">
                    <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase;">Product</th>
                    <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; text-align: center;">Qty</th>
                    <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; text-align: right;">Unit Price</th>
                    <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Pricing Summary Card -->
          <tr>
            <td style="padding: 10px 30px 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 2px solid #e5e7eb; padding-top: 12px;">
                <tr>
                  <td width="70%" style="font-size: 13.5px; color: #4b5563; padding: 4px 0; text-align: right;">Subtotal:</td>
                  <td width="30%" style="font-size: 13.5px; color: #374151; padding: 4px 0; text-align: right; font-weight: 500;">₹${subtotal}</td>
                </tr>
                ${Number(discount) > 0 ? `
                <tr>
                  <td style="font-size: 13.5px; color: #4b5563; padding: 4px 0; text-align: right;">Discount Applied ${couponInfo}:</td>
                  <td style="font-size: 13.5px; color: #dc2626; padding: 4px 0; text-align: right; font-weight: 500;">-₹${discount}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="font-size: 16px; color: #111827; font-weight: 700; padding: 12px 0 4px 0; text-align: right;">Total Price Paid:</td>
                  <td style="font-size: 18px; color: #059669; font-weight: 800; padding: 12px 0 4px 0; text-align: right;">₹${total}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Dashboard Action button -->
          ${dashboardBtn ? `
          <tr>
            <td align="center" style="padding: 10px 30px 30px 30px; border-top: 1px solid #f3f4f6;">
              ${dashboardBtn}
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">Login using administrator credentials to view shipping logs and update tracking ID.</p>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer copyright -->
          <tr>
            <td align="center" style="padding: 20px 30px; background-color: #fafafa; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 11.5px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} Niyora Gifts Store. System Generated Order Alert.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `[NEW ORDER] ${orderCode} - ₹${total} from ${customerName}`,
    text,
    html,
  };
};

const sendOrderNotificationToAdmin = async (order) => {
  const config = getSmtpConfig();
  if (!config.provider) {
    const err = new Error("EMAIL_NOT_CONFIGURED");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  // Populate user email if missing or populated as an object ID
  let orderData = order;
  if (order.userId && typeof order.userId !== "object") {
    // Attempt to query user email
    try {
      const user = await User.findById(order.userId).select("email").lean();
      if (user) {
        orderData = order.toObject ? order.toObject() : { ...order };
        orderData.userId = user;
      }
    } catch (dbErr) {
      console.error("[email] Error populating order user:", dbErr);
    }
  }

  const dbStoreInfo = await StoreSetting.findOne({ singletonKey: "store" }).lean();
  const storeName = dbStoreInfo?.storeName || String(process.env.STORE_NAME || "Niyora Gifts").trim() || "Niyora Gifts";
  const shopUrlStr = shopUrl();
  const adminDashboardUrl = shopUrlStr ? `${shopUrlStr}/admin/dashboard` : "";

  const { subject, html, text } = buildAdminOrderEmailContent(orderData, {
    storeName,
    adminDashboardUrl,
  });

  const adminEmails = await getAdminEmails();

  const fromAddress = String(
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    ""
  ).trim();

  // Retrieve default fallback from domain
  const defaultFrom = `no-reply@${String(process.env.DOMAIN || "example.com").trim()}`;
  const from = fromAddress || defaultFrom;

  console.info(`[email] Dispatching admin order notification to: ${adminEmails.join(", ")}`);

  // Send email to all admin addresses (joined as a comma separated string in nodemailer)
  const mailOptions = {
    from: `"NiyoraGifts" <${from}>`,
    to: adminEmails.join(", "),
    subject,
    text,
    html,
  };

  const result = await sendMailWithRetries(mailOptions);
  return {
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
    recipients: adminEmails,
  };
};

module.exports = {
  sendOrderNotificationToAdmin,
  buildAdminOrderEmailContent,
};
