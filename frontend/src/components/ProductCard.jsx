import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import QuantityStepper from "./QuantityStepper";
import { resolveMediaUrl } from "../services/api";

const ProductCard = ({ product, quantity, onAdd, onIncrease, onDecrease }) => {
  const navigate = useNavigate();
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const productUrl = `/products/${product.slug || product._id}`;
  const imageUrl = resolveMediaUrl(product.image || product.images?.[0] || "https://via.placeholder.com/600x400?text=Gift");
  const stock = product.stock !== undefined && product.stock !== null ? Number(product.stock) : null;
  const hasStockLimit = stock !== null && Number.isFinite(stock);
  const outOfStock = hasStockLimit && stock <= 0;
  const lowStock = hasStockLimit && stock > 0 && stock <= 5;
  const reachedMaxStock = hasStockLimit && quantity >= stock;
  const previewText = String(product.description || "").replace(/\s+/g, " ").trim();

  const openDetails = () => navigate(productUrl);

  useEffect(() => {
    if (!recentlyAdded) return undefined;
    const timeoutId = setTimeout(() => setRecentlyAdded(false), 1200);
    return () => clearTimeout(timeoutId);
  }, [recentlyAdded]);

  const handleAdd = () => {
    onAdd();
    setRecentlyAdded(true);
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-champagne/45 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md hover:border-gold-300/40 flex flex-col justify-between h-full">
      <button type="button" onClick={openDetails} className="block w-full text-left focus:outline-none">
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
        </div>

        <div className="space-y-3.5 p-4">
          <div>
            <h3 className="line-clamp-1 text-base font-serif font-semibold text-luxury-black group-hover:text-gold-600 transition-colors">
              <Link
                to={productUrl}
                onClick={(event) => event.stopPropagation()}
                className="hover:text-gold-600"
              >
                {product.name}
              </Link>
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary font-light">
              {previewText || "Tap to explore full product details, images and delivery information."}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Starting at</p>
              <p className="text-lg font-semibold font-serif text-luxury-black">INR {product.price}</p>
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
                {outOfStock ? "Sold out" : lowStock ? `${stock} left` : "Ready"}
              </div>
            ) : null}
          </div>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2 border-t border-champagne/40 bg-gold-50/20 p-3 mt-auto">
        <button
          type="button"
          onClick={openDetails}
          className="rounded-full border border-champagne bg-white px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-luxury-black transition-all duration-200 hover:bg-gold-50 hover:text-gold-600 hover:border-gold-300/40 truncate cursor-pointer"
        >
          Explore
        </button>
        {quantity > 0 ? (
          <QuantityStepper
            quantity={quantity}
            onDecrease={onDecrease}
            onIncrease={onIncrease}
            increaseDisabled={outOfStock || reachedMaxStock}
            decreaseAriaLabel={`Decrease ${product.name} quantity`}
            increaseAriaLabel={`Increase ${product.name} quantity`}
            className="rounded-full border-champagne bg-white"
            buttonClassName="h-7 w-7 text-luxury-black hover:bg-gold-50"
            valueClassName="text-luxury-black text-xs"
          />
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className="rounded-full bg-luxury-black px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-all duration-200 hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs truncate cursor-pointer"
          >
            {outOfStock ? "Sold out" : recentlyAdded ? "Added ✓" : "Add to Cart"}
          </button>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
