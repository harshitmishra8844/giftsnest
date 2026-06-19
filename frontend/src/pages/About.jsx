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
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-emerald-900 to-teal-800 px-6 py-10 text-white shadow-xl md:px-10 scroll-reveal">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">About Niyora Gifts</p>
        <h1 className="mt-3 text-3xl font-bold md:text-4xl">We help people celebrate with meaningful gifts.</h1>
        <p className="mt-4 max-w-3xl text-sm text-emerald-50 md:text-base">
          Niyora Gifts is built for moments that matter. Whether it&apos;s a birthday, anniversary, thank-you gesture, or festive
          celebration, we combine premium products with dependable service to create gifting experiences people remember.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3 scroll-reveal">
        {values.map((item) => (
          <article key={item.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
            <h2 className="text-lg font-bold text-emerald-900">{item.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-emerald-100 md:p-8 scroll-reveal">
        <h2 className="text-2xl font-bold text-emerald-900">Why customers choose us</h2>
        <ul className="mt-4 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
          <li className="rounded-lg bg-emerald-50 px-3 py-2">Premium flowers, cakes and personalized gifts</li>
          <li className="rounded-lg bg-emerald-50 px-3 py-2">Beautiful packaging and quality checks</li>
          <li className="rounded-lg bg-emerald-50 px-3 py-2">Same-day and midnight delivery options</li>
          <li className="rounded-lg bg-emerald-50 px-3 py-2">Friendly support throughout your order journey</li>
        </ul>
        <div className="mt-6">
          <Link to="/products" className="inline-flex rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
            Explore Products
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;
