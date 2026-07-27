import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import api, { resolveMediaUrl } from "../services/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import WishlistButton from "../components/WishlistButton";
import QuantityStepper from "../components/QuantityStepper";
import { mockGiftProducts } from "../data/mockGiftProducts";
import CartToast from "../components/CartToast";
import { 
  Star, Truck, ShieldCheck, HeartHandshake, Gift, 
  Eye, ShoppingBag, X, Check, Mail, Sparkles, ArrowRight 
} from "lucide-react";

const quickCategories = [
  { name: "Birthday", image: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&h=300&fit=crop&crop=center" },
  { name: "Anniversary", image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&h=300&fit=crop&crop=center" },
  { name: "Flowers", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&h=300&fit=crop&crop=center" },
  { name: "Cakes", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop&crop=center" },
  { name: "Personalized Gifts", image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&h=300&fit=crop&crop=center" },
  { name: "Plants", image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=300&fit=crop&crop=center" },
];

const featuredCollections = [
  { title: "Luxury Flower Boxes", subtitle: "Elegant blooms for premium gifting", tag: "Best Seller" },
  { title: "Cake + Bouquet Combos", subtitle: "Perfect celebration pairing", tag: "Most Loved" },
  { title: "Personalized Keepsakes", subtitle: "Custom gifts with lasting memories", tag: "Trending" },
];

const occasionCollections = [
  {
    title: "Romantic Anniversaries",
    subtitle: "Timeless hampers and premium floral bundles designed to celebrate your love story.",
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&fit=crop&q=80",
    link: "/products?category=Anniversary"
  },
  {
    title: "Gifts for Diwali",
    subtitle: "Curated collection of rich sweets, premium nuts, and elegant lanterns to light up their festive season.",
    image: "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=800&fit=crop&q=80",
    link: "/products?category=Flowers"
  },
  {
    title: "Executive Corporate Gifts",
    subtitle: "Distinguished leather goods, desktop essentials, and corporate packages tailored for branding.",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&fit=crop&q=80",
    link: "/products?category=Personalized%20Gifts"
  }
];

const moments = [
  "Birthday Surprises",
  "Anniversary Romance",
  "Thank You Gifts",
  "Get Well Soon",
  "Festive Hampers",
  "Corporate Gifting",
];

const testimonials = [
  { name: "Riya S.", text: "Beautiful packaging and super fast same-day delivery. Loved it!", verified: true },
  { name: "Aman K.", text: "The bouquet + cake combo was exactly like the photo. Great experience.", verified: true },
  { name: "Neha P.", text: "Personalized gift quality was premium. Will order again.", verified: true },
];

const aboutHighlights = [
  { title: "Handpicked Quality", text: "Every product is curated with a focus on freshness, premium presentation and gifting value." },
  { title: "Reliable Delivery", text: "Same-day and slot-based delivery options help your surprise reach on time, every time." },
  { title: "Personal Touch", text: "From custom messages to thoughtful packaging, we help you make each gift truly memorable." },
];

const optimizeUnsplashUrl = (url, width, height) => {
  if (!url) return "";
  if (typeof url !== "string") return url;
  if (url.includes("images.unsplash.com")) {
    let cleanUrl = url;
    cleanUrl = cleanUrl.replace(/&fm=[^&]*/g, "").replace(/\?fm=[^&]*/g, "?");
    cleanUrl = cleanUrl.replace(/&auto=[^&]*/g, "").replace(/\?auto=[^&]*/g, "?");
    if (cleanUrl.includes("?")) {
      cleanUrl += `&fm=webp&q=80`;
    } else {
      cleanUrl += `?fm=webp&q=80`;
    }
    if (width) {
      cleanUrl = cleanUrl.replace(/&w=[^&]*/g, "").replace(/\?w=[^&]*/g, "?");
      cleanUrl += `&w=${width}`;
    }
    if (height) {
      cleanUrl = cleanUrl.replace(/&h=[^&]*/g, "").replace(/\?h=[^&]*/g, "?");
      cleanUrl += `&h=${height}`;
    }
    cleanUrl = cleanUrl.replace(/\?&/g, "?").replace(/\?$/g, "");
    return cleanUrl;
  }
  return url;
};

const Home = () => {
  const navigate = useNavigate();
  const { cartItems, addToCart, updateQuantity } = useCart();
  const { wishlistCount } = useWishlist();

  // Component states
  const [isInteractive, setIsInteractive] = useState(false);
  
  useEffect(() => {
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    const handle = idleCallback(() => setIsInteractive(true));
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
      else clearTimeout(handle);
    };
  }, []);

  // Component states
  const [offers, setOffers] = useState([]);
  const [specialOffer, setSpecialOffer] = useState(null);
  const [countdownText, setCountdownText] = useState("");
  const [cmsContent, setCmsContent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Quick View Modal states
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewImage, setQuickViewImage] = useState("");

  // Toast and Newsletter states
  const [toastMessage, setToastMessage] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subStatus, setSubStatus] = useState("idle"); // idle, loading, success, error
  const [subMessage, setSubMessage] = useState("");

  // Check if special offer window is currently active
  const isSpecialOfferLive = (offer) => {
    if (!offer?.active) return false;
    const now = new Date();
    const start = offer.startDate ? new Date(offer.startDate) : null;
    const end = offer.endDate ? new Date(offer.endDate) : null;
    if (start && !Number.isNaN(start.getTime()) && now < start) return false;
    if (end && !Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      if (now > end) return false;
    }
    return true;
  };

  const formatOfferDate = (dateValue) => {
    if (!dateValue) return "";
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return "";
    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getCountdownText = (dateValue) => {
    if (!dateValue) return "";
    const endDate = new Date(dateValue);
    if (Number.isNaN(endDate.getTime())) return "";
    endDate.setHours(23, 59, 59, 999);
    const remainingMs = endDate.getTime() - Date.now();
    if (remainingMs <= 0) return null;

    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `Ends in ${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `Ends in ${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `Ends in ${minutes}m ${seconds}s`;
    return `Ends in ${seconds}s`;
  };

  // SEO Management
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

    if (cmsContent?.seo?.title) {
      document.title = cmsContent.seo.title;
      if (cmsContent.seo.description) setMeta("description", cmsContent.seo.description);
      if (cmsContent.seo.keywords) setMeta("keywords", cmsContent.seo.keywords);
      if (cmsContent.seo.ogTitle) setMeta("og:title", cmsContent.seo.ogTitle, "property");
      if (cmsContent.seo.ogDescription) setMeta("og:description", cmsContent.seo.ogDescription, "property");
      if (cmsContent.seo.ogImage) setMeta("og:image", cmsContent.seo.ogImage, "property");
    } else {
      document.title = "Niyora Gifts | Flowers, Cakes & Personalized Gifts";
      setMeta("description", "Shop flowers, cakes and personalized gifts at Niyora Gifts with same-day delivery and premium packaging.");
      setMeta("keywords", "gift store, flowers delivery, cakes online, personalized gifts, same day delivery");
      setMeta("og:title", "Niyora Gifts | Flowers, Cakes & Personalized Gifts", "property");
      setMeta("og:description", "Discover curated gifts for birthdays, anniversaries and special moments with fast delivery.", "property");
    }
    setMeta("og:type", "website", "property");

    return () => {
      document.title = previousTitle;
    };
  }, [cmsContent]);

  // Special Offer Countdown Timer
  useEffect(() => {
    if (!specialOffer?.endDate) {
      const timer = setTimeout(() => setCountdownText(""), 0);
      return () => clearTimeout(timer);
    }

    const updateCountdown = () => {
      const next = getCountdownText(specialOffer.endDate);
      if (next === null) {
        setSpecialOffer(null);
        setCountdownText("");
        return;
      }
      setCountdownText(next);
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [specialOffer?.endDate]);

  // Fetch offers & promos
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data } = await api.get("/store-info");
        const liveOffers = Array.isArray(data?.offers) ? data.offers.filter((offer) => offer?.active) : [];
        const topOffer = isSpecialOfferLive(data?.specialOffer) ? data.specialOffer : null;
        setSpecialOffer(topOffer);
        setOffers(liveOffers.slice(0, 4));
      } catch {
        setSpecialOffer(null);
        setOffers([]);
      }
    };
    fetchOffers();
  }, []);

  // Fetch homepage CMS content
  useEffect(() => {
    const fetchHomeContent = async () => {
      try {
        const { data } = await api.get("/cms/content/homepage");
        setCmsContent(data);
      } catch (err) {
        console.error("Failed to load homepage content:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeContent();
  }, []);

  // Fetch products for featured showcase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const { data } = await api.get("/products");
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        } else {
          setProducts(mockGiftProducts);
        }
      } catch (err) {
        console.error("Failed to load products for homepage:", err);
        setProducts(mockGiftProducts);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Sync scroll-reveal class hooks for loaded content
  useEffect(() => {
    if (loading && productsLoading) return;
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
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading, productsLoading, products]);

  // Set initial Quick View image when product changes
  useEffect(() => {
    if (quickViewProduct) {
      setQuickViewImage(quickViewProduct.image || quickViewProduct.images?.[0] || "");
    }
  }, [quickViewProduct]);

  // Quick View Cart Actions Helper
  const quickViewQuantity = useMemo(() => {
    if (!quickViewProduct) return 0;
    const match = cartItems.find((item) => item._id === quickViewProduct._id);
    return match ? match.quantity : 0;
  }, [cartItems, quickViewProduct]);

  const handleQuickViewAdd = () => {
    if (!quickViewProduct) return;
    addToCart(quickViewProduct);
    showAddToast(quickViewProduct.name);
  };

  const handleQuickViewIncrease = () => {
    if (!quickViewProduct) return;
    addToCart(quickViewProduct);
    showAddToast(quickViewProduct.name);
  };

  const handleQuickViewDecrease = () => {
    if (!quickViewProduct) return;
    const current = quickViewQuantity;
    if (current <= 0) return;
    updateQuantity(quickViewProduct._id, current - 1);
  };

  // Toast feedback helper
  const showAddToast = (name) => {
    setToastMessage(`${name} added to cart`);
  };

  // Newsletter subscribe form handler
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
      setSubMessage(response.data?.message || "Subscribed successfully!");
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

  // CMS Mappings & Fallbacks
  const categories = cmsContent?.content?.featuredCategories || quickCategories;
  const reviews = cmsContent?.content?.testimonials || testimonials;
  const highlights = cmsContent?.content?.whyChooseUs || aboutHighlights;
  const heroBgImage = optimizeUnsplashUrl(cmsContent?.content?.heroImages?.[0] || "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1920&q=80", 1920);

  // Slice first 8 products for bestsellers
  const bestsellingProducts = useMemo(() => {
    return products.slice(0, 8);
  }, [products]);

  // Fast cart lookup
  const cartQuantityById = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      acc[item._id] = item.quantity;
      return acc;
    }, {});
  }, [cartItems]);

  if (loading) {
    return (
      <div className="w-full bg-ivory py-20 text-center flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-gold-200/50 border-t-gold-500 animate-spin-normal" />
          <Sparkles className="h-6 w-6 text-gold-500 absolute animate-pulse-subtle" />
        </div>
        <p className="text-sm font-serif italic text-gold-700 tracking-wider">Curating your experience...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-ivory text-luxury-black overflow-hidden space-y-0">
      
      {/* Special Offer Promotional Bar */}
      {specialOffer && (
        <div className="bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 text-white text-xs py-3 px-4 shadow-sm border-b border-gold-700/10">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider">
                {specialOffer.eventName || "PROMO"}
              </span>
              <p className="font-medium tracking-wide">
                <strong>{specialOffer.title}:</strong> {specialOffer.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {countdownText && (
                <span className="font-mono bg-luxury-black/20 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
                  {countdownText}
                </span>
              )}
              {specialOffer.code && (
                <span className="bg-white text-gold-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider">
                  CODE: {specialOffer.code}
                </span>
              )}
              <Link to="/products" className="underline font-bold text-[11px] uppercase tracking-wider hover:text-luxury-black transition">
                {specialOffer.ctaText || "Shop Now"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section (Full-Width) */}
      <section 
        className="relative min-h-[75vh] md:min-h-[88vh] flex items-center justify-center bg-luxury-black text-white relative overflow-hidden"
        style={{ 
          backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.78) 35%, rgba(0, 0, 0, 0.45) 100%), url(${heroBgImage})`, 
          backgroundSize: "cover", 
          backgroundPosition: "center" 
        }}
      >
        {/* Luxury Background Ambient Glows */}
        <div className="absolute -right-24 -top-24 h-[450px] w-[450px] rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 h-[450px] w-[450px] rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-20 relative z-10">
          <div className="max-w-2xl space-y-6 md:space-y-8 animate-page-enter">
            <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-400/25 px-4 py-1.5 rounded-full backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-gold-300" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-gold-300">
                {cmsContent?.content?.heroSubtitle || "The Art of Curated Giving"}
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-light font-serif leading-[1.1] text-white">
              {cmsContent?.content?.heroTitle ? (
                <span dangerouslySetInnerHTML={{ __html: cmsContent.content.heroTitle }} />
              ) : (
                <>Celebrate every moment with <span className="italic font-serif text-gold-300 font-normal">premium gifts</span></>
              )}
            </h1>
            
            <p className="text-sm sm:text-base leading-relaxed text-gray-300/90 font-light tracking-wide max-w-xl">
              {cmsContent?.content?.heroDescription || "Flowers, cakes, and personalized surprises crafted with absolute elegance, delivered with care, and remembered forever."}
            </p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              <Link 
                to={cmsContent?.content?.heroButtonLink || "/products"} 
                className="rounded-full bg-gold-500 hover:bg-gold-600 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:shadow-gold-500/15 hover:-translate-y-0.5 transition-all duration-300"
              >
                {cmsContent?.content?.heroButtonText || "Explore Catalog"}
              </Link>
              <Link 
                to="/about" 
                className="rounded-full border border-white/20 hover:border-gold-300 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:text-gold-300 hover:bg-white/5 transition-all duration-300"
              >
                Our Story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / USP Strip (Full-Width) */}
      <section className="bg-white border-y border-champagne/45 py-8 shadow-xs relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-gold-50 border border-gold-100 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5 text-gold-600" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-luxury-black">Free Shipping</h4>
              <p className="text-xs text-text-secondary font-light mt-1 leading-relaxed">On order values above ₹999. Secured priority dispatch.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-gold-50 border border-gold-100 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-gold-600" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-luxury-black">Handpicked Quality</h4>
              <p className="text-xs text-text-secondary font-light mt-1 leading-relaxed">Every boutique item is vetted for fresh, high-end presentation.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-gold-50 border border-gold-100 flex items-center justify-center shrink-0">
              <HeartHandshake className="h-5 w-5 text-gold-600" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-luxury-black">Easy Exchanges</h4>
              <p className="text-xs text-text-secondary font-light mt-1 leading-relaxed">7-day hassle-free replacement on damaged arrivals.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-gold-50 border border-gold-100 flex items-center justify-center shrink-0">
              <Gift className="h-5 w-5 text-gold-600" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-luxury-black">Bespoke Wrapping</h4>
              <p className="text-xs text-text-secondary font-light mt-1 leading-relaxed">Luxury gift wrapping and premium handwritten note cards.</p>
            </div>
          </div>

        </div>
      </section>

      {/* Page Content Container (Contained to Max Width) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 space-y-24">
        
        {/* Category Showcase Section */}
        <section className="scroll-reveal space-y-12">
          <div className="text-center space-y-3 max-w-lg mx-auto">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-600">
              Curated Collections
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-luxury-black">
              Shop by Category
            </h2>
            <div className="w-12 h-0.5 bg-gold-500 mx-auto mt-2 rounded" />
            <p className="text-xs text-text-secondary font-light leading-relaxed">
              Explore our boutique selections crafted carefully for every relationship and emotional moment.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
            {categories.map((category, idx) => (
              <Link
                key={`${category.name}-${idx}`}
                to={`/products?category=${encodeURIComponent(category.name)}`}
                className="group flex flex-col items-center gap-3 transition shrink-0"
              >
                <div 
                  className="relative w-full aspect-square overflow-hidden rounded-full shadow-md border-4 border-white group-hover:border-gold-400 group-hover:shadow-lg transition-all duration-500 hover:-translate-y-1 bg-gray-100"
                  style={{ backgroundImage: `url(${optimizeUnsplashUrl(category.image, 300, 300)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="absolute inset-0 bg-luxury-black/30 group-hover:bg-luxury-black/45 transition-colors duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center p-2.5">
                    <span className="text-center text-xs font-bold uppercase tracking-widest text-white leading-relaxed">
                      {category.name}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured/Bestselling Products Section */}
        <section className="scroll-reveal space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-champagne/45 pb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-600">
                Top Selections
              </p>
              <h2 className="text-2xl md:text-3.5xl font-serif font-bold text-luxury-black">
                Bestselling Surprises
              </h2>
              <p className="text-xs text-text-secondary font-light">
                Handpicked customer favorites, guaranteed to spark joy and sweet memories.
              </p>
            </div>
            <Link 
              to="/products" 
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-luxury-black hover:text-gold-600 transition shrink-0 group"
            >
              Explore Catalog 
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-[380px] animate-pulse rounded-3xl bg-white shadow-xs border border-champagne/30" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {bestsellingProducts.map((product) => {
                const quantityInCart = cartQuantityById[product._id] || 0;
                const imageUrl = resolveMediaUrl(product.image || product.images?.[0] || "https://via.placeholder.com/600x400?text=Gift");
                const productUrl = `/products/${product.slug || product._id}`;
                
                return (
                  <article 
                    key={product._id} 
                    className="group relative flex flex-col justify-between h-full bg-white rounded-[24px] border border-champagne/35 overflow-hidden shadow-xs hover:shadow-lg hover:border-gold-300/40 hover:-translate-y-1.5 transition-all duration-350"
                  >
                    <div className="relative overflow-hidden aspect-[4/5] bg-gold-50/20">
                      <img
                        src={optimizeUnsplashUrl(imageUrl, 400, 500)}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                        width="400"
                        height="500"
                      />
                      
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-gold-700 shadow-xs border border-gold-200/20 backdrop-blur-xs">
                          {product.category}
                        </span>
                        {quantityInCart > 0 && (
                          <span className="rounded-full bg-gold-500 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white shadow-xs">
                            {quantityInCart} In Cart
                          </span>
                        )}
                      </div>
                      
                      <WishlistButton product={product} className="absolute top-3 right-3 z-10" />

                      {/* Hover Actions Overlay */}
                      <div className="absolute inset-0 bg-luxury-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-350 flex items-center justify-center gap-3 backdrop-blur-xs">
                        <button
                          type="button"
                          onClick={() => setQuickViewProduct(product)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-luxury-black hover:bg-gold-500 hover:text-white hover:scale-105 shadow-md transition cursor-pointer"
                          title="Quick View"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(product);
                            showAddToast(product.name);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-luxury-black hover:bg-gold-500 hover:text-white hover:scale-105 shadow-md transition cursor-pointer"
                          title="Add to Cart"
                        >
                          <ShoppingBag className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="text-base font-serif font-semibold text-luxury-black group-hover:text-gold-600 transition-colors line-clamp-1">
                          <Link to={productUrl}>{product.name}</Link>
                        </h3>
                        <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary font-light">
                          {product.description || "Bespoke gift curated with care."}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-gold-100/10">
                        <div>
                          <span className="text-[9px] font-medium uppercase tracking-wider text-text-secondary">Starting at</span>
                          <p className="text-base font-semibold font-serif text-luxury-black">INR {product.price}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuickViewProduct(product)}
                          className="rounded-full border border-champagne hover:border-gold-300 bg-white hover:bg-gold-50/50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-luxury-black hover:text-gold-600 transition cursor-pointer"
                        >
                          Explore
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Highlight/Featured Collections Intro (3 columns) */}
        <section className="scroll-reveal grid gap-6 md:grid-cols-3">
          {featuredCollections.map((item, idx) => (
            <article 
              key={`${item.title}-${idx}`} 
              className="rounded-2xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 hover:border-gold-300/40 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-gold-600">{item.tag}</span>
                <h3 className="text-lg font-bold font-serif text-luxury-black">{item.title}</h3>
                <p className="text-xs leading-5 text-text-secondary font-light">{item.subtitle}</p>
              </div>
              <Link to="/products" className="mt-5 inline-flex items-center text-xs font-bold uppercase tracking-wider text-luxury-black hover:text-gold-600 transition">
                Explore Collection →
              </Link>
            </article>
          ))}
        </section>

        {/* Occasion-Based Collections Section */}
        <section className="scroll-reveal space-y-12">
          <div className="text-center space-y-3 max-w-lg mx-auto">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-600">
              Bespoke Occasions
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-luxury-black">
              Curated for the Moment
            </h2>
            <div className="w-12 h-0.5 bg-gold-500 mx-auto mt-2 rounded" />
            <p className="text-xs text-text-secondary font-light leading-relaxed">
              Timeless seasonal gift packages hand-styled by our design team for specific occasions.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {occasionCollections.map((item, idx) => (
              <div 
                key={idx}
                className="group relative rounded-3xl overflow-hidden shadow-md h-80 flex items-end p-6 border border-gold-200/10 hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-108"
                  style={{ backgroundImage: `url(${optimizeUnsplashUrl(item.image, 600, 600)})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent group-hover:via-black/50 transition-colors duration-300" />
                
                <div className="relative z-10 space-y-2 text-white">
                  <h3 className="text-xl font-serif font-semibold text-white tracking-wide">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-300 font-light leading-relaxed">
                    {item.subtitle}
                  </p>
                  <Link 
                    to={item.link} 
                    className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-gold-300 hover:text-white pt-2 transition"
                  >
                    Discover Collection →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Emotion collections / lists */}
        <section className="scroll-reveal rounded-3xl border border-champagne/45 bg-white p-8 md:p-12 shadow-xs">
          <div className="grid gap-8 md:grid-cols-[1fr_2fr] items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-600">Thoughtful Selection</p>
              <h2 className="text-2xl md:text-3.5xl font-serif font-bold text-luxury-black">Gifts for Every Emotion</h2>
              <p className="text-xs text-text-secondary font-light leading-relaxed">
                From birthdays to corporate events, find curated packages built to deliver your sentiments beautifully.
              </p>
              <Link to="/products" className="inline-block rounded-full bg-luxury-black hover:bg-gold-500 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow transition duration-300">
                Browse All Occasions
              </Link>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {moments.map((moment, idx) => (
                <div 
                  key={idx} 
                  className="rounded-xl bg-gold-50/45 px-5 py-4 text-xs font-bold uppercase tracking-wider text-gold-800 border border-gold-100/35 hover:bg-gold-50 hover:border-gold-300/40 transition duration-300 flex items-center gap-2.5 shadow-2xs"
                >
                  <span className="h-2 w-2 rounded-full bg-gold-500 shadow-sm shrink-0" />
                  {moment}
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* Testimonials Section */}
        {isInteractive && (
          <section className="scroll-reveal space-y-12">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-champagne/45 pb-6">
              <div className="space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-600">Client voices</p>
                <h2 className="text-2xl md:text-3.5xl font-serif font-bold text-luxury-black">What Customers Say</h2>
              </div>
              <span className="rounded-full bg-gold-50 border border-gold-200/35 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-800 shadow-2xs">
                Trusted by Gifting Lovers
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {reviews.map((review, idx) => (
                <article 
                  key={`${review.name}-${idx}`} 
                  className="rounded-2xl border border-champagne/40 bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-300"
                >
                  <div>
                    <div className="mb-4 flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current text-gold-500 stroke-gold-500" />
                      ))}
                    </div>
                    <p className="text-xs italic leading-relaxed text-text-secondary font-light font-serif">
                      "{review.text}"
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-2 border-t border-champagne/20 pt-4">
                    <p className="text-xs font-extrabold text-gold-700 uppercase tracking-wider">{review.name}</p>
                    {review.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold-100/50 px-2.5 py-0.5 text-[9px] font-bold text-gold-800 uppercase tracking-wider">
                        <ShieldCheck className="h-3 w-3" /> Verified Buyer
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Newsletter Signup (Subtle discount card) */}
        {isInteractive && (
          <section className="scroll-reveal rounded-3xl bg-gradient-to-br from-gold-50/70 via-ivory to-gold-100/50 border border-gold-300/25 p-8 md:p-16 shadow-xs flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-gold-200/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-gold-300/5 blur-3xl pointer-events-none" />

            <div className="p-3 bg-gold-500/10 border border-gold-400/20 rounded-full backdrop-blur-xs">
              <Mail className="h-6 w-6 text-gold-600" />
            </div>

            <div className="space-y-2 max-w-xl">
              <h2 className="text-2xl md:text-4xl font-serif font-bold text-luxury-black">Savor the Art of Giving</h2>
              <p className="text-xs md:text-sm text-text-secondary font-light leading-relaxed">
                Subscribe to the Niyora circle for curated seasonal guides, exclusive boutique product releases, and 10% off your first luxury gift.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="w-full max-w-md flex flex-col sm:flex-row gap-2 relative z-10">
              <input
                type="email"
                placeholder="Your luxury email address"
                value={newsletterEmail}
                onChange={handleEmailChange}
                disabled={subStatus === "loading"}
                required
                className="flex-1 rounded-full border border-champagne bg-white px-5 py-3 text-xs text-luxury-black placeholder-gray-400 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/10 transition duration-300"
              />
              <button
                type="submit"
                disabled={subStatus === "loading"}
                className="rounded-full bg-luxury-black hover:bg-gold-500 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 shadow cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 shrink-0"
              >
                {subStatus === "loading" ? "Subscribing..." : "Join Circle"}
              </button>
            </form>

            {/* Newsletter Alerts */}
            {subStatus === "success" && (
              <div className="flex items-center gap-2 rounded-full border border-gold-800/15 bg-gold-100/50 px-4 py-1.5 text-[11px] text-gold-800 shadow-sm animate-fade-in">
                <Check className="h-4 w-4 text-gold-600 stroke-[3px]" />
                <span>{subMessage}</span>
              </div>
            )}

            {subStatus === "error" && (
              <div className="flex items-center gap-2 rounded-full border border-red-900/15 bg-red-100/50 px-4 py-1.5 text-[11px] text-red-700 shadow-sm animate-fade-in">
                <X className="h-4 w-4 text-red-500 stroke-[3px]" />
                <span>{subMessage}</span>
              </div>
            )}
          </section>
        )}

      </div>

      {/* Quick View Modal Overlay */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gold-200/20 max-h-[92vh] overflow-y-auto animate-page-enter"
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* Close button */}
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 z-20 bg-white/95 hover:bg-white text-luxury-black rounded-full p-2.5 shadow-md transition duration-200 cursor-pointer border border-gold-200/10"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="grid md:grid-cols-2 h-full">
              {/* Column 1: Image Gallery */}
              <div 
                className="bg-[#FCF9F2] p-6 md:p-8 flex flex-col justify-between border-r border-champagne/40"
                style={{ backgroundColor: '#fcf9f2' }}
              >
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xs border border-champagne/20 bg-white relative">
                  <img
                    src={resolveMediaUrl(quickViewImage || quickViewProduct.image || quickViewProduct.images?.[0])}
                    alt={quickViewProduct.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-gold-700 shadow-xs border border-gold-200/20 backdrop-blur-xs">
                      {quickViewProduct.category}
                    </span>
                  </div>
                </div>
                
                {/* Thumbnails */}
                {quickViewProduct.images && quickViewProduct.images.length > 1 ? (
                  <div className="flex gap-2.5 mt-4 overflow-x-auto no-scrollbar py-1">
                    {quickViewProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuickViewImage(img)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                          quickViewImage === img ? "border-gold-500 shadow-sm" : "border-champagne hover:border-gold-300"
                        }`}
                      >
                        <img src={resolveMediaUrl(img)} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-center p-4 border border-dashed border-champagne/40 rounded-xl bg-white/30 text-[10px] text-text-secondary uppercase tracking-widest">
                    Signature Gift Presentation
                  </div>
                )}
              </div>

              {/* Column 2: Product Info */}
              <div 
                className="p-6 md:p-8 flex flex-col justify-between space-y-6 bg-white"
                style={{ backgroundColor: '#ffffff' }}
              >
                <div className="space-y-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gold-600 block">
                    {quickViewProduct.category}
                  </span>
                  <h2 className="text-xl md:text-3xl font-serif font-bold text-luxury-black">
                    {quickViewProduct.name}
                  </h2>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current text-gold-500 stroke-gold-500" />
                    ))}
                    <span className="text-xs text-text-secondary font-light ml-2">(15 verified reviews)</span>
                  </div>

                  {/* Price */}
                  <p className="text-xl md:text-2xl font-semibold font-serif text-gold-700">
                    INR {quickViewProduct.price}
                  </p>

                  <div className="w-full h-px bg-champagne/30" />

                  <p className="text-xs md:text-sm leading-relaxed text-text-secondary font-light">
                    {quickViewProduct.description || "A premium curated gift, beautifully styled and prepared to make their day unforgettable. Includes handpicked accessories and signature packaging."}
                  </p>
                  
                  {/* USP Bullet points */}
                  <ul className="space-y-2 text-xs text-luxury-black font-light pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-gold-600 stroke-[3px] shrink-0" /> Freshly prepared and hand-wrapped
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-gold-600 stroke-[3px] shrink-0" /> Hand-written premium message card included
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-gold-600 stroke-[3px] shrink-0" /> Guaranteed on-time delivery
                    </li>
                  </ul>
                </div>

                <div className="space-y-4 pt-4 border-t border-champagne/30">
                  {/* Cart Actions */}
                  <div className="flex items-center gap-4">
                    {quickViewQuantity > 0 ? (
                      <div className="flex-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary block mb-1">Adjust Quantity</span>
                        <QuantityStepper
                          quantity={quickViewQuantity}
                          onDecrease={handleQuickViewDecrease}
                          onIncrease={handleQuickViewIncrease}
                          className="rounded-full border-champagne bg-white w-full h-11 flex justify-between items-center px-4"
                          buttonClassName="h-7 w-7 text-luxury-black hover:bg-gold-50"
                          valueClassName="text-luxury-black font-bold text-xs"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={handleQuickViewAdd}
                        className="flex-1 rounded-full bg-luxury-black hover:bg-gold-600 text-white font-bold uppercase tracking-widest text-xs h-11 shadow hover:shadow-gold-500/10 transition-all duration-300 cursor-pointer"
                      >
                        Add to Cart
                      </button>
                    )}
                    
                    <WishlistButton product={quickViewProduct} className="rounded-full border border-champagne p-3.5 hover:bg-gold-50" />
                  </div>
                  
                  <Link
                    to={`/products/${quickViewProduct.slug || quickViewProduct._id}`}
                    onClick={() => setQuickViewProduct(null)}
                    className="block text-center text-xs font-bold uppercase tracking-wider text-gold-700 hover:text-gold-800 underline transition"
                  >
                    View Full Details & Delivery Slots
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Add Notification */}
      <CartToast message={toastMessage} onClose={() => setToastMessage("")} />

    </div>
  );
};

export default Home;
