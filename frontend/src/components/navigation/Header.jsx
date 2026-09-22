import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import AnnouncementBar from "./AnnouncementBar";
import MegaMenu from "./MegaMenu";
import AccountDropdown from "./AccountDropdown";
import MobileMenuDrawer from "./MobileMenuDrawer";
import SearchBar from "../search/SearchBar";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import {
  Menu,
  Search,
  Heart,
  ShoppingBag,
  Bell,
  Sparkles,
  X,
  Compass
} from "lucide-react";

const Header = ({
  products = [],
  trendingSearches = [],
  onSearch,
  cmsShell,
  onOpenCallbackModal,
  mobileDrawerOpen: extDrawerOpen,
  setMobileDrawerOpen: extSetDrawerOpen,
  mobileSearchOpen: extSearchOpen,
  setMobileSearchOpen: extSetSearchOpen,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { auth, isAuthenticated } = useAuth();

  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const mobileDrawerOpen = extDrawerOpen !== undefined ? extDrawerOpen : internalDrawerOpen;
  const setMobileDrawerOpen = extSetDrawerOpen || setInternalDrawerOpen;
  const mobileSearchOpen = extSearchOpen !== undefined ? extSearchOpen : internalSearchOpen;
  const setMobileSearchOpen = extSetSearchOpen || setInternalSearchOpen;

  // Close drawer & search on route changes
  useEffect(() => {
    setMobileDrawerOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  // Fetch customer notification count when logged in
  useEffect(() => {
    let isMounted = true;
    const fetchUnreadCount = async () => {
      if (!auth?.token || auth?.isAdmin) return;
      try {
        const { data } = await api.get("/notifications/customer", {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        if (isMounted && data?.unreadCount !== undefined) {
          setNotificationCount(Number(data.unreadCount));
        }
      } catch {
        // Silently ignore if offline
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [auth?.token, auth?.isAdmin]);

  const handleMobileSearchSubmit = (query) => {
    setMobileSearchOpen(false);
    if (onSearch) onSearch(query);
  };

  return (
    <>
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <AnnouncementBar cmsAnnouncement={cmsShell?.announcements} />

      {/* 2. MAIN HEADER (Sticky Desktop & Mobile) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-champagne/50 shadow-[0_2px_15px_rgba(0,0,0,0.03)] transition-all duration-300">
        
        {/* Main Header Container */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center justify-between gap-3 md:gap-6 lg:gap-8">
            
            {/* === LEFT: BRAND LOGO AREA === */}
            <div className="flex items-center gap-3 shrink-0">
              
              {/* Mobile Drawer Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Open mobile navigation"
                className="md:hidden flex items-center justify-center p-2 rounded-xl text-luxury-black hover:bg-gold-50/70 border border-champagne/40 transition cursor-pointer"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Logo Link */}
              <Link to="/" className="group flex items-center gap-2.5">
                {cmsShell?.header?.logoImage ? (
                  <img
                    src={cmsShell.header.logoImage}
                    alt={cmsShell?.header?.logoText || "Niyora Gifts"}
                    className="h-9 w-9 object-contain transition-transform group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 text-sm font-serif font-bold text-white shadow-sm border border-gold-300/30 transition group-hover:scale-105">
                    {cmsShell?.header?.logoText?.[0] || "N"}
                  </span>
                )}
                <div className="flex flex-col">
                  <span className="text-xl md:text-2xl font-serif font-bold tracking-tight text-luxury-black group-hover:text-gold-600 transition">
                    {cmsShell?.header?.logoText || "Niyora Gifts"}
                  </span>
                  <span className="hidden sm:block text-[8px] font-extrabold uppercase tracking-[0.3em] text-gold-600 leading-none">
                    Luxury Curated Gifting
                  </span>
                </div>
              </Link>
            </div>

            {/* === CENTER: LARGE INTELLIGENT SEARCH BAR (Desktop) === */}
            <div className="hidden md:block flex-1 max-w-xl lg:max-w-2xl mx-auto px-2">
              <SearchBar
                products={products}
                trendingSearches={trendingSearches}
                onSearch={onSearch}
                placeholder={cmsShell?.header?.searchPlaceholder || "Search for luxury gifts, cakes, flowers, occasions..."}
              />
            </div>

            {/* === RIGHT: ACTION ICONS (Desktop & Mobile) === */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* Mobile Search Toggle Icon */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                aria-label="Toggle search"
                className="md:hidden flex items-center justify-center p-2 rounded-xl text-luxury-black hover:bg-gold-50/70 border border-champagne/40 transition cursor-pointer"
              >
                {mobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </button>

              {/* Account Dropdown Popover (Desktop) */}
              <div className="hidden md:block">
                <AccountDropdown onOpenCallbackModal={onOpenCallbackModal} />
              </div>

              {/* Notifications Icon (Desktop) */}
              {isAuthenticated && (
                <Link
                  to="/my-profile?tab=notifications"
                  aria-label={`Notifications (${notificationCount} unread)`}
                  title={`Notifications (${notificationCount} unread)`}
                  className="hidden sm:flex relative items-center justify-center p-2 rounded-full border border-champagne/60 bg-white hover:bg-gold-50/60 text-luxury-black hover:text-gold-600 transition hover:shadow-xs"
                >
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <span
                      key={`bell-count-${notificationCount}`}
                      className="cart-badge-bump absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[9px] font-bold text-white shadow-xs"
                    >
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Wishlist Button (Desktop & Mobile) */}
              <Link
                to="/wishlist"
                aria-label={`Wishlist (${wishlistCount})`}
                title={`Wishlist (${wishlistCount})`}
                className="relative flex items-center justify-center p-2 rounded-full border border-champagne/60 bg-white hover:bg-gold-50/60 text-luxury-black hover:text-gold-600 transition hover:shadow-xs"
              >
                <Heart className={`h-4 w-4 ${wishlistCount > 0 ? "text-red-500 fill-red-500" : ""}`} />
                {wishlistCount > 0 && (
                  <span
                    key={`header-wishlist-count-${wishlistCount}`}
                    className="cart-badge-bump absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[9px] font-bold text-white shadow-xs"
                  >
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart Button (Desktop & Mobile) */}
              <Link
                to="/cart"
                aria-label={`Shopping Bag (${itemCount} items)`}
                title={`Shopping Bag (${itemCount} items)`}
                className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-luxury-black to-[#1a1714] hover:from-gold-600 hover:to-gold-700 text-white px-3.5 py-1.5 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02]"
              >
                <div className="relative flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-gold-300 group-hover:text-white transition" />
                  {itemCount > 0 && (
                    <span
                      key={`header-cart-count-${itemCount}`}
                      className="cart-badge-bump absolute -top-2.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[9px] font-extrabold text-white shadow-xs border border-white/20"
                    >
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider">
                  Bag
                </span>
              </Link>

            </div>
          </div>

          {/* Mobile Search Bar Dropdown (When Expanded) */}
          {mobileSearchOpen && (
            <div className="md:hidden mt-3 pt-2 border-t border-champagne/40 animate-scale-up-sm">
              <SearchBar
                products={products}
                trendingSearches={trendingSearches}
                onSearch={handleMobileSearchSubmit}
                placeholder={cmsShell?.header?.searchPlaceholder || "Search gifts, flowers, cakes..."}
              />
            </div>
          )}

        </div>

        {/* 3. MEGA MENU SECONDARY BAR (Desktop) */}
        <MegaMenu />

      </header>

      {/* 4. MOBILE MENU OFF-CANVAS DRAWER */}
      <MobileMenuDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpenCallbackModal={onOpenCallbackModal}
      />
    </>
  );
};

export default Header;
