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

  const heading = cmsContent?.content?.heading || "We help people celebrate with meaningful gifts.";
  const description = cmsContent?.content?.description || "Niyora Gifts is built for moments that matter. Whether it's a birthday, anniversary, thank-you gesture, or festive celebration, we combine premium products with dependable service to create gifting experiences people remember.";
  const values = cmsContent?.content?.values || defaultValues;
  const image = cmsContent?.content?.images?.[0] || "";

  return (
    <div className="space-y-8">
      <section 
        className="rounded-3xl bg-luxury-black px-8 py-12 text-white shadow-2xl md:px-16 relative overflow-hidden border border-gold-500/20 scroll-reveal"
        style={image ? { backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.9) 30%, rgba(0, 0, 0, 0.5) 100%), url(${image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
      >
        {/* Luxury subtle glows */}
        {!image && <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">About Niyora Gifts</p>
        <h1 className="mt-3 text-3xl font-serif text-white md:text-5xl">{heading}</h1>
        <p className="mt-4 max-w-3xl text-sm text-gray-300 leading-7 font-light md:text-base">
          {description}
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3 scroll-reveal">
        {values.map((item) => (
          <article key={item.title} className="rounded-2xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-sm hover:border-gold-300/40 transition-all duration-300">
            <h2 className="text-lg font-bold font-serif text-gold-700">{item.title}</h2>
            <p className="mt-2 text-sm text-text-secondary font-light leading-6">{item.text}</p>
          </article>
        ))}
      </section>

      {/* Mission & Vision */}
      {(cmsContent?.content?.mission || cmsContent?.content?.vision) && (
        <section className="grid gap-6 md:grid-cols-2 scroll-reveal">
          {cmsContent.content.mission && (
            <div className="rounded-2xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-luxury-black mb-3 border-b border-champagne/20 pb-2">Our Mission</h2>
              <p className="text-xs text-text-secondary font-light leading-relaxed">{cmsContent.content.mission}</p>
            </div>
          )}
          {cmsContent.content.vision && (
            <div className="rounded-2xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-luxury-black mb-3 border-b border-champagne/20 pb-2">Our Vision</h2>
              <p className="text-xs text-text-secondary font-light leading-relaxed">{cmsContent.content.vision}</p>
            </div>
          )}
        </section>
      )}

      {/* Company Story */}
      {cmsContent?.content?.companyStory && (
        <section className="rounded-2xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 md:p-8 shadow-sm scroll-reveal">
          <h2 className="text-xl font-serif font-bold text-luxury-black mb-4">Our Story & Journey</h2>
          <div className="text-xs text-text-secondary font-light leading-relaxed prose max-w-none" dangerouslySetInnerHTML={{ __html: cmsContent.content.companyStory }} />
        </section>
      )}

      <section className="rounded-2xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-sm md:p-8 scroll-reveal">
        <h2 className="text-2xl font-bold font-serif text-luxury-black">Why customers choose us</h2>
        <ul className="mt-6 grid gap-3 text-sm text-luxury-black md:grid-cols-2">
          <li className="rounded-xl bg-gold-50/40 border border-gold-100/40 px-4 py-3 font-light flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500 shrink-0" />
            Premium flowers, cakes and personalized gifts
          </li>
          <li className="rounded-xl bg-gold-50/40 border border-gold-100/40 px-4 py-3 font-light flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500 shrink-0" />
            Beautiful packaging and quality checks
          </li>
          <li className="rounded-xl bg-gold-50/40 border border-gold-100/40 px-4 py-3 font-light flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500 shrink-0" />
            Same-day and midnight delivery options
          </li>
          <li className="rounded-xl bg-gold-50/40 border border-gold-100/40 px-4 py-3 font-light flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500 shrink-0" />
            Friendly support throughout your order journey
          </li>
        </ul>
        <div className="mt-8">
          <Link to="/products" className="inline-flex rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold tracking-widest text-xs uppercase px-7 py-3 transition shadow-sm">
            Explore Products
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;
