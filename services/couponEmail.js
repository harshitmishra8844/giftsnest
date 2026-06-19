const nodemailer = require("nodemailer");
const StoreSetting = require("../models/StoreSetting");

const isEmailConfigured = async () => {
  try {
    const info = await StoreSetting.findOne({ singletonKey: "store" }).lean();
    const dbHost = String(info?.smtpHost || "").trim();
    const dbUser = String(info?.smtpUser || "").trim();
    const dbPass = String(info?.smtpPass || "").trim();
    if (dbHost && dbUser && dbPass) return true;
  } catch (e) {}

  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  return Boolean(host && user && pass);
};

const getTransporter = async (dbStoreInfo) => {
  // Use passed dbStoreInfo if available, otherwise fetch it from the database
  const info = dbStoreInfo || await StoreSetting.findOne({ singletonKey: "store" }).lean();

  const host = String(info?.smtpHost || process.env.SMTP_HOST || "").trim();
  const user = String(info?.smtpUser || process.env.SMTP_USER || "").trim();
  const pass = String(info?.smtpPass || process.env.SMTP_PASS || "").trim();

  if (host && user && pass) {
    const port = info?.smtpPort !== undefined ? Number(info.smtpPort) : (Number(process.env.SMTP_PORT) || 587);
    const secure = info?.smtpSecure !== undefined ? Boolean(info.smtpSecure) : (String(process.env.SMTP_SECURE || "").toLowerCase() === "true");
    
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
    transporter.isTest = false;
    return transporter;
  }

  // Fallback transport: use Ethereal if no SMTP is configured, so coupon email sending can still be tested.
  if (process.env.DISABLE_EMAIL_FALLBACK !== "true") {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      transporter.isTest = true;
      transporter.testAccount = testAccount;
      return transporter;
    } catch (e) {
      console.error("Failed to create Ethereal test account:", e.message);
    }
  }

  return null;
};

const storeName = () => String(process.env.STORE_NAME || "Gift Store").trim() || "Gift Store";

const shopUrl = () => {
  const raw = String(process.env.FRONTEND_URL || "").split(",")[0].trim();
  return raw || "";
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
    ? `<p style="margin-top:16px;padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;"><strong>A note from us:</strong><br/>${escapeHtml(
        noteText
      ).replace(/\n/g, "<br/>")}</p>`
    : "";

  const shopHref = activeShopUrl ? encodeURI(activeShopUrl) : "";
  const shopBtn = shopHref
    ? `<p style="margin-top:20px;"><a href="${shopHref}" style="display:inline-block;background:#047857;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600;">Continue shopping</a></p>`
    : "";

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;max-width:560px;">
<p>${escapeHtml(greeting)}</p>
<p>Here is your exclusive offer from <strong>${escapeHtml(activeStoreName)}</strong>.</p>
<div style="margin:20px 0;padding:16px;background:#ecfdf5;border-radius:12px;border:2px dashed #059669;text-align:center;">
  <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#047857;">Your coupon code</div>
  <div style="font-size:22px;font-weight:800;font-family:ui-monospace,monospace;margin-top:8px;letter-spacing:0.05em;">${escapeHtml(code)}</div>
</div>
<ul style="padding-left:18px;color:#374151;">
  <li>${escapeHtml(offer)}</li>
  <li>${escapeHtml(minCart)}</li>
  <li>${escapeHtml(expiry)}</li>
</ul>
${noteHtml}
${shopBtn}
<p style="margin-top:24px;font-size:14px;color:#6b7280;">Apply this code at checkout. Thank you for shopping with us!<br/>— ${escapeHtml(
    activeStoreName
  )}</p>
</body></html>`;

  return {
    subject: `Your ${activeStoreName} coupon: ${code}`,
    text,
    html,
  };
};

const sendCouponEmailToCustomer = async (coupon, { to, customerName, personalNote }) => {
  const dbStoreInfo = await StoreSetting.findOne({ singletonKey: "store" }).lean();
  const transport = await getTransporter(dbStoreInfo);
  if (!transport) {
    const err = new Error("EMAIL_NOT_CONFIGURED");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  const storeNameStr = dbStoreInfo?.storeName || String(process.env.STORE_NAME || "Gift Store").trim() || "Gift Store";
  const shopUrlStr = shopUrl();

  const { subject, html, text } = buildCouponEmailContent(coupon, {
    customerName,
    personalNote,
    storeNameStr,
    shopUrlStr,
  });

  const fromAddress = String(
    dbStoreInfo?.smtpFrom ||
    process.env.SMTP_FROM ||
    dbStoreInfo?.smtpUser ||
    process.env.SMTP_USER ||
    ""
  ).trim();

  const defaultFrom = transport.isTest
    ? transport.testAccount?.user || `no-reply@${String(process.env.DOMAIN || "example.com").trim()}`
    : `no-reply@${String(process.env.DOMAIN || "example.com").trim()}`;
  const from = fromAddress || defaultFrom;

  const info = await transport.sendMail({
    from: `"${storeNameStr}" <${from}>`,
    to: String(to).trim(),
    subject,
    text,
    html,
  });

  if (transport.isTest) {
    const preview = nodemailer.getTestMessageUrl(info);
    return { previewUrl: preview };
  }
  return {};
};

module.exports = {
  isEmailConfigured,
  buildCouponEmailContent,
  sendCouponEmailToCustomer,
};
