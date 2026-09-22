import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  ShoppingBag,
  MapPin,
  Tag,
  PhoneCall,
  Headphones,
  CreditCard,
  RotateCcw,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  Compass,
  ArrowRight
} from "lucide-react";

const AccountDropdown = ({ onOpenCallbackModal }) => {
  const { auth, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Close when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate("/");
  };

  const handleCallbackClick = () => {
    setIsOpen(false);
    if (onOpenCallbackModal) {
      onOpenCallbackModal();
    } else {
      navigate(isAuthenticated ? "/my-profile?tab=callbacks" : "/contact");
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Account menu"
        className="group flex items-center gap-2 rounded-full border border-champagne/60 bg-white hover:bg-gold-50/60 px-3 py-1.5 text-xs font-semibold text-luxury-black transition hover:border-gold-300 hover:shadow-xs cursor-pointer"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-[11px] font-bold text-white shadow-xs">
          {isAuthenticated ? getInitials(auth?.name) : <User className="h-3.5 w-3.5" />}
        </div>
        <div className="hidden lg:flex flex-col items-start text-left leading-tight">
          <span className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">
            {isAuthenticated ? "My Account" : "Welcome"}
          </span>
          <span className="text-xs font-serif font-bold text-luxury-black truncate max-w-[90px]">
            {isAuthenticated ? (auth?.name?.split(" ")[0] || "Account") : "Sign In"}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* POPOVER CARD */}
      {isOpen && (
        <div
          style={{ backgroundColor: "#ffffff" }}
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-champagne/80 shadow-[0_15px_40px_rgba(0,0,0,0.18)] z-50 p-4 animate-scale-up-sm"
        >
          {isAuthenticated ? (
            /* Logged In State */
            <div className="space-y-3">
              {/* Profile Card Summary */}
              <div className="flex items-center gap-3 border-b border-champagne/40 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-gold-700 text-sm font-bold text-white shadow-sm font-serif">
                  {getInitials(auth?.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold font-serif text-luxury-black">
                      {auth?.name || "Customer"}
                    </p>
                    <span className="shrink-0 rounded-full bg-gold-50 px-1.5 py-0.5 text-[9px] font-extrabold text-gold-700 border border-gold-200">
                      MEMBER
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-text-secondary font-light">
                    {auth?.email || ""}
                  </p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-0.5 text-xs text-luxury-black font-medium">
                <Link
                  to="/my-profile?tab=orders"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <ShoppingBag className="h-4 w-4 text-gold-600" />
                  <span>My Orders</span>
                </Link>

                <Link
                  to="/my-profile?tab=addresses"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <MapPin className="h-4 w-4 text-gold-600" />
                  <span>My Addresses</span>
                </Link>

                <Link
                  to="/my-profile?tab=coupons"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <Tag className="h-4 w-4 text-gold-600" />
                  <span>Coupons & Offers</span>
                </Link>

                <Link
                  to="/my-profile?tab=store-credit"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <CreditCard className="h-4 w-4 text-gold-600" />
                  <span>Store Credit & Rewards</span>
                </Link>

                {/* Call Back Action */}
                <button
                  type="button"
                  onClick={handleCallbackClick}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-gold-50/70 hover:text-gold-700 transition text-left cursor-pointer"
                >
                  <PhoneCall className="h-4 w-4 text-gold-600" />
                  <span>Request Call Back</span>
                </button>

                <Link
                  to="/my-profile?tab=help"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <Headphones className="h-4 w-4 text-gold-600" />
                  <span>Support & Help Desk</span>
                </Link>

                <Link
                  to="/my-profile?tab=returns"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <RotateCcw className="h-4 w-4 text-gold-600" />
                  <span>Returns & Refunds</span>
                </Link>

                <Link
                  to="/my-profile?tab=settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <Settings className="h-4 w-4 text-gold-600" />
                  <span>Account Settings</span>
                </Link>
              </nav>

              {/* Sign Out Button */}
              <div className="border-t border-champagne/40 pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Unauthenticated State */
            <div className="space-y-4">
              <div className="space-y-1 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold-50 text-gold-600 border border-gold-200/50">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-serif font-bold text-luxury-black mt-2">
                  Welcome to Niyora Gifts
                </h4>
                <p className="text-[11px] text-text-secondary font-light">
                  Sign in to track orders, manage addresses & earn rewards.
                </p>
              </div>

              <div className="space-y-2">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:from-gold-600 hover:to-gold-700 hover:shadow-md transition"
                >
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-gold-300 bg-white hover:bg-gold-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-luxury-black transition"
                >
                  <span>Create Account</span>
                </Link>
              </div>

              <div className="border-t border-champagne/40 pt-2.5 space-y-1 text-xs">
                <Link
                  to="/track-order"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-luxury-black hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <Compass className="h-4 w-4 text-gold-600" />
                  <span>Track Your Order</span>
                </Link>

                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-luxury-black hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <MapPin className="h-4 w-4 text-gold-600" />
                  <span>My Addresses</span>
                </Link>

                <Link
                  to="/products"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-luxury-black hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <Tag className="h-4 w-4 text-gold-600" />
                  <span>Coupons & Offers</span>
                </Link>

                <button
                  type="button"
                  onClick={handleCallbackClick}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-luxury-black hover:bg-gold-50/70 hover:text-gold-700 transition text-left cursor-pointer"
                >
                  <PhoneCall className="h-4 w-4 text-gold-600" />
                  <span>Request Call Back</span>
                </button>

                <Link
                  to="/contact"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-luxury-black hover:bg-gold-50/70 hover:text-gold-700 transition"
                >
                  <Headphones className="h-4 w-4 text-gold-600" />
                  <span>Support & Help</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountDropdown;
