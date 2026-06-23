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

/**
 * Helper to wrap content in a premium Gold & Ivory HTML layout.
 */
const buildGoldEmail = (title, headline, messageBody, actionButtonHtml = "", storeName = "Niyora Gifts") => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FAF7F2;padding:30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 6px 18px rgba(212, 175, 55, 0.08);overflow:hidden;max-width:600px;text-align:left;border: 1px solid #E7D29E;">
          <!-- Top Accent Bar -->
          <tr>
            <td height="6" style="background-color:#D4AF37;"></td>
          </tr>
          
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding: 24px 20px; border-bottom: 1px solid #FAF4E5; background-color: #FCF9F2;">
              <span style="font-size: 24px; font-weight: 800; color: #1C1C1C; font-family: Georgia, serif; letter-spacing: 0.02em;">Niyora <span style="color: #D4AF37;">Gifts</span></span>
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #785D19; margin-top: 4px; font-weight: 600;">Customer Care Portal</div>
            </td>
          </tr>
          
          <!-- Headline -->
          <tr>
            <td style="padding: 28px 30px 12px 30px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #1C1C1C; font-family: Georgia, serif;">${headline}</h2>
            </td>
          </tr>
          
          <!-- Message Body -->
          <tr>
            <td style="padding: 10px 30px 20px 30px; font-size: 14px; color: #6B6B6B; line-height: 1.6;">
              ${messageBody}
            </td>
          </tr>
          
          <!-- Action button -->
          ${actionButtonHtml ? `
          <tr>
            <td align="center" style="padding: 10px 30px 30px 30px; border-top: 1px solid #FAF4E5; background-color: #FCF9F2;">
              ${actionButtonHtml}
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer copyright -->
          <tr>
            <td align="center" style="padding: 20px 30px; background-color: #1C1C1C; color: #E7D29E; border-top: 1px solid #E7D29E;">
              <p style="margin: 0; font-size: 11.5px; letter-spacing: 0.05em;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(storeName)}. Premium Curated Celebrations.
              </p>
              <p style="margin: 4px 0 0 0; font-size: 9.5px; color: #A7F3D0; font-weight: 300;">
                This is a system generated alert. Please do not reply directly to this inbox.
              </p>
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
 * Common mail sending helper
 */
const sendMail = async (to, subject, html, text) => {
  const config = getSmtpConfig();
  if (!config.provider) {
    console.warn("[email] Email is not configured. Skipping return dispatch.");
    return null;
  }
  const fromAddress = String(process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
  const defaultFrom = `no-reply@${String(process.env.DOMAIN || "example.com").trim()}`;
  const from = fromAddress || defaultFrom;
  const storeName = process.env.STORE_NAME || "Niyora Gifts";

  const mailOptions = {
    from: `"${storeName} Support" <${from}>`,
    to,
    subject,
    text,
    html,
  };

  return sendMailWithRetries(mailOptions);
};

/* ==========================================================================
   CUSTOMER EMAIL SENDERS
   ========================================================================== */

const sendReturnSubmittedEmail = async (user, order, returnRequest) => {
  const code = returnRequest.returnCode;
  const resolution = returnRequest.preferredResolution;
  const subject = `Return Request Submitted: ${code} - Niyora Gifts`;
  const url = `${shopUrl()}/my-profile`;
  
  const headline = "We have received your Return Request";
  const body = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>Thank you for contacting Niyora Gifts. Your return request has been submitted successfully and is currently <strong>Under Review</strong> by our customer care team.</p>
    <table width="100%" style="background-color: #FAF4E5; border-radius: 12px; padding: 16px; border: 1px solid #F1E5C5; margin: 20px 0;">
      <tr>
        <td style="font-size: 13px; color: #1C1C1C; padding-bottom: 8px;"><strong>Return Code:</strong></td>
        <td style="font-size: 13px; color: #785D19; text-align: right; font-weight: bold;">${code}</td>
      </tr>
      <tr>
        <td style="font-size: 13px; color: #1C1C1C; padding-bottom: 8px;"><strong>Order ID:</strong></td>
        <td style="font-size: 13px; color: #1C1C1C; text-align: right;">${escapeHtml(order.orderCode)}</td>
      </tr>
      <tr>
        <td style="font-size: 13px; color: #1C1C1C; padding-bottom: 8px;"><strong>Reason:</strong></td>
        <td style="font-size: 13px; color: #1C1C1C; text-align: right;">${escapeHtml(returnRequest.reason)}</td>
      </tr>
      <tr>
        <td style="font-size: 13px; color: #1C1C1C;"><strong>Preferred Resolution:</strong></td>
        <td style="font-size: 13px; color: #D4AF37; text-align: right; font-weight: bold;">${resolution}</td>
      </tr>
    </table>
    <p>Our support team will review the description and uploaded files and update you shortly. Once approved, we will coordinate the reverse pick-up process.</p>
  `;
  
  const actionBtn = `<a href="${url}" style="display: inline-block; background-color: #D4AF37; color: #ffffff; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #C49A2C;">Track Request Status</a>`;
  
  const html = buildGoldEmail(subject, headline, body, actionBtn);
  const text = `Hi ${user.name},\nYour return request ${code} for order ${order.orderCode} has been submitted successfully.\nPreferred Resolution: ${resolution}\nReason: ${returnRequest.reason}\n\nTrack status: ${url}`;
  
  return sendMail(user.email, subject, html, text);
};

const sendReturnApprovedEmail = async (user, returnRequest) => {
  const code = returnRequest.returnCode;
  const subject = `Return Request Approved: ${code} - Niyora Gifts`;
  const url = `${shopUrl()}/my-profile`;
  
  const headline = "Your Return Request has been Approved!";
  const body = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>Good news! Our quality assurance support agents have reviewed your claim, and your return request <strong>${code}</strong> has been <strong>Approved</strong>.</p>
    <p><strong>Next Steps:</strong></p>
    <ol style="padding-left: 20px; line-height: 1.8;">
      <li>Our logistics courier partners will coordinate a reverse pickup from your registered address.</li>
      <li>Please keep the product ready in its original packaging with all boxes and accessories intact.</li>
      <li>Once pickup is scheduled, we will send you a tracking confirmation.</li>
    </ol>
    <p>We appreciate your patience as we rectify this for you.</p>
  `;
  
  const actionBtn = `<a href="${url}" style="display: inline-block; background-color: #D4AF37; color: #ffffff; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 99px; text-align: center;">View Return Timeline</a>`;
  
  const html = buildGoldEmail(subject, headline, body, actionBtn);
  const text = `Hi ${user.name},\nYour return request ${code} has been approved. Logistics reverse pickup is being arranged. View details here: ${url}`;
  
  return sendMail(user.email, subject, html, text);
};

const sendReturnRejectedEmail = async (user, returnRequest, note) => {
  const code = returnRequest.returnCode;
  const subject = `Return Request Update: ${code} - Niyora Gifts`;
  const url = `${shopUrl()}/my-profile`;
  
  const headline = "Return Request Update";
  const body = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>We are writing to update you regarding your return request <strong>${code}</strong>.</p>
    <p>Following review by our customer support specialists, your request has been <strong>Declined</strong> at this time due to the following reason:</p>
    <div style="background-color: #FCF9F2; border-left: 3px solid #D4AF37; padding: 12px 18px; margin: 15px 0; font-style: italic; color: #1C1C1C; font-size: 13.5px;">
      "${escapeHtml(note || "No specific note provided.")}"
    </div>
    <p>If you believe this is a mistake or have additional files/unboxing videos to provide, please reply to the active support ticket from your profile dashboard.</p>
  `;
  
  const actionBtn = `<a href="${url}" style="display: inline-block; background-color: #1C1C1C; color: #E7D29E; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 99px; text-align: center; border: 1px solid #E7D29E;">Open Support Ticket</a>`;
  
  const html = buildGoldEmail(subject, headline, body, actionBtn);
  const text = `Hi ${user.name},\nYour return request ${code} was declined. Reason/Note: ${note}\nSupport link: ${url}`;
  
  return sendMail(user.email, subject, html, text);
};

const sendPickupScheduledEmail = async (user, returnRequest) => {
  const code = returnRequest.returnCode;
  const p = returnRequest.pickupDetails || {};
  const dateStr = p.pickupDate ? new Date(p.pickupDate).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Soon";
  const subject = `Reverse Pickup Scheduled: ${code} - Niyora Gifts`;
  const url = `${shopUrl()}/my-profile`;
  
  const headline = "Reverse Pickup Scheduled";
  const body = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>Your reverse pickup has been scheduled for return request <strong>${code}</strong>.</p>
    <table width="100%" style="background-color: #FAF4E5; border-radius: 12px; padding: 16px; border: 1px solid #F1E5C5; margin: 20px 0;">
      <tr>
        <td style="font-size: 13px; color: #1C1C1C; padding-bottom: 8px;"><strong>Courier Partner:</strong></td>
        <td style="font-size: 13px; color: #1C1C1C; text-align: right;">${escapeHtml(p.courier || "Express reverse delivery")}</td>
      </tr>
      <tr>
        <td style="font-size: 13px; color: #1C1C1C; padding-bottom: 8px;"><strong>Tracking ID:</strong></td>
        <td style="font-size: 13px; color: #785D19; text-align: right; font-weight: bold;">${escapeHtml(p.trackingId || "N/A")}</td>
      </tr>
      <tr>
        <td style="font-size: 13px; color: #1C1C1C;"><strong>Scheduled Date:</strong></td>
        <td style="font-size: 13px; color: #1C1C1C; text-align: right; font-weight: bold;">${dateStr}</td>
      </tr>
    </table>
    <p>Please print/keep the return reference details handy and hand over the package to the courier agent when they arrive.</p>
  `;
  
  const html = buildGoldEmail(subject, headline, body, null);
  const text = `Hi ${user.name},\nReverse pickup has been scheduled for request ${code} via ${p.courier}. Tracking ID: ${p.trackingId}. Pickup Date: ${dateStr}`;
  
  return sendMail(user.email, subject, html, text);
};

const sendProductReceivedEmail = async (user, returnRequest) => {
  const code = returnRequest.returnCode;
  const subject = `Product Received: ${code} - Niyora Gifts`;
  const url = `${shopUrl()}/my-profile`;
  
  const headline = "Returned Product Received";
  const body = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>We are writing to confirm that the package containing your returned items for request <strong>${code}</strong> has been received at our fulfillment center.</p>
    <p>Our verification team will now perform a quick inspection. Upon verification, we will proceed with your selected resolution: <strong>${escapeHtml(returnRequest.preferredResolution)}</strong>.</p>
  `;
  
  const html = buildGoldEmail(subject, headline, body, null);
  const text = `Hi ${user.name},\nWe have received your returned product for request ${code}. Processing resolution ${returnRequest.preferredResolution} now.`;
  
  return sendMail(user.email, subject, html, text);
};

const sendRefundInitiatedEmail = async (user, returnRequest, amount) => {
  const code = returnRequest.returnCode;
  const subject = `Refund Initiated: ${code} - Niyora Gifts`;
  
  const headline = "Your Refund is being Processed";
  const body = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>We have initiated the refund process for your return request <strong>${code}</strong>.</p>
    <p>An amount of <strong>INR ${amount}</strong> is being processed back to your original payment source or store credit account as requested.</p>
    <p>This process usually takes 5-7 business days to reflect in your banking statement depending on bank processing cycles.</p>
  `;
  
  const html = buildGoldEmail(subject, headline, body, null);
  const text = `Hi ${user.name},\nRefund of INR ${amount} has been initiated for return request ${code}. Funds will reflect in 5-7 business days.`;
  
  return sendMail(user.email, subject, html, text);
};

const sendRefundCompletedEmail = async (user, returnRequest, amount, reference) => {
  const code = returnRequest.returnCode;
  const subject = `Refund Completed: ${code} - Niyora Gifts`;
  
  const headline = "Refund Successfully Processed";
  const body = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>We are pleased to inform you that your refund has been successfully completed for return request <strong>${code}</strong>.</p>
    <table width="100%" style="background-color: #FAF4E5; border-radius: 12px; padding: 16px; border: 1px solid #F1E5C5; margin: 20px 0;">
      <tr>
        <td style="font-size: 13px; color: #1C1C1C; padding-bottom: 8px;"><strong>Refunded Amount:</strong></td>
        <td style="font-size: 13px; color: #1C1C1C; text-align: right; font-weight: bold; font-family: Georgia, serif;">INR ${amount}</td>
      </tr>
      <tr>
        <td style="font-size: 13px; color: #1C1C1C;"><strong>Transaction Reference:</strong></td>
        <td style="font-size: 13px; color: #785D19; text-align: right; font-family: monospace;">${escapeHtml(reference || "N/A")}</td>
      </tr>
    </table>
    <p>If you have any further questions, please feel free to reach out to our concierge service.</p>
  `;
  
  const html = buildGoldEmail(subject, headline, body, null);
  const text = `Hi ${user.name},\nRefund of INR ${amount} for return request ${code} is completed. Reference: ${reference}`;
  
  return sendMail(user.email, subject, html, text);
};

const sendReplacementShippedEmail = async (user, returnRequest, replacementOrderCode) => {
  const code = returnRequest.returnCode;
  const subject = `Replacement Order Shipped: ${code} - Niyora Gifts`;
  const url = `${shopUrl()}/my-profile`;
  
  const headline = "Replacement Package is on the Way!";
  const body = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>We have shipped your replacement package matching return request <strong>${code}</strong>.</p>
    <p>Your new order code is: <strong>${escapeHtml(replacementOrderCode)}</strong>.</p>
    <p>You can track the shipment live via the Order Tracking module in your profile dashboard.</p>
  `;
  
  const actionBtn = `<a href="${url}" style="display: inline-block; background-color: #D4AF37; color: #ffffff; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 99px; text-align: center;">Track Replacement Order</a>`;
  
  const html = buildGoldEmail(subject, headline, body, actionBtn);
  const text = `Hi ${user.name},\nYour replacement order ${replacementOrderCode} for return request ${code} has been shipped. Track here: ${url}`;
  
  return sendMail(user.email, subject, html, text);
};

const sendReturnClosedEmail = async (user, returnRequest) => {
  const code = returnRequest.returnCode;
  const subject = `Return Case Closed: ${code} - Niyora Gifts`;
  
  const headline = "Return Case Resolved and Closed";
  const body = `
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>This is to notify you that return request case <strong>${code}</strong> has been resolved and is now marked as <strong>Closed</strong>.</p>
    <p>We hope we resolved this issue to your complete satisfaction. Thank you for choosing Niyora Gifts!</p>
  `;
  
  const html = buildGoldEmail(subject, headline, body, null);
  const text = `Hi ${user.name},\nYour return case ${code} is resolved and closed. Thank you for choosing Niyora Gifts.`;
  
  return sendMail(user.email, subject, html, text);
};


/* ==========================================================================
   ADMIN & SUPPORT STAFF EMAIL SENDERS
   ========================================================================== */

const sendNewReturnRequestAlertToAdmin = async (returnRequest, order) => {
  const admins = await getAdminEmails();
  const code = returnRequest.returnCode;
  const subject = `[NEW RETURN REQUEST] ${code} - Order #${order.orderCode}`;
  const url = `${shopUrl()}/admin/dashboard`;
  
  const headline = "New Return Request Submitted";
  const body = `
    <p>An order return request has been submitted by customer.</p>
    <table width="100%" style="background-color: #FAF4E5; border-radius: 12px; padding: 16px; border: 1px solid #E7D29E; margin: 20px 0; font-size: 13px; color: #1C1C1C;">
      <tr>
        <td style="padding-bottom: 6px;"><strong>Return Code:</strong></td>
        <td style="text-align: right; font-weight: bold; color: #785D19;">${code}</td>
      </tr>
      <tr>
        <td style="padding-bottom: 6px;"><strong>Order Code:</strong></td>
        <td style="text-align: right;">${escapeHtml(order.orderCode)}</td>
      </tr>
      <tr>
        <td style="padding-bottom: 6px;"><strong>Reason:</strong></td>
        <td style="text-align: right; color: #B91C1C; font-weight: 600;">${escapeHtml(returnRequest.reason)}</td>
      </tr>
      <tr>
        <td><strong>Preferred Resolution:</strong></td>
        <td style="text-align: right; font-weight: bold;">${escapeHtml(returnRequest.preferredResolution)}</td>
      </tr>
    </table>
    <p><strong>Description:</strong></p>
    <div style="background-color: #FAF7F2; padding: 12px; border-radius: 8px; font-size: 12.5px; line-height: 1.5; color: #6B6B6B; border-left: 2px solid #D4AF37; margin-bottom: 20px;">
      "${escapeHtml(returnRequest.description)}"
    </div>
    <p>Please log in to the admin console to assign a support agent or schedule pickup.</p>
  `;
  
  const actionBtn = `<a href="${url}" style="display: inline-block; background-color: #D4AF37; color: #ffffff; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 99px; text-align: center;">Open Admin Dashboard</a>`;
  
  const html = buildGoldEmail(subject, headline, body, actionBtn);
  const text = `New return request ${code} submitted for order ${order.orderCode}. Reason: ${returnRequest.reason}. Resolve at: ${url}`;
  
  return sendMail(admins.join(", "), subject, html, text);
};

const sendEscalationAlertToAdmin = async (ticket, returnRequest, agentName) => {
  const admins = await getAdminEmails();
  const code = returnRequest ? returnRequest.returnCode : "N/A";
  const subject = `[ESCALATION ALERT] Ticket #${ticket.ticketCode} - Return #${code}`;
  const url = `${shopUrl()}/admin/dashboard`;
  
  const headline = "Ticket Escalated to Admin";
  const body = `
    <p>Support Agent <strong>${escapeHtml(agentName)}</strong> has escalated support ticket <strong>#${escapeHtml(ticket.ticketCode)}</strong> to administrator attention.</p>
    <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
    <p><strong>Reason:</strong> Return Order #${code} requires financial review / replacement authorization.</p>
    <p>Please review immediately inside the admin console.</p>
  `;
  
  const actionBtn = `<a href="${url}" style="display: inline-block; background-color: #B91C1C; color: #ffffff; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 99px; text-align: center;">Review Escalated Ticket</a>`;
  
  const html = buildGoldEmail(subject, headline, body, actionBtn);
  const text = `Agent ${agentName} escalated Ticket #${ticket.ticketCode} for return request ${code}. Review: ${url}`;
  
  return sendMail(admins.join(", "), subject, html, text);
};

const sendTicketAssignedEmailToAgent = async (agent, ticket, returnRequest) => {
  const code = returnRequest ? returnRequest.returnCode : "N/A";
  const subject = `[ASSIGNED] New Ticket: #${ticket.ticketCode}`;
  const url = `${shopUrl()}/admin/dashboard`;
  
  const headline = "New Support Ticket Assigned";
  const body = `
    <p>Hi ${escapeHtml(agent.name)},</p>
    <p>A new customer ticket has been assigned to you.</p>
    <table width="100%" style="background-color: #FAF4E5; border-radius: 12px; padding: 16px; border: 1px solid #E7D29E; margin: 20px 0; font-size: 13px; color: #1C1C1C;">
      <tr>
        <td style="padding-bottom: 6px;"><strong>Ticket Code:</strong></td>
        <td style="text-align: right; font-weight: bold; font-family: monospace;">#${ticket.ticketCode}</td>
      </tr>
      <tr>
        <td style="padding-bottom: 6px;"><strong>Subject:</strong></td>
        <td style="text-align: right; font-weight: 600;">${escapeHtml(ticket.subject)}</td>
      </tr>
      <tr>
        <td><strong>Return Reference:</strong></td>
        <td style="text-align: right; font-weight: bold;">${code}</td>
      </tr>
    </table>
    <p>Please review and reply to the customer within standard SLA windows.</p>
  `;
  
  const actionBtn = `<a href="${url}" style="display: inline-block; background-color: #D4AF37; color: #ffffff; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 99px; text-align: center;">Open Assigned Tickets</a>`;
  
  const html = buildGoldEmail(subject, headline, body, actionBtn);
  const text = `Hi ${agent.name}, Ticket #${ticket.ticketCode} has been assigned to you. Reply at: ${url}`;
  
  return sendMail(agent.email, subject, html, text);
};

const sendCustomerReplyNotificationToAgentOrAdmin = async (recipientEmail, recipientName, ticket, messageBody) => {
  const subject = `[CUSTOMER REPLY] Ticket: #${ticket.ticketCode}`;
  const url = `${shopUrl()}/admin/dashboard`;
  
  const headline = "Customer Responded to Ticket";
  const body = `
    <p>Hi ${escapeHtml(recipientName)},</p>
    <p>Customer has sent a new response to Ticket <strong>#${ticket.ticketCode}</strong>.</p>
    <p><strong>Message Content:</strong></p>
    <div style="background-color: #FAF7F2; padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; color: #1C1C1C; border-left: 2px solid #D4AF37; margin: 15px 0;">
      "${escapeHtml(messageBody)}"
    </div>
    <p>Reply directly inside the dashboard panel.</p>
  `;
  
  const actionBtn = `<a href="${url}" style="display: inline-block; background-color: #D4AF37; color: #ffffff; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 99px; text-align: center;">Go to Ticket Console</a>`;
  
  const html = buildGoldEmail(subject, headline, body, actionBtn);
  const text = `Customer responded to ticket #${ticket.ticketCode}: "${messageBody}". Reply at: ${url}`;
  
  return sendMail(recipientEmail, subject, html, text);
};

module.exports = {
  sendReturnSubmittedEmail,
  sendReturnApprovedEmail,
  sendReturnRejectedEmail,
  sendPickupScheduledEmail,
  sendProductReceivedEmail,
  sendRefundInitiatedEmail,
  sendRefundCompletedEmail,
  sendReplacementShippedEmail,
  sendReturnClosedEmail,
  sendNewReturnRequestAlertToAdmin,
  sendEscalationAlertToAdmin,
  sendTicketAssignedEmailToAgent,
  sendCustomerReplyNotificationToAgentOrAdmin,
};
