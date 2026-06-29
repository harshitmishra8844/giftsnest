import { useEffect, useState } from "react";
import api from "../services/api";

const ReturnsRefunds = () => {
  const [cmsContent, setCmsContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const { data } = await api.get("/cms/content/policies");
        setCmsContent(data);
      } catch (err) {
        console.error("Failed to load refund policy:", err);
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
      document.title = "Returns, Refunds & Replacement | Niyora Gifts";
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
            Returns & Refunds
          </h1>
          <p className="mt-4 text-xs text-text-secondary font-light">
            Our commitment to your satisfaction with transparent return and refund policies
          </p>
        </div>

        {cmsContent?.content?.refundPolicy ? (
          <div className="rounded-3xl border border-champagne/45 bg-white/70 p-8 shadow-xs backdrop-blur-md prose max-w-none text-sm text-text-secondary font-light leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: cmsContent.content.refundPolicy }} />
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="rounded-3xl border border-champagne/45 bg-white/70 p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-serif font-semibold text-luxury-black mb-6 border-b border-champagne/30 pb-2">Return Policy</h2>

              <div className="space-y-6">
                <div className="border-l-2 border-gold-500 pl-6">
                  <h3 className="text-base font-serif font-semibold text-luxury-black">Eligibility for Returns</h3>
                  <p className="mt-2 text-xs text-text-secondary font-light leading-relaxed">
                    We accept returns within 7 days of delivery for most items, provided they are in
                    their original condition and packaging. Some items like perishable goods (flowers,
                    cakes) cannot be returned due to hygiene and safety reasons.
                  </p>
                </div>

                <div className="border-l-2 border-gold-400 pl-6">
                  <h3 className="text-base font-serif font-semibold text-luxury-black">Non-Returnable Items</h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-text-secondary font-light">
                    <li>• Perishable items (flowers, cakes, chocolates)</li>
                    <li>• Personalized or custom-made items</li>
                    <li>• Items damaged due to misuse or normal wear</li>
                    <li>• Items without original packaging and tags</li>
                  </ul>
                </div>

                <div className="border-l-2 border-gold-300 pl-6">
                  <h3 className="text-base font-serif font-semibold text-luxury-black">Return Process</h3>
                  <div className="mt-2 space-y-2 text-xs text-text-secondary font-light leading-relaxed">
                    <p>1. Contact our customer support within 7 days of delivery</p>
                    <p>2. Provide order details and reason for return</p>
                    <p>3. Our team will guide you through the return process</p>
                    <p>4. Pack the item securely in original packaging</p>
                    <p>5. Ship the item back to us (shipping charges may apply)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-champagne/45 bg-white/70 p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-serif font-semibold text-luxury-black mb-6 border-b border-champagne/30 pb-2">Refund Policy</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-serif font-semibold text-luxury-black mb-3">Refund Processing</h3>
                  <p className="text-xs text-text-secondary font-light leading-relaxed">
                    Once we receive and inspect your returned item, we will process your refund within
                    5-7 business days. Refunds will be issued to the original payment method.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 text-xs text-text-secondary font-light">
                  <div>
                    <h4 className="font-bold text-luxury-black mb-2 uppercase tracking-wider">Refund Timeline</h4>
                    <ul className="space-y-1.5">
                      <li>• Credit/Debit Card: 5-7 business days</li>
                      <li>• UPI/Wallets: 1-3 business days</li>
                      <li>• Net Banking: 3-5 business days</li>
                      <li>• Cash on Delivery: 7-10 business days</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-luxury-black mb-2 uppercase tracking-wider">Refund Amount</h4>
                    <ul className="space-y-1.5">
                      <li>• Full refund for defective items</li>
                      <li>• Partial refund for used items</li>
                      <li>• Shipping charges are non-refundable</li>
                      <li>• COD charges are non-refundable</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-champagne/45 bg-white/70 p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-serif font-semibold text-luxury-black mb-6 border-b border-champagne/30 pb-2">Exchange Policy</h2>

              <div className="space-y-4">
                <p className="text-xs text-text-secondary font-light leading-relaxed">
                  We offer hassle-free exchanges for size issues, color preferences, or if you received
                  a different item than ordered. Exchanges are processed within 7 days of delivery.
                </p>

                <div className="grid gap-4 md:grid-cols-2 text-xs text-text-secondary font-light">
                  <div className="rounded-2xl bg-gold-50/5 border border-gold-200/40 p-4">
                    <h4 className="font-serif font-semibold text-luxury-black mb-2">Exchange Process</h4>
                    <ul className="space-y-1.5">
                      <li>• Contact customer support</li>
                      <li>• Provide order and exchange details</li>
                      <li>• Receive exchange approval</li>
                      <li>• Return old item (we pay shipping)</li>
                      <li>• Receive new item</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-champagne/10 border border-champagne/40 p-4">
                    <h4 className="font-serif font-semibold text-luxury-black mb-2">Exchange Charges</h4>
                    <ul className="space-y-1.5">
                      <li>• Free for defective items</li>
                      <li>• ₹99 for size/color exchanges</li>
                      <li>• Full price difference if applicable</li>
                      <li>• No exchange for sale items</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-champagne/45 bg-white/70 p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-serif font-semibold text-luxury-black mb-6 border-b border-champagne/30 pb-2">Damaged or Defective Items</h2>

              <div className="space-y-4">
                <p className="text-xs text-text-secondary font-light leading-relaxed">
                  If you receive a damaged or defective item, please contact us immediately with
                  photos of the item and packaging. We will arrange for a replacement or full refund
                  at no extra cost to you.
                </p>

                <div className="bg-amber-50/30 border border-amber-250/30 rounded-2xl p-4">
                  <h4 className="font-bold text-amber-900 mb-2 uppercase tracking-wider">Important</h4>
                  <ul className="space-y-1.5 text-xs text-amber-800 font-light">
                    <li>• Report damage within 24 hours of delivery</li>
                    <li>• Keep original packaging and all accessories</li>
                    <li>• Take clear photos from multiple angles</li>
                    <li>• Do not use damaged items before inspection</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-text-secondary font-light">
                Need help with returns or refunds?{" "}
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

export default ReturnsRefunds;