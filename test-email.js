const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "c:/gift/.env" });

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT) || 587;
const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

console.log("SMTP Config:", { host, port, secure, user, pass: pass ? "***" : "none" });

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass,
  },
});

transporter.sendMail({
  from: `"Test Sender" <${user}>`,
  to: "niyoragifts@gmail.com",
  subject: "Nodemailer SMTP Test",
  text: "This is a test email to verify SMTP configuration.",
  html: "<b>This is a test email to verify SMTP configuration.</b>",
}).then(info => {
  console.log("Email sent successfully:", info.messageId);
  process.exit(0);
}).catch(err => {
  console.error("Email send failed:", err);
  process.exit(1);
});
