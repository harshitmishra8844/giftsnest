import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { NavLink, Route, Routes, Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import { PremiumRingLoader } from "./components/SkeletonLoaders";
import api from "./services/api";

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Cart = lazy(() => import("./pages/Cart"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Checkout = lazy(() => import("./pages/Checkout"));
const UserAuth = lazy(() => import("./pages/UserAuth"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const ReturnsRefunds = lazy(() => import("./pages/ReturnsRefunds"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const PersonalizedMug = lazy(() => import("./pages/PersonalizedMug"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Contact = lazy(() => import("./pages/Contact"));

import { useCart } from "./context/CartContext";
import { useWishlist } from "./context/WishlistContext";
import { useAuth } from "./context/AuthContext";
import SearchBar from "./components/search/SearchBar";
import { mockGiftProducts, trendingSearches } from "./data/mockGiftProducts";
import SEO from "./components/SEO";
import { Sparkles, X, Copy, Check, Phone } from "lucide-react";
import Header from "./components/navigation/Header";
import MobileBottomNav from "./components/navigation/MobileBottomNav";



const UserProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { auth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth?.token) {
      navigate("/login", { state: { redirectTo: location.pathname }, replace: true });
    }
  }, [auth, location, navigate]);

  if (!auth?.token) {
    return null;
  }

  return children;
};

function App() {
  const location = useLocation();
  const { itemCount, cartItems, setCartItems } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const { auth, showLoginModal } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [cmsShell, setCmsShell] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Quick Callback Floating Modal State
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [quickCallbackForm, setQuickCallbackForm] = useState({
    customerName: "",
    customerPhone: "",
    preferredTime: "Immediately / Urgent",
    notes: "",
  });
  const [quickCallbackLoading, setQuickCallbackLoading] = useState(false);
  const [quickCallbackSuccess, setQuickCallbackSuccess] = useState(null);
  const [quickCallbackError, setQuickCallbackError] = useState("");

  const handleQuickCallbackSubmit = async (e) => {
    e.preventDefault();
    setQuickCallbackError("");
    if (!quickCallbackForm.customerName.trim()) {
      setQuickCallbackError("Please enter your name.");
      return;
    }
    if (!quickCallbackForm.customerPhone.trim()) {
      setQuickCallbackError("Please enter your phone number.");
      return;
    }

    try {
      setQuickCallbackLoading(true);
      const res = await api.post("/callbacks/request", {
        customerName: quickCallbackForm.customerName.trim(),
        customerPhone: quickCallbackForm.customerPhone.trim(),
        preferredTime: quickCallbackForm.preferredTime,
        notes: quickCallbackForm.notes.trim(),
        subject: `Storefront Quick Callback: ${quickCallbackForm.customerName}`,
        priority: quickCallbackForm.preferredTime === "Immediately / Urgent" ? "Urgent" : "Medium",
      });

      if (res.data?.success) {
        setQuickCallbackSuccess(res.data);
      }
    } catch (err) {
      setQuickCallbackError(err.response?.data?.message || "Failed to schedule callback. Please try again.");
    } finally {
      setQuickCallbackLoading(false);
    }
  };

  useEffect(() => {
    const fetchShell = async () => {
      try {
        const { data } = await api.get("/cms/shell");
        setCmsShell(data);
      } catch (err) {
        console.error("Failed to load CMS layout settings:", err);
      }
    };
    fetchShell();
  }, []);

  const isAdminPath = location.pathname.startsWith("/niyora-admin-portal-2026");

  useEffect(() => {
    // Completely disable promotional popup banner inside Admin Dashboard
    if (isAdminPath) {
      setShowPopup(false);
      return;
    }

    if (cmsShell?.popups?.active) {
      const closed = sessionStorage.getItem("gift-popup-closed");
      if (!closed) {
        const rawDelay = cmsShell.popups.delay;
        const delaySec = (rawDelay !== undefined && rawDelay !== null && rawDelay !== "") 
          ? Number(rawDelay) 
          : 2.5;
        const delayMs = Math.max(0, isNaN(delaySec) ? 2500 : delaySec * 1000);

        if (delayMs === 0) {
          setShowPopup(true);
          return;
        }

        const timer = setTimeout(() => setShowPopup(true), delayMs);
        return () => clearTimeout(timer);
      }
    }
  }, [cmsShell, isAdminPath]);

  const handleClosePopup = () => {
    sessionStorage.setItem("gift-popup-closed", "true");
    setShowPopup(false);
  };

  // Centralized SEO default mappings
  const seoData = useMemo(() => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    
    // 1. Check CMS database SEO first
    if (cmsShell?.seoMap && cmsShell.seoMap[path]) {
      const dbSeo = cmsShell.seoMap[path];
      return {
        title: dbSeo.title,
        description: dbSeo.description,
        keywords: dbSeo.keywords,
        canonical: dbSeo.canonical,
        ogImage: dbSeo.ogImage,
        ogTitle: dbSeo.ogTitle,
        ogDescription: dbSeo.ogDescription,
        schemaJson: dbSeo.schemaJson,
      };
    }
    
    // Default fallback
    let title = "Niyora Gifts | Luxury Curated Gifting";
    let description = "Premium flowers, cakes and personalized gifts curated for celebrations that deserve a beautiful, lasting memory.";
    
    if (path === "/") {
      title = "Home | Niyora Gifts";
      description = "Niyora Gifts is India's leading luxury curated gifting portal. Buy premium personalized gifts, anniversary gifts, flowers, cakes, and plants.";
    } else if (path === "/about") {
      title = "About Niyora Gifts | Online Gift Store for Every Occasion";
      description = "Discover the story behind Niyora Gifts — your trusted online gift shop for personalized, unique, and thoughtful gifts. Shop with confidence, delivered with love.";
    } else if (path === "/products") {
      const category = searchParams.get("category");
      if (category) {
        const formattedCat = category
          .split("-")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        title = `${formattedCat} Gifts | Niyora Gifts`;
        description = `Browse our exclusive collection of luxury ${formattedCat.toLowerCase()} and curated items for celebrations.`;
      } else {
        title = "Curated Gifts Collection | Niyora Gifts";
        description = "Browse our exclusive collection of luxury flowers, cakes, personalized mugs, and curated gifts for every celebration.";
      }
    } else if (path === "/cart") {
      title = "Cart | Niyora Gifts";
      description = "Review your luxury curated gifts, select personalization options, and prepare to place your order on Niyora Gifts.";
    } else if (path === "/wishlist") {
      title = "My Wishlist | Niyora Gifts";
      description = "View your saved luxury curated gifts, select options, and move items to your cart on Niyora Gifts.";
    } else if (path === "/checkout") {
      title = "Checkout | Niyora Gifts";
      description = "Complete your purchase securely. Enter shipping address, payment details, and complete order fulfillment at Niyora Gifts.";
    } else if (path === "/login") {
      title = "Login | Niyora Gifts";
      description = "Access your account on Niyora Gifts to manage orders, customize products, track delivery status, and view special offers.";
    } else if (path === "/my-profile") {
      title = "My Account | Niyora Gifts";
      description = "Manage your profile, check order status history, submit returns, and chat with the help concierge.";
    } else if (path === "/track-order") {
      title = "Order Tracking | Niyora Gifts";
      description = "Enter your order code or tracking ID to check the shipping status, dispatch times, and courier details of your gift.";
    } else if (path === "/shipping-policy") {
      title = "Shipping Policy | Niyora Gifts";
      description = "Read about Niyora Gifts' delivery times, priority prep services, midnight deliveries, and shipping rates across cities.";
    } else if (path === "/returns-refunds" || path === "/return-replacement" || path === "/returns-replacement" || path === "/return-and-replacement") {
      title = "Returns, Refunds & Replacement | Niyora Gifts";
      description = "Review our policy on returns, refunds, damaged product checks, and custom gift replacements at Niyora Gifts.";
    } else if (path === "/terms-conditions" || path === "/pages/terms-and-conditions" || path === "/terms-and-conditions") {
      title = "Terms & Conditions | Niyora Gifts Account & Website Usage Policy";
      description = "Read the Terms & Conditions for creating an account and shopping on Niyora Gifts. Understand your rights, responsibilities, and our policies before you sign up.";
    } else if (path === "/personalized-mug") {
      title = "Personalized Mug | Niyora Gifts";
      description = "Create a custom personalized ceramic mug. Upload photos, add bespoke text, and choose premium gift packaging.";
    } else if (path === "/add-product") {
      title = "Add Product | Niyora Gifts";
      description = "Inventory item creation form for catalog management.";
    } else if (path === "/niyora-admin-portal-2026/login") {
      title = "Admin Login | Niyora Gifts Admin";
      description = "Secure executive login portal to access Niyora Gifts administrative controls.";
    }
    
    return { title, description };
  }, [location.pathname, location.search]);

  const isDynamicRoute = useMemo(() => {
    const path = location.pathname;
    return (
      (path.startsWith("/products/") && path !== "/products") ||
      path.startsWith("/niyora-admin-portal-2026/dashboard")
    );
  }, [location.pathname]);
  const isAdminRoute = location.pathname.startsWith("/niyora-admin-portal-2026") || location.pathname.startsWith("/admin");

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subStatus, setSubStatus] = useState("idle"); // idle, loading, success, error
  const [subMessage, setSubMessage] = useState("");
  const [products, setProducts] = useState(mockGiftProducts);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get("/products");
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      } catch (err) {
        console.error("Failed to load products for global search:", err);
      }
    };
    fetchProducts();
  }, []);

  // Load database cart on login
  useEffect(() => {
    const loadCart = async () => {
      if (auth?.token && !auth?.isAdmin) {
        try {
          const { data } = await api.get("/user/cart", {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
          if (Array.isArray(data) && data.length > 0) {
            const formatted = data.map(item => {
              if (!item.product) return null;
              return {
                ...item.product,
                quantity: item.quantity,
                customization: item.customization || {},
                cartItemId: item.customization ? `${item.product._id}-${JSON.stringify(item.customization)}` : item.product._id
              };
            }).filter(Boolean);
            
            if (formatted.length > 0) {
              setCartItems(formatted);
            }
          }
        } catch (err) {
          console.error("Failed to load cart from database:", err);
        }
      }
    };
    loadCart();
  }, [auth, setCartItems]);

  // Sync local cart changes to database
  useEffect(() => {
    const syncCart = async () => {
      if (auth?.token && !auth?.isAdmin) {
        try {
          const payload = cartItems.map(item => ({
            product: item._id,
            quantity: item.quantity,
            customization: item.customization || {}
          }));
          await api.put("/user/cart", { cartItems: payload }, {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
        } catch (err) {
          console.error("Failed to sync cart items to database:", err);
        }
      }
    };
    const delay = setTimeout(syncCart, 1000);
    return () => clearTimeout(delay);
  }, [cartItems, auth]);

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
    `px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-300 ${
      isActive
        ? "text-gold-500 border-b-2 border-gold-500 font-bold"
        : "text-luxury-black hover:text-gold-500 border-b-2 border-transparent hover:border-gold-300/40"
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

  return (
    <div className={isAdminRoute ? "min-h-screen bg-[#FAF7F2] font-sans" : "min-h-screen bg-ivory"}>
      {!isDynamicRoute && (
        <SEO 
          title={seoData.title} 
          description={seoData.description} 
          keywords={seoData.keywords}
          canonical={seoData.canonical}
          image={seoData.ogImage}
          ogTitle={seoData.ogTitle}
          ogDescription={seoData.ogDescription}
          schemaJson={seoData.schemaJson}
        />
      )}
      {!isAdminRoute && (
        <Header
          products={products}
          trendingSearches={trendingSearches}
          onSearch={handleSearch}
          cmsShell={cmsShell}
          onOpenCallbackModal={() => setShowCallbackModal(true)}
          mobileDrawerOpen={mobileDrawerOpen}
          setMobileDrawerOpen={setMobileDrawerOpen}
          mobileSearchOpen={mobileSearchOpen}
          setMobileSearchOpen={setMobileSearchOpen}
        />
      )}

      <main className={isAdminRoute ? "min-h-screen w-full bg-[#FAF7F2]" : location.pathname === "/" ? "w-full page-enter pb-16 md:pb-0" : "mx-auto w-full max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-10 page-enter pb-16 md:pb-0"}>
        <Suspense fallback={<PremiumRingLoader text="Loading page..." />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/pages/about-us" element={<Navigate to="/about" replace />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:idOrSlug" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
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
            <Route path="/account" element={<Navigate to="/my-profile?tab=orders" replace />} />
            <Route path="/orders" element={<Navigate to="/my-profile?tab=orders" replace />} />
            <Route path="/addresses" element={<Navigate to="/my-profile?tab=addresses" replace />} />
            <Route path="/coupons" element={<Navigate to="/my-profile?tab=coupons" replace />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/admin" element={<Navigate to="/niyora-admin-portal-2026/login" replace />} />
            <Route path="/admin/login" element={<Navigate to="/niyora-admin-portal-2026/login" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/niyora-admin-portal-2026/dashboard" replace />} />
            <Route path="/admin/*" element={<Navigate to="/niyora-admin-portal-2026/login" replace />} />
            <Route path="/niyora-admin-portal-2026/login" element={<AdminLogin />} />
            <Route path="/niyora-admin-portal-2026/dashboard" element={<AdminDashboard />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/returns-refunds" element={<ReturnsRefunds />} />
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/pages/terms-and-conditions" element={<Navigate to="/terms-conditions" replace />} />
            <Route path="/return-replacement" element={<Navigate to="/returns-refunds" replace />} />
            <Route path="/returns-replacement" element={<Navigate to="/returns-refunds" replace />} />
            <Route path="/return-and-replacement" element={<Navigate to="/returns-refunds" replace />} />
            <Route path="/personalized-mug" element={<PersonalizedMug />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/contact-us" element={<Navigate to="/contact" replace />} />
            <Route path="/support" element={<Navigate to="/contact" replace />} />
            <Route path="/pages/contact" element={<Navigate to="/contact" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!isAdminRoute && (
        <footer className="mt-16 bg-luxury-black text-gray-300 border-t border-gold-500/20">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-4 space-y-4">
              {cmsShell?.footer?.logoImage ? (
                <img src={cmsShell.footer.logoImage} className="h-9 object-contain" alt="Logo" />
              ) : (
                <h3 className="text-2xl font-bold tracking-widest text-gold-500 font-serif">
                  {cmsShell?.footer?.logoText || "Niyora Gifts"}
                </h3>
              )}
              <p className="max-w-sm text-sm leading-7 text-gray-400">
                {cmsShell?.footer?.aboutText || "Premium flowers, cakes and personalized gifts curated for celebrations that deserve a beautiful, lasting memory."}
              </p>
              <div className="flex items-center gap-3 pt-2">
                {(cmsShell?.footer?.socialMediaLinks || [
                  { name: "instagram", link: "https://instagram.com" },
                  { name: "facebook", link: "https://facebook.com" },
                  { name: "x", link: "https://x.com" }
                ]).map((s, index) => {
                  let svgContent = null;
                  if (s.name.toLowerCase() === "instagram") {
                    svgContent = <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9z M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.1a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8zM18 6.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" />;
                  } else if (s.name.toLowerCase() === "facebook") {
                    svgContent = <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5H17V5a24.2 24.2 0 0 0-2.6-.1c-2.6 0-4.4 1.6-4.4 4.5V11H7.5v3H10v8h3.5z" />;
                  } else if (s.name.toLowerCase() === "x" || s.name.toLowerCase() === "twitter") {
                    svgContent = <path d="M18.9 3H21l-4.6 5.3L22 21h-4.8l-3.8-5-4.3 5H7l5-5.8L2 3h4.9l3.4 4.5L13.9 3h5zM18 19h1.3L6.2 5H4.8L18 19z" />;
                  }
                  return (
                    <a key={index} href={s.link} target="_blank" rel="noreferrer" aria-label={s.name} className="rounded-full bg-stone-900 p-2.5 text-gray-400 hover:bg-gold-500 hover:text-white transition duration-300 border border-stone-800 shadow-sm">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                        {svgContent}
                      </svg>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gold-500">Explore</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {(cmsShell?.footer?.quickLinks || [
                  { label: "Home", link: "/" },
                  { label: "About", link: "/about" },
                  { label: "Products", link: "/products" },
                  { label: "Cart", link: "/cart" }
                ]).map((link, index) => (
                  <li key={index}>
                    <Link to={link.link} className="hover:text-gold-500 transition">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-3 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gold-500">Customer Care</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {(cmsShell?.footer?.customerServiceLinks || [
                  { label: "Track Order", link: "/track-order" },
                  { label: "Customer Support & Inquiries", link: "/contact" },
                  { label: "Shipping Policy", link: "/shipping-policy" },
                  { label: "Returns, Refunds & Replacement", link: "/returns-refunds" },
                  { label: "Terms & Conditions", link: "/terms-conditions" }
                ]).map((link, index) => (
                  <li key={index}>
                    <Link to={link.link} className="hover:text-gold-500 transition">{link.label}</Link>
                  </li>
                ))}
                {cmsShell?.footer?.contactDetails?.email && (
                  <li>
                    <a href={`mailto:${cmsShell.footer.contactDetails.email}`} className="hover:text-gold-500 transition">
                      {cmsShell.footer.contactDetails.email}
                    </a>
                  </li>
                )}
                {cmsShell?.footer?.contactDetails?.phone && (
                  <li className="text-gray-400">{cmsShell.footer.contactDetails.phone}</li>
                )}
              </ul>
            </div>

            <div className="md:col-span-3 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gold-500">Stay Updated</h4>
              <p className="text-sm text-gray-400">Get festive offers and latest collections in your inbox.</p>
              <form onSubmit={handleSubscribe} className="flex items-center rounded-full border border-stone-800 bg-stone-900 p-1 shadow focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/20 transition duration-300">
                <input
                  type="email"
                  placeholder="Your email address"
                  value={newsletterEmail}
                  onChange={handleEmailChange}
                  disabled={subStatus === "loading"}
                  required
                  className="w-full rounded-full bg-transparent px-4 py-2 text-sm text-white placeholder-gray-600 outline-none"
                />
                <button
                  type="submit"
                  disabled={subStatus === "loading"}
                  className="rounded-full bg-gold-500 hover:bg-gold-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition duration-300 shadow shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {subStatus === "loading" ? "..." : "Join"}
                </button>
              </form>

              {subStatus === "success" && (
                <div className="flex items-start gap-2 rounded-xl border border-gold-800/20 bg-gold-500/10 p-3 text-xs text-gold-500 shadow-sm">
                  <svg className="h-4 w-4 shrink-0 text-gold-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{subMessage}</span>
                </div>
              )}

              {subStatus === "error" && (
                <div className="flex items-start gap-2 rounded-xl border border-red-900/20 bg-red-500/10 p-3 text-xs text-red-450 shadow-sm">
                  <svg className="h-4 w-4 shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{subMessage}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-stone-850 pt-6 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
            <p>{cmsShell?.footer?.copyrightText || `© ${new Date().getFullYear()} Niyora Gifts. All rights reserved.`}</p>
            <div className="flex items-center gap-4">
              <Link to="/shipping-policy" className="hover:text-gold-500 transition">Shipping Policy</Link>
              <Link to="/returns-refunds" className="hover:text-gold-500 transition">Return & Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
      )}
      {/* Dynamic Luxury Promotional Popup Dialog (Disabled in Admin Dashboard) */}
      {!isAdminPath && showPopup && cmsShell?.popups && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Solid dark backdrop with blur - prevents background bleeding */}
          <div
            className="fixed inset-0 bg-luxury-black/75 backdrop-blur-md transition-opacity duration-300"
            onClick={handleClosePopup}
          />

          {/* Luxury Modal Card (100% solid, fully opaque) */}
          <div className="relative z-10 w-full max-w-lg md:max-w-xl rounded-3xl border border-gold-400/30 bg-[#FFFDF9] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row animate-page-enter">
            {/* Ambient gold glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-gold-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleClosePopup}
              className="absolute top-3.5 right-3.5 z-20 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-luxury-black shadow-sm flex items-center justify-center text-xs font-bold transition cursor-pointer border border-champagne/40"
              aria-label="Close promotion dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left Image Section (if imageUrl present) */}
            {cmsShell.popups.imageUrl && (
              <div className="md:w-5/12 h-48 md:h-auto min-h-[220px] bg-gold-50/20 relative overflow-hidden shrink-0">
                <img
                  src={resolveMediaUrl(cmsShell.popups.imageUrl)}
                  alt="Special Offer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:hidden" />
              </div>
            )}

            {/* Content Section */}
            <div className={`p-6 sm:p-8 flex flex-col justify-center relative z-10 ${
              cmsShell.popups.imageUrl ? "md:w-7/12 text-left" : "w-full text-center items-center py-10 px-8"
            }`}>
              {/* Luxury Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-[10px] font-bold uppercase tracking-widest text-gold-700 mb-3 w-fit">
                <Sparkles className="w-3 h-3 text-gold-600" />
                <span>Special Privilege</span>
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-3xl font-serif text-luxury-black font-normal tracking-tight mb-2.5 leading-snug">
                {cmsShell.popups.title || "Exclusive Offer"}
              </h3>

              {/* Body Text */}
              <p className="text-xs text-text-secondary font-light leading-relaxed mb-4">
                {cmsShell.popups.text || "Enjoy a curated discount on your celebration gifts."}
              </p>

              {/* Coupon Box (if promo code detected in text) */}
              {(() => {
                const match = cmsShell.popups.text?.match(/\b(?:code|coupon)\s*:?\s*([A-Z0-9_-]+)/i);
                const code = match ? match[1] : null;
                if (!code) return null;

                return (
                  <div
                    onClick={() => {
                      navigator.clipboard?.writeText(code);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="mb-5 flex items-center justify-between gap-3 p-2.5 px-3.5 rounded-xl border border-dashed border-gold-500/50 bg-gold-50/40 cursor-pointer hover:bg-gold-50 transition group w-full max-w-xs"
                    title="Click to copy coupon code"
                  >
                    <div className="text-left">
                      <span className="block text-[8px] font-bold uppercase tracking-wider text-gold-700">Coupon Code</span>
                      <span className="font-mono text-xs font-bold text-luxury-black tracking-wider">{code}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-800 flex items-center gap-1">
                      {copiedCode ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                          <span>Copy</span>
                        </>
                      )}
                    </span>
                  </div>
                );
              })()}

              {/* CTA Action Button */}
              <Link
                to={cmsShell.popups.buttonLink || "/products"}
                onClick={handleClosePopup}
                className="inline-block rounded-full bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 hover:from-gold-700 hover:via-gold-600 hover:to-gold-700 text-white font-bold tracking-widest text-xs uppercase px-8 py-3.5 transition text-center shadow-md hover:shadow-lg w-full max-w-xs cursor-pointer active:scale-[0.99]"
              >
                {cmsShell.popups.buttonText || "Explore Gifts"}
              </Link>

              {/* Guarantee / Subtext */}
              <p className="mt-3 text-[10px] text-gray-400 font-light tracking-wide">
                Handcrafted with love • Express delivery available
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Floating Concierge & Callback Trigger Button (Customer Storefront Only) */}
      {!isAdminPath && (
        <>
          <aside aria-label="Customer concierge callback" className="fixed bottom-6 right-6 z-40">
            <button
              type="button"
              onClick={() => {
                setShowCallbackModal(true);
                setQuickCallbackError("");
              }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#1C1C1C] hover:bg-black text-gold-400 border border-gold-500/40 shadow-2xl hover:shadow-gold-500/20 transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-95"
              title="Request a Callback from Niyora Concierge"
            >
              <span className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 group-hover:bg-gold-500 group-hover:text-black transition-colors">
                <Phone className="w-4 h-4" />
              </span>
              <div className="text-left pr-1">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-gold-400/80">Concierge Desk</span>
                <span className="block text-xs font-bold text-white tracking-wide">Request Callback</span>
              </div>
            </button>
          </aside>

          {/* Quick Callback Modal */}
          {showCallbackModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
              <div className="w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-3xl border border-gold-300/40 p-6 shadow-2xl text-luxury-black dark:text-white space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-gold-500/15 text-gold-600 dark:text-gold-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-serif font-bold">Niyora Concierge Callback</h3>
                      <p className="text-[10px] text-gray-400">15-Minute Guaranteed SLA Response</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowCallbackModal(false);
                      setQuickCallbackSuccess(null);
                    }}
                    className="text-gray-400 hover:text-black dark:hover:text-white text-lg p-1"
                  >
                    ✕
                  </button>
                </div>

                {quickCallbackSuccess ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto text-xl font-bold">
                      ✓
                    </div>
                    <h4 className="text-base font-serif font-bold text-emerald-600 dark:text-emerald-400">
                      Callback Scheduled!
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                      Our concierge executive has been assigned. You will receive an outbound call shortly.
                    </p>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-white/5 text-xs space-y-1 text-left">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Callback ID:</span>
                        <span className="font-mono font-bold text-luxury-black dark:text-white">{quickCallbackSuccess.callbackCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Ticket Ref:</span>
                        <span className="font-mono font-bold text-gold-600 dark:text-gold-400">{quickCallbackSuccess.ticketCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Target SLA:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Within 15 Minutes</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCallbackModal(false);
                        setQuickCallbackSuccess(null);
                      }}
                      className="w-full py-2.5 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleQuickCallbackSubmit} className="space-y-3 text-xs">
                    {quickCallbackError && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-[11px]">
                        {quickCallbackError}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Your Name *</label>
                      <input
                        type="text"
                        required
                        value={quickCallbackForm.customerName}
                        onChange={(e) => setQuickCallbackForm({ ...quickCallbackForm, customerName: e.target.value })}
                        placeholder="e.g. Priya Sharma"
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 text-xs outline-none focus:border-gold-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={quickCallbackForm.customerPhone}
                        onChange={(e) => setQuickCallbackForm({ ...quickCallbackForm, customerPhone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 text-xs outline-none focus:border-gold-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Preferred Time</label>
                      <select
                        value={quickCallbackForm.preferredTime}
                        onChange={(e) => setQuickCallbackForm({ ...quickCallbackForm, preferredTime: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 text-xs outline-none focus:border-gold-500"
                      >
                        <option value="Immediately / Urgent">⚡ Urgent / Immediately (Within 15 Mins)</option>
                        <option value="Morning (9 AM - 12 PM)">Morning (9:00 AM - 12:00 PM)</option>
                        <option value="Afternoon (12 PM - 4 PM)">Afternoon (12:00 PM - 4:00 PM)</option>
                        <option value="Evening (4 PM - 7 PM)">Evening (4:00 PM - 7:00 PM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Assistance Required</label>
                      <textarea
                        rows={2}
                        value={quickCallbackForm.notes}
                        onChange={(e) => setQuickCallbackForm({ ...quickCallbackForm, notes: e.target.value })}
                        placeholder="Order inquiries, customization, corporate gifts, etc."
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 text-xs outline-none focus:border-gold-500 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={quickCallbackLoading}
                      className="w-full py-3 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs uppercase tracking-widest transition cursor-pointer shadow-md shadow-gold-500/20 disabled:opacity-50"
                    >
                      {quickCallbackLoading ? "Scheduling..." : "Call Me Back"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sticky Mobile Bottom Navigation Bar */}
      {!isAdminRoute && (
        <MobileBottomNav
          onOpenCategories={() => setMobileDrawerOpen(true)}
          onOpenSearch={() => {
            setMobileSearchOpen(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => {
              const searchInput = document.getElementById("gift-search-input");
              if (searchInput) searchInput.focus();
            }, 100);
          }}
        />
      )}
    </div>
  );
}

export default App;
