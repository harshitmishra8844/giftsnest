import { NavLink, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext";
import {
  Home,
  Gift,
  Search,
  Heart,
  ShoppingBag,
  User
} from "lucide-react";

const MobileBottomNav = ({ onOpenCategories, onOpenSearch }) => {
  const location = useLocation();
  const { itemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { isAuthenticated } = useAuth();

  // Hide on admin routes
  if (location.pathname.startsWith("/niyora-admin-portal-2026") || location.pathname.startsWith("/admin")) {
    return null;
  }

  const isHome = location.pathname === "/";
  const isWishlist = location.pathname === "/wishlist";
  const isCart = location.pathname === "/cart";
  const isProfile = location.pathname === "/my-profile" || location.pathname === "/login";

  return (
    <nav
      aria-label="Mobile navigation bar"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-champagne/60 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid grid-cols-6 items-center h-14 max-w-md mx-auto px-1">
        
        {/* 1. Home */}
        <NavLink
          to="/"
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            isHome ? "text-gold-600 font-bold" : "text-gray-500 hover:text-luxury-black"
          }`}
        >
          <Home className={`h-4 w-4 transition-transform ${isHome ? "scale-110" : ""}`} />
          <span className="text-[9px] mt-0.5 tracking-tight">Home</span>
        </NavLink>

        {/* 2. Categories Trigger */}
        <button
          type="button"
          onClick={onOpenCategories}
          className="flex flex-col items-center justify-center h-full text-gray-500 hover:text-gold-600 transition-colors cursor-pointer"
        >
          <Gift className="h-4 w-4" />
          <span className="text-[9px] mt-0.5 tracking-tight">Categories</span>
        </button>

        {/* 3. Search Trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex flex-col items-center justify-center h-full text-gray-500 hover:text-gold-600 transition-colors cursor-pointer"
        >
          <Search className="h-4 w-4" />
          <span className="text-[9px] mt-0.5 tracking-tight">Search</span>
        </button>

        {/* 4. Wishlist */}
        <NavLink
          to="/wishlist"
          className={`flex flex-col items-center justify-center h-full transition-colors relative ${
            isWishlist ? "text-gold-600 font-bold" : "text-gray-500 hover:text-luxury-black"
          }`}
        >
          <div className="relative">
            <Heart className={`h-4 w-4 transition-transform ${isWishlist ? "scale-110 text-red-500 fill-red-500" : ""}`} />
            {wishlistCount > 0 && (
              <span
                key={`mobile-bottom-wishlist-${wishlistCount}`}
                className="cart-badge-bump absolute -top-1.5 -right-2.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gold-500 px-1 text-[8px] font-extrabold text-white shadow-xs"
              >
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </div>
          <span className="text-[9px] mt-0.5 tracking-tight">Wishlist</span>
        </NavLink>

        {/* 5. Cart */}
        <NavLink
          to="/cart"
          className={`flex flex-col items-center justify-center h-full transition-colors relative ${
            isCart ? "text-gold-600 font-bold" : "text-gray-500 hover:text-luxury-black"
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`h-4 w-4 transition-transform ${isCart ? "scale-110 text-gold-600" : ""}`} />
            {itemCount > 0 && (
              <span
                key={`mobile-bottom-cart-${itemCount}`}
                className="cart-badge-bump absolute -top-1.5 -right-2.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-luxury-black px-1 text-[8px] font-extrabold text-white shadow-xs"
              >
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </div>
          <span className="text-[9px] mt-0.5 tracking-tight">Cart</span>
        </NavLink>

        {/* 6. Profile / Account */}
        <NavLink
          to={isAuthenticated ? "/my-profile" : "/login"}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            isProfile ? "text-gold-600 font-bold" : "text-gray-500 hover:text-luxury-black"
          }`}
        >
          <User className={`h-4 w-4 transition-transform ${isProfile ? "scale-110" : ""}`} />
          <span className="text-[9px] mt-0.5 tracking-tight">
            {isAuthenticated ? "Account" : "Login"}
          </span>
        </NavLink>

      </div>
    </nav>
  );
};

export default MobileBottomNav;
