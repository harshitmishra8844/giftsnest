import { useEffect, useState } from "react";
import { 
  Scale, 
  UserPlus, 
  Lock, 
  FileText, 
  AlertTriangle, 
  ShieldCheck, 
  Shield, 
  Globe, 
  Mail, 
  Phone, 
  Clock, 
  Sparkles,
  ArrowRight,
  Trash2,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

const TermsConditions = () => {
  const [cmsContent, setCmsContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const { data } = await api.get("/cms/content/policies");
        setCmsContent(data);
      } catch (err) {
        console.error("Failed to load terms content:", err);
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
      document.title = "Terms & Conditions | Niyora Gifts";
    }
    return () => {
      document.title = previousTitle;
    };
  }, [cmsContent]);

  // Check if content matches the default simple seeder template
  const isDefaultTerms = (html) => {
    if (!html) return true;
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return (
      stripped.includes("By using our website, you agree to our terms of service") ||
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
            Terms & Conditions
          </h1>
          <p className="max-w-xl mx-auto text-xs text-gray-300 font-light leading-relaxed">
            Welcome to Niyora Gifts! These Terms govern your website usage and the creation and use of your account. By registering or using our site, you agree to be bound by these Terms.
          </p>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 mt-12">
        {cmsContent?.content?.termsConditions && !isDefaultTerms(cmsContent.content.termsConditions) ? (
          /* Render customized policy from CMS */
          <div className="rounded-3xl border border-champagne/45 bg-white p-8 shadow-xs backdrop-blur-md prose max-w-none text-sm text-text-secondary font-light leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: cmsContent.content.termsConditions }} />
          </div>
        ) : (
          /* Render styled premium static layout */
          <div className="space-y-12 animate-fade-in">
            
            {/* Last Updated Tag */}
            <div className="text-right text-xs text-text-secondary font-light italic">
              Last Updated: July 25, 2026
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              
              {/* Introduction */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35 lg:col-span-3 bg-gradient-to-r from-white to-gold-50/5">
                <div className="space-y-3">
                  <div className="p-3 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-serif font-semibold text-luxury-black">
                    Introduction & Acceptance
                  </h3>
                  <p className="text-xs text-text-secondary font-light leading-relaxed">
                    By registering for an account or using our site to browse, purchase, or interact with our services, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these Terms, please do not register an account or use our website.
                  </p>
                </div>
              </article>

              {/* 1. Account Registration */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      1. Account Registration
                    </h3>
                    <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                      <li>• Creating an account is required to place orders, save details, or access priority features.</li>
                      <li>• You agree to provide accurate, current, and complete details (name, email, phone, and delivery address).</li>
                      <li>• You must be at least 18 years old (or have parental/guardian consent) to register and make purchases.</li>
                    </ul>
                  </div>
                </div>
              </article>

              {/* 2. Account Responsibility */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      2. Account Responsibility
                    </h3>
                    <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                      <li>• You are solely responsible for keeping your login credentials confidential and secure.</li>
                      <li>• You accept full responsibility for all activities that occur under your account.</li>
                      <li>• If you suspect unauthorized access, please notify support immediately at <span className="font-semibold text-luxury-black">niyoragifts@gmail.com</span>.</li>
                    </ul>
                  </div>
                </div>
              </article>

              {/* 3. Accuracy of Information */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      3. Accuracy of Info
                    </h3>
                    <ul className="text-xs text-text-secondary font-light space-y-2 leading-relaxed">
                      <li>• You agree to keep your contact, billing, and shipping details up to date.</li>
                      <li>• Niyora Gifts is not liable for delivery failures, delays, or lost packages resulting from incorrect or outdated addresses.</li>
                    </ul>
                  </div>
                </div>
              </article>

              {/* 4. One Account Per User */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      4. One Account Per User
                    </h3>
                    <p className="text-xs text-text-secondary font-light leading-relaxed">
                      Each customer is permitted to maintain exactly one active account. Creating duplicate accounts to exploit promotional codes, discounts, new-user offers, or giveaways is strictly prohibited and leads to immediate restriction.
                    </p>
                  </div>
                </div>
              </article>

              {/* 5. Account Suspension */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-red-500/5 border border-red-500/10 text-red-600 group-hover:bg-red-500/10 group-hover:border-red-500/20 transition duration-300">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-red-800 uppercase tracking-wider">
                      5. Suspension & Termination
                    </h3>
                    <p className="text-xs text-text-secondary font-light leading-relaxed">
                      We reserve the right to suspend or terminate accounts, without notice, for providing false details, engaging in fraudulent transaction behaviors, or violating any terms listed in our shipping or returns policies.
                    </p>
                  </div>
                </div>
              </article>

              {/* 6. Privacy & Data Use */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      6. Privacy & Data Use
                    </h3>
                    <p className="text-xs text-text-secondary font-light leading-relaxed font-sans">
                      All data provided during account setup is handled in accordance with privacy standards. By creating an account, you consent to using this data for order processing, logistics coordination, and administrative alerts.
                    </p>
                  </div>
                </div>
              </article>

              {/* 7. Use of the Website */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      7. Website Usage
                    </h3>
                    <ul className="text-xs text-text-secondary font-light space-y-1.5 leading-relaxed">
                      <li>• You agree to use the site for lawful shopping activities only.</li>
                      <li>• Disruption, hacking, or attempting to breach security measures is strictly prohibited.</li>
                      <li>• Posting spam, abusive feedback, or duplicate fake reviews will result in account closure.</li>
                    </ul>
                  </div>
                </div>
              </article>

              {/* 8. Order & Purchase Terms */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      8. Order & Purchase Terms
                    </h3>
                    <p className="text-xs text-text-secondary font-light leading-relaxed">
                      All checkout purchases are additionally subject to our <Link to="/shipping-policy" className="font-semibold text-gold-700 underline">Shipping Policy</Link> and <Link to="/returns-refunds" className="font-semibold text-gold-700 underline">Returns Policy</Link>. We reserve the right to cancel orders if pricing inaccuracies or inventory errors occur.
                    </p>
                  </div>
                </div>
              </article>

              {/* 9. Changes to Terms */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      9. Changes to Terms
                    </h3>
                    <p className="text-xs text-text-secondary font-light leading-relaxed">
                      We reserve the right to update or revise these Terms at any time without prior notice. Continued use of your account after revisions constitutes acceptance of updated terms. We suggest checking this page periodically.
                    </p>
                  </div>
                </div>
              </article>

              {/* 10. Account Deletion */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      10. Account Deletion
                    </h3>
                    <p className="text-xs text-text-secondary font-light leading-relaxed">
                      If you wish to close and delete your account, please send an account deletion request to <a href="mailto:niyoragifts@gmail.com" className="font-semibold text-gold-700 underline">niyoragifts@gmail.com</a>. We will process your request and wipe records in accordance with regulations.
                    </p>
                  </div>
                </div>
              </article>

              {/* 11. Limitation of Liability */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      11. Liability Limits
                    </h3>
                    <p className="text-xs text-text-secondary font-light leading-relaxed">
                      Niyora Gifts is not liable for any indirect, incidental, or consequential damages arising from the use or inability to use your account, except as explicitly required by applicable regional laws.
                    </p>
                  </div>
                </div>
              </article>

              {/* 12. Governing Law */}
              <article className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-gold-500/35">
                <div className="space-y-4">
                  <div className="p-3.5 w-fit rounded-2xl bg-gold-500/5 border border-gold-500/10 text-gold-600 group-hover:bg-gold-500/10 group-hover:border-gold-500/20 transition duration-300">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-semibold text-luxury-black uppercase tracking-wider">
                      12. Governing Law
                    </h3>
                    <p className="text-xs text-text-secondary font-light leading-relaxed">
                      These Terms & Conditions shall be governed by and construed in accordance with the laws of Delhi, India, without regard to conflicts of law principles.
                    </p>
                  </div>
                </div>
              </article>

            </div>

            {/* Note Callout */}
            <div className="rounded-3xl border border-gold-500/15 bg-gold-50/15 p-6 shadow-xs flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gold-500/5 text-gold-600 shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-luxury-black">Compliance Guarantee</h4>
                <p className="text-xs text-text-secondary font-light leading-relaxed">
                  We are committed to operating in full transparency. Our terms ensure that every buyer's details are kept safe, pricing is fair, and transaction processes are smooth.
                </p>
              </div>
            </div>

            {/* Need Help? Footer Section */}
            <section className="rounded-3xl border border-gold-500/15 bg-luxury-black text-white p-8 md:p-10 shadow-lg text-center relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="max-w-2xl mx-auto space-y-6 relative z-10">
                <div className="space-y-2">
                  <h2 className="text-xl font-serif font-semibold text-white">Have Questions About Our Terms?</h2>
                  <p className="text-xs text-gray-300 font-light leading-relaxed">
                    If you require clarification on any part of these Terms or account security policies, please contact our concierge support:
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
                  Niyora Gifts reserves the right to update or modify these Terms & Conditions at any time without prior notice.
                </div>
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
};

export default TermsConditions;
