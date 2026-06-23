import { Link } from "react-router-dom";
import { useEffect } from "react";

const values = [
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

    document.title = "About Niyora Gifts | Premium Gift Store";
    setMeta("description", "Learn about Niyora Gifts, your trusted online gift store for flowers, cakes and personalized gifts with reliable delivery.");
    setMeta("keywords", "Niyora Gifts, online gifts, flowers delivery, cakes, personalized gifts, gift store");
    setMeta("og:title", "About Niyora Gifts | Premium Gift Store", "property");
    setMeta("og:description", "Discover Niyora Gifts's mission, gifting values and premium celebration experiences.", "property");
    setMeta("og:type", "website", "property");

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-luxury-black px-8 py-12 text-white shadow-2xl md:px-16 relative overflow-hidden border border-gold-500/20 scroll-reveal">
        {/* Luxury subtle glows */}
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">About Niyora Gifts</p>
        <h1 className="mt-3 text-3xl font-serif text-white md:text-5xl">We help people celebrate with meaningful gifts.</h1>
        <p className="mt-4 max-w-3xl text-sm text-gray-300 leading-7 font-light md:text-base">
          Niyora Gifts is built for moments that matter. Whether it&apos;s a birthday, anniversary, thank-you gesture, or festive
          celebration, we combine premium products with dependable service to create gifting experiences people remember.
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
