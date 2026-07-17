import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Check, Truck, Package, Calendar, MapPin, CreditCard, 
  ArrowRight, ShoppingBag, Phone, Mail, Clock 
} from "lucide-react";
import api from "../services/api";
import { getUserAuth } from "../services/userAuth";

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [storeContact, setStoreContact] = useState(null);
  const [loadingContact, setLoadingContact] = useState(true);

  const order = location.state?.order;
  const successMessage = location.state?.message || "Your payment was processed successfully.";

  // Fetch contact information from CMS for support details
  useEffect(() => {
    const fetchContactDetails = async () => {
      try {
        const { data } = await api.get("/cms/content/contact");
        setStoreContact(data?.content || null);
      } catch (err) {
        console.error("Failed to load store contact for success page:", err);
      } finally {
        setLoadingContact(false);
      }
    };
    fetchContactDetails();
  }, []);

  // Redirect to home if accessed directly without order data
  useEffect(() => {
    if (!order) {
      const timer = setTimeout(() => {
        navigate("/", { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [order, navigate]);

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
        <h2 className="text-xl font-serif font-bold text-luxury-black">No order details found</h2>
        <p className="text-sm text-text-secondary font-light max-w-sm">
          Redirecting you to the home page in a few seconds...
        </p>
        <Link to="/" className="inline-flex rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold tracking-widest text-xs uppercase px-6 py-2.5 transition">
          Go Home Immediately
        </Link>
      </div>
    );
  }

  const orderDisplayId = order?.orderCode || order?._id || "N/A";
  const userAuth = getUserAuth();
  const customerEmail = userAuth?.email || userAuth?.user?.email || order?.address?.email || "";

  const subtotal = Number(order?.subtotal || order?.totalPrice || 0);
  const discount = Number(order?.discountAmount || 0);
  const total = Number(order?.totalPrice || 0);

  // Default support fallbacks if CMS fetch fails
  const supportEmail = storeContact?.email || "niyoragifts@gmail.com";
  const supportPhone = storeContact?.phone || "+91 90000 00000";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-16 space-y-12 animate-slide-up">
      {/* 1. Header Animation and Success Confirmation */}
      <div className="text-center space-y-4">
        {/* Pulsing Animated Gold Checkmark */}
        <div className="flex justify-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative flex items-center justify-center h-24 w-24 rounded-full bg-gold-50 border border-gold-300 shadow-xl"
          >
            <motion.div 
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-gold-200/20 blur-md"
            />
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-gold-400 to-gold-600 flex items-center justify-center text-luxury-black shadow-lg shadow-gold-500/10">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
          </motion.div>
        </div>

        <motion.h1 
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl md:text-5xl font-serif text-luxury-black font-semibold mt-6"
        >
          Order Confirmed!
        </motion.h1>

        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-sm md:text-base text-text-secondary font-light max-w-lg mx-auto leading-relaxed"
        >
          {successMessage} We have sent a receipt and order confirmation details to <strong className="font-semibold text-luxury-black">{customerEmail}</strong>.
        </motion.p>
      </div>

      {/* 2. Order Timeline Stepper */}
      <section className="rounded-3xl border border-champagne bg-white p-6 md:p-8 shadow-sm">
        <h3 className="text-sm font-serif font-bold text-luxury-black tracking-wider uppercase border-b border-gold-100 pb-3 mb-6">
          Gifting Progress Tracker
        </h3>
        <div className="grid gap-6 md:grid-cols-3 relative">
          {/* Stepper items */}
          <div className="flex gap-4 items-start md:flex-col md:text-center md:items-center">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gold-500 text-luxury-black flex items-center justify-center border border-gold-600 font-bold shadow-md shadow-gold-500/10">
              ✓
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-sm font-bold text-luxury-black">Order Placed</h4>
              <p className="text-[11px] text-text-secondary font-light">Your order request has been registered in our system.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start md:flex-col md:text-center md:items-center">
            <div className="h-10 w-10 shrink-0 rounded-full border border-gold-300 bg-gold-50/50 text-gold-600 flex items-center justify-center font-bold animate-pulse">
              <Package className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-sm font-bold text-gold-700">Preparation</h4>
              <p className="text-[11px] text-text-secondary font-light">Our curators are selection-checking flowers, baking, and wrapping your gifts.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start md:flex-col md:text-center md:items-center">
            <div className="h-10 w-10 shrink-0 rounded-full border border-gray-200 bg-gray-50 text-gray-400 flex items-center justify-center font-bold">
              <Truck className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-sm font-bold text-gray-400">Delivery Surprises</h4>
              <p className="text-[11px] text-text-secondary font-light">Our courier hand-delivers the package to the recipient's doorstep.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Detailed Summary Card */}
      <section className="rounded-3xl border border-champagne bg-white/70 backdrop-blur-md p-6 md:p-8 shadow-sm">
        <h3 className="text-sm font-serif font-bold text-luxury-black tracking-wider uppercase border-b border-gold-100 pb-3 mb-6">
          Order Information Summary
        </h3>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Metadata values */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gold-50 flex items-center justify-center text-gold-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-secondary font-light uppercase tracking-wider">Order Reference</p>
                <p className="text-sm font-serif font-bold text-gold-700">{orderDisplayId}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gold-50 flex items-center justify-center text-gold-600">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-secondary font-light uppercase tracking-wider">Payment Method</p>
                <p className="text-sm font-serif font-bold text-luxury-black">
                  {order.paymentMethod === "COD" ? "Cash on Delivery (COD)" : "Online Secure Checkout"}
                  <span className={`ml-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                    order.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/40" : "bg-gold-50 text-gold-700 border border-gold-200/40"
                  }`}>
                    {order.paymentStatus || "Pending"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gold-50 flex items-center justify-center text-gold-600">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-text-secondary font-light uppercase tracking-wider">Purchase Date</p>
                <p className="text-sm font-serif font-bold text-luxury-black">
                  {new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN", {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery values */}
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-gold-50 flex items-center justify-center text-gold-600 shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-text-secondary font-light uppercase tracking-wider">Delivery To</p>
              <p className="text-sm font-serif font-bold text-luxury-black mt-0.5">{order.address?.fullName}</p>
              <p className="text-xs text-text-secondary font-light leading-relaxed mt-1">
                {order.address?.line1}<br />
                {order.address?.city}, {order.address?.state} - {order.address?.postalCode}<br />
                {order.address?.country}
              </p>
              <p className="text-xs text-text-secondary font-light mt-1.5 flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-gold-500" />
                {order.address?.phone}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="border-t border-gold-100/60 mt-8 pt-6 space-y-3 max-w-md ml-auto">
          <div className="flex justify-between text-xs text-text-secondary font-light">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 font-light">
              <span>Promo Code Discount</span>
              <span>- ₹{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gold-100 pt-3 flex justify-between font-serif text-base font-bold text-luxury-black">
            <span>Grand Total</span>
            <span className="text-gold-700">₹{total.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* 4. Support Block */}
      <section className="rounded-3xl border border-gold-200/40 bg-gold-50/20 p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-center">
        <div className="space-y-1 text-center md:text-left">
          <h4 className="font-serif text-base font-bold text-gold-800">Need assistance with your gift?</h4>
          <p className="text-xs text-text-secondary font-light">If you need to change delivery address details or order requirements, feel free to reach out.</p>
        </div>
        <div className="flex flex-wrap gap-4 shrink-0 justify-center">
          <a 
            href={`mailto:${supportEmail}`}
            className="flex items-center gap-2 rounded-full border border-gold-250 bg-white hover:bg-gold-50 px-4 py-2 text-xs font-semibold text-gold-700 transition"
          >
            <Mail className="h-3.5 w-3.5" />
            {supportEmail}
          </a>
          <a 
            href={`tel:${supportPhone}`}
            className="flex items-center gap-2 rounded-full border border-gold-250 bg-white hover:bg-gold-50 px-4 py-2 text-xs font-semibold text-gold-700 transition"
          >
            <Phone className="h-3.5 w-3.5" />
            {supportPhone}
          </a>
        </div>
      </section>

      {/* 5. Stepper Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
        <Link 
          to={`/track-order?orderId=${orderDisplayId}&email=${customerEmail}`}
          className="w-full sm:w-auto text-center inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-450 to-gold-600 hover:from-gold-500 hover:to-gold-700 text-luxury-black font-bold tracking-widest text-xs uppercase px-8 py-3.5 transition duration-300 shadow-lg shadow-gold-500/10"
        >
          Track Gift Delivery
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link 
          to="/products"
          className="w-full sm:w-auto text-center inline-flex items-center justify-center gap-2 rounded-full border border-luxury-black hover:bg-luxury-black/5 text-luxury-black font-bold tracking-widest text-xs uppercase px-8 py-3.5 transition"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
