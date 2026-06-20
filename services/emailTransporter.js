const nodemailer = require("nodemailer");

const parseBooleanEnv = (name, defaultValue = false) => {
  const raw = String(process.env[name] || "").trim().toLowerCase();
  if (!raw) return defaultValue;
  return ["1", "true", "yes", "y", "on"].includes(raw);
};

const parseNumberEnv = (name, defaultValue) => {
  const raw = String(process.env[name] || "").trim();
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const TEMPORARY_SMTP_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ESOCKET",
  "ECONNRESET",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
  "EMFILE",
  "ENOTFOUND",
  "ECONNABORTED",
]);

const TEMPORARY_SMTP_RESPONSE_CODES = new Set([421, 450, 451, 452, 454]);

const getSmtpConfig = () => {
  const host = String(process.env.SMTP_HOST || "").trim();
  const portValue = String(process.env.SMTP_PORT || "").trim();
  const secureValue = String(process.env.SMTP_SECURE || "").trim().toLowerCase();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const from = String(process.env.SMTP_FROM || "").trim();
  const secure = ["true", "1", "yes", "y", "on"].includes(secureValue);
  const port = Number.isInteger(Number(portValue)) ? Number(portValue) : undefined;
  const effectivePort = port || (secure ? 465 : 587);

  return {
    host,
    port: effectivePort,
    secure,
    user,
    pass,
    from,
    debug: parseBooleanEnv("SMTP_DEBUG", false),
    logger: parseBooleanEnv("SMTP_LOGGER", false),
    connectionTimeout: parseNumberEnv("SMTP_CONNECTION_TIMEOUT_MS", 20000),
    greetingTimeout: parseNumberEnv("SMTP_GREETING_TIMEOUT_MS", 20000),
    socketTimeout: parseNumberEnv("SMTP_SOCKET_TIMEOUT_MS", 20000),
    maxRetries: parseNumberEnv("SMTP_RETRY_COUNT", 2),
    retryDelayMs: parseNumberEnv("SMTP_RETRY_DELAY_MS", 1200),
    verifyStrict: parseBooleanEnv("SMTP_STARTUP_VERIFY_STRICT", true),
    hasCredentials: Boolean(host && user && pass),
    isGmail: Boolean(host && /(?:^|\.)gmail\.com$/i.test(host)),
  };
};

let sharedTransporter = null;

const buildDiagnostics = (config) => ({
  host: config.host,
  port: config.port,
  secure: config.secure,
  isGmail: config.isGmail,
  credentialsLoaded: Boolean(config.user && config.pass),
  debug: config.debug,
  logger: config.logger,
  connectionTimeout: config.connectionTimeout,
  greetingTimeout: config.greetingTimeout,
  socketTimeout: config.socketTimeout,
});

const createSmtpTransporter = async (config) => {
  const options = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: config.connectionTimeout,
    greetingTimeout: config.greetingTimeout,
    socketTimeout: config.socketTimeout,
    logger: config.logger,
    debug: config.debug,
  };

  console.info("[email] Creating SMTP transporter", buildDiagnostics(config));
  return nodemailer.createTransport(options);
};

const createTestTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();
  const transportOptions = {
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };
  console.info("[email] Creating Ethereal test transporter for local development", {
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
  });
  const transporter = nodemailer.createTransport(transportOptions);
  transporter.isTest = true;
  transporter.testAccount = testAccount;
  return transporter;
};

const getTransporter = async () => {
  if (sharedTransporter) return sharedTransporter;
  const config = getSmtpConfig();
  if (config.hasCredentials) {
    sharedTransporter = await createSmtpTransporter(config);
    return sharedTransporter;
  }
  if (process.env.NODE_ENV !== "production" && process.env.DISABLE_EMAIL_FALLBACK !== "true") {
    sharedTransporter = await createTestTransporter();
    return sharedTransporter;
  }
  return null;
};

const verifyEmailTransporter = async () => {
  const config = getSmtpConfig();
  if (!config.hasCredentials) {
    console.warn("[email] SMTP verification skipped because SMTP_HOST, SMTP_USER or SMTP_PASS is missing.");
    return false;
  }

  const transporter = await getTransporter();
  if (!transporter) {
    throw new Error("Unable to create SMTP transporter for verification.");
  }

  console.info("[email] Verifying SMTP transporter connection...");
  const result = await transporter.verify();
  console.info("[email] SMTP transporter verification succeeded", { verified: result });

  if (config.isGmail) {
    console.warn("[email] Gmail SMTP detected. For Render production, Gmail SMTP is fragile and may time out. Consider Resend, Brevo, or a dedicated SMTP relay provider.");
  }

  return result;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTemporarySmtpFailure = (error) => {
  if (!error || typeof error !== "object") return false;
  if (error.code && TEMPORARY_SMTP_ERROR_CODES.has(error.code)) return true;
  if (typeof error.responseCode === "number" && TEMPORARY_SMTP_RESPONSE_CODES.has(error.responseCode)) return true;
  if (typeof error.message === "string" && /timeout|timed out|EAI_AGAIN|ENOTFOUND|ECONN|ECONNRESET|ESOCKET|ETIMEDOUT|ENETUNREACH/i.test(error.message)) {
    return true;
  }
  return false;
};

const sendMailWithRetries = async (mailOptions) => {
  const transporter = await getTransporter();
  if (!transporter) {
    const err = new Error("EMAIL_NOT_CONFIGURED");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  const config = getSmtpConfig();
  const attempts = config.maxRetries + 1;
  let attempt = 0;

  while (attempt < attempts) {
    attempt += 1;
    try {
      const info = await transporter.sendMail(mailOptions);
      console.info("[email] Email sent successfully", {
        messageId: info.messageId,
        attempt,
        from: mailOptions.from,
        to: mailOptions.to,
      });
      return info;
    } catch (error) {
      const temporary = isTemporarySmtpFailure(error);
      console.error("[email] Email send failed", {
        attempt,
        maxAttempts: attempts,
        message: error.message,
        code: error.code,
        responseCode: error.responseCode,
        response: error.response,
        stack: error.stack,
        temporary,
      });

      if (!temporary || attempt >= attempts) {
        error.message = `SMTP send failed after ${attempt} attempt(s): ${error.message}`;
        throw error;
      }

      const delayMs = Math.min(config.retryDelayMs * attempt, 10000);
      console.warn(`[email] Temporary SMTP failure will retry in ${delayMs}ms (attempt ${attempt + 1}/${attempts})`);
      await delay(delayMs);
    }
  }

  throw new Error("SMTP send retry loop exited unexpectedly");
};

const isSmtpConfigured = () => {
  const config = getSmtpConfig();
  return config.hasCredentials;
};

module.exports = {
  getTransporter,
  verifyEmailTransporter,
  sendMailWithRetries,
  isSmtpConfigured,
  getSmtpConfig,
};
