import { useEffect } from "react";
import { 
  Clock, 
  Truck, 
  CreditCard, 
  MapPin, 
  AlertTriangle, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Calendar,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const ShippingPolicy = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Shipping Policy | Niyora Gifts";
    return () => {
      document.title = previousTitle;
    };
  }, []);

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
            Shipping & Delivery Policy
          </h1>
          <p className="max-w-xl mx-auto text-xs text-gray-300 font-light leading-relaxed">
            Thank you for shopping with Niyora Gifts! We want your curated surprises and luxury gift items to reach you or your loved ones safely, beautifully wrapped, and strictly on time.
          </p>
        </div>
      </header>

      {/* Policy Details Grid */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 mt-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* 1. Processing Time */}
          <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
            <div className="space-y-4">
              <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                  Order Processing
                </h3>
                <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                  <li>• All orders processed within <strong className="font-semibold text-luxury-black">1–2 business days</strong> after payment.</li>
                  <li>• Shipments and deliveries are paused on <strong className="font-semibold text-luxury-black">Sundays and public holidays</strong>.</li>
                  <li>• High volume periods may add 1-2 days; we will notify you immediately of any delay.</li>
                </ul>
              </div>
            </div>
          </article>

          {/* 2. Shipping Time & Delivery */}
          <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
            <div className="space-y-4">
              <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                <Truck className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                  Timelines & Delivery
                </h3>
                <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                  <li>• <strong className="font-semibold text-luxury-black">Domestic Orders:</strong> Typically arrive within 3–7 business days.</li>
                  <li>• <strong className="font-semibold text-luxury-black">Remote Areas:</strong> May take an additional 2–3 business days.</li>
                  <li>• <strong className="font-semibold text-luxury-black">International:</strong> Typically 7–15 business days (subject to customs).</li>
                  <li className="text-[10px] italic text-gray-400 font-light mt-1">Estimates are subject to weather, courier partner speeds, and customs.</li>
                </ul>
              </div>
            </div>
          </article>

          {/* 3. Shipping Charges */}
          <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
            <div className="space-y-4">
              <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                  Charges & Fees
                </h3>
                <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                  <li>• Calculated at checkout based on weight, location, and speed.</li>
                  <li>• We offer <strong className="font-semibold text-gold-700">Free Shipping</strong> on orders above <strong className="font-semibold text-gold-700">₹999</strong>.</li>
                  <li>• Customs duties or import taxes (if applicable) are the customer's responsibility.</li>
                </ul>
              </div>
            </div>
          </article>

          {/* 4. Tracking */}
          <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
            <div className="space-y-4">
              <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                  Order Tracking
                </h3>
                <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                  <li>• Confirmation email/SMS with tracking ID sent upon dispatch.</li>
                  <li>• Live updates are available via the carrier links provided.</li>
                  <li>• Track order journey anytime by logging into your Niyora profile.</li>
                </ul>
              </div>
            </div>
            <div className="pt-4 border-t border-champagne/10 mt-4">
              <Link 
                to="/login"
                className="text-[10px] font-bold uppercase tracking-wider text-gold-600 hover:text-gold-700 transition flex items-center gap-1 bg-transparent border-none cursor-pointer"
              >
                Go to Profile <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </article>

          {/* 5. Address Details & Delays */}
          <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
            <div className="space-y-4">
              <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                  Address Verification
                </h3>
                <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                  <li>• Double-check your shipping details before purchase.</li>
                  <li>• Niyora is not responsible for lost packages due to incorrect addresses.</li>
                  <li>• Notice an error? Contact us immediately at <span className="font-semibold text-luxury-black">niyoragifts@gmail.com</span> to correct before dispatch.</li>
                </ul>
              </div>
            </div>
          </article>

          {/* 6. Perishables & Damaged Packages */}
          <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
            <div className="space-y-4">
              <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                  Damaged Packages
                </h3>
                <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                  <li>• Package damaged or lost? Contact support within <strong className="font-semibold text-luxury-black">48 hours of delivery</strong>.</li>
                  <li>• Provide photos of the damaged packaging and gifts.</li>
                  <li>• We will arrange a replacement or refund per our Return & Refund Policy.</li>
                </ul>
              </div>
            </div>
          </article>

        </div>

        {/* Multiple Shipments Note */}
        <div className="mt-8 rounded-3xl border border-champagne/45 bg-gold-50/15 p-6 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gold-500/5 text-gold-600 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-luxury-black">Multiple Shipments Note</h4>
            <p className="text-xs text-text-secondary font-light leading-relaxed">
              If your order contains multiple custom items, they may be shipped separately based on warehouse allocations. Rest assured, you will not be charged any extra shipping fees for split deliveries.
            </p>
          </div>
        </div>

        {/* Need Help? Footer Section */}
        <section className="mt-12 rounded-3xl border border-gold-500/15 bg-luxury-black text-white p-8 md:p-10 shadow-lg text-center relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <div className="space-y-2">
              <h2 className="text-xl font-serif font-semibold text-white">Need Help with Your Shipment?</h2>
              <p className="text-xs text-gray-300 font-light leading-relaxed">
                If your package hasn't arrived within the expected window, or if you have specific courier inquiries, reach out directly to our concierge team:
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
                <Calendar className="w-4 h-4 text-gold-400 mb-1" />
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Support Hours</span>
                <p className="text-xs font-semibold text-white">
                  Mon–Sat, 10 AM – 6 PM
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-[10px] text-gray-400 italic font-light">
              Niyora Gifts reserves the right to update or modify this Shipping Policy at any time without prior notice. Please check this page periodically for updates.
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default ShippingPolicy;