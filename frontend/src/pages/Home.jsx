import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";

const quickCategories = [
  { name: "Birthday", image: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&h=300&fit=crop&crop=center" },
  { name: "Anniversary", image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&h=300&fit=crop&crop=center" },
  { name: "Flowers", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&h=300&fit=crop&crop=center" },
  // Cakes removed per request
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

    document.title = "GiftNest | Flowers, Cakes & Personalized Gifts";
    setMeta("description", "Shop flowers, cakes and personalized gifts at GiftNest with same-day delivery and premium packaging.");
    setMeta("keywords", "gift store, flowers delivery, cakes online, personalized gifts, same day delivery");
    setMeta("og:title", "GiftNest | Flowers, Cakes & Personalized Gifts", "property");
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
    <div className="space-y-6">
      {specialOffer ? (
        <section className="fade-in-up scroll-reveal rounded-2xl border border-amber-200 bg-gradient-to-r from-emerald-50 via-amber-50 to-teal-50 p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                {specialOffer.eventName || "Special Event Offer"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-emerald-900 md:text-2xl">{specialOffer.title}</h2>
              <p className="mt-1 text-sm text-emerald-800">{specialOffer.subtitle}</p>
              {specialOffer.endDate ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Offer ends on {formatOfferDate(specialOffer.endDate)}
                  </p>
                  {countdownText ? (
                    <p className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800">
                      {countdownText}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {specialOffer.code ? (
                <span className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
                  CODE: {specialOffer.code}
                </span>
              ) : null}
              <Link
                to="/products"
                className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-emerald-800"
              >
                {specialOffer.ctaText || "Explore"}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="fade-in-up scroll-reveal rounded-3xl bg-gradient-to-r from-emerald-900 to-teal-800 p-6 text-white shadow-xl md:p-10">
        <div className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-emerald-50 md:text-xl">Gift Storefront</h2>
            <h3 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">
              Celebrate every moment with curated premium gifts
            </h3>
            <p className="mt-4 max-w-xl text-sm text-emerald-50 md:text-base">
              Flowers, cakes and personalized surprises crafted with elegance, delivered with care, and remembered forever.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/products" className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
                Explore Products
              </Link>
              <Link to="/about" className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                Our Story
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            {aboutHighlights.map((item) => (
              <article key={item.title} className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <h3 className="text-sm font-bold">{item.title}</h3>
                <p className="mt-1 text-sm text-emerald-100">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fade-in-up scroll-reveal rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-emerald-900">Shop by Category</h2>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-6">
          {quickCategories.map((category) => (
            <Link
              key={category.name}
              to="/products"
              className="group relative w-[160px] h-[160px] md:w-[180px] md:h-[180px] overflow-hidden rounded-xl shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
              style={{ backgroundImage: `url(${category.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/30 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="z-10 rounded-full bg-white/10 px-3 py-1 text-center text-sm font-semibold text-white backdrop-blur-sm">
                  {category.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="fade-in-up scroll-reveal grid gap-4 md:grid-cols-3">
        {featuredCollections.map((item) => (
          <article key={item.title} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{item.tag}</p>
            <h3 className="mt-2 text-xl font-bold text-gray-900">{item.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{item.subtitle}</p>
            <Link to="/products" className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              Explore Collection
            </Link>
          </article>
        ))}
      </section>

      {offers.length > 0 ? (
        <section className="fade-in-up scroll-reveal rounded-3xl border border-emerald-200/40 bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-950 p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-100">Limited offers</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Fresh deals crafted by our team</h2>
            </div>
            <Link
              to="/products"
              className="rounded-full border border-white/35 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur hover:bg-white/20"
            >
              View All Gifts
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {offers.map((offer, index) => (
              <article
                key={`${offer.code || offer.title}-${index}`}
                className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/15"
              >
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br from-teal-300/35 via-emerald-400/25 to-transparent blur-2xl" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">Offer {index + 1}</p>
                <h3 className="mt-2 text-xl font-bold">{offer.title}</h3>
                <p className="mt-2 text-sm text-emerald-50">{offer.subtitle}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {offer.code ? (
                    <span className="rounded-full border border-emerald-200/35 bg-emerald-500/25 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-50">
                      CODE: {offer.code}
                    </span>
                  ) : null}
                  <Link
                    to="/products"
                    className="rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800 shadow-sm transition group-hover:bg-emerald-50"
                  >
                    {offer.ctaText || "Explore"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="fade-in-up scroll-reveal rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-bold text-emerald-900">Gifts for Every Emotion</h2>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          From birthdays to festivals, choose meaningful gifts that perfectly match the mood of every celebration.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {moments.map((moment) => (
            <p key={moment} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {moment}
            </p>
          ))}
        </div>
      </section>

      <section className="fade-in-up scroll-reveal rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-emerald-900">What Customers Say</h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Trusted by Gift Lovers</span>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-4">
          {testimonials.map((review) => (
            <article key={review.name} className="w-80 flex-shrink-0 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="mb-2 flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-4 w-4 fill-current text-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-700">"{review.text}"</p>
              <div className="mt-3 flex items-center gap-2">
                <p className="text-sm font-semibold text-emerald-800">{review.name}</p>
                {review.verified ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Verified Buyer</span>
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
