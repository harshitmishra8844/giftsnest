import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Truck, Sparkles, Gift, X, ChevronRight, 
  Clock, Tag, Heart, ShieldCheck, Megaphone 
} from "lucide-react";

const ANNOUNCEMENT_STORAGE_KEY = "niyora_announcement_dismissed";

const ICON_MAP = {
  Truck,
  Sparkles,
  Gift,
  Clock,
  Tag,
  Heart,
  ShieldCheck,
  Megaphone
};

export const DEFAULT_ANNOUNCEMENTS = [
  {
    id: "default-1",
    icon: "Truck",
    text: "Free Express Shipping Across India on Orders Above ₹999",
    highlight: "FREE SHIP",
    link: "/products",
    linkText: "Shop Catalog",
    active: true
  },
  {
    id: "default-2",
    icon: "Sparkles",
    text: "Same Day & Slot-Based Midnight Delivery Available in Select Metros",
    highlight: "SAME DAY",
    link: "/shipping-policy",
    linkText: "Delivery Info",
    active: true
  },
  {
    id: "default-3",
    icon: "Gift",
    text: "Special Festive Offer: Flat 15% OFF on Curated Gift Combos",
    highlight: "CODE: LUXURY15",
    link: "/products?category=Personalized",
    linkText: "Claim Offer",
    active: true
  }
];

const resolveIcon = (iconName) => {
  if (!iconName) return Sparkles;
  if (typeof iconName !== "string") return iconName;
  return ICON_MAP[iconName] || Sparkles;
};

const AnnouncementBar = ({ cmsAnnouncement }) => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  // If admin explicitly disabled the announcement bar in CMS, do not render
  const isMasterActive = cmsAnnouncement ? cmsAnnouncement.active !== false : true;

  // Extract valid announcements from CMS or fall back to defaults
  const announcements = useMemo(() => {
    if (!isMasterActive) return [];

    if (Array.isArray(cmsAnnouncement?.items) && cmsAnnouncement.items.length > 0) {
      const activeList = cmsAnnouncement.items.filter(
        (item) => item && item.active !== false && item.text && item.text.trim()
      );
      if (activeList.length > 0) return activeList;
    }

    // Support legacy single-text CMS announcement format
    if (cmsAnnouncement?.text && cmsAnnouncement.text.trim()) {
      return [
        {
          id: "cms-single",
          icon: cmsAnnouncement.icon || "Sparkles",
          text: cmsAnnouncement.text,
          highlight: cmsAnnouncement.highlight || "PROMO",
          link: cmsAnnouncement.link || "",
          linkText: cmsAnnouncement.linkText || "View Details",
          active: true
        }
      ];
    }

    return DEFAULT_ANNOUNCEMENTS;
  }, [cmsAnnouncement, isMasterActive]);

  // Rotation speed in milliseconds (default: 4.5s)
  const rotationMs = useMemo(() => {
    const sec = Number(cmsAnnouncement?.rotationSpeed);
    if (!isNaN(sec) && sec >= 2) return sec * 1000;
    return 4500;
  }, [cmsAnnouncement?.rotationSpeed]);

  // Rotate through announcements
  useEffect(() => {
    if (dismissed || announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, rotationMs);
    return () => clearInterval(interval);
  }, [dismissed, announcements.length, rotationMs]);

  // Reset index if announcements list changes
  useEffect(() => {
    if (currentIndex >= announcements.length) {
      setCurrentIndex(0);
    }
  }, [announcements.length, currentIndex]);

  const handleDismiss = () => {
    sessionStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, "true");
    setDismissed(true);
  };

  if (dismissed || !isMasterActive || announcements.length === 0) {
    return null;
  }

  const current = announcements[currentIndex % announcements.length];
  if (!current) return null;

  const IconComponent = resolveIcon(current.icon);
  const isDismissible = cmsAnnouncement?.dismissible !== false;

  // Colors configured by Admin Dashboard
  const customBg = cmsAnnouncement?.bgColor;
  const customText = cmsAnnouncement?.textColor;
  const customHighlightBg = cmsAnnouncement?.highlightBg;
  const customHighlightText = cmsAnnouncement?.highlightTextColor;

  return (
    <aside 
      aria-label="Promotional Announcement"
      style={{
        backgroundColor: customBg || undefined,
        color: customText || undefined
      }}
      className={`relative z-30 ${
        !customBg ? "bg-gradient-to-r from-luxury-black via-[#1a1714] to-luxury-black text-gold-200" : ""
      } border-b border-gold-900/30 px-4 py-1.5 text-xs shadow-xs transition-all duration-300`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5 sm:gap-3 text-center pr-8 sm:pr-0">
        <div 
          className="hidden sm:inline-flex items-center justify-center h-4 w-4 rounded-full bg-gold-500/20 text-gold-400 shrink-0"
          style={{
            backgroundColor: customHighlightBg ? `${customHighlightBg}33` : undefined,
            color: customHighlightText || undefined
          }}
        >
          <IconComponent className="h-2.5 w-2.5" />
        </div>

        {current.highlight && (
          <span 
            className="inline-block rounded-sm bg-gold-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-gold-300 border border-gold-400/25 shrink-0"
            style={{
              backgroundColor: customHighlightBg || undefined,
              color: customHighlightText || undefined,
              borderColor: customHighlightText ? `${customHighlightText}40` : undefined
            }}
          >
            {current.highlight}
          </span>
        )}

        <p 
          className="text-[11px] sm:text-xs font-light truncate max-w-[280px] sm:max-w-none"
          style={{ color: customText || undefined }}
        >
          {current.text}
        </p>

        {current.link && (
          <Link
            to={current.link}
            className="hidden md:inline-flex items-center gap-0.5 text-[11px] font-bold text-gold-400 hover:text-gold-300 underline underline-offset-2 ml-1 transition"
            style={{ color: customHighlightText || undefined }}
          >
            <span>{current.linkText || "Learn More"}</span>
            <ChevronRight className="h-2.5 w-2.5" />
          </Link>
        )}

        {/* Multi-item indicator dots */}
        {announcements.length > 1 && (
          <div className="hidden lg:flex items-center gap-1 ml-2">
            {announcements.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentIndex(dotIdx)}
                aria-label={`Jump to announcement ${dotIdx + 1}`}
                className={`h-1 rounded-full transition-all cursor-pointer ${
                  dotIdx === currentIndex ? "w-3 bg-gold-400" : "w-1 bg-white/30 hover:bg-white/60"
                }`}
                style={{
                  backgroundColor: dotIdx === currentIndex ? (customHighlightText || undefined) : undefined
                }}
              />
            ))}
          </div>
        )}
      </div>

      {isDismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </aside>
  );
};

export default AnnouncementBar;
