import { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  RotateCcw, 
  RefreshCw, 
  Package, 
  XCircle, 
  AlertTriangle, 
  Mail, 
  Phone, 
  Clock, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar
} from "lucide-react";
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

  // Check if content matches the default simple seeder template
  const isDefaultPolicy = (html) => {
    if (!html) return true;
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return (
      stripped.includes("For cancelled or returned items, refunds are processed back") ||
      stripped.length < 200
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] pb-16">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Header Section */}
      <header className="relative bg-luxury-black text-white py-16 px-4 md:px-8 border-b border-gold-500/20 text-center overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10 bg-cover bg-center" 
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80')` }} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-luxury-black via-luxury-black/95 to-[#121212] z-0" />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold-500/10 border border-gold-500/35 text-xs text-gold-400 font-serif uppercase tracking-widest animate-pulse">
            N
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-wide text-white">
            Returns, Refunds & Replacement Policy
          </h1>
          <p className="max-w-xl mx-auto text-xs text-gray-300 font-light leading-relaxed">
            At Niyora Gifts, we want you to love every gift you order! If something isn't right, we're happy to help with a return, replacement, or refund — subject to the conditions below.
          </p>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 mt-12">
        {cmsContent?.content?.refundPolicy && !isDefaultPolicy(cmsContent.content.refundPolicy) ? (
          /* Render customized policy from CMS */
          <div className="rounded-3xl border border-champagne/45 bg-white p-8 shadow-xs backdrop-blur-md prose max-w-none text-sm text-text-secondary font-light leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: cmsContent.content.refundPolicy }} />
          </div>
        ) : (
          /* Render styled premium static layout */
          <div className="space-y-12 animate-fade-in">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              
              {/* 1. Eligibility */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      Return Eligibility
                    </h3>
                    <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                      <li>• Requests must be raised within <strong className="font-semibold text-luxury-black">7 days</strong> of delivery.</li>
                      <li>• Product must be <strong className="font-semibold text-luxury-black">unused, unwashed, and undamaged</strong>, with all original tags, accessories, and packaging intact.</li>
                      <li>• Sent back in original delivered condition. Used, altered, or customer-damaged items are not eligible.</li>
                      <li>• Customized/personalized gifts are <strong className="font-semibold text-gold-700">not eligible</strong> unless defective or damaged on arrival.</li>
                    </ul>
                  </div>
                </div>
              </article>

              {/* 2. Process Workflow */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35 lg:col-span-2">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      How The Process Works
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 text-xs text-text-secondary font-light leading-relaxed">
                      <div className="space-y-2">
                        <p><strong className="font-semibold text-luxury-black">1. Raise a Request:</strong> Contact support at <span className="font-semibold text-luxury-black">niyoragifts@gmail.com</span> within 7 days, providing your order number and clear photos of the issue.</p>
                        <p><strong className="font-semibold text-luxury-black">2. Review & Approval:</strong> Our concierge team will review the photos and details to verify eligibility under this policy.</p>
                        <p><strong className="font-semibold text-luxury-black">3. Return Shipping:</strong> Once approved, we will arrange a reverse pickup. If pickup is unavailable in your area, our support team will guide you on self-shipping with shipping fee reimbursement.</p>
                      </div>
                      <div className="space-y-2">
                        <p><strong className="font-semibold text-luxury-black">4. Quality Inspection:</strong> Once received at our hub, the product is inspected to confirm it remains unused and intact.</p>
                        <p><strong className="font-semibold text-luxury-black">5. Resolution:</strong> Upon successful inspection, we immediately dispatch the new replacement item or credit your refund.</p>
                        <p className="text-[10px] italic text-amber-600 mt-2 bg-amber-500/5 border border-amber-250/20 rounded-xl p-2.5">
                          ⚠️ Refunds & replacements are initiated only after the returned product is received and inspected at our store, not at the time of pickup.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              {/* 3. Refunds */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      Refund Guidelines
                    </h3>
                    <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                      <li>• Refund processed within <strong className="font-semibold text-luxury-black">5–7 business days</strong> after product approval.</li>
                      <li>• Credited back directly to your <strong className="font-semibold text-luxury-black">original payment method</strong>.</li>
                      <li>• Original shipping charges are <strong className="font-semibold text-luxury-black">non-refundable</strong> unless the return is due to our error (defective, wrong, or damaged item).</li>
                    </ul>
                  </div>
                </div>
              </article>

              {/* 4. Replacements */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      Replacements Policy
                    </h3>
                    <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                      <li>• Replacements are subject to <strong className="font-semibold text-luxury-black">stock availability</strong>.</li>
                      <li>• If the item is out of stock, we will issue a full refund or offer an alternative gift of equal value.</li>
                      <li>• The replacement item is dispatched within <strong className="font-semibold text-luxury-black">3–5 business days</strong> of inspecting the returned product.</li>
                    </ul>
                  </div>
                </div>
              </article>

              {/* 5. Non-Returnables */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-red-500/5 border border-red-500/10 text-red-600 group-hover:bg-red-500/10 group-hover:border-red-500/20 transition duration-300">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-red-800 uppercase tracking-wider">
                      Non-Returnable Items
                    </h3>
                    <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                      <li>• <strong className="font-semibold text-luxury-black">Personalized / customized</strong> items (unless defective on arrival).</li>
                      <li>• <strong className="font-semibold text-luxury-black">Perishable items</strong> (chocolates, fresh flowers, cakes) unless damaged on arrival.</li>
                      <li>• Items purchased as <strong className="font-semibold text-luxury-black">"Final Sale"</strong> or during clearance sales.</li>
                      <li>• Gift cards, vouchers, and coupons.</li>
                    </ul>
                  </div>
                </div>
              </article>

              {/* 6. Damaged / Defective on Arrival */}
              <div className="sm:col-span-2 lg:col-span-3 rounded-3xl border border-amber-500/15 bg-amber-50/15 p-6 shadow-xs flex flex-col sm:flex-row items-start gap-4">
                <div className="p-3 rounded-2xl bg-amber-500/5 text-amber-600 shrink-0">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">Damaged, Defective, or Wrong Item Received</h4>
                  <p className="text-xs text-text-secondary font-light leading-relaxed">
                    If you receive a product that is damaged, incorrect, or defective, please contact us within <strong className="font-semibold text-luxury-black">48 hours of delivery</strong> with clear unboxing photos/videos at <a href="mailto:niyoragifts@gmail.com" className="font-semibold text-luxury-black underline hover:text-gold-600">niyoragifts@gmail.com</a>. In such cases, Niyora Gifts will bear all return shipping costs and prioritize an immediate replacement or full refund.
                  </p>
                </div>
              </div>

            </div>

            {/* Important Notes */}
            <div className="rounded-3xl border border-champagne/45 bg-gold-50/15 p-6 shadow-xs flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gold-500/5 text-gold-600 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-luxury-black">Important Policy Notes</h4>
                <ul className="text-xs text-text-secondary font-light space-y-1 leading-relaxed list-disc list-inside">
                  <li>Any return package sent to us without prior support approval will not be accepted or processed.</li>
                  <li>Products returned in a used, altered, or customer-damaged state will be sent back to the customer, and no refund or exchange will be issued.</li>
                  <li>Processing and dispatch times may vary slightly during peak holiday sales or high order volumes.</li>
                </ul>
              </div>
            </div>

            {/* Need Help? Footer Section */}
            <section className="rounded-3xl border border-gold-500/15 bg-luxury-black text-white p-8 md:p-10 shadow-lg text-center relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="max-w-2xl mx-auto space-y-6 relative z-10">
                <div className="space-y-2">
                  <h2 className="text-xl font-serif font-semibold text-white">Need Help with Returns or Replacements?</h2>
                  <p className="text-xs text-gray-300 font-light leading-relaxed">
                    Our customer experience concierge team is available to assist you with any questions regarding returns, refunds, or replacement status.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 pt-2 text-left">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <Mail className="w-4 h-4 text-gold-400 mb-1" />
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Email Us</span>
                    <a href="mailto:niyoragifts@gmail.com" className="text-xs font-semibold text-white hover:text-gold-400 transition break-all">
                      niyoragifts@gmail.com
                    </a>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <Phone className="w-4 h-4 text-gold-400 mb-1" />
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Call Us</span>
                    <a href="tel:+919000000000" className="text-xs font-semibold text-white hover:text-gold-400 transition">
                      +91 90000-00000
                    </a>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <Clock className="w-4 h-4 text-gold-400 mb-1" />
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Support Hours</span>
                    <p className="text-xs font-semibold text-white">
                      Mon–Sat, 10 AM – 6 PM
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 text-[10px] text-gray-400 italic font-light">
                  Niyora Gifts reserves the right to update or modify this policy at any time without prior notice. Please check this page periodically for updates.
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReturnsRefunds;