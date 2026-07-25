const { z } = require("zod");
const fs = require("fs");
const path = require("path");

// Regex to match any HTML tag
const htmlRegex = /<[^>]*>/g;
const hasHtml = (val) => htmlRegex.test(val);

// Basic field schemas
const emailSchema = z.string()
  .trim()
  .email("Invalid email format")
  .refine(val => !hasHtml(val), { message: "Email cannot contain HTML/script tags" });

const passwordSchema = z.string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password is too long")
  .refine(val => !hasHtml(val), { message: "Password cannot contain HTML/script tags" });

const nameSchema = z.string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name is too long")
  .refine(val => !hasHtml(val), { message: "Name cannot contain HTML/script tags" });

const usernameSchema = z.string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username is too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username must contain only alphanumeric characters, underscores, and hyphens")
  .refine(val => !hasHtml(val), { message: "Username cannot contain HTML/script tags" })
  .optional();

const mobileNumberSchema = z.string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, "Mobile number must be a valid phone number")
  .refine(val => !hasHtml(val), { message: "Mobile number cannot contain HTML/script tags" });

const otpSchema = z.string()
  .trim()
  .regex(/^\d{6}$/, "OTP must be exactly 6 digits");

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
  name: nameSchema.optional(),
  mobileNumber: mobileNumberSchema.optional(),
  username: usernameSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.register) {
    if (!data.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name is required for registration",
        path: ["name"]
      });
    }
    if (!data.mobileNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mobile number is required for registration",
        path: ["mobileNumber"]
      });
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
      body: maskedBody
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
      const errorDetails = result.error.issues.map(err => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code
      }));

      // Log the attack/validation failure details server-side
      logRejectedSubmission(req, errorDetails);

      // Return a completely generic error response to the client
      return res.status(400).json({
        message: "Invalid submission data. Please verify your inputs."
      });
    }

    // Pass the parsed & sanitized body onward (strips unrecognized keys)
    req.body = result.data;
    next();
  };
};

module.exports = {
  validateBody,
  checkEmailSchema,
  registerSendOtpSchema,
  verifyOtpSchema,
  googleLoginSchema,
  adminLoginSchema,
};
