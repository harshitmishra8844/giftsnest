import { Link } from "react-router-dom";

const ProductCard = ({ product, onAddToCart }) => {
  const imageUrl = product.image || product.images?.[0] || "https://via.placeholder.com/600x400?text=Gift";
  const stock = product.stock !== undefined && product.stock !== null ? Number(product.stock) : null;
  const hasStockLimit = stock !== null && Number.isFinite(stock);
  const outOfStock = hasStockLimit && stock <= 0;
  const lowStock = hasStockLimit && stock > 0 && stock <= 5;

  return (
    <article className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-emerald-100 transition hover:-translate-y-0.5 hover:shadow-lg hover-float">
      <div className="relative">
        <Link to={`/products/${product.slug || product._id}`} className="block">
          <img
            src={imageUrl}
            alt={product.name}
            className="h-48 w-full rounded-xl object-cover"
            loading="lazy"
          />
        </Link>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          {product.category}
        </p>
        <h3 className="mt-1 line-clamp-1 text-lg font-semibold text-gray-900">
          <Link to={`/products/${product.slug || product._id}`} className="hover:text-emerald-700">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{product.description}</p>
        <div className="mt-4 flex flex-col gap-2">
          {hasStockLimit ? (
            <p className={`text-xs font-medium ${outOfStock ? "text-red-600" : lowStock ? "text-amber-700" : "text-gray-500"}`}>
              {outOfStock ? "Out of stock" : lowStock ? `Only ${stock} left` : `${stock} in stock`}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xl font-bold text-gray-900">INR {product.price}</p>
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={outOfStock}
              className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-800 button-pop disabled:cursor-not-allowed disabled:opacity-50"
            >
              {outOfStock ? "Sold out" : "Send Gift"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
