import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import CartToast from "../components/CartToast";

const Products = () => {
  const location = useLocation();
  const { cartItems, addToCart, updateQuantity } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Shop Gifts | GiftNest Products";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchText(params.get("q") || "");
  }, [location.search]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/products");
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        setError("Unable to load products right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [refreshSeed]);

  const categoryChips = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          products
            .map((product) => String(product.category || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    ],
    [products]
  );

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const searchTokens = normalizedSearch.split(/\s+/).filter(Boolean);

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" ||
        String(product.category || "").toLowerCase() === selectedCategory.toLowerCase();
      const tags = Array.isArray(product.tags) ? product.tags.join(" ") : "";
      const haystack = `${product.name || ""} ${product.category || ""} ${product.description || ""} ${product.slug || ""} ${tags}`.toLowerCase();
      const matchesSearch =
        !searchTokens.length || searchTokens.every((token) => haystack.includes(token));
      return matchesCategory && matchesSearch;
    });
  }, [products, searchText, selectedCategory]);

  const cartQuantityById = useMemo(
    () =>
      // Fast lookup for per-card quantity controls.
      cartItems.reduce((acc, item) => {
        acc[item._id] = item.quantity;
        return acc;
      }, {}),
    [cartItems]
  );

  const showAddToast = (productName) => {
    setToastMessage(`${productName} added to cart`);
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-emerald-100">
          <div className="h-8 w-56 animate-pulse rounded-xl bg-emerald-100" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded-xl bg-emerald-50" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, idx) => (
            <div key={idx} className="h-[380px] animate-pulse rounded-[22px] bg-white shadow-sm ring-1 ring-emerald-100" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => setRefreshSeed((prev) => prev + 1)}
          className="mt-4 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-[30px] border border-emerald-100 bg-white shadow-sm">
        <div className="grid gap-6 px-6 py-7 md:grid-cols-[1.3fr_0.7fr] md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Gift Storefront</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Pick a gift, open the detail page, and shop without the fuss
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 md:text-base">
              A simpler catalog layout with direct product actions, clearer navigation and a calmer browsing flow.
            </p>
          </div>
          <div className="flex items-center justify-center rounded-[24px] bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 text-center">
              {visibleProducts.length} product{visibleProducts.length === 1 ? "" : "s"} showing
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categoryChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setSelectedCategory(chip)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              selectedCategory === chip
                ? "bg-emerald-700 text-white"
                : "border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {visibleProducts.length === 0 ? (
        <div className="rounded-[24px] border border-emerald-100 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">No products found</p>
          <p className="mt-2 text-sm text-gray-600">Try another search or switch to a different category.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              quantity={cartQuantityById[product._id] || 0}
              onAdd={() => {
                addToCart(product);
                showAddToast(product.name);
              }}
              onIncrease={() => {
                addToCart(product);
                showAddToast(product.name);
              }}
              onDecrease={() => {
                const current = cartQuantityById[product._id] || 0;
                if (current <= 0) return;
                updateQuantity(product._id, current - 1);
              }}
            />
          ))}
        </div>
      )}
      <CartToast message={toastMessage} onClose={() => setToastMessage("")} />
    </section>
  );
};

export default Products;
