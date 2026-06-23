import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";

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

const Home = () => {
  const [offers, setOffers] = useState([]);
  const [specialOffer, setSpecialOffer] = useState(null);
  const [countdownText, setCountdownText] = useState("");

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

  /** @returns {string|null} label, or null when the offer window has ended */
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

    document.title = "Niyora Gifts | Flowers, Cakes & Personalized Gifts";
    setMeta("description", "Shop flowers, cakes and personalized gifts at Niyora Gifts with same-day delivery and premium packaging.");
    setMeta("keywords", "gift store, flowers delivery, cakes online, personalized gifts, same day delivery");
    setMeta("og:title", "Niyora Gifts | Flowers, Cakes & Personalized Gifts", "property");
    setMeta("og:description", "Discover curated gifts for birthdays, anniversaries and special moments with fast delivery.", "property");
    setMeta("og:type", "website", "property");

    return () => {
      document.title = previousTitle;
    };
  }, []);

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

  return (
    <div className="space-y-10">
      {specialOffer ? (
        <section className="fade-in-up scroll-reveal rounded-2xl border border-gold-300/40 bg-gradient-to-r from-gold-50/60 via-cream/50 to-gold-100/60 p-5 shadow-sm md:p-6 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-600">
                {specialOffer.eventName || "Special Event Offer"}
              </p>
              <h2 className="text-xl font-bold font-serif text-luxury-black md:text-2xl">{specialOffer.title}</h2>
              <p className="text-sm text-text-secondary font-light">{specialOffer.subtitle}</p>
              {specialOffer.endDate ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
                  <p className="inline-flex items-center rounded-full border border-gold-250 bg-gold-50/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-700">
                    Offer ends on {formatOfferDate(specialOffer.endDate)}
                  </p>
                  {countdownText ? (
                    <p className="inline-flex items-center rounded-full border border-gold-250 bg-gold-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-700">
                      {countdownText}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {specialOffer.code ? (
                <span className="rounded-full border border-gold-200 bg-white px-3.5 py-1.5 text-xs font-bold tracking-widest text-gold-700 shadow-sm">
                  CODE: {specialOffer.code}
                </span>
              ) : null}
              <Link
                to="/products"
                className="rounded-full bg-luxury-black hover:bg-gold-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition-all duration-300 cursor-pointer"
              >
                {specialOffer.ctaText || "Explore"}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="fade-in-up scroll-reveal rounded-3xl bg-luxury-black text-white shadow-2xl p-8 md:p-16 relative overflow-hidden border border-gold-500/20">
        {/* Luxury Background Glows */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />

        <div className="grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr] relative z-10">
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold-400/90">Curated Boutique</p>
            <h1 className="text-4xl font-light font-serif leading-[1.15] md:text-6xl text-white">
              Celebrate every moment with <span className="italic font-serif text-gold-300 font-normal">premium gifts</span>
            </h1>
            <p className="max-w-xl text-sm leading-8 text-gray-300/80 font-light tracking-wide md:text-base">
              Flowers, cakes, and personalized surprises crafted with elegance, delivered with care, and remembered forever.
            </p>
            <div className="mt-2 flex flex-wrap gap-4 pt-1">
              <Link to="/products" className="rounded-full bg-gold-500 hover:bg-gold-600 px-7 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md transition duration-300 font-semibold">
                Explore Catalog
              </Link>
              <Link to="/about" className="rounded-full border border-white/20 hover:border-gold-300 px-7 py-3 text-xs font-bold uppercase tracking-widest text-white hover:text-gold-300 hover:bg-white/5 transition duration-300">
                Our Story
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            {aboutHighlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm hover:bg-white/8 transition duration-300 shadow-sm">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-gold-300">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-gray-300/70 font-light">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fade-in-up scroll-reveal rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-8 md:p-12 shadow-sm">
        <div className="text-center space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-600">Elegant selections</p>
          <h2 className="text-2xl font-bold font-serif text-luxury-black md:text-4xl">Shop by Category</h2>
          <div className="w-12 h-0.5 bg-gold-500 mx-auto mt-3 rounded" />
        </div>

        <div className="mt-10 flex overflow-x-auto gap-4 no-scrollbar pb-4 -mx-4 px-4 md:grid md:grid-cols-6 md:justify-center md:gap-6 lg:gap-8 md:mx-0 md:px-0 scroll-smooth">
          {quickCategories.map((category) => (
            <Link
              key={category.name}
              to={`/products?category=${encodeURIComponent(category.name)}`}
              className="group flex flex-col items-center gap-3 transition shrink-0"
            >
              <div 
                className="relative w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] md:w-full md:aspect-square overflow-hidden rounded-full shadow-md border-4 border-white group-hover:border-gold-500 shadow-gray-200/80 transition-all duration-500 hover:-translate-y-1"
                style={{ backgroundImage: `url(${category.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <div className="absolute inset-0 bg-black/35 group-hover:bg-black/45 transition-colors duration-300" />
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <span className="text-center text-xs font-bold uppercase tracking-wider text-white">
                    {category.name}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="fade-in-up scroll-reveal grid gap-6 md:grid-cols-3">
        {featuredCollections.map((item) => (
          <article key={item.title} className="rounded-2xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-gold-300/60 flex flex-col justify-between">
            <div className="space-y-2">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-gold-600">{item.tag}</p>
              <h3 className="text-lg font-bold font-serif text-luxury-black">{item.title}</h3>
              <p className="text-xs leading-5 text-text-secondary font-light">{item.subtitle}</p>
            </div>
            <Link to="/products" className="mt-5 inline-flex items-center text-xs font-bold uppercase tracking-wider text-luxury-black hover:text-gold-600 transition">
              Explore Collection →
            </Link>
          </article>
        ))}
      </section>

      {offers.length > 0 ? (
        <section className="fade-in-up scroll-reveal rounded-3xl bg-luxury-black p-8 text-white shadow-xl md:p-12 relative overflow-hidden border border-gold-500/20">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gold-400 font-semibold">Limited Offers</p>
              <h2 className="mt-2 text-2xl font-bold font-serif md:text-3.5xl">Fresh deals crafted by our team</h2>
            </div>
            <Link
              to="/products"
              className="rounded-full border border-gold-300/40 bg-gold-500/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-300 backdrop-blur hover:bg-gold-500/15 hover:border-gold-300 transition cursor-pointer"
            >
              View All Gifts
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 relative z-10">
            {offers.map((offer, index) => (
              <article
                key={`${offer.code || offer.title}-${index}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/10"
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold-400">Offer {index + 1}</p>
                <h3 className="mt-2 text-lg font-bold font-serif">{offer.title}</h3>
                <p className="mt-2 text-xs leading-5 text-gray-300/70 font-light">{offer.subtitle}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {offer.code ? (
                    <span className="rounded-full border border-gold-300/40 bg-gold-500/10 px-3 py-1.5 text-xs font-bold tracking-widest text-gold-300">
                      CODE: {offer.code}
                    </span>
                  ) : null}
                  <Link
                    to="/products"
                    className="rounded-full bg-gold-500 hover:bg-gold-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition duration-300 font-semibold"
                  >
                    {offer.ctaText || "Explore"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="fade-in-up scroll-reveal rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-8 md:p-12 shadow-sm">
        <h2 className="text-xl font-bold font-serif text-luxury-black md:text-3xl">Gifts for Every Emotion</h2>
        <p className="mt-2 text-xs text-text-secondary font-light leading-5 md:text-sm">
          From birthdays to festivals, choose meaningful gifts that perfectly match the mood of every celebration.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {moments.map((moment) => (
            <p key={moment} className="rounded-xl bg-gold-50/40 px-4 py-3 text-xs font-semibold text-gold-800 border border-gold-100/40 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              {moment}
            </p>
          ))}
        </div>
      </section>

      <section className="fade-in-up scroll-reveal rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-8 md:p-12 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-champagne/30 pb-5">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-600">Client voices</p>
            <h2 className="text-xl font-bold font-serif text-luxury-black md:text-3xl">What Customers Say</h2>
          </div>
          <span className="rounded-full bg-gold-50 border border-gold-200/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-800">Trusted by Gift Lovers</span>
        </div>
        <div className="mt-8 flex gap-6 overflow-x-auto pb-4 no-scrollbar">
          {testimonials.map((review) => (
            <article key={review.name} className="w-80 flex-shrink-0 rounded-2xl border border-champagne/40 bg-white/90 p-6 flex flex-col justify-between shadow-xs hover:border-gold-300/40 transition-all duration-300">
              <div>
                <div className="mb-3 flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-4 w-4 fill-current text-gold-500" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs italic leading-6 text-text-secondary font-light font-serif">"{review.text}"</p>
              </div>
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-champagne/20 pt-3">
                <p className="text-xs font-extrabold text-gold-700 uppercase tracking-wider">{review.name}</p>
                {review.verified ? (
                  <span className="rounded-full bg-gold-100/60 px-2 py-0.5 text-[10px] font-bold text-gold-800 uppercase tracking-wider">Verified Buyer</span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
