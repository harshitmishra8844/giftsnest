import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import QuantityStepper from "./QuantityStepper";

const ProductCard = ({ product, quantity, onAdd, onIncrease, onDecrease }) => {
  const navigate = useNavigate();
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const productUrl = `/products/${product.slug || product._id}`;
  const imageUrl = product.image || product.images?.[0] || "https://via.placeholder.com/600x400?text=Gift";
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
    <article className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md hover:border-amber-200/50 flex flex-col justify-between h-full">
      <button type="button" onClick={openDetails} className="block w-full text-left focus:outline-none">
        <div className="relative overflow-hidden aspect-[4/3] bg-gray-50 flex items-center justify-center">
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-3 left-3">
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-800 shadow-sm backdrop-blur-sm border border-amber-100/20">
              {product.category}
            </span>
          </div>
        </div>

        <div className="space-y-3.5 p-4">
          <div>
            <h3 className="line-clamp-1 text-base font-serif font-semibold text-gray-950 group-hover:text-amber-800 transition-colors">
              <Link
                to={productUrl}
                onClick={(event) => event.stopPropagation()}
                className="hover:text-amber-800"
              >
                {product.name}
              </Link>
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 font-light">
              {previewText || "Tap to explore full product details, images and delivery information."}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Starting at</p>
              <p className="text-lg font-semibold font-serif text-gray-900">INR {product.price}</p>
            </div>
            {hasStockLimit ? (
              <div
                className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                  outOfStock
                    ? "bg-red-50/80 text-red-600 border-red-100"
                    : lowStock
                      ? "bg-amber-50/80 text-amber-700 border-amber-100"
                      : "bg-emerald-50/80 text-emerald-800 border-emerald-100"
                }`}
              >
                {outOfStock ? "Sold out" : lowStock ? `${stock} left` : "Ready"}
              </div>
            ) : null}
          </div>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-gray-50/30 p-4 mt-auto">
        <button
          type="button"
          onClick={openDetails}
          className="rounded-full border border-gray-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
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
            className="rounded-full border-gray-200 bg-white"
            buttonClassName="h-7 w-7 text-gray-600 hover:bg-gray-150"
            valueClassName="text-gray-900 text-xs"
          />
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className="rounded-full bg-emerald-950 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all duration-200 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
          >
            {outOfStock ? "Sold out" : recentlyAdded ? "Added ✓" : "Add to Cart"}
          </button>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
