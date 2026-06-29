import { useEffect, useState } from "react";
import api from "../services/api";

const ShippingPolicy = () => {
  const [cmsContent, setCmsContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const { data } = await api.get("/cms/content/policies");
        setCmsContent(data);
      } catch (err) {
        console.error("Failed to load shipping policy:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    if (cmsContent?.seo?.title) {
      document.title = cmsContent.seo.title;
    } else {
      document.title = "Shipping Policy | Niyora Gifts";
    }
    return () => {
      document.title = previousTitle;
    };
  }, [cmsContent]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
        <div className="mb-8 text-center animate-fade-in">
          <h1 className="text-3xl font-serif font-light tracking-tight text-luxury-black md:text-4xl">
            Shipping Policy
          </h1>
          <p className="mt-4 text-xs text-text-secondary font-light">
            Learn about our shipping methods, delivery times, and charges
          </p>
        </div>

        {cmsContent?.content?.shippingPolicy ? (
          <div className="rounded-3xl border border-champagne/45 bg-white/70 p-8 shadow-xs backdrop-blur-md prose max-w-none text-sm text-text-secondary font-light leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: cmsContent.content.shippingPolicy }} />
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="rounded-3xl border border-champagne/45 bg-white/70 p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-serif font-semibold text-luxury-black mb-6 border-b border-champagne/30 pb-2">Shipping Methods</h2>

              <div className="space-y-6">
                <div className="border-l-2 border-gold-500 pl-6">
                  <h3 className="text-base font-serif font-semibold text-luxury-black">Standard Delivery</h3>
                  <p className="mt-2 text-xs text-text-secondary font-light leading-relaxed">
                    Our standard delivery service ensures your gifts arrive within 3-5 business days.
                    Perfect for planned celebrations and regular gifting needs.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-gold-700">Delivery Time: 3-5 business days</p>
                  <p className="mt-1 text-xs font-semibold text-gold-700">Shipping Cost: ₹99 (Free on orders above ₹999)</p>
                </div>

                <div className="border-l-2 border-gold-400 pl-6">
                  <h3 className="text-base font-serif font-semibold text-luxury-black">Express Delivery</h3>
                  <p className="mt-2 text-xs text-text-secondary font-light leading-relaxed">
                    For urgent deliveries and last-minute surprises, our express service gets your
                    gifts delivered within 1-2 business days.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-gold-700">Delivery Time: 1-2 business days</p>
                  <p className="mt-1 text-xs font-semibold text-gold-700">Shipping Cost: ₹199 (Free on orders above ₹1499)</p>
                </div>

                <div className="border-l-2 border-gold-300 pl-6">
                  <h3 className="text-base font-serif font-semibold text-luxury-black">Same Day Delivery</h3>
                  <p className="mt-2 text-xs text-text-secondary font-light leading-relaxed">
                    Available in select cities for orders placed before 2 PM. Perfect for same-day
                    celebrations and emergency gifting needs.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-gold-700">Delivery Time: Same day (before 8 PM)</p>
                  <p className="mt-1 text-xs font-semibold text-gold-700">Shipping Cost: ₹299</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-champagne/45 bg-white/70 p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-serif font-semibold text-luxury-black mb-6 border-b border-champagne/30 pb-2">Shipping Information</h2>

              <div className="grid gap-6 md:grid-cols-2 text-xs text-text-secondary font-light">
                <div>
                  <h3 className="text-sm font-bold text-luxury-black uppercase tracking-wider mb-3">Processing Time</h3>
                  <ul className="space-y-2">
                    <li>• Orders are processed within 1-2 business hours</li>
                    <li>• Custom orders may take additional preparation time</li>
                    <li>• Order confirmation will be sent via email and SMS</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-luxury-black uppercase tracking-wider mb-3">Delivery Areas</h3>
                  <ul className="space-y-2">
                    <li>• Pan-India delivery available</li>
                    <li>• International shipping on request</li>
                    <li>• Remote areas may have extended delivery times</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-luxury-black uppercase tracking-wider mb-3">Shipping Charges</h3>
                  <ul className="space-y-2">
                    <li>• Free shipping on orders above ₹999</li>
                    <li>• Additional charges for remote locations</li>
                    <li>• COD charges may apply</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-luxury-black uppercase tracking-wider mb-3">Tracking</h3>
                  <ul className="space-y-2">
                    <li>• Real-time tracking updates via SMS and email</li>
                    <li>• Track your order using the order ID</li>
                    <li>• Customer support available 24/7</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-champagne/45 bg-white/70 p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-serif font-semibold text-luxury-black mb-6 border-b border-champagne/30 pb-2">Important Notes</h2>

              <div className="space-y-4 text-xs text-text-secondary font-light leading-relaxed">
                <p>
                  • All delivery times are business days (Monday to Saturday, excluding public holidays).
                </p>
                <p>
                  • We are not responsible for delays caused by natural disasters, strikes, or other
                  unforeseen circumstances.
                </p>
                <p>
                  • For perishable items like flowers and cakes, we recommend same-day or next-day delivery.
                </p>
                <p>
                  • Delivery attempts are made up to 3 times. Additional attempts may incur extra charges.
                </p>
                <p>
                  • Please ensure someone is available at the delivery address during business hours.
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-text-secondary font-light">
                Have questions about shipping?{" "}
                <a href="mailto:niyoragifts@gmail.com" className="font-bold text-gold-700 hover:text-gold-800 transition">
                  Contact our support team
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShippingPolicy;