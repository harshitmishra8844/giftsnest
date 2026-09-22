/**
 * Cloudinary & CDN Image Optimization Utility
 * 
 * Automatically transforms raw Cloudinary & Unsplash URLs to:
 * - WebP / AVIF format via content negotiation (f_auto)
 * - Intelligent compression (q_auto)
 * - Dimension bounds (w_..., c_limit)
 * - Responsive srcset generation
 */

const DEFAULT_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%23f5f0eb'%3E%3Crect width='100%25' height='100%25' fill='%23f9f6f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23c8a97e' font-family='serif' font-size='16'%3ENiyora Gifts%3C/text%3E%3C/svg%3E";

/**
 * Optimizes an image URL for the requested dimensions and auto WebP/AVIF format
 * @param {string} url - Original image URL
 * @param {object} options - { width, height, quality, crop }
 * @returns {string} - Optimized URL
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!url || typeof url !== "string") return DEFAULT_PLACEHOLDER;

  const width = options.width;
  const height = options.height;
  const quality = options.quality || "auto";
  const format = options.format || "auto";

  // 1. Cloudinary Optimization
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    // Check if already contains transformation parameters
    const uploadIndex = url.indexOf("/image/upload/");
    const prefix = url.substring(0, uploadIndex + "/image/upload/".length);
    const suffix = url.substring(uploadIndex + "/image/upload/".length);

    // If suffix already has f_auto or transformations, preserve or adapt
    if (suffix.startsWith("f_auto") || suffix.startsWith("w_") || suffix.startsWith("q_")) {
      return url;
    }

    const transformations = [`f_${format}`, `q_${quality}`];
    if (width && height) {
      transformations.push(`w_${width}`, `h_${height}`, "c_fill");
    } else if (width) {
      transformations.push(`w_${width}`, "c_limit");
    } else if (height) {
      transformations.push(`h_${height}`, "c_limit");
    }

    return `${prefix}${transformations.join(",")}/${suffix}`;
  }

  // 2. Unsplash Optimization
  if (url.includes("images.unsplash.com")) {
    let cleanUrl = url.replace(/&fm=[^&]*/g, "").replace(/\?fm=[^&]*/g, "?");
    cleanUrl = cleanUrl.replace(/&auto=[^&]*/g, "").replace(/\?auto=[^&]*/g, "?");
    cleanUrl = cleanUrl.replace(/&q=[^&]*/g, "").replace(/\?q=[^&]*/g, "?");
    cleanUrl = cleanUrl.replace(/&w=[^&]*/g, "").replace(/\?w=[^&]*/g, "?");
    cleanUrl = cleanUrl.replace(/&h=[^&]*/g, "").replace(/\?h=[^&]*/g, "?");

    const joinChar = cleanUrl.includes("?") ? "&" : "?";
    let params = `auto=format&fm=webp&q=80`;
    if (width) params += `&w=${width}`;
    if (height) params += `&h=${height}`;

    cleanUrl = `${cleanUrl}${joinChar}${params}`.replace(/\?&/g, "?").replace(/\?$/g, "");
    return cleanUrl;
  }

  return url;
}

/**
 * Generate responsive srcSet for an image
 * @param {string} url 
 * @param {number[]} widths 
 * @returns {string} 
 */
export function generateSrcSet(url, widths = [320, 480, 640, 800, 1024]) {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("res.cloudinary.com") && !url.includes("images.unsplash.com")) {
    return "";
  }

  return widths
    .map((w) => `${getOptimizedImageUrl(url, { width: w })} ${w}w`)
    .join(", ");
}

export function optimizeUnsplashUrl(url, width, height) {
  return getOptimizedImageUrl(url, { width, height });
}

export { DEFAULT_PLACEHOLDER };
