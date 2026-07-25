const securityHeaders = (req, res, next) => {
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
};

const csrfProtection = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const path = req.baseUrl + req.path;
  const isApi = path.startsWith("/api");
  if (!isApi) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  const isAllowed = (urlStr) => {
    if (!urlStr) return false;
    
    // Normalize domain string by removing protocols, www., ports, and paths
    const normalize = (str) => {
      let cleaned = str.trim().toLowerCase();
      cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, "");
      cleaned = cleaned.split(":")[0];
      cleaned = cleaned.split("/")[0];
      return cleaned;
    };

    const requestDomain = normalize(urlStr);

    if (
      requestDomain === "localhost" ||
      requestDomain === "127.0.0.1" ||
      requestDomain === "[::1]"
    ) {
      return true;
    }
    
    // Support multiple comma-separated frontend URLs
    const allowedUrls = (process.env.FRONTEND_URL || "")
      .split(",")
      .map(url => url.trim())
      .filter(Boolean);

    for (const allowedUrl of allowedUrls) {
      const allowedDomain = normalize(allowedUrl);
      if (requestDomain === allowedDomain || requestDomain.endsWith("." + allowedDomain)) {
        return true;
      }
    }
    return false;
  };

  if (origin && !isAllowed(origin)) {
    console.warn(`[CSRF Block] Origin "${origin}" is not allowed. Allowed: ${process.env.FRONTEND_URL || 'none'}`);
    return res.status(403).json({ message: "CSRF protection: Invalid request origin." });
  }

  if (!origin && referer && !isAllowed(referer)) {
    console.warn(`[CSRF Block] Referer "${referer}" is not allowed. Allowed: ${process.env.FRONTEND_URL || 'none'}`);
    return res.status(403).json({ message: "CSRF protection: Invalid request referer." });
  }

  next();
};

const loginLimiterMap = {};
const loginRateLimiter = (req, res, next) => {
  const rawIp = req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "127.0.0.1";
  const ip = String(rawIp).split(",")[0].trim();
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxAttempts = 15; // 15 attempts

  if (!loginLimiterMap[ip]) {
    loginLimiterMap[ip] = [];
  }

  loginLimiterMap[ip] = loginLimiterMap[ip].filter((t) => now - t < windowMs);

  if (loginLimiterMap[ip].length >= maxAttempts) {
    return res.status(401).json({ message: "Incorrect email or password" });
  }

  loginLimiterMap[ip].push(now);
  next();
};

module.exports = {
  securityHeaders,
  csrfProtection,
  loginRateLimiter,
};
