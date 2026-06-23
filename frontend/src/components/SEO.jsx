import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function SEO({ title, description, canonical, type = "website", image }) {
  const location = useLocation();

  useEffect(() => {
    // 1. Title
    if (title) {
      document.title = title;
    }

    // Helper to get or create element
    const getOrCreateMeta = (attribute, value, attributeName = "name") => {
      let element = document.querySelector(`meta[${attributeName}="${value}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attributeName, value);
        document.head.appendChild(element);
      }
      return element;
    };

    // 2. Meta Description
    if (description) {
      const descMeta = getOrCreateMeta("name", "description");
      descMeta.setAttribute("content", description);
    }

    // 3. Open Graph Metadata
    if (title) {
      const ogTitle = getOrCreateMeta("property", "og:title", "property");
      ogTitle.setAttribute("content", title);
    }
    if (description) {
      const ogDesc = getOrCreateMeta("property", "og:description", "property");
      ogDesc.setAttribute("content", description);
    }
    const ogType = getOrCreateMeta("property", "og:type", "property");
    ogType.setAttribute("content", type);

    const ogUrl = getOrCreateMeta("property", "og:url", "property");
    ogUrl.setAttribute("content", window.location.href);

    if (image) {
      const ogImage = getOrCreateMeta("property", "og:image", "property");
      ogImage.setAttribute("content", image);
    }

    // 4. Twitter Card Metadata
    const twitterCard = getOrCreateMeta("name", "twitter:card");
    twitterCard.setAttribute("content", "summary_large_image");

    if (title) {
      const twitterTitle = getOrCreateMeta("name", "twitter:title");
      twitterTitle.setAttribute("content", title);
    }
    if (description) {
      const twitterDesc = getOrCreateMeta("name", "twitter:description");
      twitterDesc.setAttribute("content", description);
    }
    if (image) {
      const twitterImage = getOrCreateMeta("name", "twitter:image");
      twitterImage.setAttribute("content", image);
    }

    // 5. Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonical || window.location.href);

  }, [title, description, canonical, type, image, location.pathname]);

  return null;
}
