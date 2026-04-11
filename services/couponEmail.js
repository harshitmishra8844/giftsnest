const nodemailer = require("nodemailer");

const isEmailConfigured = () => {
  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  return Boolean(host && user && pass);
};

let transporterCache = null;

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (transporterCache) return transporterCache;
  const host = process.env.SMTP_HOST.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  transporterCache = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASS.trim(),
    },
  });
  return transporterCache;
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

const buildCouponEmailContent = (coupon, { customerName = "", personalNote = "" } = {}) => {
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
  const shop = shopUrl();
  const shopLine = shop ? `\n\nShop now: ${shop}` : "";

  const text = `${greeting}

Here is your exclusive offer from ${storeName()}.

Your coupon code: ${code}
${offer}
${minCart}
${expiry}${noteBlock}${shopLine}

Apply this code at checkout. Thank you for shopping with us!
— ${storeName()}
`;

  const noteHtml = noteText
    ? `<p style="margin-top:16px;padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;"><strong>A note from us:</strong><br/>${escapeHtml(
        noteText
      ).replace(/\n/g, "<br/>")}</p>`
    : "";

  const shopHref = shop ? encodeURI(shop) : "";
  const shopBtn = shopHref
    ? `<p style="margin-top:20px;"><a href="${shopHref}" style="display:inline-block;background:#047857;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600;">Continue shopping</a></p>`
    : "";

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;max-width:560px;">
<p>${escapeHtml(greeting)}</p>
<p>Here is your exclusive offer from <strong>${escapeHtml(storeName())}</strong>.</p>
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
    storeName()
  )}</p>
</body></html>`;

  return {
    subject: `Your ${storeName()} coupon: ${code}`,
    text,
    html,
  };
};

const sendCouponEmailToCustomer = async (coupon, { to, customerName, personalNote }) => {
  const transport = getTransporter();
  if (!transport) {
    const err = new Error("EMAIL_NOT_CONFIGURED");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }
  const { subject, html, text } = buildCouponEmailContent(coupon, { customerName, personalNote });
  const from = String(process.env.SMTP_FROM || process.env.SMTP_USER).trim();
  await transport.sendMail({
    from: `"${storeName()}" <${from}>`,
    to: String(to).trim(),
    subject,
    text,
    html,
  });
};

module.exports = {
  isEmailConfigured,
  buildCouponEmailContent,
  sendCouponEmailToCustomer,
};
