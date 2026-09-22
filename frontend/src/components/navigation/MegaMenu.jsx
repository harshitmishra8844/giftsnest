import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Gift,
  Heart,
  Sparkles,
  Flame,
  Cake,
  Calendar,
  Smile,
  Home,
  Crown,
  SmilePlus,
  Briefcase,
  Users,
  Image,
  Type,
  Sun,
  Palette,
  Coffee,
  Shapes,
  ArrowRight,
  Compass,
  Star
} from "lucide-react";

export const OCCASIONS = [
  { name: "Birthday Gifts", category: "Birthday", icon: Cake, desc: "Cakes, blooms & custom keepsakes" },
  { name: "Anniversary Gifts", category: "Anniversary", icon: Calendar, desc: "Romantic hampers & photo frames" },
  { name: "Wedding Gifts", category: "Wedding", icon: Crown, desc: "Luxury couple sets & personalized decor" },
  { name: "Love & Romantic Gifts", category: "Romantic", icon: Heart, desc: "Message cards, crystal balls & roses" },
  { name: "Baby Shower Gifts", category: "Baby Shower", icon: SmilePlus, desc: "Sweet bundles for new beginnings" },
  { name: "Housewarming Gifts", category: "Housewarming", icon: Home, desc: "Artisan home decor & aroma lamps" },
  { name: "Retirement Gifts", category: "Retirement", icon: Briefcase, desc: "Executive memorabilia & premium pens" },
  { name: "Farewell Gifts", category: "Farewell", icon: Compass, desc: "Thoughtful tokens of appreciation" },
  { name: "Festival Gifts", category: "Festival", icon: Sparkles, desc: "Diwali, New Year & festive sweets" },
];

export const RELATIONS = [
  { name: "Gifts For Husband", category: "Husband", desc: "Leather accessories & personalized mugs" },
  { name: "Gifts For Wife", category: "Wife", desc: "Crystal lights & customized jewelry boxes" },
  { name: "Gifts For Boyfriend", category: "Boyfriend", desc: "Romantic cards & personalized desk lamps" },
  { name: "Gifts For Girlfriend", category: "Girlfriend", desc: "Teddy bouquets, chocolates & keepsakes" },
  { name: "Gifts For Mother", category: "Mother", desc: "Heartfelt wooden frames & spiritual lamps" },
  { name: "Gifts For Father", category: "Father", desc: "Sophisticated keepsakes & customized bottles" },
  { name: "Gifts For Brother", category: "Brother", desc: "Quirky caricatures & tech combos" },
  { name: "Gifts For Sister", category: "Sister", desc: "Personalized lamps & beauty hampers" },
  { name: "Gifts For Friends", category: "Friends", desc: "Fun tokens & memory card sets" },
  { name: "Gifts For Kids", category: "Kids", desc: "3D animal lamps & celebration cakes" },
];

export const PERSONALIZED = [
  { name: "Photo Frames", category: "Photo Frames", icon: Image, desc: "Engraved wooden & acrylic frames" },
  { name: "Name Gifts", category: "Name Gifts", icon: Type, desc: "Bespoke names carved in wood & metal" },
  { name: "LED Gifts", category: "LED Gifts", icon: Sun, desc: "3D illusion lamps & glowing crystal balls" },
  { name: "Engraved Gifts", category: "Engraved Gifts", icon: Palette, desc: "Laser engraved wallets, pens & wood" },
  { name: "Custom Mugs", category: "Custom Mugs", icon: Coffee, desc: "Magic mugs & high-gloss ceramic prints" },
  { name: "Custom Cushions", category: "Cushions", icon: Shapes, desc: "Soft velvet & sequin printed pillows" },
  { name: "Custom Wooden Gifts", category: "Wooden Gifts", icon: Sparkles, desc: "Handcrafted pine plaques & blocks" },
];

export const TRENDING = [
  { name: "Best Sellers", query: "filter=bestsellers", icon: Crown, desc: "Most purchased customer favorites" },
  { name: "New Arrivals", query: "filter=new", icon: Sparkles, desc: "Fresh designs added this month" },
  { name: "Most Loved", query: "filter=most-loved", icon: Heart, desc: "Top rated with 5-star verified reviews" },
  { name: "Curated Hampers", query: "category=Hampers", icon: Gift, desc: "All-in-one celebration bundles" },
];

const MegaMenu = () => {
  const [activeMenu, setActiveMenu] = useState(null);
  const closeTimeoutRef = useRef(null);

  const handleMouseEnter = (menuName) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setActiveMenu(menuName);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 220);
  };

  // Close when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setActiveMenu(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const closeMenu = () => setActiveMenu(null);

  return (
    <nav aria-label="Catalog categories" className="relative hidden md:block bg-white border-b border-champagne/40">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <ul className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-luxury-black">
          
          {/* 1. Shop by Occasion */}
          <li 
            className="group"
            onMouseEnter={() => handleMouseEnter("occasion")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setActiveMenu((prev) => (prev === "occasion" ? null : "occasion"))}
              className={`flex items-center gap-1.5 py-3 hover:text-gold-600 transition cursor-pointer ${
                activeMenu === "occasion" ? "text-gold-600 font-bold" : ""
              }`}
              aria-expanded={activeMenu === "occasion"}
            >
              <Gift className="h-3.5 w-3.5 text-gold-500" />
              <span>Shop by Occasion</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${
                activeMenu === "occasion" ? "rotate-180" : ""
              }`} />
            </button>
          </li>

          {/* 2. Shop by Relation */}
          <li 
            className="group"
            onMouseEnter={() => handleMouseEnter("relation")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setActiveMenu((prev) => (prev === "relation" ? null : "relation"))}
              className={`flex items-center gap-1.5 py-3 hover:text-gold-600 transition cursor-pointer ${
                activeMenu === "relation" ? "text-gold-600 font-bold" : ""
              }`}
              aria-expanded={activeMenu === "relation"}
            >
              <Users className="h-3.5 w-3.5 text-gold-500" />
              <span>Shop by Relation</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${
                activeMenu === "relation" ? "rotate-180" : ""
              }`} />
            </button>
          </li>

          {/* 3. Personalized Gifts */}
          <li 
            className="group"
            onMouseEnter={() => handleMouseEnter("personalized")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setActiveMenu((prev) => (prev === "personalized" ? null : "personalized"))}
              className={`flex items-center gap-1.5 py-3 hover:text-gold-600 transition cursor-pointer ${
                activeMenu === "personalized" ? "text-gold-600 font-bold" : ""
              }`}
              aria-expanded={activeMenu === "personalized"}
            >
              <Sparkles className="h-3.5 w-3.5 text-gold-500" />
              <span>Personalized Gifts</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${
                activeMenu === "personalized" ? "rotate-180" : ""
              }`} />
            </button>
          </li>

          {/* 4. Trending Gifts */}
          <li 
            className="group"
            onMouseEnter={() => handleMouseEnter("trending")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setActiveMenu((prev) => (prev === "trending" ? null : "trending"))}
              className={`flex items-center gap-1.5 py-3 hover:text-gold-600 transition cursor-pointer ${
                activeMenu === "trending" ? "text-gold-600 font-bold" : ""
              }`}
              aria-expanded={activeMenu === "trending"}
            >
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span>Trending Gifts</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${
                activeMenu === "trending" ? "rotate-180" : ""
              }`} />
            </button>
          </li>

          {/* Quick Direct Links */}
          <li className="flex items-center gap-6">
            <Link
              to="/products"
              className="py-3 hover:text-gold-600 transition"
              onClick={closeMenu}
            >
              All Gifts
            </Link>

            <Link
              to="/track-order"
              className="py-3 text-text-secondary hover:text-gold-600 transition flex items-center gap-1 normal-case font-medium"
              onClick={closeMenu}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Track Order</span>
            </Link>
          </li>

        </ul>
      </div>

      {/* DROPDOWN OVERLAYS */}
      {activeMenu && (
        <>
          {/* Subtle dimming backdrop scrim behind the mega-menu covering the page */}
          <div
            className="fixed inset-x-0 bottom-0 top-[120px] bg-black/40 backdrop-blur-[2px] z-30 transition-opacity duration-300 pointer-events-auto"
            onClick={closeMenu}
            onMouseEnter={handleMouseLeave}
          />
          <div
            onMouseEnter={() => handleMouseEnter(activeMenu)}
            onMouseLeave={handleMouseLeave}
            style={{ backgroundColor: "#ffffff" }}
            className="absolute left-0 right-0 top-full z-40 bg-white border-b-2 border-champagne/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] animate-scale-up-sm"
          >
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

            {/* Panel 1: OCCASIONS */}
            {activeMenu === "occasion" && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 grid grid-cols-3 gap-6">
                  {OCCASIONS.map((occ) => {
                    const Icon = occ.icon;
                    return (
                      <Link
                        key={occ.name}
                        to={`/products?category=${encodeURIComponent(occ.category)}`}
                        onClick={closeMenu}
                        className="group/item flex items-start gap-3 p-2.5 rounded-xl hover:bg-gold-50/50 transition duration-150"
                      >
                        <div className="p-2 rounded-lg bg-gold-50 group-hover/item:bg-gold-500 group-hover/item:text-white text-gold-600 transition shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-luxury-black group-hover/item:text-gold-600 transition">
                            {occ.name}
                          </p>
                          <p className="text-[11px] text-text-secondary font-light mt-0.5 leading-snug">
                            {occ.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Promotional Card */}
                <div className="col-span-4 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-700 text-white p-6 flex flex-col justify-between shadow-md relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  <div className="space-y-2 relative z-10">
                    <span className="bg-white/20 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider">
                      Celebration Special
                    </span>
                    <h4 className="text-lg font-serif font-bold text-white leading-tight">
                      Curated Celebration Gift Hampers
                    </h4>
                    <p className="text-xs text-gold-100 font-light leading-relaxed">
                      Handcrafted with flowers, personalized cards & keepsake boxes ready for gifting.
                    </p>
                  </div>
                  <Link
                    to="/products"
                    onClick={closeMenu}
                    className="inline-flex items-center gap-2 bg-white text-luxury-black hover:bg-gold-50 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition self-start mt-4 shadow-sm"
                  >
                    <span>Explore Hampers</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gold-600" />
                  </Link>
                </div>
              </div>
            )}

            {/* Panel 2: RELATIONS */}
            {activeMenu === "relation" && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-5">
                  {RELATIONS.map((rel) => (
                    <Link
                      key={rel.name}
                      to={`/products?category=${encodeURIComponent(rel.category)}`}
                      onClick={closeMenu}
                      className="group/item p-3 rounded-xl hover:bg-gold-50/50 border border-transparent hover:border-gold-200/50 transition duration-150"
                    >
                      <p className="text-xs font-bold text-luxury-black group-hover/item:text-gold-600 transition flex items-center justify-between">
                        <span>{rel.name}</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover/item:opacity-100 transition-opacity text-gold-600" />
                      </p>
                      <p className="text-[11px] text-text-secondary font-light mt-1 leading-snug">
                        {rel.desc}
                      </p>
                    </Link>
                  ))}
                </div>

                {/* Promotional Card */}
                <div className="col-span-4 rounded-2xl bg-luxury-black text-white p-6 flex flex-col justify-between shadow-md border border-gold-400/20 relative overflow-hidden">
                  <div className="space-y-2 relative z-10">
                    <span className="bg-gold-500/20 text-gold-300 border border-gold-400/30 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider">
                      Love & Care
                    </span>
                    <h4 className="text-lg font-serif font-bold text-white leading-tight">
                      Gifts Handcrafted for Those Who Matter Most
                    </h4>
                    <p className="text-xs text-gray-300 font-light leading-relaxed">
                      Make their day unforgettable with customizable engravings and sentimental cards.
                    </p>
                  </div>
                  <Link
                    to="/products?category=Personalized"
                    onClick={closeMenu}
                    className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition self-start mt-4 shadow-sm"
                  >
                    <span>Shop All Relations</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Panel 3: PERSONALIZED GIFTS */}
            {activeMenu === "personalized" && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {PERSONALIZED.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={`/products?category=${encodeURIComponent(item.category)}`}
                        onClick={closeMenu}
                        className="group/item flex items-start gap-3 p-3 rounded-xl hover:bg-gold-50/50 transition duration-150"
                      >
                        <div className="p-2 rounded-lg bg-gold-50 group-hover/item:bg-gold-500 group-hover/item:text-white text-gold-600 transition shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-luxury-black group-hover/item:text-gold-600 transition">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-text-secondary font-light mt-0.5 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Promotional Card */}
                <div className="col-span-4 rounded-2xl bg-gold-50 border border-gold-200/60 p-6 flex flex-col justify-between shadow-xs">
                  <div className="space-y-2">
                    <span className="bg-gold-600 text-white px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider">
                      Laser Engraving
                    </span>
                    <h4 className="text-lg font-serif font-bold text-luxury-black leading-tight">
                      Photo & Name Customization
                    </h4>
                    <p className="text-xs text-text-secondary font-light leading-relaxed">
                      Upload photos or write custom heartfelt messages. High precision engraving delivered in 2-4 days.
                    </p>
                  </div>
                  <Link
                    to="/products?category=Personalized"
                    onClick={closeMenu}
                    className="inline-flex items-center gap-2 bg-luxury-black hover:bg-gold-600 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition self-start mt-4 shadow-sm"
                  >
                    <span>Customize a Gift</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Panel 4: TRENDING GIFTS */}
            {activeMenu === "trending" && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 grid grid-cols-2 gap-6">
                  {TRENDING.map((trend) => {
                    const Icon = trend.icon;
                    return (
                      <Link
                        key={trend.name}
                        to={`/products?${trend.query}`}
                        onClick={closeMenu}
                        className="group/item flex items-start gap-3.5 p-4 rounded-2xl border border-champagne/50 hover:border-gold-300 hover:bg-gold-50/30 transition duration-200"
                      >
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-gold-50 to-gold-100 group-hover/item:from-gold-500 group-hover/item:to-gold-600 group-hover/item:text-white text-gold-600 transition shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-serif font-bold text-luxury-black group-hover/item:text-gold-600 transition">
                            {trend.name}
                          </p>
                          <p className="text-xs text-text-secondary font-light mt-1 leading-relaxed">
                            {trend.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Promotional Card */}
                <div className="col-span-4 rounded-2xl bg-gradient-to-br from-luxury-black to-zinc-900 text-white p-6 flex flex-col justify-between shadow-md border border-gold-500/20">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-gold-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-gold-400" />
                      ))}
                      <span className="text-[10px] text-gray-300 ml-1">4.9 / 5.0 Rated</span>
                    </div>
                    <h4 className="text-lg font-serif font-bold text-white leading-tight">
                      Customer Favorites Showcase
                    </h4>
                    <p className="text-xs text-gray-300 font-light leading-relaxed">
                      Discover the most cherished surprises loved by over 10,000+ happy gifters.
                    </p>
                  </div>
                  <Link
                    to="/products"
                    onClick={closeMenu}
                    className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition self-start mt-4 shadow-sm"
                  >
                    <span>View All Top Rated</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
        </>
      )}
    </nav>
  );
};

export default MegaMenu;
