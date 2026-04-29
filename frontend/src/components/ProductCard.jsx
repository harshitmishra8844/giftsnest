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
    <article className="overflow-hidden rounded-[22px] border border-emerald-100 bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl">
      <button type="button" onClick={openDetails} className="block w-full text-left">
        <div className="relative">
          <img
            src={imageUrl}
            alt={product.name}
            className="h-56 w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent px-4 pb-4 pt-10">
            <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
              {product.category}
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <h3 className="line-clamp-1 text-lg font-bold text-gray-900">
              <Link
                to={productUrl}
                onClick={(event) => event.stopPropagation()}
                className="hover:text-emerald-700"
              >
                {product.name}
              </Link>
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
              {previewText || "Tap to explore full product details, images and delivery information."}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Starting at</p>
              <p className="text-2xl font-bold text-gray-900">INR {product.price}</p>
            </div>
            {hasStockLimit ? (
              <div
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  outOfStock
                    ? "bg-red-50 text-red-600"
                    : lowStock
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {outOfStock ? "Sold out" : lowStock ? `${stock} left` : "Ready to ship"}
              </div>
            ) : null}
          </div>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2 border-t border-emerald-100 bg-emerald-50/50 p-4">
        <button
          type="button"
          onClick={openDetails}
          className="rounded-full border border-emerald-600 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-50"
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
          />
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className="rounded-full bg-emerald-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {outOfStock ? "Sold out" : recentlyAdded ? "Added ✓" : "Add to Cart"}
          </button>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
