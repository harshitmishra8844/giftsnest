import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Truck, Sparkles, Gift, X, ChevronRight } from "lucide-react";

const ANNOUNCEMENT_STORAGE_KEY = "niyora_announcement_dismissed";

const DEFAULT_ANNOUNCEMENTS = [
  {
    icon: Truck,
    text: "Free Express Shipping Across India on Orders Above ₹999",
    highlight: "FREE SHIP",
    link: "/products",
    linkText: "Shop Catalog"
  },
  {
    icon: Sparkles,
    text: "Same Day & Slot-Based Midnight Delivery Available in Select Metros",
    highlight: "SAME DAY",
    link: "/shipping-policy",
    linkText: "Delivery Info"
  },
  {
    icon: Gift,
    text: "Special Festive Offer: Flat 15% OFF on Curated Gift Combos",
    highlight: "CODE: LUXURY15",
    link: "/products?category=Personalized",
    linkText: "Claim Offer"
  }
];

const AnnouncementBar = ({ cmsAnnouncement }) => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotate through announcements every 4.5 seconds
  useEffect(() => {
    if (dismissed || cmsAnnouncement?.active) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DEFAULT_ANNOUNCEMENTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [dismissed, cmsAnnouncement]);

  const handleDismiss = () => {
    sessionStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  // If CMS announcement is active, prioritize it
  if (cmsAnnouncement?.active) {
    return (
      <aside 
        aria-label="Promotional Announcement"
        style={{
          backgroundColor: cmsAnnouncement.bgColor || "#B28A30",
          color: cmsAnnouncement.textColor || "#ffffff"
        }}
        className="relative z-30 px-4 py-2 text-center text-xs font-medium tracking-wide shadow-xs transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 pr-8">
          <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90 animate-pulse" />
          {cmsAnnouncement.link ? (
            <Link to={cmsAnnouncement.link} className="hover:underline flex items-center gap-1 font-semibold">
              <span>{cmsAnnouncement.text}</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          ) : (
            <span>{cmsAnnouncement.text}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/80 hover:text-white hover:bg-black/10 transition cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </aside>
    );
  }

  const current = DEFAULT_ANNOUNCEMENTS[currentIndex];
  const IconComponent = current.icon;

  return (
    <aside 
      aria-label="Promotional Announcement"
      className="relative z-30 bg-gradient-to-r from-luxury-black via-[#1a1714] to-luxury-black text-gold-200 border-b border-gold-900/30 px-4 py-1.5 text-xs shadow-xs transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5 sm:gap-3 text-center pr-8 sm:pr-0">
        <div className="hidden sm:inline-flex items-center justify-center h-4 w-4 rounded-full bg-gold-500/20 text-gold-400 shrink-0">
          <IconComponent className="h-2.5 w-2.5" />
        </div>

        <span className="inline-block rounded-sm bg-gold-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-gold-300 border border-gold-400/25 shrink-0">
          {current.highlight}
        </span>

        <p className="text-[11px] sm:text-xs text-gray-200 font-light truncate max-w-[280px] sm:max-w-none">
          {current.text}
        </p>

        {current.link && (
          <Link
            to={current.link}
            className="hidden md:inline-flex items-center gap-0.5 text-[11px] font-bold text-gold-400 hover:text-gold-300 underline underline-offset-2 ml-1 transition"
          >
            <span>{current.linkText}</span>
            <ChevronRight className="h-2.5 w-2.5" />
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
};

export default AnnouncementBar;
