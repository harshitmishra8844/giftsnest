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

  const allowedFrontendUrl = process.env.FRONTEND_URL || "";

  const isAllowed = (urlStr) => {
    if (!urlStr) return false;
    if (
      urlStr.includes("localhost") ||
      urlStr.includes("127.0.0.1") ||
      urlStr.includes("[::1]")
    ) {
      return true;
    }
    if (allowedFrontendUrl && urlStr.startsWith(allowedFrontendUrl)) {
      return true;
    }
    return false;
  };

  if (origin && !isAllowed(origin)) {
    return res.status(403).json({ message: "CSRF protection: Invalid request origin." });
  }

  if (!origin && referer && !isAllowed(referer)) {
    return res.status(403).json({ message: "CSRF protection: Invalid request referer." });
  }

  next();
};

const loginLimiterMap = {};
const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress || "127.0.0.1";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  if (!loginLimiterMap[ip]) {
    loginLimiterMap[ip] = [];
  }

  loginLimiterMap[ip] = loginLimiterMap[ip].filter((t) => now - t < windowMs);

  if (loginLimiterMap[ip].length >= maxAttempts) {
    return res.status(429).json({
      message: "Too many failed login attempts from this IP. Please try again after 15 minutes.",
    });
  }

  const originalJson = res.json;
  res.json = function (data) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      loginLimiterMap[ip].push(Date.now());
    }
    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  securityHeaders,
  csrfProtection,
  loginRateLimiter,
};
