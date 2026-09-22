/**
 * Strong User Detail Validation & Fake Data Protection Utility
 * Comprehensive, reusable validation and sanitization for customer credentials,
 * address profiles, order checkouts, callbacks, and profile management.
 */

// List of obvious dummy words or sequences (case-insensitive)
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
  "administrator",
  "guest",
  "null",
  "undefined",
  "none",
  "na",
  "n/a",
  "temp",
  "temporary",
  "unknown",
  "anonymous",
  "no name",
  "noname",
  "my name",
  "customer",
  "someone",
  "anyone",
  "demo",
  "foo",
  "bar",
  "baz",
]);

// Strip harmful HTML/script tags while preserving legitimate text punctuation
const stripHtml = (val) => {
  if (typeof val !== "string") return "";
  return val.replace(/<[^>]*>/g, "").trim();
};

// Normalize and sanitize free text input
const sanitizeText = (val) => {
  if (typeof val !== "string") return "";
  return stripHtml(val).replace(/\s+/g, " ").trim();
};

/**
 * Validate Full Name:
 * - Required.
 * - Minimum 2 characters, maximum 70 characters.
 * - Must contain letters (Unicode aware).
 * - Allows letters, spaces, hyphens, apostrophes, and periods (e.g., "O'Connor", "Jean-Luc", "Dr. A. Sharma").
 * - Rejects numbers-only, symbols-only, or obvious dummy words / repeated characters.
 */
const validateName = (name) => {
  if (!name || typeof name !== "string") {
    return { isValid: false, error: "Please enter your full name.", sanitizedValue: "" };
  }

  const cleaned = sanitizeText(name);
  if (cleaned.length < 2) {
    return { isValid: false, error: "Full name must be at least 2 characters long.", sanitizedValue: cleaned };
  }

  if (cleaned.length > 70) {
    return { isValid: false, error: "Full name cannot exceed 70 characters.", sanitizedValue: cleaned };
  }

  // Must contain at least one letter
  if (!/\p{L}/u.test(cleaned)) {
    return { isValid: false, error: "Full name must contain letters.", sanitizedValue: cleaned };
  }

  // Whitelist: letters, spaces, hyphens, apostrophes, periods
  const validNameRegex = /^[\p{L}\s\.'\-]+$/u;
  if (!validNameRegex.test(cleaned)) {
    return {
      isValid: false,
      error: "Full name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed.",
      sanitizedValue: cleaned,
    };
  }

  // Check against dummy terms
  const lower = cleaned.toLowerCase();
  if (DUMMY_TERMS.has(lower)) {
    return { isValid: false, error: "Please enter a valid personal name, not a dummy or placeholder name.", sanitizedValue: cleaned };
  }

  // Check if every word in the name is a dummy word (e.g. "Test Test" or "Asdf Qwerty")
  const words = lower.split(/\s+/);
  if (words.length > 0 && words.every((w) => DUMMY_TERMS.has(w))) {
    return { isValid: false, error: "Please enter a valid personal name, not a dummy or placeholder name.", sanitizedValue: cleaned };
  }

  // Check for repeated single character (e.g., "aaaaa", "zzzz")
  if (/^(\p{L})\1{2,}$/u.test(cleaned.replace(/[\s\.'\-]/g, ""))) {
    return { isValid: false, error: "Please enter a real name, not repeated characters.", sanitizedValue: cleaned };
  }

  return { isValid: true, error: null, sanitizedValue: cleaned };
};

/**
 * Validate Email Address:
 * - Required where applicable.
 * - Standard RFC-compliant email structure with legitimate domain and TLD.
 * - Normalizes to lowercase and trimmed.
 * - Rejects malformed and obvious dummy domains.
 */
const validateEmail = (email) => {
  if (!email || typeof email !== "string") {
    return { isValid: false, error: "Please enter your email address.", sanitizedValue: "" };
  }

  const cleaned = sanitizeText(email).toLowerCase();
  if (cleaned.length < 5 || cleaned.length > 100) {
    return { isValid: false, error: "Please enter a valid email address.", sanitizedValue: cleaned };
  }

  // Robust standard email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleaned)) {
    return { isValid: false, error: "Please enter a valid email address (e.g. name@example.com).", sanitizedValue: cleaned };
  }

  // Reject obvious dummy emails
  const [localPart, domain] = cleaned.split("@");
  if (DUMMY_TERMS.has(localPart) && (domain === "test.com" || domain === "example.com" || domain === "fake.com" || domain === "mailinator.com")) {
    return { isValid: false, error: "Please enter an authentic personal email address.", sanitizedValue: cleaned };
  }

  return { isValid: true, error: null, sanitizedValue: cleaned };
};

/**
 * Validate Indian Mobile Number:
 * - 10-digit Indian mobile format starting with 6, 7, 8, or 9.
 * - Normalizes by stripping leading +91, 91, or 0, as well as spaces and hyphens.
 * - Rejects repeated dummy sequences (e.g. 0000000000, 1111111111, 9999999999) or invalid prefixes (0-5).
 */
const validatePhone = (phone) => {
  if (!phone || (typeof phone !== "string" && typeof phone !== "number")) {
    return { isValid: false, error: "Please enter a 10-digit mobile number.", sanitizedValue: "" };
  }

  let cleaned = String(phone).replace(/[^\d+]/g, "").trim();

  // Strip international / trunk prefixes
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(cleaned)) {
    return { isValid: false, error: "Please enter a valid 10-digit mobile number.", sanitizedValue: cleaned };
  }

  // Must start with 6, 7, 8, or 9 for Indian cellular networks
  if (!/^[6-9]/.test(cleaned)) {
    return { isValid: false, error: "Mobile number must start with 6, 7, 8, or 9.", sanitizedValue: cleaned };
  }

  // Reject all identical repeated digits (e.g., 0000000000, 1111111111, 9999999999)
  if (/^(\d)\1{9}$/.test(cleaned)) {
    return { isValid: false, error: "Please enter a valid mobile number, not repeated identical digits.", sanitizedValue: cleaned };
  }

  // Reject obvious dummy ascending/descending patterns
  if (cleaned === "1234567890" || cleaned === "0123456789") {
    return { isValid: false, error: "Please enter a real mobile number, not dummy sequential digits.", sanitizedValue: cleaned };
  }

  return { isValid: true, error: null, sanitizedValue: cleaned };
};

/**
 * Validate Indian Postal / PIN Code:
 * - 6-digit Indian PIN code format (1-9 followed by 5 digits).
 * - Normalizes by stripping spaces.
 * - Rejects dummy PIN codes (000000, 111111, 999999, 123456, 654321).
 */
const validatePinCode = (pin) => {
  if (!pin || (typeof pin !== "string" && typeof pin !== "number")) {
    return { isValid: false, error: "Please enter a 6-digit PIN code.", sanitizedValue: "" };
  }

  const cleaned = String(pin).replace(/\D/g, "").trim();

  if (cleaned.length !== 6) {
    return { isValid: false, error: "PIN code must be exactly 6 digits.", sanitizedValue: cleaned };
  }

  // Indian postal codes cannot start with 0
  if (!/^[1-9][0-9]{5}$/.test(cleaned)) {
    return { isValid: false, error: "Please enter a valid 6-digit PIN code.", sanitizedValue: cleaned };
  }

  // Reject all repeated digits
  if (/^(\d)\1{5}$/.test(cleaned)) {
    return { isValid: false, error: "Please enter a real delivery PIN code, not repeated digits.", sanitizedValue: cleaned };
  }

  // Reject dummy sequences
  if (cleaned === "123456" || cleaned === "654321") {
    return { isValid: false, error: "Please enter a valid 6-digit PIN code.", sanitizedValue: cleaned };
  }

  return { isValid: true, error: null, sanitizedValue: cleaned };
};

/**
 * Validate Address Text Field (House/Flat, Street/Area, City, State):
 */
const validateAddressLine = (value, fieldName = "Address", minLen = 2, maxLen = 150) => {
  if (!value || typeof value !== "string") {
    return { isValid: false, error: `Please enter ${fieldName}.`, sanitizedValue: "" };
  }

  const cleaned = sanitizeText(value);
  if (cleaned.length < minLen) {
    return { isValid: false, error: `${fieldName} must be at least ${minLen} characters.`, sanitizedValue: cleaned };
  }

  if (cleaned.length > maxLen) {
    return { isValid: false, error: `${fieldName} cannot exceed ${maxLen} characters.`, sanitizedValue: cleaned };
  }

  // Reject dummy placeholder values
  const lower = cleaned.toLowerCase();
  if (DUMMY_TERMS.has(lower)) {
    return { isValid: false, error: `Please enter real ${fieldName} information.`, sanitizedValue: cleaned };
  }

  // Must contain letters or numbers, not only punctuation
  if (!/[\p{L}\d]/u.test(cleaned)) {
    return { isValid: false, error: `Please enter a valid ${fieldName}.`, sanitizedValue: cleaned };
  }

  return { isValid: true, error: null, sanitizedValue: cleaned };
};

/**
 * Comprehensive Shipping Address Validator:
 * Validates fullName, phone, line1, line2, city, state, postalCode, country.
 */
const validateAddress = (address = {}) => {
  const errors = {};

  // 1. Recipient Full Name
  const nameRes = validateName(address.fullName);
  if (!nameRes.isValid) {
    errors.fullName = nameRes.error;
  }

  // 2. Mobile Phone Number
  const phoneRes = validatePhone(address.phone || address.mobileNumber);
  if (!phoneRes.isValid) {
    errors.phone = phoneRes.error;
  }

  // 3. House / Flat / Building (line1)
  const line1Res = validateAddressLine(address.line1, "House/Flat/Building details", 2, 120);
  if (!line1Res.isValid) {
    errors.line1 = line1Res.error;
  }

  // 4. Street / Area / Landmark (line2)
  let sanitizedLine2 = "";
  if (address.line2 && typeof address.line2 === "string" && address.line2.trim().length > 0) {
    const line2Res = validateAddressLine(address.line2, "Street/Area details", 2, 120);
    if (!line2Res.isValid) {
      errors.line2 = line2Res.error;
    } else {
      sanitizedLine2 = line2Res.sanitizedValue;
    }
  }

  // 5. City
  const cityRes = validateAddressLine(address.city, "City", 2, 60);
  if (!cityRes.isValid) {
    errors.city = cityRes.error;
  } else if (!/^[\p{L}\s\.\-]+$/u.test(cityRes.sanitizedValue)) {
    errors.city = "City name should contain only letters and spaces.";
  }

  // 6. State
  const stateRes = validateAddressLine(address.state, "State", 2, 60);
  if (!stateRes.isValid) {
    errors.state = stateRes.error;
  } else if (!/^[\p{L}\s\.\-]+$/u.test(stateRes.sanitizedValue)) {
    errors.state = "State name should contain only letters and spaces.";
  }

  // 7. PIN code
  const pinRes = validatePinCode(address.postalCode || address.pincode);
  if (!pinRes.isValid) {
    errors.postalCode = pinRes.error;
  }

  const sanitizedAddress = {
    fullName: nameRes.sanitizedValue,
    phone: phoneRes.sanitizedValue,
    line1: line1Res.sanitizedValue,
    line2: sanitizedLine2,
    city: cityRes.sanitizedValue,
    state: stateRes.sanitizedValue,
    postalCode: pinRes.sanitizedValue,
    country: sanitizeText(address.country) || "India",
    label: sanitizeText(address.label) || "Home",
    isDefault: Boolean(address.isDefault),
  };

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedAddress,
  };
};

module.exports = {
  stripHtml,
  sanitizeText,
  validateName,
  validateEmail,
  validatePhone,
  validatePinCode,
  validateAddressLine,
  validateAddress,
  DUMMY_TERMS,
};
