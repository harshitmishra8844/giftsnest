import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";
import { OCCASIONS, RELATIONS, PERSONALIZED, TRENDING } from "./MegaMenu";
import {
  X,
  User,
  ShoppingBag,
  Heart,
  CreditCard,
  Bell,
  RotateCcw,
  Headphones,
  Compass,
  Phone,
  LogOut,
  ChevronDown,
  Sparkles,
  Gift,
  Users,
  Flame,
  ArrowRight,
  ShieldCheck,
  Truck
} from "lucide-react";

const MobileMenuDrawer = ({ isOpen, onClose, onOpenCallbackModal }) => {
  const { auth, isAuthenticated, logout } = useAuth();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  // Accordion open states
  const [openSection, setOpenSection] = useState("occasions");

  const toggleSection = (sec) => {
    setOpenSection((prev) => (prev === sec ? null : sec));
  };

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate("/");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-luxury-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative z-10 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col h-full overflow-hidden animate-slide-in-right">
        
        {/* Top Header & User Profile Bar */}
        <div className="bg-gradient-to-br from-luxury-black via-[#161311] to-[#221c17] text-white p-5 shrink-0 border-b border-gold-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-serif tracking-[0.25em] uppercase text-gold-400 font-bold">
              Niyora Gifts
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="rounded-full p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-base font-serif font-bold text-white shadow-sm border border-gold-300/40">
                {auth?.name ? auth.name[0].toUpperCase() : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-serif font-bold text-white">
                  {auth?.name || "Customer"}
                </p>
                <p className="truncate text-[11px] text-gray-300 font-light">
                  {auth?.email || ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-serif font-bold text-white">
                  Welcome to Niyora Gifts
                </p>
                <p className="text-[11px] text-gray-300 font-light">
                  Sign in to explore your orders & member rewards.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleNavigate("/login")}
                className="w-full py-2 px-4 rounded-full bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <span>Sign In / Register</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-champagne/30 text-xs text-luxury-black">
          
          {/* Quick Shortcuts Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-gold-50/20">
            <button
              type="button"
              onClick={() => handleNavigate("/my-profile?tab=orders")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white border border-champagne/50 hover:border-gold-300 transition text-center"
            >
              <ShoppingBag className="h-4 w-4 text-gold-600" />
              <span className="text-[10px] font-semibold text-luxury-black">Orders</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("/wishlist")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white border border-champagne/50 hover:border-gold-300 transition text-center relative"
            >
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-[10px] font-semibold text-luxury-black">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-2 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gold-500 px-1 text-[8px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("/track-order")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white border border-champagne/50 hover:border-gold-300 transition text-center"
            >
              <Compass className="h-4 w-4 text-gold-600" />
              <span className="text-[10px] font-semibold text-luxury-black">Track</span>
            </button>
          </div>

          {/* ACCORDION CATEGORIES */}
          <div className="py-2">
            
            {/* 1. Shop by Occasion */}
            <div className="border-b border-champagne/20">
              <button
                type="button"
                onClick={() => toggleSection("occasions")}
                className="w-full flex items-center justify-between px-5 py-3 font-semibold uppercase tracking-wider text-[11px] text-luxury-black hover:bg-gold-50/50"
              >
                <span className="flex items-center gap-2">
                  <Gift className="h-3.5 w-3.5 text-gold-500" />
                  <span>Shop by Occasion</span>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${
                  openSection === "occasions" ? "rotate-180" : ""
                }`} />
              </button>
              {openSection === "occasions" && (
                <div className="bg-gold-50/20 px-5 py-2 space-y-1">
                  {OCCASIONS.map((occ) => (
                    <button
                      key={occ.name}
                      type="button"
                      onClick={() => handleNavigate(`/products?category=${encodeURIComponent(occ.category)}`)}
                      className="w-full text-left py-1.5 text-xs text-text-secondary hover:text-gold-600 transition flex items-center justify-between"
                    >
                      <span>{occ.name}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Shop by Relation */}
            <div className="border-b border-champagne/20">
              <button
                type="button"
                onClick={() => toggleSection("relations")}
                className="w-full flex items-center justify-between px-5 py-3 font-semibold uppercase tracking-wider text-[11px] text-luxury-black hover:bg-gold-50/50"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-gold-500" />
                  <span>Shop by Relation</span>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${
                  openSection === "relations" ? "rotate-180" : ""
                }`} />
              </button>
              {openSection === "relations" && (
                <div className="bg-gold-50/20 px-5 py-2 space-y-1">
                  {RELATIONS.map((rel) => (
                    <button
                      key={rel.name}
                      type="button"
                      onClick={() => handleNavigate(`/products?category=${encodeURIComponent(rel.category)}`)}
                      className="w-full text-left py-1.5 text-xs text-text-secondary hover:text-gold-600 transition flex items-center justify-between"
                    >
                      <span>{rel.name}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Personalized Gifts */}
            <div className="border-b border-champagne/20">
              <button
                type="button"
                onClick={() => toggleSection("personalized")}
                className="w-full flex items-center justify-between px-5 py-3 font-semibold uppercase tracking-wider text-[11px] text-luxury-black hover:bg-gold-50/50"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-gold-500" />
                  <span>Personalized Gifts</span>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${
                  openSection === "personalized" ? "rotate-180" : ""
                }`} />
              </button>
              {openSection === "personalized" && (
                <div className="bg-gold-50/20 px-5 py-2 space-y-1">
                  {PERSONALIZED.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleNavigate(`/products?category=${encodeURIComponent(item.category)}`)}
                      className="w-full text-left py-1.5 text-xs text-text-secondary hover:text-gold-600 transition flex items-center justify-between"
                    >
                      <span>{item.name}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Trending Gifts */}
            <div className="border-b border-champagne/20">
              <button
                type="button"
                onClick={() => toggleSection("trending")}
                className="w-full flex items-center justify-between px-5 py-3 font-semibold uppercase tracking-wider text-[11px] text-luxury-black hover:bg-gold-50/50"
              >
                <span className="flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  <span>Trending & Bestsellers</span>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${
                  openSection === "trending" ? "rotate-180" : ""
                }`} />
              </button>
              {openSection === "trending" && (
                <div className="bg-gold-50/20 px-5 py-2 space-y-1">
                  {TRENDING.map((trend) => (
                    <button
                      key={trend.name}
                      type="button"
                      onClick={() => handleNavigate(`/products?${trend.query}`)}
                      className="w-full text-left py-1.5 text-xs text-text-secondary hover:text-gold-600 transition flex items-center justify-between"
                    >
                      <span>{trend.name}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Support & Concierge Section */}
          <div className="p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gold-600 mb-2">
              Customer Concierge
            </p>

            {onOpenCallbackModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCallbackModal();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gold-50 border border-gold-200 text-gold-800 font-semibold transition hover:bg-gold-100"
              >
                <span className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-gold-600" />
                  <span>Request Instant Callback</span>
                </span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleNavigate("/shipping-policy")}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-gold-600 transition text-left"
            >
              <Truck className="h-3.5 w-3.5 text-gold-500" />
              <span>Delivery & Shipping Rates</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate("/returns-refunds")}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-gold-600 transition text-left"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-gold-500" />
              <span>Returns & Replacement Policy</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate("/about")}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-gold-600 transition text-left"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold-500" />
              <span>About Niyora Gifts</span>
            </button>
          </div>

          {/* User Account / Sign Out Section */}
          {isAuthenticated && (
            <div className="p-4">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-red-600 hover:bg-red-50 font-semibold border border-red-200/50 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer Brand Credit */}
        <div className="p-3 bg-gray-50 border-t border-champagne/40 text-center text-[10px] text-text-secondary font-light">
          Crafted with care for unforgettable gifting moments.
        </div>

      </div>
    </div>
  );
};

export default MobileMenuDrawer;
