import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  Gift, 
  Heart, 
  ShoppingBag, 
  Home as HomeIcon, 
  Sparkles, 
  CheckCircle2, 
  Mail, 
  Phone, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones
} from "lucide-react";
import api from "../services/api";

const About = () => {
  const [cmsContent, setCmsContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutContent = async () => {
      try {
        const { data } = await api.get("/cms/content/about");
        setCmsContent(data);
      } catch (err) {
        console.error("Failed to load about content:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAboutContent();
  }, []);

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

    const useCmsSeo = cmsContent?.seo?.title && 
      !cmsContent.seo.title.includes("Premium Gift Store") && 
      !cmsContent.seo.title.includes("We help people celebrate");

    if (useCmsSeo) {
      document.title = cmsContent.seo.title;
      if (cmsContent.seo.description) setMeta("description", cmsContent.seo.description);
      if (cmsContent.seo.keywords) setMeta("keywords", cmsContent.seo.keywords);
      if (cmsContent.seo.ogTitle) setMeta("og:title", cmsContent.seo.ogTitle, "property");
      if (cmsContent.seo.ogDescription) setMeta("og:description", cmsContent.seo.ogDescription, "property");
    } else {
      document.title = "About Niyora Gifts | Online Gift Store for Every Occasion";
      setMeta("description", "Discover the story behind Niyora Gifts — your trusted online gift shop for personalized, unique, and thoughtful gifts. Shop with confidence, delivered with love.");
      setMeta("keywords", "Niyora Gifts, online gift store, personalized gifts, gift shop, buy gifts online");
      setMeta("og:title", "About Niyora Gifts | Online Gift Store for Every Occasion", "property");
      setMeta("og:description", "Discover the story behind Niyora Gifts — your trusted online gift shop for personalized, unique, and thoughtful gifts.", "property");
    }
    setMeta("og:type", "website", "property");

    return () => {
      document.title = previousTitle;
    };
  }, [cmsContent]);

  const isDefaultAbout = (headingText) => {
    return (
      !headingText ||
      headingText.includes("We help people celebrate") ||
      headingText.includes("meaningful gifts")
    );
  };

  const useCms = cmsContent?.content && !isDefaultAbout(cmsContent.content.heading);

  const accentText = useCms ? cmsContent.content.accentText : "About Niyora Gifts";
  const heading = useCms ? cmsContent.content.heading : "Welcome to Niyora Gifts";
  const description = useCms ? (cmsContent.content.description || "") : "At Niyora Gifts, we believe every gift tells a story. What started as a simple idea — to make gifting easier, more meaningful, and more personal — has grown into a trusted online gift store loved by customers who want to celebrate life's special moments in style. Whether you're looking for a birthday gift, an anniversary surprise, a wedding present, or a thoughtful token for a loved one, Niyora Gifts brings you a carefully curated collection designed to make every occasion unforgettable.";
  
  const image = (useCms && cmsContent.content.images?.[0]) || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200";
  const storyImage = (useCms && cmsContent.content.storyImage) || "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800";

  const companyStory = useCms ? cmsContent.content.companyStory : `
    <p>Niyora Gifts was founded with one simple mission: <strong>to bring joy through thoughtful gifting</strong>. We noticed how difficult it can be to find the perfect gift — something unique, meaningful, and delivered on time. So, we set out to build an online gifting destination that combines <strong>quality products, affordable prices, and a seamless shopping experience</strong>.</p>
    <p>Today, Niyora Gifts is proud to serve customers across Delhi and all of India with a growing range of gifts for birthdays, anniversaries, weddings, festivals, and everyday "just because" moments.</p>
  `;

  // Custom static content for "What We Offer"
  const offerCategories = [
    {
      title: "Personalized & Customized Gifts",
      description: "Photo frames, custom ceramic mugs, engraved keepsakes, and bespoke memory items.",
      icon: Gift,
      link: "/products"
    },
    {
      title: "Birthday & Anniversary Gifts",
      description: "Curated gift items tailored for every milestone age and close relationship.",
      icon: Heart,
      link: "/products"
    },
    {
      title: "Gift Hampers & Combos",
      description: "Thoughtfully assembled and wrapped gift boxes matching diverse occasion themes.",
      icon: ShoppingBag,
      link: "/products"
    },
    {
      title: "Home Décor & Lifestyle Gifts",
      description: "Premium items for housewarmings, special anniversaries, and modern lifestyles.",
      icon: HomeIcon,
      link: "/products"
    },
    {
      title: "Festive & Seasonal Gifts",
      description: "Special holiday collections and seasonal surprises for festive moments.",
      icon: Sparkles,
      link: "/products"
    }
  ];

  // Custom static content for "Why Choose Niyora Gifts"
  const chooseUsReasons = [
    {
      title: "Wide Range of Unique Gifts",
      text: "Something special for every relationship and occasion.",
      icon: Gift
    },
    {
      title: "Quality You Can Trust",
      text: "Every single product is inspected before it reaches your door.",
      icon: ShieldCheck
    },
    {
      title: "Affordable Pricing",
      text: "Premium gifting designs without the premium price tag.",
      icon: CheckCircle2
    },
    {
      title: "Fast & Reliable Shipping",
      text: "So your curated surprises arrive on time, every time.",
      icon: Truck
    },
    {
      title: "Easy Returns & Replacements",
      text: "Shop with peace of mind under our clear return policy.",
      icon: RotateCcw
    },
    {
      title: "Dedicated Customer Support",
      text: "Our team is always here to guide you and resolve issues.",
      icon: Headphones
    }
  ];

  return (
    <div className="space-y-16 pb-16 bg-[#FDFCF9]">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Hero / Welcome Section */}
      <section 
        className="rounded-3xl bg-luxury-black px-8 py-16 text-white shadow-2xl md:px-16 relative overflow-hidden border border-gold-500/20 animate-fade-in min-h-[450px] flex items-center"
        style={{ 
          backgroundImage: `linear-gradient(to right, rgba(18, 18, 18, 0.95) 30%, rgba(18, 18, 18, 0.8) 60%, rgba(18, 18, 18, 0.4) 100%), url(${image})`, 
          backgroundSize: "cover", 
          backgroundPosition: "center" 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-black/35 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl space-y-4">
          <span className="inline-block px-3 py-1 rounded-full border border-gold-400/30 bg-gold-400/10 text-gold-400 text-[10px] uppercase font-bold tracking-widest animate-pulse">
            {accentText}
          </span>
          <h1 className="text-3xl font-serif text-white md:text-5xl leading-tight font-light">
            {heading}
          </h1>
          <p className="max-w-2xl text-xs md:text-sm text-gray-300 leading-relaxed font-light font-sans font-extralight">
            {description}
          </p>
        </div>
      </section>

      {/* 2. Our Story Section */}
      <section className="grid gap-12 items-center md:grid-cols-2 max-w-6xl mx-auto px-4 md:px-8 animate-fade-in">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-gold-500/20 to-gold-200/10 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />
          <div className="relative rounded-3xl overflow-hidden border border-gold-200/30 bg-white p-2.5 shadow-xl">
            <img 
              src={storyImage} 
              alt="Niyora Gifts unboxing experience" 
              className="rounded-2xl object-cover w-full h-[380px] transform hover:scale-[1.02] transition duration-700" 
            />
          </div>
        </div>
        <div className="space-y-6">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-600">The Journey</span>
          <h2 className="font-serif text-3xl text-luxury-black font-semibold">Our Story & Mission</h2>
          <div 
            className="text-xs text-text-secondary font-light leading-relaxed prose prose-stone max-w-none space-y-4 font-sans font-extralight"
            dangerouslySetInnerHTML={{ __html: companyStory }} 
          />
        </div>
      </section>

      {/* 3. What We Offer Section */}
      <section className="space-y-10 max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-600">Explore Collections</p>
          <h2 className="font-serif text-3xl text-luxury-black font-semibold">What We Offer</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offerCategories.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link 
                to={item.link} 
                key={idx} 
                className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35 animate-fade-in"
              >
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black group-hover:text-gold-700 transition">
                      {item.title}
                    </h3>
                    <p className="text-xs text-text-secondary font-light leading-relaxed font-sans font-extralight">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="pt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-600 mt-2">
                  View Items <ArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. Why Choose Us Section */}
      <section className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-8 md:p-12 max-w-6xl mx-auto shadow-xs space-y-10">
        <div className="text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-600">The Niyora Promise</p>
          <h2 className="text-3xl font-serif text-luxury-black font-semibold text-center">
            Why Choose Niyora Gifts?
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {chooseUsReasons.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className="flex gap-4 p-5 rounded-2xl border border-gold-100/50 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-gold-300/40 transition-all duration-300 animate-fade-in"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-gold-50/70 flex items-center justify-center text-gold-600 border border-gold-200/30">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-sm font-bold text-luxury-black">
                    {item.title}
                  </h3>
                  <p className="text-xs text-text-secondary font-light leading-relaxed font-sans font-extralight">
                    {item.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Our Promise Callout */}
      <section className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="rounded-3xl border border-gold-500/15 bg-gold-50/15 p-6 shadow-xs flex flex-col md:flex-row items-center gap-6 animate-fade-in">
          <div className="p-4 rounded-full bg-gold-500/5 text-gold-600 shrink-0">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2 text-center md:text-left">
            <h4 className="text-sm font-serif font-bold uppercase tracking-wider text-luxury-black">Our Promise To You</h4>
            <p className="text-xs text-text-secondary font-light leading-relaxed font-sans font-extralight">
              At Niyora Gifts, customer satisfaction is at the heart of everything we do. From the moment you browse our store to the moment your gift is unwrapped, we're committed to making your experience smooth, joyful, and memorable. We continuously work to bring you new, exciting, and trending gift ideas — so you always find the perfect gift, no matter the occasion.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Join the Family & CTA Section */}
      <section className="rounded-3xl bg-gradient-to-r from-stone-900 via-luxury-black to-stone-900 border border-gold-500/20 p-10 md:p-16 text-center relative overflow-hidden shadow-2xl max-w-6xl mx-auto animate-fade-in">
        <div className="absolute right-0 bottom-0 h-40 w-40 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />
        <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-400">
            Join the Niyora Gifts Family
          </p>
          <h2 className="font-serif text-3xl text-white font-light">
            Ready to make someone's day special?
          </h2>
          <p className="text-xs text-gray-400 font-light leading-relaxed max-w-lg mx-auto font-sans font-extralight">
            Thousands of customers trust Niyora Gifts to help them celebrate the moments that matter most. We'd love for you to be part of our story. Browse our collections or review our store policies below.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link 
              to="/products" 
              className="rounded-full bg-gradient-to-r from-gold-450 to-gold-600 hover:from-gold-500 hover:to-gold-700 text-luxury-black font-bold tracking-widest text-[10px] uppercase px-8 py-3.5 transition duration-300 shadow-lg shadow-gold-500/20"
            >
              Explore Collections
            </Link>
            <Link 
              to="/shipping-policy" 
              className="rounded-full border border-gray-400 hover:border-white text-gray-300 hover:text-white font-semibold text-[10px] uppercase px-6 py-3.5 transition"
            >
              Shipping Policy
            </Link>
            <Link 
              to="/returns-refunds" 
              className="rounded-full border border-gray-400 hover:border-white text-gray-300 hover:text-white font-semibold text-[10px] uppercase px-6 py-3.5 transition"
            >
              Return Policy
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-8 border-t border-white/10 text-left text-gray-400 max-w-lg mx-auto font-sans font-light">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gold-400 shrink-0" />
              <div>
                <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider">Email Support</span>
                <a href="mailto:niyoragifts@gmail.com" className="text-xs font-semibold text-white hover:text-gold-400 transition">
                  niyoragifts@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gold-400 shrink-0" />
              <div>
                <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider">Call Support</span>
                <a href="tel:+919000000000" className="text-xs font-semibold text-white hover:text-gold-400 transition">
                  +91 90000-00000
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
