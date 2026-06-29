import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { resolveMediaUrl } from "../services/api";

const Wishlist = () => {
  const { wishlistItems, removeFromWishlist, isLoading } = useWishlist();
  const { addToCart } = useCart();

  const handleMoveToCart = (product) => {
    // 1. Add to Cart
    addToCart(product);
    // 2. Remove from Wishlist
    removeFromWishlist(product._id);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <svg className="animate-spin h-8 w-8 text-gold-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xs text-text-secondary font-light uppercase tracking-widest animate-pulse">Loading Wishlist...</p>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <section className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-12 text-center shadow-xs max-w-xl mx-auto flex flex-col items-center justify-center">
        {/* Heart SVG illustration */}
        <div className="w-20 h-20 rounded-full bg-gold-50/50 flex items-center justify-center border border-gold-200/20 mb-6 animate-pulse-subtle">
          <svg className="h-10 w-10 fill-red-400 stroke-red-400" viewBox="0 0 24 24">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-light text-luxury-black">Your wishlist is empty</h2>
        <p className="mt-2.5 text-xs text-text-secondary font-light leading-relaxed max-w-sm">
          Save your favorite curated luxury gifts and custom celebration packages here to explore them later.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 shadow-sm font-semibold cursor-pointer"
        >
          Continue Shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-16">
      <div className="border-b border-champagne/30 pb-4">
        <h2 className="text-2xl font-serif font-light text-luxury-black">My Wishlist ({wishlistItems.length})</h2>
        <p className="text-[10px] text-text-secondary font-light uppercase tracking-wider mt-1">Keep track of items you love and move them directly to checkout</p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger-grid">
        {wishlistItems.map((item) => {
          const product = item.product_id;
          if (!product) return null; // fallback check

          const imageUrl = resolveMediaUrl(product.image || product.images?.[0] || "https://via.placeholder.com/600x400?text=Gift");
          const stock = product.stock !== undefined && product.stock !== null ? Number(product.stock) : null;
          const hasStockLimit = stock !== null && Number.isFinite(stock);
          const outOfStock = hasStockLimit && stock <= 0;
          const lowStock = hasStockLimit && stock > 0 && stock <= 5;

          const rating = Math.max(0, Math.min(5, Number(product.rating || 0)));
          const numReviews = Math.max(0, Number(product.numReviews || 0));

          // Calculate compare / discount price
          const comparePrice = product.originalPrice || Math.round(Number(product.price || 0) * 1.18);
          const hasDiscount = comparePrice > product.price;
          const discountPercentage = product.discountPercentage || (hasDiscount ? Math.round(((comparePrice - product.price) / comparePrice) * 100) : 0);

          // Format Added Date
          const addedDateStr = item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }) : "";

          return (
            <article
              key={item.id || item._id}
              className="group overflow-hidden rounded-2xl border border-champagne/45 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md hover:border-gold-300/40 flex flex-col justify-between h-full"
            >
              <div>
                <div className="relative overflow-hidden aspect-[4/3] bg-gold-50/30 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-gold-700 shadow-sm backdrop-blur-sm border border-gold-200/30">
                      {product.category}
                    </span>
                  </div>
                  {hasDiscount && discountPercentage > 0 && (
                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-red-500 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white shadow-sm">
                        {discountPercentage}% OFF
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="line-clamp-1 text-base font-serif font-semibold text-luxury-black group-hover:text-gold-600 transition-colors">
                      <Link to={`/products/${product.slug || product._id}`} className="hover:text-gold-600">
                        {product.name}
                      </Link>
                    </h3>
                    {addedDateStr && (
                      <p className="text-[9px] text-text-secondary font-light uppercase tracking-wider mt-1">
                        Added on {addedDateStr}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="inline-flex items-center rounded-full bg-luxury-black/90 px-2 py-0.5 font-bold text-[9px] text-white tracking-wider">
                      {rating.toFixed(1)} ★
                    </span>
                    <span className="text-[10px] font-light">({numReviews} reviews)</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-champagne/20">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-semibold font-serif text-luxury-black">INR {product.price}</span>
                        {hasDiscount && (
                          <span className="text-xs text-text-secondary line-through font-light">INR {comparePrice}</span>
                        )}
                      </div>
                    </div>
                    {hasStockLimit ? (
                      <div
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                          outOfStock
                            ? "bg-red-50/80 text-red-650 border-red-100"
                            : lowStock
                              ? "bg-gold-50/80 text-gold-700 border-gold-200/50"
                              : "bg-gold-50/40 text-gold-800 border-gold-100/40"
                        }`}
                      >
                        {outOfStock ? "Sold out" : lowStock ? `${stock} left` : "In Stock"}
                      </div>
                    ) : (
                      <div className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border bg-gold-50/40 text-gold-800 border-gold-100/40">
                        In Stock
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-champagne/40 bg-gold-50/20 p-3 mt-auto">
                <button
                  type="button"
                  onClick={() => removeFromWishlist(product._id)}
                  className="rounded-full border border-champagne bg-white px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-red-500 transition-all duration-200 hover:bg-red-50 hover:border-red-200 truncate cursor-pointer"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveToCart(product)}
                  disabled={outOfStock}
                  className="rounded-full bg-luxury-black px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white transition-all duration-200 hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs truncate cursor-pointer"
                >
                  {outOfStock ? "Out of Stock" : "Move to Cart"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default Wishlist;
