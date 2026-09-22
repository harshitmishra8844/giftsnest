const { z } = require("zod");
const fs = require("fs");
const path = require("path");
const {
  validateName,
  validateEmail,
  validatePhone,
  validatePinCode,
  validateAddress,
  stripHtml,
} = require("../utils/validation");

// Helper to check for HTML tags
const htmlRegex = /<[^>]*>/g;
const hasHtml = (val) => htmlRegex.test(val);

// Field schemas using validation utility
const emailSchema = z.string()
  .trim()
  .superRefine((val, ctx) => {
    const res = validateEmail(val);
    if (!res.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error,
      });
    }
  })
  .transform((val) => validateEmail(val).sanitizedValue);

const passwordSchema = z.string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password is too long")
  .refine((val) => !hasHtml(val), { message: "Password cannot contain HTML/script tags" });

const nameSchema = z.string()
  .trim()
  .superRefine((val, ctx) => {
    const res = validateName(val);
    if (!res.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error,
      });
    }
  })
  .transform((val) => validateName(val).sanitizedValue);

const usernameSchema = z.string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username is too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username must contain only alphanumeric characters, underscores, and hyphens")
  .refine((val) => !hasHtml(val), { message: "Username cannot contain HTML/script tags" })
  .optional();

const mobileNumberSchema = z.string()
  .trim()
  .superRefine((val, ctx) => {
    const res = validatePhone(val);
    if (!res.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error,
      });
    }
  })
  .transform((val) => validatePhone(val).sanitizedValue);

const otpSchema = z.string()
  .trim()
  .regex(/^\d{6}$/, "Verification code must be exactly 6 digits");

// Endpoint Schemas
const checkEmailSchema = z.object({
  email: emailSchema,
});

const registerSendOtpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  mobileNumber: mobileNumberSchema,
  username: usernameSchema,
});

const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  register: z.boolean().optional().default(false),
  name: z.string().optional(),
  mobileNumber: z.string().optional(),
  username: usernameSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.register) {
    if (!data.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter your full name for registration",
        path: ["name"],
      });
    } else {
      const nameRes = validateName(data.name);
      if (!nameRes.isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: nameRes.error,
          path: ["name"],
        });
      }
    }

    if (!data.mobileNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter your mobile number for registration",
        path: ["mobileNumber"],
      });
    } else {
      const phoneRes = validatePhone(data.mobileNumber);
      if (!phoneRes.isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: phoneRes.error,
          path: ["mobileNumber"],
        });
      }
    }
  }
});

const googleLoginSchema = z.object({
  email: emailSchema,
  name: nameSchema,
});

const adminLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const addressValidationSchema = z.object({
  label: z.string().optional().default("Home"),
  fullName: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().optional().default(""),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string().optional().default("India"),
  isDefault: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
  const res = validateAddress(data);
  if (!res.isValid) {
    Object.entries(res.errors).forEach(([field, msg]) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: msg,
      });
    });
  }
}).transform((data) => validateAddress(data).sanitizedAddress);

/**
 * Logs details of validation failures (client IP, UA, target, error details, masked body)
 * securely to rejected_submissions.log.
 */
const logRejectedSubmission = (req, errorDetails) => {
  try {
    const logFilePath = path.join(process.cwd(), "rejected_submissions.log");

    const xForwarded = req.headers["x-forwarded-for"];
    const ip = xForwarded
      ? xForwarded.split(",")[0].trim()
      : (req.ip || req.connection?.remoteAddress || "127.0.0.1");

    const userAgent = req.headers["user-agent"] || "Unknown";
    const timestamp = new Date().toISOString();

    // Mask sensitive fields in the logged body
    const maskedBody = { ...req.body };
    if (typeof maskedBody.password === "string") {
      maskedBody.password = "[MASKED]";
    }
    if (typeof maskedBody.otp === "string") {
      maskedBody.otp = "[MASKED]";
    }

    const logEntry = {
      timestamp,
      ip,
      userAgent,
      url: req.originalUrl || req.url,
      method: req.method,
      errors: errorDetails,
      body: maskedBody,
    };

    fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + "\n", "utf8");
  } catch (err) {
    console.error("Failed to write to rejected_submissions.log:", err);
  }
};

/**
 * Middleware wrapper to validate request bodies against a Zod schema.
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorDetails = result.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      // Log the validation failure details server-side
      logRejectedSubmission(req, errorDetails);

      const firstError = errorDetails[0]?.message || "Invalid submission data. Please verify your inputs.";

      return res.status(400).json({
        message: firstError,
        errors: errorDetails.reduce((acc, curr) => {
          if (curr.field) acc[curr.field] = curr.message;
          return acc;
        }, {}),
      });
    }

    // Pass the parsed & sanitized body onward (strips unrecognized keys)
    req.body = result.data;
    next();
  };
};

module.exports = {
  validateBody,
  emailSchema,
  nameSchema,
  mobileNumberSchema,
  checkEmailSchema,
  registerSendOtpSchema,
  verifyOtpSchema,
  googleLoginSchema,
  adminLoginSchema,
  addressValidationSchema,
};
