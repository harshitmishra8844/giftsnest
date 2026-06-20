const nodemailer = require("nodemailer");
const StoreSetting = require("../models/StoreSetting");
const {
  getTransporter,
  sendMailWithRetries,
  isSmtpConfigured,
  getSmtpConfig,
} = require("./emailTransporter");

const isEmailConfigured = async () => {
  const config = getSmtpConfig();
  return Boolean(config.provider);
};

const storeName = () => String(process.env.STORE_NAME || "Niyora Gifts").trim() || "Niyora Gifts";

const shopUrl = () => {
  const raw = String(process.env.FRONTEND_URL || "").split(",")[0].trim();
  if (!raw || raw.includes("your-vercel-url") || raw.includes("vercel.app") || raw.includes("localhost")) {
    return "https://www.niyoragifts.in";
  }
  return raw;
};

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatOfferLine = (coupon) => {
  if (coupon.type === "percent") {
    const cap = Number(coupon.maxDiscount) > 0 ? ` (max ₹${coupon.maxDiscount} discount)` : "";
    return `${coupon.value}% off your order${cap}`;
  }
  return `₹${coupon.value} off your order`;
};

const buildCouponEmailContent = (coupon, { customerName = "", personalNote = "", storeNameStr = "", shopUrlStr = "" } = {}) => {
  const name = String(customerName || "").trim();
  const greeting = name ? `Hi ${name},` : "Hello,";
  const code = coupon.code;
  const offer = formatOfferLine(coupon);
  const minCart = `Minimum order value: ₹${Number(coupon.minCartValue || 0)}`;
  const expiry = coupon.endDate
    ? `Valid until ${new Date(coupon.endDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}.`
    : "No expiry date on this offer.";
  const noteText = String(personalNote || "").trim();
  const noteBlock = noteText ? `\n\nA note from us:\n${noteText}` : "";
  
  const activeStoreName = storeNameStr || storeName();
  const activeShopUrl = shopUrlStr || shopUrl();
  const shopLine = activeShopUrl ? `\n\nShop now: ${activeShopUrl}` : "";

  const text = `${greeting}

Here is your exclusive offer from ${activeStoreName}.

Your coupon code: ${code}
${offer}
${minCart}
${expiry}${noteBlock}${shopLine}

Apply this code at checkout. Thank you for shopping with us!
— ${activeStoreName}
`;

  const noteHtml = noteText
    ? `<div style="background-color: #f9fafb; border-left: 4px solid #059669; padding: 16px; margin: 15px 0; border-radius: 0 12px 12px 0; text-align: left;">
         <div style="font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">A note from us</div>
         <div style="font-style: italic; color: #374151; font-size: 14px; line-height: 1.5;">"${escapeHtml(noteText).replace(/\n/g, "<br/>")}"</div>
       </div>`
    : "";

  const shopHref = activeShopUrl ? encodeURI(activeShopUrl) : "";
  const shopBtn = shopHref
    ? `<a href="${shopHref}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2); text-align: center;">Shop Niyora Gifts</a>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exclusive Coupon from ${escapeHtml(activeStoreName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Outfit','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.05),0 4px 6px -2px rgba(0,0,0,0.025);overflow:hidden;max-width:540px;text-align:left;">
          <!-- Top Accent Bar -->
          <tr>
            <td height="6" style="background-color:#059669;"></td>
          </tr>
          
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding: 30px 20px 20px 20px;">
              <span style="font-size: 28px; font-weight: 800; color: #064e3b; letter-spacing: -0.03em;">Niyora <span style="color: #059669;">Gifts</span></span>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #047857; margin-top: 6px; font-weight: 700;">Flowers, Cakes & Personalized Surprises</div>
            </td>
          </tr>
          
          <!-- Greeting and Intro -->
          <tr>
            <td style="padding: 10px 30px 20px 30px; font-size: 15px; color: #374151; line-height: 1.6;">
              <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #111827;">${escapeHtml(greeting)}</p>
              <p style="margin: 0;">We are delighted to share an exclusive offer with you! Use the secure coupon code below at checkout to enjoy special savings on your next order.</p>
            </td>
          </tr>
          
          <!-- Ticket Coupon Container -->
          <tr>
            <td style="padding: 10px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f0fdf4; border: 2px dashed #a7f3d0; border-radius: 16px; padding: 24px; text-align: center;">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 800; color: #047857; letter-spacing: 0.15em; text-transform: uppercase;">Your Exclusive Discount</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0 16px 0;">
                    <span style="font-size: 26px; font-weight: 800; color: #065f46;">${escapeHtml(offer)}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="background-color: #ffffff; border: 1px dashed #6ee7b7; border-radius: 8px; padding: 12px 20px; display: inline-block; min-width: 200px;">
                      <span style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Coupon Code</span>
                      <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 20px; font-weight: 800; color: #064e3b; letter-spacing: 0.05em;">${escapeHtml(code)}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Offer Details & Conditions -->
          <tr>
            <td style="padding: 20px 30px 10px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f9fafb; border-radius: 12px; border: 1px solid #f3f4f6; padding: 16px 20px;">
                <tr>
                  <td style="font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 12px;">Offer Conditions</td>
                </tr>
                <!-- Condition: Min Cart -->
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #4b5563;">
                    <span style="display:inline-block; width: 8px; height: 8px; background-color: #059669; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
                    Minimum cart value: <strong style="color: #111827;">₹${Number(coupon.minCartValue || 0)}</strong>
                  </td>
                </tr>
                <!-- Condition: Expiry -->
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #4b5563;">
                    <span style="display:inline-block; width: 8px; height: 8px; background-color: #059669; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
                    Validity: <strong style="color: #111827;">${escapeHtml(expiry.replace('Valid until ', '').replace('No expiry date on this offer.', 'No expiry'))}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Personal Note (if present) -->
          ${noteHtml ? `
          <tr>
            <td style="padding: 10px 30px;">
              ${noteHtml}
            </td>
          </tr>
          ` : ''}
          
          <!-- Call to Action -->
          <tr>
            <td align="center" style="padding: 20px 30px 30px 30px;">
              ${shopBtn}
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280;">Simply apply the coupon code during checkout to redeem your discount.</p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 30px;">
              <div style="border-top: 1px solid #f3f4f6;"></div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 30px; background-color: #fafafa;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; font-weight: 500;">
                Questions? Contact us at <a href="mailto:niyoragifts@gmail.com" style="color: #059669; text-decoration: none; font-weight: 600;">niyoragifts@gmail.com</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} Niyora Gifts. All rights reserved.
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
    subject: `Your Niyora Gifts coupon: ${code}`,
    text,
    html,
  };
};

const sendCouponEmailToCustomer = async (coupon, { to, customerName, personalNote }) => {
  const dbStoreInfo = await StoreSetting.findOne({ singletonKey: "store" }).lean();
  const config = getSmtpConfig();
  if (!config.provider) {
    const err = new Error("EMAIL_NOT_CONFIGURED");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  const transport = await getTransporter();

  const storeNameStr = dbStoreInfo?.storeName || String(process.env.STORE_NAME || "Niyora Gifts").trim() || "Niyora Gifts";
  const shopUrlStr = shopUrl();

  const { subject, html, text } = buildCouponEmailContent(coupon, {
    customerName,
    personalNote,
    storeNameStr,
    shopUrlStr,
  });

  const fromAddress = String(
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    ""
  ).trim();

  const isTest = transport ? transport.isTest : false;
  const defaultFrom = isTest
    ? transport.testAccount?.user || `no-reply@${String(process.env.DOMAIN || "example.com").trim()}`
    : `no-reply@${String(process.env.DOMAIN || "example.com").trim()}`;
  const from = fromAddress || defaultFrom;

  const mailOptions = {
    from: `"Niyora Gifts" <${from}>`,
    to: String(to).trim(),
    subject,
    text,
    html,
  };

  const info = await sendMailWithRetries(mailOptions);

  if (isTest) {
    const preview = nodemailer.getTestMessageUrl(info);
    return {
      previewUrl: preview,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  }

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
};

module.exports = {
  isEmailConfigured,
  buildCouponEmailContent,
  sendCouponEmailToCustomer,
};
