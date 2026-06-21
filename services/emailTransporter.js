const nodemailer = require("nodemailer");
let smtpFailedVerification = false;


const getEnvValue = (...names) => {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
};

const parseBooleanEnv = (name, defaultValue = false) => {
  const raw = String(getEnvValue(name) || "").trim().toLowerCase();
  if (!raw) return defaultValue;
  return ["1", "true", "yes", "y", "on"].includes(raw);
};

const parseNumberEnv = (name, defaultValue) => {
  const raw = String(getEnvValue(name) || "").trim();
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
  const host = String(getEnvValue("SMTP_HOST", "EMAIL_HOST", "EMAIL_SERVER") || "").trim();
  const portValue = String(getEnvValue("SMTP_PORT", "EMAIL_PORT", "EMAIL_SERVER_PORT") || "").trim();
  const secureValue = String(getEnvValue("SMTP_SECURE", "EMAIL_SECURE") || "").trim().toLowerCase();
  const user = String(getEnvValue("SMTP_USER", "EMAIL_USER") || "").trim();
  const pass = String(getEnvValue("SMTP_PASS", "EMAIL_PASS") || "").trim();
  const from = String(getEnvValue("SMTP_FROM", "EMAIL_FROM", "FROM_EMAIL") || "").trim();
  const resendApiKey = String(getEnvValue("RESEND_API_KEY", "RESEND_KEY") || "").trim();
  const resendFrom = String(getEnvValue("RESEND_FROM_EMAIL", "RESEND_FROM", "SMTP_FROM", "EMAIL_FROM") || "").trim();
  const brevoApiKey = String(getEnvValue("BREVO_API_KEY", "BREVO_KEY", "SENDINBLUE_API_KEY") || "").trim();

  const secure = ["true", "1", "yes", "y", "on"].includes(secureValue);
  const port = Number.isInteger(Number(portValue)) ? Number(portValue) : undefined;
  const effectivePort = port || (secure ? 465 : 587);
  const invalidPort = portValue !== "" && !Number.isInteger(Number(portValue));
  const smtpHostIsGmail = Boolean(host && /(?:^|\.)gmail\.com$/i.test(host));

  return {
    host,
    port: effectivePort,
    secure,
    user,
    pass,
    from,
    resendApiKey,
    resendFrom,
    resendConfigured: Boolean(resendApiKey && resendFrom),
    brevoApiKey,
    brevoConfigured: Boolean(brevoApiKey),
    debug: parseBooleanEnv("SMTP_DEBUG", false),
    logger: parseBooleanEnv("SMTP_LOGGER", false),
    connectionTimeout: parseNumberEnv("SMTP_CONNECTION_TIMEOUT_MS", 20000),
    greetingTimeout: parseNumberEnv("SMTP_GREETING_TIMEOUT_MS", 20000),
    socketTimeout: parseNumberEnv("SMTP_SOCKET_TIMEOUT_MS", 20000),
    maxRetries: parseNumberEnv("SMTP_RETRY_COUNT", 2),
    retryDelayMs: parseNumberEnv("SMTP_RETRY_DELAY_MS", 1200),
    verifyStrict: parseBooleanEnv("SMTP_STARTUP_VERIFY_STRICT", true),
    invalidPort,
    hasCredentials: Boolean(host && user && pass && !invalidPort),
    isGmail: smtpHostIsGmail,
    provider: (Boolean(host && user && pass && !invalidPort) && !smtpFailedVerification) ? "smtp" : Boolean(resendApiKey && resendFrom) ? "resend" : Boolean(brevoApiKey) ? "brevo" : undefined,
  };

};

let sharedTransporter = null;

const buildDiagnostics = (config) => ({
  provider: config.provider,
  smtpHost: config.host,
  smtpPort: config.port,
  smtpSecure: config.secure,
  smtpIsGmail: config.isGmail,
  smtpCredentialsLoaded: Boolean(config.user && config.pass),
  resendConfigured: config.resendConfigured,
  brevoConfigured: config.brevoConfigured,
  debug: config.debug,
  logger: config.logger,
  connectionTimeout: config.connectionTimeout,
  greetingTimeout: config.greetingTimeout,
  socketTimeout: config.socketTimeout,
  invalidPort: config.invalidPort,
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
  if (config.hasCredentials && !smtpFailedVerification) {
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
  if (config.invalidPort) {
    throw new Error(`SMTP_PORT is invalid: ${String(getEnvValue("SMTP_PORT", "EMAIL_PORT", "EMAIL_SERVER_PORT"))}`);
  }

  if (!config.hasCredentials) {
    if (config.resendConfigured) {
      console.info("[email] SMTP is not configured, but Resend fallback provider is available.");
      return true;
    }

    console.warn("[email] SMTP verification skipped because SMTP_HOST, SMTP_USER or SMTP_PASS is missing.");
    return false;
  }

  const transporter = await getTransporter();
  if (!transporter) {
    throw new Error("Unable to create SMTP transporter for verification.");
  }

  console.info("[email] Verifying SMTP transporter connection...");
  try {
    const result = await transporter.verify();
    console.info("[email] SMTP transporter verification succeeded", { verified: result });

    if (config.isGmail) {
      console.warn("[email] Gmail SMTP detected. For Render production, Gmail SMTP is fragile and may time out. Consider Resend, Brevo, or a dedicated SMTP relay provider.");
    }

    return result;
  } catch (error) {
    smtpFailedVerification = true;
    sharedTransporter = null;
    throw error;
  }
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

const sendViaResend = async (mailOptions, config) => {
  if (!config.resendConfigured) {
    const error = new Error("Resend provider is not configured.");
    error.code = "RESEND_NOT_CONFIGURED";
    throw error;
  }

  if (typeof fetch !== "function") {
    const error = new Error("Fetch is not available in this Node runtime. Cannot send email via Resend.");
    error.code = "FETCH_NOT_AVAILABLE";
    throw error;
  }

  const fromEmail = config.resendFrom || config.from || `no-reply@${String(process.env.DOMAIN || "example.com").trim()}`;
  const body = {
    from: fromEmail,
    to: mailOptions.to,
    subject: mailOptions.subject,
  };

  if (mailOptions.text) {
    body.text = mailOptions.text;
  }
  if (mailOptions.html) {
    body.html = mailOptions.html;
  }

  console.info("[email] Sending email via Resend fallback provider", {
    from: fromEmail,
    to: mailOptions.to,
    subject: mailOptions.subject,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`Resend send failed: ${response.status} ${response.statusText}`);
    error.code = "RESEND_SEND_FAILED";
    error.response = data;
    throw error;
  }

  console.info("[email] Email sent successfully via Resend", {
    messageId: data.id,
    to: mailOptions.to,
  });

  return {
    messageId: data.id,
    accepted: [mailOptions.to],
    rejected: [],
    response: data,
  };
};

const sendViaBrevo = async (mailOptions, config) => {
  if (!config.brevoConfigured) {
    const error = new Error("Brevo provider is not configured.");
    error.code = "BREVO_NOT_CONFIGURED";
    throw error;
  }

  if (typeof fetch !== "function") {
    const error = new Error("Fetch is not available in this Node runtime. Cannot send email via Brevo.");
    error.code = "FETCH_NOT_AVAILABLE";
    throw error;
  }

  const fromEmail = config.from || "niyoragifts@gmail.com";
  let fromName = "Niyora Gifts";
  const fromMatch = mailOptions.from ? String(mailOptions.from).match(/^"([^"]+)"\s*<([^>]+)>/) : null;
  const senderEmail = fromMatch ? fromMatch[2] : fromEmail;
  const senderName = fromMatch ? fromMatch[1] : fromName;

  const body = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        email: mailOptions.to,
      },
    ],
    subject: mailOptions.subject,
  };

  if (mailOptions.text) {
    body.textContent = mailOptions.text;
  }
  if (mailOptions.html) {
    body.htmlContent = mailOptions.html;
  }

  console.info("[email] Sending email via Brevo HTTP API", {
    from: senderEmail,
    to: mailOptions.to,
    subject: mailOptions.subject,
  });

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": config.brevoApiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`Brevo send failed: ${response.status} ${response.statusText}`);
    error.code = "BREVO_SEND_FAILED";
    error.response = data;
    throw error;
  }

  console.info("[email] Email sent successfully via Brevo API", {
    messageId: data.messageId,
    to: mailOptions.to,
  });

  return {
    messageId: data.messageId,
    accepted: [mailOptions.to],
    rejected: [],
    response: data,
  };
};

const sendMailWithRetries = async (mailOptions) => {
  const config = getSmtpConfig();

  if (config.invalidPort) {
    const error = new Error(`SMTP_PORT is invalid: ${String(getEnvValue("SMTP_PORT", "EMAIL_PORT", "EMAIL_SERVER_PORT"))}`);
    error.code = "INVALID_SMTP_PORT";
    if (config.brevoConfigured) {
      console.warn("[email] Invalid SMTP port configured; using Brevo HTTP API.");
      return sendViaBrevo(mailOptions, config);
    }
    if (config.resendConfigured) {
      console.warn("[email] Invalid SMTP port configured; using Resend fallback provider.");
      return sendViaResend(mailOptions, config);
    }
    throw error;
  }

  const transporter = await getTransporter();
  if (!transporter) {
    if (config.brevoConfigured) {
      console.warn("[email] SMTP is not configured; sending via Brevo HTTP API.");
      return sendViaBrevo(mailOptions, config);
    }
    if (config.resendConfigured) {
      console.warn("[email] SMTP is not configured; sending via Resend fallback provider.");
      return sendViaResend(mailOptions, config);
    }

    const err = new Error("EMAIL_NOT_CONFIGURED");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  const attempts = config.maxRetries + 1;
  let attempt = 0;
  let lastError = null;

  while (attempt < attempts) {
    attempt += 1;
    try {
      const info = await transporter.sendMail(mailOptions);
      console.info("[email] Email sent successfully via SMTP", {
        messageId: info.messageId,
        attempt,
        from: mailOptions.from,
        to: mailOptions.to,
      });
      return info;
    } catch (error) {
      lastError = error;
      const temporary = isTemporarySmtpFailure(error);
      console.error("[email] SMTP send failed", {
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
        break;
      }

      const delayMs = Math.min(config.retryDelayMs * attempt, 10000);
      console.warn(`[email] Temporary SMTP failure will retry in ${delayMs}ms (attempt ${attempt + 1}/${attempts})`);
      await delay(delayMs);
    }
  }

  if (config.brevoConfigured) {
    console.warn("[email] SMTP failed after retries; switching to Brevo HTTP API.");
    return sendViaBrevo(mailOptions, config);
  }

  if (config.resendConfigured) {
    console.warn("[email] SMTP failed after retries; switching to Resend fallback provider.");
    return sendViaResend(mailOptions, config);
  }

  if (lastError) {
    lastError.message = `SMTP send failed after ${attempt} attempt(s): ${lastError.message}`;
    throw lastError;
  }

  throw new Error("SMTP send failed after retries.");
};

const isSmtpConfigured = () => {
  const config = getSmtpConfig();
  return config.hasCredentials;
};

const isEmailConfigured = () => {
  const config = getSmtpConfig();
  return Boolean(config.provider);
};

module.exports = {
  getTransporter,
  verifyEmailTransporter,
  sendMailWithRetries,
  isSmtpConfigured,
  isEmailConfigured,
  getSmtpConfig,
};
