import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import CartToast from "../components/CartToast";

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
    document.title = "Shop Gifts | Niyora Gifts";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchText(params.get("q") || "");
    setSelectedCategory(params.get("category") || "All");
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

  const categoryChips = useMemo(() => {
    const standard = ["Birthday", "Anniversary", "Flowers", "Cakes", "Personalized Gifts", "Plants"];
    const dynamic = [];
    products.forEach((product) => {
      if (product.category) {
        String(product.category)
          .split(",")
          .forEach((cat) => {
            const trimmed = cat.trim();
            if (trimmed && !dynamic.includes(trimmed)) {
              dynamic.push(trimmed);
            }
          });
      }
    });
    const combined = Array.from(new Set([...standard, ...dynamic]));
    const activeCategories = combined.filter((catName) => {
      const selectedCat = catName.toLowerCase();
      return products.some((product) => {
        const productCat = String(product.category || "").toLowerCase();
        const categoriesList = productCat.split(",").map((c) => c.trim()).filter(Boolean);
        return (
          categoriesList.includes(selectedCat) ||
          categoriesList.some((c) => c.includes(selectedCat) || selectedCat.includes(c))
        );
      });
    });
    return ["All", ...activeCategories.sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const searchTokens = normalizedSearch.split(/\s+/).filter(Boolean);

    return products.filter((product) => {
      const productCat = String(product.category || "").toLowerCase();
      const selectedCat = selectedCategory.toLowerCase();
      const categoriesList = productCat.split(",").map(c => c.trim()).filter(Boolean);
      const matchesCategory =
        selectedCategory === "All" ||
        categoriesList.includes(selectedCat) ||
        categoriesList.some(c => c.includes(selectedCat) || selectedCat.includes(c));
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
        <div className="rounded-[28px] border border-champagne/45 bg-white p-6 shadow-xs">
          <div className="h-8 w-56 animate-pulse rounded-xl bg-gold-50" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded-xl bg-gold-50/50" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, idx) => (
            <div key={idx} className="h-[380px] animate-pulse rounded-[22px] bg-white shadow-xs border border-champagne/40" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-champagne bg-white p-8 text-center shadow-xs">
        <p className="text-red-500 font-light">{error}</p>
        <button
          onClick={() => setRefreshSeed((prev) => prev + 1)}
          className="mt-4 rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition shadow-sm cursor-pointer"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      <div className="border-b border-champagne/30 pb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-600">Gift Catalog</p>
            <h1 className="text-3xl font-light font-serif tracking-tight text-luxury-black md:text-5xl">
              Curated Gift Storefront
            </h1>
            <p className="mt-2 text-sm text-text-secondary font-light leading-6 max-w-xl">
              Discover premium bouquets, fresh cakes, and custom keepsakes hand-crafted for your celebrations.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center justify-center rounded-full bg-gold-50 border border-gold-200/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-800">
            {visibleProducts.length} gift{visibleProducts.length === 1 ? "" : "s"} available
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2.5 no-scrollbar pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap whitespace-nowrap scroll-smooth">
        {categoryChips.map((chip) => {
          const isSelected = selectedCategory === chip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => {
                const params = new URLSearchParams(location.search);
                if (chip === "All") {
                  params.delete("category");
                } else {
                  params.set("category", chip);
                }
                navigate({ search: params.toString() }, { replace: true });
              }}
              className={`rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition duration-300 cursor-pointer shrink-0 ${
                isSelected
                  ? "bg-luxury-black text-white shadow-md border border-luxury-black"
                  : "border border-champagne bg-white text-luxury-black hover:bg-gold-50 hover:border-gold-300/40"
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {visibleProducts.length === 0 ? (
        <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-12 text-center shadow-xs">
          <p className="text-lg font-bold font-serif text-luxury-black">No gifts found</p>
          <p className="mt-2 text-sm text-text-secondary font-light">Try another search filter or select another category above.</p>
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
