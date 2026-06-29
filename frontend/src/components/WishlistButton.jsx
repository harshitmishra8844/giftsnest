import { useWishlist } from "../context/WishlistContext";
import { useLocation, useNavigate } from "react-router-dom";

const WishlistButton = ({ product, className = "" }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const isWishlisted = isInWishlist(product?._id);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggleWishlist(product);
    if (result?.redirect) {
      // Redirect to login, storing current path to return afterwards
      navigate("/login", { state: { redirectTo: location.pathname + location.search } });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
      aria-pressed={isWishlisted}
      className={`group flex h-9 w-9 items-center justify-center rounded-full bg-white text-luxury-black shadow-md transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 ${className}`}
    >
      <svg
        className={`h-5 w-5 transition-all duration-300 ${
          isWishlisted
            ? "fill-red-500 stroke-red-500 scale-110 animate-heart-pop"
            : "fill-transparent stroke-gray-500 hover:stroke-red-500 group-hover:scale-105"
        }`}
        viewBox="0 0 24 24"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </button>
  );
};

export default WishlistButton;
