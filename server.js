const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
// Load local environment variables only when they are not already set.
// This preserves Render-provided environment values in production.
dotenv.config({ override: false });

const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const roleRoutes = require("./routes/roleRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const logRoutes = require("./routes/logRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const returnRoutes = require("./routes/returnRoutes");
const emailRoutes = require("./routes/emailRoutes");
const { getStoreInfo } = require("./controllers/adminController");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { verifyEmailTransporter, getSmtpConfig } = require("./services/emailTransporter");

const app = express();

const { securityHeaders, csrfProtection } = require("./middleware/securityMiddleware");

// ✅ FINAL CORS FIX (WORKS 100%)
app.use(cors({
  origin: "*",
}));

app.use(securityHeaders);
app.use(csrfProtection);


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "Gift store API is running" });
});

// ✅ ROUTES (ALL SAFE)
app.use("/api/products", productRoutes);
app.use("/api", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.get("/api/store-info", getStoreInfo);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);   // admin login safe
app.use("/api/admin/employees", employeeRoutes);
app.use("/api/admin/roles", roleRoutes);
app.use("/api/admin/departments", departmentRoutes);
app.use("/api/admin/logs", logRoutes);
app.use("/api/user", userRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/admin/emails", emailRoutes);


app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const logSmtpStartupInfo = () => {
  const smtpConfig = getSmtpConfig();
  console.info("[startup] SMTP configuration summary", {
    host: smtpConfig.host || "<missing>",
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    hasCredentials: smtpConfig.hasCredentials,
    provider: smtpConfig.provider || "<none>",
    isGmail: smtpConfig.isGmail,
    connectionTimeout: smtpConfig.connectionTimeout,
    greetingTimeout: smtpConfig.greetingTimeout,
    socketTimeout: smtpConfig.socketTimeout,
  });
  if (!smtpConfig.hasCredentials && !smtpConfig.resendConfigured && !smtpConfig.brevoConfigured) {
    console.warn("[startup] Email provider is not configured in production. Configure SMTP, Resend, or Brevo.");
  }
};

const startServer = async () => {
  try {
    await connectDB();
    const { seedDB } = require("./services/seedService");
    await seedDB();
    const { startEmailWorker } = require("./services/emailService");
    startEmailWorker();
    logSmtpStartupInfo();

    if (process.env.NODE_ENV === "production") {
      try {
        await verifyEmailTransporter();
      } catch (smtpError) {
        console.error("[startup] SMTP transporter verification failed", {
          message: smtpError.message,
          code: smtpError.code,
          stack: smtpError.stack,
        });
      }
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message, error.stack);
    process.exit(1);
  }
};

startServer();