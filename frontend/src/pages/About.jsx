import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";

const defaultValues = [
  {
    title: "Thoughtful Curation",
    text: "Every flower, cake and gift in our catalog is handpicked for quality, design and gifting impact."
  },
  {
    title: "On-Time Delivery",
    text: "From same-day surprises to planned celebrations, we focus on timely and reliable doorstep delivery."
  },
  {
    title: "Personalized Experience",
    text: "Custom notes, elegant packaging and occasion-based recommendations make every gift feel unique."
  }
];

const defaultWhyChooseUs = [
  {
    title: "Premium Selections",
    text: "Premium flowers, cakes and personalized gifts curated for high-end celebrations."
  },
  {
    title: "Luxury Packaging",
    text: "Beautiful custom packaging and rigorous quality checks for every single order."
  },
  {
    title: "Timed Delivery Options",
    text: "Same-day, slot-based, and midnight delivery options so you never miss a moment."
  },
  {
    title: "Dedicated Support",
    text: "Friendly customer support team ready to assist you throughout your ordering journey."
  }
];

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

    if (cmsContent?.seo?.title) {
      document.title = cmsContent.seo.title;
      if (cmsContent.seo.description) setMeta("description", cmsContent.seo.description);
      if (cmsContent.seo.keywords) setMeta("keywords", cmsContent.seo.keywords);
      if (cmsContent.seo.ogTitle) setMeta("og:title", cmsContent.seo.ogTitle, "property");
      if (cmsContent.seo.ogDescription) setMeta("og:description", cmsContent.seo.ogDescription, "property");
    } else {
      document.title = "About Niyora Gifts | Premium Gift Store";
      setMeta("description", "Learn about Niyora Gifts, your trusted online gift store for flowers, cakes and personalized gifts with reliable delivery.");
      setMeta("keywords", "Niyora Gifts, online gifts, flowers delivery, cakes, personalized gifts, gift store");
      setMeta("og:title", "About Niyora Gifts | Premium Gift Store", "property");
      setMeta("og:description", "Discover Niyora Gifts's mission, gifting values and premium celebration experiences.", "property");
    }
    setMeta("og:type", "website", "property");

    return () => {
      document.title = previousTitle;
    };
  }, [cmsContent]);

  const accentText = cmsContent?.content?.accentText || "About Niyora Gifts";
  const heading = cmsContent?.content?.heading || "We help people celebrate with meaningful gifts.";
  const description = cmsContent?.content?.description || "Niyora Gifts is built for moments that matter. Whether it's a birthday, anniversary, thank-you gesture, or festive celebration, we combine premium products with dependable service to create gifting experiences people remember.";
  const values = cmsContent?.content?.values || defaultValues;
  const image = cmsContent?.content?.images?.[0] || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200";

  const mission = cmsContent?.content?.mission || "Our mission is to bring joy to every celebration through high quality, handpicked gifts delivered right on time.";
  const vision = cmsContent?.content?.vision || "To be the most trusted and premium online gifting brand known for exceptional customer satisfaction and elegant collections.";
  const missionImage = cmsContent?.content?.missionImage || "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800";

  const companyStory = cmsContent?.content?.companyStory || "Founded in 2026, Niyora Gifts started with a simple belief: that every gift should carry a deep emotion. Over time, we've grown into a destination for luxury flowers, gourmet cakes, and bespoke customized keepsakes.";
  const storyImage = cmsContent?.content?.storyImage || "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800";

  const whyChooseUsTitle = cmsContent?.content?.whyChooseUsTitle || "Why customers choose us";
  const whyChooseUsList = cmsContent?.content?.whyChooseUsList || defaultWhyChooseUs;

  const ctaText = cmsContent?.content?.ctaText || "Explore Products";
  const ctaLink = cmsContent?.content?.ctaLink || "/products";

  return (
    <div className="space-y-16 pb-12">
      {/* 1. Hero Section */}
      <section 
        className="rounded-3xl bg-luxury-black px-8 py-16 text-white shadow-2xl md:px-16 relative overflow-hidden border border-gold-500/20 scroll-reveal min-h-[450px] flex items-center"
        style={{ 
          backgroundImage: `linear-gradient(to right, rgba(28, 28, 28, 0.95) 30%, rgba(28, 28, 28, 0.8) 60%, rgba(28, 28, 28, 0.4) 100%), url(${image})`, 
          backgroundSize: "cover", 
          backgroundPosition: "center" 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-black/35 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl">
          <span className="inline-block px-3 py-1 mb-4 rounded-full border border-gold-400/30 bg-gold-400/10 text-gold-400 text-[10px] uppercase font-bold tracking-widest">
            {accentText}
          </span>
          <h1 className="text-3xl font-serif text-white md:text-6xl leading-tight font-normal">
            {heading}
          </h1>
          <p className="mt-6 max-w-2xl text-sm md:text-base text-gray-300 leading-relaxed font-light">
            {description}
          </p>
        </div>
      </section>

      {/* 2. Core Values Grid */}
      <section className="scroll-reveal space-y-10">
        <div className="text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-600">Our Core Pillars</p>
          <h2 className="font-serif text-3xl md:text-4xl text-luxury-black font-semibold">Gifting Core Values</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {values.map((item, idx) => (
            <article key={idx} className="rounded-3xl border border-champagne bg-white/70 backdrop-blur-md p-8 shadow-sm hover:border-gold-300/40 transition-all duration-300 hover-float relative overflow-hidden group">
              <div className="text-5xl font-serif text-gold-200/30 group-hover:text-gold-200/50 transition-colors duration-300 select-none absolute top-4 right-6">
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div className="text-xs font-semibold text-gold-600 font-serif mb-4">
                — VALUE {idx + 1}
              </div>
              <h3 className="text-xl font-bold font-serif text-luxury-black mt-2 mb-3">{item.title}</h3>
              <p className="text-sm text-text-secondary font-light leading-relaxed">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 3. Company Story Section */}
      <section className="grid gap-12 items-center md:grid-cols-2 scroll-reveal">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-gold-500/20 to-gold-200/10 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
          <div className="relative rounded-3xl overflow-hidden border border-gold-200/30 bg-white p-2.5 shadow-xl">
            <img 
              src={storyImage} 
              alt="Our Story" 
              className="rounded-2xl object-cover w-full h-[400px] transform hover:scale-[1.02] transition duration-700" 
            />
          </div>
        </div>
        <div className="space-y-6">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-600">The Journey</span>
          <h2 className="font-serif text-3xl md:text-4xl text-luxury-black font-semibold">Our Story & History</h2>
          <div 
            className="text-sm text-text-secondary font-light leading-relaxed prose prose-stone max-w-none space-y-4"
            dangerouslySetInnerHTML={{ __html: companyStory }} 
          />
        </div>
      </section>

      {/* 4. Mission & Vision Section */}
      <section className="grid gap-12 items-center md:grid-cols-2 scroll-reveal">
        <div className="space-y-8 order-2 md:order-1">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-600">Purpose & Inspiration</span>
          <h2 className="font-serif text-3xl md:text-4xl text-luxury-black font-semibold">Why We Do What We Do</h2>
          
          <div className="space-y-6">
            <div className="border-l-2 border-gold-400 pl-6 space-y-2">
              <h3 className="text-lg font-bold font-serif text-gold-800">Our Mission</h3>
              <p className="text-sm text-text-secondary font-light leading-relaxed italic">
                "{mission}"
              </p>
            </div>
            <div className="border-l-2 border-gold-400 pl-6 space-y-2">
              <h3 className="text-lg font-bold font-serif text-gold-800">Our Vision</h3>
              <p className="text-sm text-text-secondary font-light leading-relaxed italic">
                "{vision}"
              </p>
            </div>
          </div>
        </div>
        <div className="relative group order-1 md:order-2">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-gold-500/20 to-gold-200/10 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
          <div className="relative rounded-3xl overflow-hidden border border-gold-200/30 bg-white p-2.5 shadow-xl">
            <img 
              src={missionImage} 
              alt="Our Mission" 
              className="rounded-2xl object-cover w-full h-[400px] transform hover:scale-[1.02] transition duration-700" 
            />
          </div>
        </div>
      </section>

      {/* 5. Why Choose Us Section */}
      <section className="rounded-3xl border border-champagne bg-white/70 backdrop-blur-md p-8 md:p-12 shadow-sm scroll-reveal space-y-10">
        <div className="text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-600">The Niyora Promise</p>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-luxury-black text-center">
            {whyChooseUsTitle}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {whyChooseUsList.map((item, idx) => (
            <div 
              key={idx} 
              className="flex gap-4 p-5 rounded-2xl border border-gold-100/50 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-gold-300/40 transition-all duration-300"
            >
              <div className="h-10 w-10 shrink-0 rounded-full bg-gold-50/70 flex items-center justify-center text-gold-600 border border-gold-200/30">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-base font-bold text-luxury-black">
                  {item.title}
                </h3>
                <p className="text-xs text-text-secondary font-light leading-relaxed">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Call To Action (CTA) */}
      <section className="rounded-3xl bg-gradient-to-r from-stone-900 via-luxury-black to-stone-900 border border-gold-500/20 p-10 md:p-16 text-center relative overflow-hidden shadow-2xl scroll-reveal">
        <div className="absolute right-0 bottom-0 h-40 w-40 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />
        <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold-400">
            Share the Joy
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-white font-normal">
            Ready to make someone's day special?
          </h2>
          <p className="text-xs text-gray-400 font-light leading-relaxed max-w-lg mx-auto">
            Browse our curated collections of luxury flowers, custom cakes, and custom hand-engraved gifts today.
          </p>
          <div className="pt-4">
            <Link 
              to={ctaLink} 
              className="inline-block rounded-full bg-gradient-to-r from-gold-450 to-gold-600 hover:from-gold-500 hover:to-gold-700 text-luxury-black font-bold tracking-widest text-xs uppercase px-8 py-3.5 transition duration-300 shadow-lg shadow-gold-500/20 transform hover:-translate-y-0.5"
            >
              {ctaText}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
