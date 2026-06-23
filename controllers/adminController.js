const bcrypt = require("bcryptjs");
const User = require("../models/User");
const StoreSetting = require("../models/StoreSetting");
const LoginActivityLog = require("../models/LoginActivityLog");
const { generateToken } = require("./authController");
const { getSmtpConfig, isSmtpConfigured, isEmailConfigured, verifyEmailTransporter } = require("../services/emailTransporter");
const { logActivity } = require("../services/logService");

const parseUserAgent = (userAgentString) => {
  const ua = userAgentString || "";
  let browser = "Unknown Browser";
  let device = "Desktop";

  if (/mobile/i.test(ua)) {
    device = "Mobile";
  } else if (/tablet|ipad/i.test(ua)) {
    device = "Tablet";
  }

  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr/i.test(ua)) {
    browser = "Chrome";
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua) && !/android/i.test(ua)) {
    browser = "Safari";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/edge|edg/i.test(ua)) {
    browser = "Edge";
  } else if (/opr/i.test(ua)) {
    browser = "Opera";
  }

  return { browser, device };
};

const logLoginAttempt = async (userName, email, status, userId, req) => {
  try {
    const userAgent = req.headers["user-agent"] || "";
    const { browser, device } = parseUserAgent(userAgent);
    const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";

    return await LoginActivityLog.create({
      userId: userId || null,
      userName: userName || "Unknown User",
      email: email.toLowerCase(),
      browser,
      device,
      ipAddress,
      status
    });
  } catch (error) {
    console.error("Failed to write login activity log:", error);
  }
};

const defaultOffers = [
  {
    title: "Midnight Surprise Drop",
    subtitle: "Order before 11 PM and unlock priority prep on select gifts.",
    code: "MIDNIGHT12",
    ctaText: "Shop Late Night",
    active: true,
  },
  {
    title: "Birthday Bundle Wave",
    subtitle: "Combo gifts with curated cards and packaging at festival pricing.",
    code: "BDAYBLISS",
    ctaText: "View Bundles",
    active: true,
  },
  {
    title: "Personalized Express",
    subtitle: "Fast-track custom gifts with handcrafted finishing.",
    code: "CUSTOM10",
    ctaText: "Customize Now",
    active: true,
  },
];

const defaultSpecialOffer = {
  title: "Festive Mega Sale",
  subtitle: "Celebrate the season with curated gifts and limited-time savings.",
  eventName: "Festive Special",
  code: "FESTIVE20",
  ctaText: "Grab Offer",
  startDate: "",
  endDate: "",
  active: false,
};

const normalizeDateInput = (value) => {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return parsedDate.toISOString();
};

const sanitizeSpecialOffer = (specialOffer) => ({
  title: String(specialOffer?.title || defaultSpecialOffer.title).trim(),
  subtitle: String(specialOffer?.subtitle || defaultSpecialOffer.subtitle).trim(),
  eventName: String(specialOffer?.eventName || defaultSpecialOffer.eventName).trim(),
  code: String(specialOffer?.code || "").trim().toUpperCase(),
  ctaText: String(specialOffer?.ctaText || defaultSpecialOffer.ctaText).trim(),
  startDate: normalizeDateInput(specialOffer?.startDate),
  endDate: normalizeDateInput(specialOffer?.endDate),
  active: Boolean(specialOffer?.active),
});

const sanitizeOffers = (offers) => {
  if (!Array.isArray(offers)) return defaultOffers;

  return offers
    .slice(0, 6)
    .map((offer) => ({
      title: String(offer?.title || "").trim(),
      subtitle: String(offer?.subtitle || "").trim(),
      code: String(offer?.code || "").trim().toUpperCase(),
      ctaText: String(offer?.ctaText || "Explore").trim(),
      active: Boolean(offer?.active),
    }))
    .filter((offer) => offer.title && offer.subtitle);
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let admin = await User.findOne({ email: email.toLowerCase(), isAdmin: true }).populate("roles", "name permissions");
    if (!admin) {
      const fallbackEmail = process.env.ADMIN_EMAIL || "niyoragifts@gmail.com";
      const fallbackPassword = process.env.ADMIN_PASSWORD || "harshit@123";

      if (email.toLowerCase() !== fallbackEmail.toLowerCase() || password !== fallbackPassword) {
        await logLoginAttempt("Unknown Admin", email, "Failed", null, req);
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      const hashedPassword = await bcrypt.hash(fallbackPassword, 10);
      admin = await User.create({
        name: "Store Admin",
        email: fallbackEmail.toLowerCase(),
        password: hashedPassword,
        isAdmin: true,
        isMasterAdmin: true, // Default created first fallback holds Master Admin
        status: "Active",
      });
    }

    // Lockout check
    if (admin.lockUntil && admin.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((admin.lockUntil - new Date()) / (60 * 1000));
      await logLoginAttempt(admin.name, email, "Failed", admin._id, req);
      return res.status(403).json({ 
        message: `Account is temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minutes.` 
      });
    }

    // Suspension check
    if (admin.status === "Inactive") {
      await logLoginAttempt(admin.name, email, "Failed", admin._id, req);
      return res.status(403).json({ message: "Your employee account has been suspended or deactivated." });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      admin.loginAttempts = (admin.loginAttempts || 0) + 1;
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minute lock
      }
      await admin.save();
      await logLoginAttempt(admin.name, email, "Failed", admin._id, req);
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    // Reset login failures
    admin.loginAttempts = 0;
    admin.lockUntil = null;

    admin.lastLogin = new Date();
    await admin.save();

    await logActivity(admin._id, admin.name, "LOGIN", "Logged into admin panel successfully", req);

    const loginLog = await logLoginAttempt(admin.name, admin.email, "Success", admin._id, req);

    const roleNames = admin.roles ? admin.roles.map(r => r.name) : [];
    const permissions = new Set();
    if (admin.isMasterAdmin) {
      permissions.add("ALL");
    } else if (admin.roles) {
      admin.roles.forEach(r => {
        if (r.permissions) {
          r.permissions.forEach(p => permissions.add(p));
        }
      });
    }

    const token = generateToken(admin._id);

    // Set secure HTTP-only cookie
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    return res.status(200).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      isAdmin: true,
      isMasterAdmin: admin.isMasterAdmin,
      roles: roleNames,
      permissions: Array.from(permissions),
      token,
      loginLogId: loginLog ? loginLog._id : null,
    });
  } catch (error) {
    console.error("Admin login error:", error.message);
    return res.status(500).json({ message: "Admin login failed" });
  }
};

const setup2FA = async (req, res) => {
  try {
    const speakeasy = require("speakeasy");
    const QRCode = require("qrcode");

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = speakeasy.generateSecret({
      name: `Niyora Gifts:${user.email}`
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.status(200).json({
      secret: secret.base32,
      qrCodeDataUrl
    });
  } catch (error) {
    console.error("2FA setup error:", error.message);
    return res.status(500).json({ message: "Failed to generate 2FA setup details" });
  }
};

const enable2FA = async (req, res) => {
  try {
    const speakeasy = require("speakeasy");
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Verification token is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid 2FA token. Please try scanning again." });
    }

    user.twoFactorEnabled = true;
    await user.save();

    await logActivity(
      user._id,
      user.name,
      "SECURITY_2FA_ENABLED",
      "Enabled Two-Factor Authentication (2FA) for this account",
      req
    );

    return res.status(200).json({ message: "Two-Factor Authentication enabled successfully" });
  } catch (error) {
    console.error("2FA enable error:", error.message);
    return res.status(500).json({ message: "Failed to enable 2FA" });
  }
};

const disable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = "";
    await user.save();

    await logActivity(
      user._id,
      user.name,
      "SECURITY_2FA_DISABLED",
      "Disabled Two-Factor Authentication (2FA) for this account",
      req
    );

    return res.status(200).json({ message: "Two-Factor Authentication disabled successfully" });
  } catch (error) {
    console.error("2FA disable error:", error.message);
    return res.status(500).json({ message: "Failed to disable 2FA" });
  }
};

const verify2FA = async (req, res) => {
  try {
    const speakeasy = require("speakeasy");
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ message: "userId and token are required" });
    }

    const admin = await User.findById(userId).populate("roles", "name permissions");
    if (!admin || !admin.isAdmin) {
      return res.status(404).json({ message: "User not found" });
    }

    if (admin.status === "Inactive") {
      await logLoginAttempt(admin.name, admin.email, "Failed", admin._id, req);
      return res.status(403).json({ message: "Your employee account has been suspended or deactivated." });
    }

    const verified = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1
    });

    if (!verified) {
      await logLoginAttempt(admin.name, admin.email, "Failed", admin._id, req);
      return res.status(401).json({ message: "Invalid 2FA token. Please try again." });
    }

    admin.loginAttempts = 0;
    admin.lockUntil = null;
    admin.lastLogin = new Date();
    await admin.save();

    await logActivity(admin._id, admin.name, "LOGIN", "Logged into admin panel successfully (2FA Verified)", req);

    const loginLog = await logLoginAttempt(admin.name, admin.email, "Success", admin._id, req);

    const roleNames = admin.roles ? admin.roles.map(r => r.name) : [];
    const permissions = new Set();
    if (admin.isMasterAdmin) {
      permissions.add("ALL");
    } else if (admin.roles) {
      admin.roles.forEach(r => {
        if (r.permissions) {
          r.permissions.forEach(p => permissions.add(p));
        }
      });
    }

    const authToken = generateToken(admin._id);

    // Set secure HTTP-only cookie
    res.cookie("admin_token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    return res.status(200).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      isAdmin: true,
      isMasterAdmin: admin.isMasterAdmin,
      roles: roleNames,
      permissions: Array.from(permissions),
      token: authToken,
      loginLogId: loginLog ? loginLog._id : null,
    });
  } catch (error) {
    console.error("2FA verify error:", error.message);
    return res.status(500).json({ message: "2FA login verification failed" });
  }
};

const getStoreInfo = async (req, res) => {
  try {
    const dbStoreInfo = await StoreSetting.findOne({ singletonKey: "store" }).lean();
    return res.status(200).json({
      storeName: dbStoreInfo?.storeName || process.env.STORE_NAME || "Niyora Gifts",
      storePhone: dbStoreInfo?.storePhone || process.env.STORE_PHONE || "+91-90000-00000",
      storeAddress: dbStoreInfo?.storeAddress || process.env.STORE_ADDRESS || "123 Commerce Street, Mumbai, Maharashtra 400001, India",
      storeLogoUrl: dbStoreInfo?.storeLogoUrl || "",
      specialOffer: sanitizeSpecialOffer(dbStoreInfo?.specialOffer),
      offers: sanitizeOffers(dbStoreInfo?.offers),
      codEnabled: dbStoreInfo?.codEnabled !== undefined ? dbStoreInfo.codEnabled : true,
    });
  } catch (error) {
    console.error("Get store info error:", error.message);
    return res.status(500).json({ message: "Failed to fetch store info" });
  }
};

const updateStoreInfo = async (req, res) => {
  try {
    const { storeName, storePhone, storeAddress, storeLogoUrl, specialOffer, offers, codEnabled } = req.body;
    if (!storeName || !storePhone || !storeAddress) {
      return res.status(400).json({ message: "storeName, storePhone and storeAddress are required" });
    }

    const storeInfo = await StoreSetting.findOneAndUpdate(
      { singletonKey: "store" },
      {
        singletonKey: "store",
        storeName: String(storeName).trim(),
        storePhone: String(storePhone).trim(),
        storeAddress: String(storeAddress).trim(),
        storeLogoUrl: String(storeLogoUrl || "").trim(),
        specialOffer: sanitizeSpecialOffer(specialOffer),
        offers: sanitizeOffers(offers),
        codEnabled: codEnabled !== undefined ? Boolean(codEnabled) : true,
      },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
    );

    if (req.user) {
      await logActivity(
        req.user._id,
        req.user.name,
        "SETTINGS_MODIFIED",
        `Updated store settings (Store Name: ${storeInfo.storeName})`,
        req
      );
    }

    return res.status(200).json({
      message: "Store info updated successfully",
      storeInfo: {
        storeName: storeInfo.storeName,
        storePhone: storeInfo.storePhone,
        storeAddress: storeInfo.storeAddress,
        storeLogoUrl: storeInfo.storeLogoUrl || "",
        specialOffer: sanitizeSpecialOffer(storeInfo.specialOffer),
        offers: sanitizeOffers(storeInfo.offers),
        codEnabled: storeInfo.codEnabled !== undefined ? storeInfo.codEnabled : true,
      },
    });
  } catch (error) {
    console.error("Update store info error:", error.message);
    return res.status(500).json({ message: "Failed to update store info" });
  }
};

const getEmailDiagnostics = async (req, res) => {
  try {
    const smtpConfig = getSmtpConfig();
    const emailConfigured = isEmailConfigured();
    const smtpConfigured = isSmtpConfigured();
    const diagnostics = {
      emailConfigured,
      emailProvider: smtpConfig.provider || null,
      smtpConfigured,
      smtpHost: smtpConfig.host || null,
      smtpPort: smtpConfig.port,
      smtpSecure: smtpConfig.secure,
      smtpUserLoaded: Boolean(smtpConfig.user),
      smtpPassLoaded: Boolean(smtpConfig.pass),
      smtpFrom: smtpConfig.from || null,
      resendConfigured: smtpConfig.resendConfigured,
      brevoConfigured: smtpConfig.brevoConfigured,
      smtpConnectionTimeoutMs: smtpConfig.connectionTimeout,
      smtpGreetingTimeoutMs: smtpConfig.greetingTimeout,
      smtpSocketTimeoutMs: smtpConfig.socketTimeout,
      smtpDebug: smtpConfig.debug,
      smtpLogger: smtpConfig.logger,
      smtpIsGmail: smtpConfig.isGmail,
      environment: process.env.NODE_ENV || "<unset>",
    };

    if (!emailConfigured) {
      return res.status(200).json({
        message: "Email provider is not configured. Configure SMTP, Resend, or Brevo.",
        diagnostics,
      });
    }

    let verifyResult = null;
    let verifyError = null;
    try {
      verifyResult = await verifyEmailTransporter();
    } catch (error) {
      verifyError = {
        message: error.message,
        code: error.code,
        responseCode: error.responseCode,
        stack: error.stack,
      };
    }

    return res.status(200).json({
      message: "SMTP diagnostics completed.",
      diagnostics,
      verifyResult,
      verifyError,
    });
  } catch (error) {
    console.error("Get email diagnostics error:", error);
    return res.status(500).json({ message: "Failed to retrieve email diagnostics", error: error.message || error });
  }
};

const adminLogout = async (req, res) => {
  try {
    const { loginLogId, reason } = req.body;

    res.clearCookie("admin_token");

    if (loginLogId) {
      const log = await LoginActivityLog.findById(loginLogId);
      if (log) {
        log.logoutTime = new Date();
        log.status = reason === "Session Expired" ? "Session Expired" : "Logged Out";
        await log.save();
      }
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Admin logout error:", error.message);
    return res.status(500).json({ message: "Failed to logout properly" });
  }
};

const getLoginLogs = async (req, res) => {
  try {
    if (!req.user || !req.user.isMasterAdmin) {
      return res.status(403).json({ message: "Access denied. Master Admin access required." });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const total = await LoginActivityLog.countDocuments({});
    const logs = await LoginActivityLog.find({})
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Get login logs error:", error.message);
    return res.status(500).json({ message: "Failed to fetch login history logs." });
  }
};

module.exports = { 
  adminLogin, 
  getStoreInfo, 
  updateStoreInfo, 
  getEmailDiagnostics, 
  setup2FA, 
  enable2FA, 
  disable2FA, 
  verify2FA,
  adminLogout,
  getLoginLogs
};
