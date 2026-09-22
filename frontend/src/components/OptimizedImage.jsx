import { useState } from "react";
import { getOptimizedImageUrl, generateSrcSet, DEFAULT_PLACEHOLDER } from "../utils/imageOptimizer";

/**
 * High-Performance Image Component
 * 
 * Features:
 * - Automatically injects WebP/AVIF transformations on Cloudinary & Unsplash
 * - Automatic responsive srcSet generation
 * - Native lazy loading with async decoding
 * - High-priority preloading support for hero images
 * - Smooth fade-in without layout shift (CLS = 0)
 * - Safe error fallback
 */
const OptimizedImage = ({
  src,
  alt = "Product Image",
  width,
  height,
  className = "",
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  objectFit = "cover",
  style = {},
  onClick,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const optimizedSrc = hasError 
    ? DEFAULT_PLACEHOLDER 
    : getOptimizedImageUrl(src, { width, height });

  const srcSet = !hasError && !priority
    ? generateSrcSet(src)
    : undefined;

  return (
    <div
      className={`relative overflow-hidden bg-gold-50/20 ${className}`}
      style={{
        aspectRatio: width && height ? `${width} / ${height}` : undefined,
        ...style
      }}
      onClick={onClick}
    >
      <img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full transition-opacity duration-300 ease-in-out ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        style={{
          objectFit,
        }}
        {...props}
      />
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-gold-100/30 animate-pulse pointer-events-none" 
          aria-hidden="true" 
        />
      )}
    </div>
  );
};

export default OptimizedImage;
