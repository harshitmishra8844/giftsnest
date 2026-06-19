import { useEffect, useState } from "react";
import { NavLink, Route, Routes, Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import UserAuth from "./pages/UserAuth";
import MyProfile from "./pages/MyProfile";
import AddProduct from "./pages/AddProduct";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import TrackOrder from "./pages/TrackOrder";
import ShippingPolicy from "./pages/ShippingPolicy";
import ReturnsRefunds from "./pages/ReturnsRefunds";
import PersonalizedMug from "./pages/PersonalizedMug";
import { useCart } from "./context/CartContext";
import { getUserAuth } from "./services/userAuth";
import SearchBar from "./components/search/SearchBar";
import { mockGiftProducts, trendingSearches } from "./data/mockGiftProducts";
import api from "./services/api";


const UserProtectedRoute = ({ children }) => {
  const location = useLocation();
  const userAuth = getUserAuth();

  if (!userAuth?.token) {
    return <Navigate to="/login" state={{ redirectTo: location.pathname }} replace />;
  }

  return children;
};

function App() {
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subStatus, setSubStatus] = useState("idle"); // idle, loading, success, error
  const [subMessage, setSubMessage] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!newsletterEmail) {
      setSubStatus("error");
      setSubMessage("Email is required.");
      return;
    }
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(newsletterEmail)) {
      setSubStatus("error");
      setSubMessage("Please enter a valid email address.");
      return;
    }

    try {
      setSubStatus("loading");
      setSubMessage("");
      const response = await api.post("/newsletter/subscribe", { email: newsletterEmail });
      setSubStatus("success");
      setSubMessage(response.data.message || "Subscribed successfully!");
      setNewsletterEmail("");
    } catch (error) {
      setSubStatus("error");
      const errorMsg = error.response?.data?.message || "Subscription failed. Please try again.";
      setSubMessage(errorMsg);
    }
  };

  const handleEmailChange = (e) => {
    setNewsletterEmail(e.target.value);
    if (subStatus !== "idle") {
      setSubStatus("idle");
      setSubMessage("");
    }
  };

  const handleSearch = (query) => {
    if (!query) {
      navigate("/products");
      return;
    }
    navigate(`/products?q=${encodeURIComponent(query)}`);
  };

  const navLinkClass = ({ isActive }) =>
    `rounded-full px-2.5 py-1.5 text-xs font-semibold transition md:px-4 md:py-2 md:text-sm lg:px-5 lg:py-2.5 lg:text-[15px] ${
      isActive
        ? "bg-emerald-600 text-white shadow-sm"
        : "border border-emerald-100/80 bg-white/70 text-emerald-800 hover:bg-emerald-50"
    }`;

  useEffect(() => {
    const elements = document.querySelectorAll(".scroll-reveal:not(.is-visible)");
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (mobileMenuOpen) {
      const timer = setTimeout(() => setMobileMenuOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search, mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 to-white">
      <header className="sticky top-0 z-20 border-b border-emerald-100/80 bg-white/85 backdrop-blur-md fade-in">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 md:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:gap-6">
            <div className="flex items-center justify-between min-w-[150px] shrink-0">
              <NavLink to="/" className="group inline-flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 text-sm font-bold text-white shadow-sm transition group-hover:scale-105">
                  N
                </span>
                <span className="text-xl font-bold tracking-tight text-emerald-900">Niyora Gifts</span>
              </NavLink>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 md:hidden">
                curated gifting
              </span>
              <div className="ml-2 flex items-center gap-2 md:hidden">
                <NavLink
                  to="/cart"
                  aria-label={`Cart (${itemCount})`}
                  title={`Cart (${itemCount})`}
                  className="relative shrink-0 rounded-full bg-emerald-700 p-2 text-white transition hover:bg-emerald-800"
                >
                  <span className="inline-flex items-center">
                     <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13l-1.1 5M7 13h10m0 0v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-8" />
                    </svg>
                  </span>
                  {itemCount > 0 ? (
                    <span
                      key={`cart-count-mobile-${itemCount}`}
                      className="cart-badge-bump absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-4 text-emerald-700"
                    >
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  ) : null}
                </NavLink>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-label="Toggle navigation menu"
                  className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Global Search Bar */}
            <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto flex-1 px-1.5 md:px-0">
              <SearchBar
                products={mockGiftProducts}
                trendingSearches={trendingSearches}
                onSearch={handleSearch}
              />
            </div>

            <div className="hidden items-center gap-2 rounded-2xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/70 p-2 shadow-sm md:flex lg:flex-wrap shrink-0">
              <NavLink to="/" className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to="/products" className={navLinkClass}>
                Products
              </NavLink>
              <NavLink to="/about" className={navLinkClass}>
                About
              </NavLink>
              <NavLink to="/my-profile" className={navLinkClass}>
                Profile
              </NavLink>
              <NavLink
                to="/cart"
                aria-label={`Cart (${itemCount})`}
                title={`Cart (${itemCount})`}
                className="relative shrink-0 rounded-full bg-emerald-700 px-3.5 py-2.5 text-white transition hover:bg-emerald-800 lg:px-4 lg:py-3"
              >
                <span className="inline-flex items-center">
                  <svg className="h-4 w-4 lg:h-5 lg:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13l-1.1 5M7 13h10m0 0v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-8" />
                  </svg>
                </span>
                {itemCount > 0 ? (
                  <span
                    key={`cart-count-desktop-${itemCount}`}
                    className="cart-badge-bump absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-4 text-emerald-700"
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                ) : null}
              </NavLink>
            </div>

          </div>
          {mobileMenuOpen ? (
            <div className="mt-3 space-y-3 rounded-2xl border border-emerald-100 bg-white p-3 md:hidden">
              <div className="grid grid-cols-2 gap-2">
                <NavLink to="/" className={navLinkClass}>Home</NavLink>
                <NavLink to="/products" className={navLinkClass}>Products</NavLink>
                <NavLink to="/about" className={navLinkClass}>About</NavLink>
                <NavLink to="/my-profile" className={navLinkClass}>Profile</NavLink>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-10 page-enter">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:idOrSlug" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/checkout"
            element={
              <UserProtectedRoute>
                <Checkout />
              </UserProtectedRoute>
            }
          />
          <Route path="/login" element={<UserAuth />} />
          <Route
            path="/my-profile"
            element={
              <UserProtectedRoute>
                <MyProfile />
              </UserProtectedRoute>
            }
          />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/returns-refunds" element={<ReturnsRefunds />} />
          <Route path="/personalized-mug" element={<PersonalizedMug />} />
        </Routes>
      </main>

      <footer className="mt-10 border-t border-emerald-100 bg-gradient-to-b from-white to-emerald-50/40 fade-in-delayed">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-4 scroll-reveal">
              <h3 className="text-2xl font-bold tracking-tight text-emerald-900">Niyora Gifts</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-600">
                Premium flowers, cakes and personalized gifts curated for celebrations that deserve a beautiful memory.
              </p>
              <div className="mt-5 flex items-center gap-3 text-gray-600">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="rounded-full border border-emerald-200 bg-white p-2.5 transition hover:border-emerald-400 hover:text-emerald-700 hover:shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9z" />
                    <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.1a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8zM18 6.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" />
                  </svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-full border border-emerald-200 bg-white p-2.5 transition hover:border-emerald-400 hover:text-emerald-700 hover:shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5H17V5a24.2 24.2 0 0 0-2.6-.1c-2.6 0-4.4 1.6-4.4 4.5V11H7.5v3H10v8h3.5z" />
                  </svg>
                </a>
                <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X" className="rounded-full border border-emerald-200 bg-white p-2.5 transition hover:border-emerald-400 hover:text-emerald-700 hover:shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M18.9 3H21l-4.6 5.3L22 21h-4.8l-3.8-5-4.3 5H7l5-5.8L2 3h4.9l3.4 4.5L13.9 3h5zM18 19h1.3L6.2 5H4.8L18 19z" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="md:col-span-2 scroll-reveal">
              <h4 className="text-sm font-bold uppercase tracking-wide text-emerald-900">Explore</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li><Link to="/" className="hover:text-emerald-700">Home</Link></li>
                <li><Link to="/about" className="hover:text-emerald-700">About</Link></li>
                <li><Link to="/products" className="hover:text-emerald-700">Products</Link></li>
                <li><Link to="/cart" className="hover:text-emerald-700">Cart</Link></li>
                <li><Link to="/my-profile" className="hover:text-emerald-700">My Profile</Link></li>
                <li><Link to="/admin/login" className="hover:text-emerald-700">Admin Login</Link></li>
              </ul>
            </div>

            <div className="md:col-span-3 scroll-reveal">
              <h4 className="text-sm font-bold uppercase tracking-wide text-emerald-900">Customer Care</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li><Link to="/track-order" className="hover:text-emerald-700">Track Order</Link></li>
                <li><Link to="/shipping-policy" className="hover:text-emerald-700">Shipping Policy</Link></li>
                <li><Link to="/returns-refunds" className="hover:text-emerald-700">Returns & Refunds</Link></li>
                <li><a href="mailto:niyoragifts@gmail.com" className="hover:text-emerald-700">niyoragifts@gmail.com</a></li>
                <li>+91 90000 00000</li>
              </ul>
            </div>

            <div className="md:col-span-3 scroll-reveal">
              <h4 className="text-sm font-bold uppercase tracking-wide text-emerald-900">Stay Updated</h4>
              <p className="mt-3 text-sm text-gray-600">Get festive offers and latest collections in your inbox.</p>
              <form onSubmit={handleSubscribe} className="mt-4 flex items-center rounded-full border border-emerald-200 bg-white p-1 shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition">
                <input
                  type="email"
                  placeholder="Your email"
                  value={newsletterEmail}
                  onChange={handleEmailChange}
                  disabled={subStatus === "loading"}
                  required
                  className="w-full rounded-full px-3 py-1.5 text-sm text-gray-700 outline-none disabled:bg-gray-50/50"
                />
                <button
                  type="submit"
                  disabled={subStatus === "loading"}
                  className="rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:bg-emerald-600/70 cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  {subStatus === "loading" ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      ...
                    </span>
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </form>

              {subStatus === "success" && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5 text-xs text-emerald-800 fade-in shadow-sm">
                  <svg className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{subMessage}</span>
                </div>
              )}

              {subStatus === "error" && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/75 p-2.5 text-xs text-amber-800 fade-in shadow-sm">
                  <svg className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{subMessage}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-emerald-100 pt-4 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Niyora Gifts. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/products" className="hover:text-emerald-700">Privacy Policy</Link>
              <Link to="/products" className="hover:text-emerald-700">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
