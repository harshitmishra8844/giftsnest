import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";

const Products = () => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim().toLowerCase();

  useEffect(() => {
    const previousTitle = document.title;
    const setMeta = (name, content, attr = "name") => {
      let element = document.head.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    document.title = "Shop Gifts | GiftNest Products";
    setMeta("description", "Browse GiftNest products including flowers, cakes and personalized gifts for every occasion.");
    setMeta("keywords", "buy gifts online, flowers and cakes, personalized gifts, gift categories");
    setMeta("og:title", "Shop Gifts | GiftNest Products", "property");
    setMeta("og:description", "Explore premium gifting collections and order online with smooth checkout.", "property");
    setMeta("og:type", "website", "property");

    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/products");
        setProducts(data);
      } catch {
        setError("Unable to load products right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [refreshSeed]);

  if (loading) {
    return (
      <section>
        <h2 className="mb-2 text-2xl font-bold text-emerald-900 md:text-3xl">Shop by Occasion</h2>
        <p className="mb-6 text-sm text-gray-600">Curated gifting picks inspired by FNP-style categories.</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-80 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
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

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((product) => {
          const category = String(product.category || "").toLowerCase();
          return category === selectedCategory.toLowerCase();
        });
  const fullyFilteredProducts = filteredProducts.filter((product) => {
    if (!query) return true;
    return String(product.name || "").toLowerCase().includes(query);
  });

  const categoryChips = [
    "All",
    ...Array.from(
      new Set(
        products
          .map((product) => String(product.category || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b)),
  ];

  return (
    <section className="fade-in-up scroll-reveal">
      <h2 className="mb-2 text-2xl font-bold text-emerald-900 md:text-3xl">Shop by Occasion</h2>
      <p className="mb-6 text-sm text-gray-600">
        Curated gifting picks inspired by FNP-style categories.
        {query ? ` Search results for "${query}".` : ""}
      </p>
      <div className="sticky top-[74px] z-[5] mb-6 rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap gap-2">
        {categoryChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setSelectedCategory(chip)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              selectedCategory === chip
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            {chip}
          </button>
        ))}
        </div>
      </div>

      {/* Personalized Mug Feature */}
      <div className="mb-8 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-emerald-900 md:text-2xl">Create Your Personalized Mug</h3>
            <p className="mt-2 text-sm text-gray-600 md:text-base">
              Upload your favorite photo and add custom text to create a unique ceramic mug.
              Perfect for gifts or personal keepsakes.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-emerald-100 px-3 py-1">Upload Photo</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1">Add Custom Text</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1">Live Preview</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1">₹499</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Link
              to="/personalized-mug"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Design Your Mug
            </Link>
          </div>
        </div>
      </div>

      {fullyFilteredProducts.length === 0 ? (
        <p className="text-gray-600">No products found.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger-grid">
          {fullyFilteredProducts.map((product) => (
            <ProductCard key={product._id} product={product} onAddToCart={addToCart} />
          ))}
        </div>
      )}
    </section>
  );
};

export default Products;
