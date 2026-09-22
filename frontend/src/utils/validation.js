/**
 * Client-side Strong Validation & Fake Data Protection
 * Mirrored rules with the backend validation engine for instant, user-friendly feedback.
 */

const DUMMY_TERMS = new Set([
  "test",
  "testing",
  "tester",
  "test user",
  "testuser",
  "abc",
  "xyz",
  "asdf",
  "qwerty",
  "fake",
  "dummy",
  "sample",
  "user",
  "admin",
  "guest",
  "null",
  "undefined",
  "none",
  "na",
  "n/a",
  "temp",
  "unknown",
  "customer",
  "demo",
]);

export const sanitizeText = (val) => {
  if (typeof val !== "string") return "";
  return val.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
};

export const validateName = (name) => {
  if (!name || typeof name !== "string") {
    return { isValid: false, error: "Please enter your full name." };
  }

  const cleaned = sanitizeText(name);
  if (cleaned.length < 2) {
    return { isValid: false, error: "Full name must be at least 2 characters." };
  }

  if (cleaned.length > 70) {
    return { isValid: false, error: "Full name cannot exceed 70 characters." };
  }

  // Must contain letters
  if (!/\p{L}/u.test(cleaned)) {
    return { isValid: false, error: "Full name must contain letters, not numbers only." };
  }

  const validNameRegex = /^[\p{L}\s\.'\-]+$/u;
  if (!validNameRegex.test(cleaned)) {
    return { isValid: false, error: "Full name contains invalid characters." };
  }

  const lower = cleaned.toLowerCase();
  if (DUMMY_TERMS.has(lower)) {
    return { isValid: false, error: "Please enter your real full name, not a placeholder." };
  }

  const words = lower.split(/\s+/);
  if (words.length > 0 && words.every((w) => DUMMY_TERMS.has(w))) {
    return { isValid: false, error: "Please enter your real full name, not a placeholder." };
  }

  if (/^(\p{L})\1{2,}$/u.test(cleaned.replace(/[\s\.'\-]/g, ""))) {
    return { isValid: false, error: "Please enter a real name, not repeated characters." };
  }

  return { isValid: true, error: null, sanitizedValue: cleaned };
};

export const validateEmail = (email) => {
  if (!email || typeof email !== "string") {
    return { isValid: false, error: "Please enter your email address." };
  }

  const cleaned = sanitizeText(email).toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleaned)) {
    return { isValid: false, error: "Please enter a valid email address (e.g. name@example.com)." };
  }

  const [localPart, domain] = cleaned.split("@");
  if (DUMMY_TERMS.has(localPart) && (domain === "test.com" || domain === "example.com" || domain === "fake.com")) {
    return { isValid: false, error: "Please enter an authentic personal email address." };
  }

  return { isValid: true, error: null, sanitizedValue: cleaned };
};

export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, error: "Please enter a 10-digit mobile number." };
  }

  let cleaned = String(phone).replace(/[^\d+]/g, "").trim();

  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  if (!/^\d{10}$/.test(cleaned)) {
    return { isValid: false, error: "Please enter a valid 10-digit mobile number." };
  }

  if (!/^[6-9]/.test(cleaned)) {
    return { isValid: false, error: "Mobile number must start with 6, 7, 8, or 9." };
  }

  if (/^(\d)\1{9}$/.test(cleaned)) {
    return { isValid: false, error: "Please enter a valid mobile number, not repeated identical digits." };
  }

  if (cleaned === "1234567890" || cleaned === "0123456789") {
    return { isValid: false, error: "Please enter a valid mobile number, not sequential numbers." };
  }

  return { isValid: true, error: null, sanitizedValue: cleaned };
};

export const validatePinCode = (pin) => {
  if (!pin) {
    return { isValid: false, error: "Please enter a 6-digit PIN code." };
  }

  const cleaned = String(pin).replace(/\D/g, "").trim();

  if (cleaned.length !== 6) {
    return { isValid: false, error: "PIN code must be exactly 6 digits." };
  }

  if (!/^[1-9][0-9]{5}$/.test(cleaned)) {
    return { isValid: false, error: "Please enter a valid 6-digit PIN code." };
  }

  if (/^(\d)\1{5}$/.test(cleaned) || cleaned === "123456" || cleaned === "654321") {
    return { isValid: false, error: "Please enter a valid delivery PIN code." };
  }

  return { isValid: true, error: null, sanitizedValue: cleaned };
};

export const validateAddressLine = (value, fieldName = "Address", minLen = 2) => {
  if (!value || typeof value !== "string") {
    return { isValid: false, error: `Please enter ${fieldName}.` };
  }

  const cleaned = sanitizeText(value);
  if (cleaned.length < minLen) {
    return { isValid: false, error: `${fieldName} must be at least ${minLen} characters.` };
  }

  const lower = cleaned.toLowerCase();
  if (DUMMY_TERMS.has(lower)) {
    return { isValid: false, error: `Please enter real ${fieldName} information.` };
  }

  return { isValid: true, error: null, sanitizedValue: cleaned };
};

export const validateAddress = (address = {}) => {
  const errors = {};

  const nameRes = validateName(address.fullName);
  if (!nameRes.isValid) errors.fullName = nameRes.error;

  const phoneRes = validatePhone(address.phone || address.mobileNumber);
  if (!phoneRes.isValid) errors.phone = phoneRes.error;

  const line1Res = validateAddressLine(address.line1, "House/Flat/Building details", 2);
  if (!line1Res.isValid) errors.line1 = line1Res.error;

  if (address.line2 && address.line2.trim().length > 0) {
    const line2Res = validateAddressLine(address.line2, "Street/Area details", 2);
    if (!line2Res.isValid) errors.line2 = line2Res.error;
  }

  const cityRes = validateAddressLine(address.city, "City", 2);
  if (!cityRes.isValid) errors.city = cityRes.error;

  const stateRes = validateAddressLine(address.state, "State", 2);
  if (!stateRes.isValid) errors.state = stateRes.error;

  const pinRes = validatePinCode(address.postalCode || address.pincode);
  if (!pinRes.isValid) errors.postalCode = pinRes.error;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
