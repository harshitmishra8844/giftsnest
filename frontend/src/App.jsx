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
    `rounded-full px-4 py-2 text-[13px] font-bold uppercase tracking-widest transition duration-300 ${
      isActive
        ? "bg-emerald-900 text-white shadow-sm"
        : "text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50/50"
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

  // Close mobile menu on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/75 border-b border-gray-200/40 shadow-sm transition-all duration-300">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 md:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:gap-6">
            <div className="flex items-center justify-between min-w-[150px] shrink-0">
              <NavLink to="/" className="group inline-flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-800 to-emerald-950 text-sm font-bold text-white shadow transition group-hover:scale-105">
                  N
                </span>
                <span className="text-xl font-bold tracking-widest text-emerald-950 font-serif">Niyora Gifts</span>
              </NavLink>
              <span className="hidden md:inline-block text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded">
                curated gifting
              </span>
              <div className="ml-2 flex items-center gap-2 md:hidden">
                <NavLink
                  to="/cart"
                  aria-label={`Cart (${itemCount})`}
                  title={`Cart (${itemCount})`}
                  className="relative shrink-0 rounded-full bg-emerald-900 p-2 text-white transition hover:bg-emerald-950 shadow-sm"
                >
                  <span className="inline-flex items-center">
                     <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13l-1.1 5M7 13h10m0 0v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-8" />
                    </svg>
                  </span>
                  {itemCount > 0 ? (
                    <span
                      key={`cart-count-mobile-${itemCount}`}
                      className="cart-badge-bump absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-4 text-emerald-900 shadow-sm"
                    >
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  ) : null}
                </NavLink>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-label="Toggle navigation menu"
                  className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-900 hover:bg-emerald-50"
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

            <div className="hidden items-center gap-1.5 rounded-full border border-gray-200/50 bg-gray-50/50 p-1.5 shadow-inner md:flex lg:flex-wrap shrink-0">
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
                className="relative shrink-0 rounded-full bg-emerald-900 px-4 py-2 text-white transition hover:bg-emerald-950 shadow-md hover:shadow-lg flex items-center gap-1"
              >
                <span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13l-1.1 5M7 13h10m0 0v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-8" />
                  </svg>
                </span>
                {itemCount > 0 ? (
                  <span
                    key={`cart-count-desktop-${itemCount}`}
                    className="cart-badge-bump inline-flex min-w-4 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-extrabold leading-3 text-emerald-900"
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                ) : null}
              </NavLink>
            </div>

          </div>
          {mobileMenuOpen ? (
            <>
              {/* Backdrop overlay */}
              <div
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm animate-fade-in-backdrop md:hidden"
              />
              {/* Slide-in drawer */}
              <div
                className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-[#faf8f5] shadow-2xl p-6 md:hidden flex flex-col justify-between animate-slide-in-right border-l border-emerald-100/20"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-200/40 pb-4">
                    <span className="text-lg font-serif font-bold tracking-wider text-emerald-950">Menu</span>
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label="Close menu"
                      className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 transition"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <nav className="flex flex-col gap-3">
                    <NavLink
                      to="/"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition duration-200 ${
                          isActive
                            ? "bg-emerald-900 text-white shadow-sm"
                            : "text-emerald-800 hover:bg-emerald-50/50 hover:text-emerald-950"
                        }`
                      }
                    >
                      Home
                    </NavLink>
                    <NavLink
                      to="/products"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition duration-200 ${
                          isActive
                            ? "bg-emerald-900 text-white shadow-sm"
                            : "text-emerald-800 hover:bg-emerald-50/50 hover:text-emerald-950"
                        }`
                      }
                    >
                      Products
                    </NavLink>
                    <NavLink
                      to="/about"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition duration-200 ${
                          isActive
                            ? "bg-emerald-900 text-white shadow-sm"
                            : "text-emerald-800 hover:bg-emerald-50/50 hover:text-emerald-950"
                        }`
                      }
                    >
                      About Us
                    </NavLink>
                    <NavLink
                      to="/my-profile"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition duration-200 ${
                          isActive
                            ? "bg-emerald-900 text-white shadow-sm"
                            : "text-emerald-800 hover:bg-emerald-50/50 hover:text-emerald-950"
                        }`
                      }
                    >
                      My Profile
                    </NavLink>
                  </nav>
                </div>

                <div className="border-t border-gray-200/40 pt-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold">Niyora Gifts</p>
                  <p className="text-[9px] text-gray-400 mt-1">Curated with love</p>
                </div>
              </div>
            </>
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

      <footer className="mt-16 bg-gradient-to-br from-emerald-950 to-emerald-980 text-emerald-100/90 border-t border-emerald-900/30">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-4 space-y-4">
              <h3 className="text-2xl font-bold tracking-widest text-amber-100 font-serif">Niyora Gifts</h3>
              <p className="max-w-sm text-sm leading-7 text-emerald-200/80">
                Premium flowers, cakes and personalized gifts curated for celebrations that deserve a beautiful, lasting memory.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="rounded-full bg-emerald-900/40 p-2.5 text-emerald-300 hover:bg-emerald-800/80 hover:text-white transition duration-300 border border-emerald-800/40 shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9z" />
                    <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.1a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8zM18 6.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" />
                  </svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-full bg-emerald-900/40 p-2.5 text-emerald-300 hover:bg-emerald-800/80 hover:text-white transition duration-300 border border-emerald-800/40 shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5H17V5a24.2 24.2 0 0 0-2.6-.1c-2.6 0-4.4 1.6-4.4 4.5V11H7.5v3H10v8h3.5z" />
                  </svg>
                </a>
                <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X" className="rounded-full bg-emerald-900/40 p-2.5 text-emerald-300 hover:bg-emerald-800/80 hover:text-white transition duration-300 border border-emerald-800/40 shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M18.9 3H21l-4.6 5.3L22 21h-4.8l-3.8-5-4.3 5H7l5-5.8L2 3h4.9l3.4 4.5L13.9 3h5zM18 19h1.3L6.2 5H4.8L18 19z" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-100">Explore</h4>
              <ul className="space-y-3 text-sm text-emerald-200/70">
                <li><Link to="/" className="hover:text-amber-100 transition">Home</Link></li>
                <li><Link to="/about" className="hover:text-amber-100 transition">About</Link></li>
                <li><Link to="/products" className="hover:text-amber-100 transition">Products</Link></li>
                <li><Link to="/cart" className="hover:text-amber-100 transition">Cart</Link></li>
                <li><Link to="/my-profile" className="hover:text-amber-100 transition">My Profile</Link></li>
                <li><Link to="/admin/login" className="hover:text-amber-100 transition">Admin Login</Link></li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-100">Customer Care</h4>
              <ul className="space-y-3 text-sm text-emerald-200/70">
                <li><Link to="/track-order" className="hover:text-amber-100 transition">Track Order</Link></li>
                <li><Link to="/shipping-policy" className="hover:text-amber-100 transition">Shipping Policy</Link></li>
                <li><Link to="/returns-refunds" className="hover:text-amber-100 transition">Returns & Refunds</Link></li>
                <li><a href="mailto:niyoragifts@gmail.com" className="hover:text-amber-100 transition">niyoragifts@gmail.com</a></li>
                <li className="text-emerald-300/80">+91 90000 00000</li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-100">Stay Updated</h4>
              <p className="text-sm text-emerald-200/70">Get festive offers and latest collections in your inbox.</p>
              <form onSubmit={handleSubscribe} className="flex items-center rounded-full border border-emerald-800 bg-emerald-950 p-1 shadow focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200/20 transition duration-300">
                <input
                  type="email"
                  placeholder="Your email address"
                  value={newsletterEmail}
                  onChange={handleEmailChange}
                  disabled={subStatus === "loading"}
                  required
                  className="w-full rounded-full bg-transparent px-4 py-2 text-sm text-white placeholder-emerald-300/50 outline-none"
                />
                <button
                  type="submit"
                  disabled={subStatus === "loading"}
                  className="rounded-full bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition duration-300 shadow shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {subStatus === "loading" ? "..." : "Join"}
                </button>
              </form>

              {subStatus === "success" && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-800 bg-emerald-900/40 p-3 text-xs text-emerald-300 shadow-sm">
                  <svg className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{subMessage}</span>
                </div>
              )}

              {subStatus === "error" && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-xs text-amber-300 shadow-sm">
                  <svg className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{subMessage}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-emerald-900/40 pt-6 text-xs text-emerald-300/50 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Niyora Gifts. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/products" className="hover:text-amber-100 transition">Privacy Policy</Link>
              <Link to="/products" className="hover:text-amber-100 transition">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
