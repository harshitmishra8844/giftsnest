import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { getUserAuth } from "../services/userAuth";



const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const getOrderDisplayId = (order) => order?.orderCode || order?._id || "N/A";

const formatCouponEndDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatCouponOfferLabel = (c) => {
  if (c.type === "percent") {
    const cap = Number(c.maxDiscount) > 0 ? ` · max ₹${c.maxDiscount}` : "";
    return `${c.value}% off${cap}`;
  }
  return `₹${c.value} off`;
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const cartCouponHandoffDone = useRef(false);
  const { cartItems, totalPrice, clearCart } = useCart();
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Online");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [globalStoreInfo, setGlobalStoreInfo] = useState(null);

  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const { data } = await api.get("/store-info");
        setGlobalStoreInfo(data);
      } catch (err) {
        console.error("Failed to fetch store settings:", err);
      }
    };
    fetchGlobalSettings();
  }, []);

  const isCodGloballyEnabled = globalStoreInfo?.codEnabled !== false;
  const isCodAllowedForCart = cartItems.every((item) => item.codEnabled !== false);
  const isCodAvailable = isCodGloballyEnabled && isCodAllowedForCart;

  const userAuth = getUserAuth();

  useEffect(() => {
    if (!userAuth?.token) {
      navigate("/login", { state: { redirectTo: "/checkout" } });
      return;
    }

    // Fetch saved addresses
    const fetchAddresses = async () => {
      try {
        const { data } = await api.get("/user/addresses");
        setSavedAddresses(data);
        // Auto-select default address if available
        const defaultAddr = data.find(addr => addr.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr._id);
        }
      } catch (err) {
        console.error("Failed to fetch addresses:", err);
      }
    };

    fetchAddresses();
  }, [navigate, userAuth]);

  useEffect(() => {
    if (!userAuth?.token) return;
    let cancelled = false;
    (async () => {
      try {
        setCouponsLoading(true);
        const { data } = await api.get("/orders/active-coupons");
        if (!cancelled && Array.isArray(data)) setActiveCoupons(data);
      } catch {
        if (!cancelled) setActiveCoupons([]);
      } finally {
        if (!cancelled) setCouponsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userAuth?.token]);

  const orderProducts = useMemo(
    () =>
      cartItems.map((item) => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        customization: item.customization || {},
      })),
    [cartItems]
  );

  useEffect(() => {
    const codeFromCart = location.state?.couponCode;
    if (!codeFromCart || cartCouponHandoffDone.current || orderProducts.length === 0) return;

    const normalized = String(codeFromCart).toUpperCase().trim();
    if (!normalized) return;

    cartCouponHandoffDone.current = true;
    setCouponCode(normalized);
    setCouponError("");

    let cancelled = false;
    (async () => {
      try {
        setApplyingCoupon(true);
        const { data } = await api.post("/orders/apply-coupon", {
          couponCode: normalized,
          products: orderProducts,
        });
        if (cancelled) return;
        setCouponData(data);
        setInfo(data.message);
        navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
      } catch (err) {
        if (!cancelled) {
          setCouponData(null);
          const msg = err.response?.data?.message;
          setCouponError(typeof msg === "string" ? msg : "Coupon could not be applied");
        }
      } finally {
        if (!cancelled) setApplyingCoupon(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.state, location.pathname, location.search, navigate, orderProducts]);

  const applyCouponWithCode = async (code) => {
    setCouponError("");
    setInfo("");
    const normalized = String(code ?? "").trim().toUpperCase();
    if (!normalized) {
      setCouponError("Enter a coupon code");
      return;
    }
    setCouponCode(normalized);
    try {
      setApplyingCoupon(true);
      const { data } = await api.post("/orders/apply-coupon", {
        couponCode: normalized,
        products: orderProducts,
      });
      setCouponData(data);
      setInfo(data.message);
    } catch (err) {
      setCouponData(null);
      const body = err.response?.data;
      const msg = typeof body?.message === "string" ? body.message : null;
      setCouponError(msg || "Invalid coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const applyCoupon = () => applyCouponWithCode(couponCode);

  const removeCoupon = () => {
    setCouponData(null);
    setCouponCode("");
    setCouponError("");
    setInfo("");
  };

  const subtotal = Number(totalPrice.toFixed(2));
  const discountAmount = couponData?.discountAmount || 0;
  const finalTotal = couponData?.finalTotal ?? subtotal;
  const hasSavedAddresses = savedAddresses.length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (orderProducts.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!userAuth?.token) {
      setError("Please login to place an order.");
      navigate("/login", { state: { redirectTo: "/checkout" } });
      return;
    }

    if (!hasSavedAddresses) {
      setError("Please add a delivery address in My Addresses before completing your order.");
      navigate("/my-profile", {
        state: { activeTab: "addresses", openAddressForm: true, returnTo: "/checkout" },
      });
      return;
    }

    const selectedAddr = savedAddresses.find((addr) => addr._id === selectedAddressId)
      || savedAddresses.find((addr) => addr.isDefault)
      || savedAddresses[0];
    if (!selectedAddr) {
      setError("No valid delivery address found.");
      navigate("/my-profile", {
        state: { activeTab: "addresses", openAddressForm: true, returnTo: "/checkout" },
      });
      return;
    }

    // Validation succeeded, show modal
    setShowPaymentModal(true);
  };

  const handleConfirmOrder = async (selectedMethod) => {
    setShowPaymentModal(false);
    setError("");
    setInfo("");

    const selectedAddr = savedAddresses.find((addr) => addr._id === selectedAddressId)
      || savedAddresses.find((addr) => addr.isDefault)
      || savedAddresses[0];
    if (!selectedAddr) {
      setError("No valid delivery address found.");
      return;
    }

    const orderAddress = {
      fullName: selectedAddr.fullName,
      phone: selectedAddr.phone,
      line1: selectedAddr.line1,
      city: selectedAddr.city,
      state: selectedAddr.state,
      postalCode: selectedAddr.postalCode,
      country: selectedAddr.country,
    };

    try {
      setPlacingOrder(true);
      const payload = {
        products: orderProducts,
        totalPrice: finalTotal,
        couponCode,
        address: orderAddress,
        paymentMethod: selectedMethod,
      };

      const { data } = await api.post("/orders", payload);
      const appOrder = data.order;

      if (selectedMethod === "COD") {
        clearCart();
        navigate("/cart", {
          state: {
            orderSuccess: `Order placed successfully (Cash on Delivery). Order ID: ${getOrderDisplayId(appOrder)}`,
          },
        });
        setPlacingOrder(false);
        return;
      }

      setInfo("Order created. Opening secure payment...");

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load.");
      }

      const paymentOrderResponse = await api.post("/payments/create-order", {
        appOrderId: appOrder._id,
      });

      const paymentConfig = paymentOrderResponse.data;

      if (paymentConfig.demoMode) {
        setInfo("Demo mode: completing test payment (no Razorpay popup)...");
        await api.post("/payments/demo-complete", { appOrderId: appOrder._id });
        clearCart();
        navigate("/cart", {
          state: {
            orderSuccess: `Demo payment successful. Order ID: ${getOrderDisplayId(appOrder)}`,
          },
        });
        setPlacingOrder(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: paymentConfig.key,
        amount: paymentConfig.amount,
        currency: paymentConfig.currency,
        name: "Niyora Gifts",
        description: "Personalized Gift Order Payment",
        order_id: paymentConfig.razorpayOrderId,
        handler: async (response) => {
          try {
            await api.post("/payments/verify", {
              appOrderId: appOrder._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            clearCart();
            navigate("/cart", {
              state: {
                orderSuccess: `Payment successful. Order ID: ${getOrderDisplayId(appOrder)}`,
              },
            });
          } catch (verifyError) {
            setError(
              verifyError.response?.data?.message ||
                "Payment was made but verification failed. Please contact support."
            );
          } finally {
            setPlacingOrder(false);
          }
        },
        prefill: {
          name: orderAddress.fullName,
          contact: orderAddress.phone,
        },
        notes: {
          appOrderId: appOrder._id,
        },
        theme: {
          color: "#D4AF37",
        },
        modal: {
          ondismiss: () => {
            setError("Payment popup closed. You can retry checkout.");
            setInfo("");
            setPlacingOrder(false);
          },
        },
      });

      razorpay.on("payment.failed", () => {
        setError("Payment failed or cancelled. Please try again.");
        setInfo("");
        setPlacingOrder(false);
      });

      razorpay.open();
      return;
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to place order. Please try again.");
      setInfo("");
      setPlacingOrder(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <section className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-12 text-center shadow-xs max-w-xl mx-auto">
        <h2 className="text-2xl font-serif font-light text-luxury-black">No items to checkout</h2>
        <p className="mt-2.5 text-xs text-text-secondary font-light leading-relaxed">Your cart is empty right now. Add curated gifts to continue.</p>
        <Link
          to="/products"
          className="mt-6 inline-flex rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 shadow-sm font-semibold"
        >
          Continue Shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_340px] pb-16">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-xs"
      >
        <div className="rounded-2xl bg-luxury-black p-6 text-white shadow-xs border border-gold-500/20">
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold-400 font-semibold">Secure Checkout</p>
          <h2 className="mt-1.5 text-2xl font-serif font-light tracking-tight">Complete your order</h2>
          <p className="mt-1 text-xs text-gray-350 font-light">
            Premium packaging, express delivery options, and secure Razorpay payment integrations.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-serif font-semibold text-luxury-black border-b border-champagne/30 pb-2">Delivery Address</h3>

          {hasSavedAddresses ? (
            <div className="mt-4 rounded-2xl border border-champagne/45 bg-white/60 p-4 shadow-xs">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary font-semibold">Shipping to</p>

              {(() => {
                const selectedAddr = savedAddresses.find(addr => addr._id === selectedAddressId) || savedAddresses.find(addr => addr.isDefault) || savedAddresses[0];
                return (
                  <div className="rounded-xl border border-champagne/30 bg-white p-4 text-xs shadow-xs font-light text-text-secondary space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold font-serif text-sm text-luxury-black">{selectedAddr.label}</span>
                      {selectedAddr.isDefault && (
                        <span className="rounded-full bg-gold-50 border border-gold-200/30 px-2 py-0.5 text-[9px] font-bold uppercase text-gold-800 tracking-wider">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-luxury-black font-medium">{selectedAddr.fullName}</p>
                    <p>{selectedAddr.line1}</p>
                    <p>
                      {selectedAddr.city}, {selectedAddr.state} {selectedAddr.postalCode}
                    </p>
                    <p>{selectedAddr.country}</p>
                    <p className="text-luxury-black mt-1 font-normal">📞 {selectedAddr.phone}</p>
                  </div>
                );
              })()}

              <div className="mt-4 pt-3 border-t border-champagne/30">
                <p className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">
                  To change address, visit your{" "}
                  <Link to="/my-profile" className="text-gold-700 hover:text-gold-800 font-bold transition-colors">
                    profile settings
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-champagne/45 bg-white/60 p-4 shadow-xs">
              <p className="mb-2 text-xs font-semibold text-luxury-black">Add delivery address</p>
              <p className="text-xs text-text-secondary font-light leading-relaxed mb-4">
                No saved address found. Please add your address in profile, then return to complete order.
              </p>
              <Link
                to="/my-profile"
                state={{ activeTab: "addresses", openAddressForm: true, returnTo: "/checkout" }}
                className="inline-flex items-center rounded-full bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors shadow-sm font-semibold"
              >
                Go to My Addresses
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-champagne bg-white/70 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold-50 rounded-lg flex items-center justify-center border border-gold-200/30">
              <svg className="w-4 h-4 text-gold-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-serif font-semibold text-luxury-black">Payment Mode Selection</h3>
              <p className="text-[10px] text-text-secondary font-light uppercase tracking-wider">Select payment method in the next step</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary font-light leading-relaxed">
            You will choose between <strong>Online Payment</strong> and <strong>Cash on Delivery (COD)</strong> in a popup modal after clicking the proceed button.
          </p>
        </div>

        <div className="rounded-2xl border border-gold-300/40 bg-gold-50/5 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold-50 rounded-lg flex items-center justify-center border border-gold-200/30">
              <svg className="w-4 h-4 text-gold-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-serif font-bold text-luxury-black">{"Coupons & offers"}</p>
              <p className="text-[10px] text-text-secondary font-light uppercase tracking-wider">Select an active coupon or enter a code below</p>
            </div>
          </div>

          {(couponsLoading || activeCoupons.length > 0) && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700 font-semibold">Active coupons</p>
              {couponsLoading ? (
                <p className="text-xs text-gold-700 font-light">Loading offers…</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {activeCoupons.map((c) => {
                    const isApplied = couponData?.code === c.code;
                    const minCart = Number(c.minCartValue || 0);
                    const meetsMin = subtotal >= minCart;
                    const shortBy = Math.max(0, minCart - subtotal);
                    return (
                      <li key={c.code}>
                        <div
                          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                            isApplied
                              ? "border-gold-500 bg-gold-50/40"
                              : meetsMin
                                ? "border-champagne bg-white hover:border-gold-300/50"
                                : "border-champagne bg-gray-50/30"
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="font-mono text-xs font-bold text-luxury-black tracking-wider">{c.code}</p>
                            <p className="text-[11px] font-semibold text-gold-700">{formatCouponOfferLabel(c)}</p>
                            <p className="text-[10px] text-text-secondary font-light">
                              Min. order ₹{minCart}
                              {c.endDate ? ` · Valid till ${formatCouponEndDate(c.endDate)}` : ""}
                            </p>
                            {!meetsMin && !isApplied ? (
                              <p className="text-[10px] font-semibold text-gold-600">
                                Add ₹{Number(shortBy.toFixed(0))} more to use this coupon
                              </p>
                            ) : null}
                          </div>
                          {isApplied ? (
                            <span className="shrink-0 rounded-full bg-gold-500 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white shadow-xs">
                              Applied
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => applyCouponWithCode(c.code)}
                              disabled={applyingCoupon || !meetsMin}
                              className="shrink-0 rounded-full bg-luxury-black px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white transition hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              Apply
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700 font-semibold">Enter coupon code</p>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code (e.g., GIFT10)"
              className="flex-1 rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={applyingCoupon}
              className="rounded-full bg-luxury-black px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-sm cursor-pointer"
            >
              {applyingCoupon ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Applying...
                </span>
              ) : (
                "Apply"
              )}
            </button>
          </div>
          {couponError && (
            <div className="flex items-center gap-2 text-xs text-red-650 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {couponError}
            </div>
          )}
          {info && (
            <div className="flex items-center gap-2 text-xs text-gold-700 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {info}
            </div>
          )}
          {couponData && (
            <div className="rounded-xl border border-gold-200 bg-gold-50/40 p-3 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold text-luxury-black">
                    {couponData.code ? (
                      <>
                        <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-gold-900 ring-1 ring-gold-200">
                          {couponData.code}
                        </span>
                        <span className="ml-2 font-medium text-gold-700">applied successfully</span>
                      </>
                    ) : (
                      <span className="font-medium text-gold-700">Discount applied</span>
                    )}
                  </p>
                  <div className="flex items-center justify-between gap-3 text-[11px] text-text-secondary font-light">
                    <span>{couponData.message}</span>
                    <span className="shrink-0 font-bold text-gold-800">-₹{couponData.discountAmount}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="shrink-0 rounded-full border border-champagne bg-white px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:text-red-750 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
              {couponData.couponEndDate ? (
                <p className="mt-2.5 inline-flex items-center rounded-full border border-gold-200 bg-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-700">
                  Coupon valid until {formatCouponEndDate(couponData.couponEndDate)}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {error ? <p className="text-xs text-red-650 font-medium">{error}</p> : null}
        {info ? <p className="text-xs text-gold-700 font-medium">{info}</p> : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-champagne bg-white/50 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gold-800">100% Secure Payment</div>
          <div className="rounded-xl border border-champagne bg-white/50 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gold-800">Premium Packaging</div>
          <div className="rounded-xl border border-champagne bg-white/50 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gold-800">Fast Delivery Support</div>
        </div>

        <button
          type="submit"
          disabled={placingOrder}
          className="w-full rounded-full bg-gold-500 hover:bg-gold-600 px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-75 transition-all duration-300 shadow-xs cursor-pointer font-semibold"
        >
          {placingOrder ? "Processing..." : "Proceed to Pay"}
        </button>
      </form>

      <aside className="h-fit rounded-3xl border border-champagne/45 bg-white/70 p-5 shadow-xs backdrop-blur-sm">
        <h3 className="text-sm font-serif font-semibold text-luxury-black border-b border-champagne/30 pb-2">Order Summary</h3>
        <ul className="mt-3.5 space-y-2.5 text-xs text-text-secondary font-light border-b border-champagne/30 pb-3.5">
          {cartItems.map((item) => (
            <li key={item._id} className="flex items-center justify-between gap-3">
              <span className="truncate max-w-[170px]">{item.name} x {item.quantity}</span>
              <span className="font-semibold font-serif text-luxury-black">INR {item.price * item.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3.5 space-y-2.5 text-xs text-text-secondary font-light border-b border-champagne/30 pb-3.5">
          <p className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-luxury-black">INR {subtotal}</span>
          </p>
          <p className="flex items-center justify-between">
            <span>Discount</span>
            <span className="text-gold-700 font-bold">- INR {discountAmount}</span>
          </p>
        </div>
        <div className="mt-3.5 flex items-center justify-between text-sm font-semibold text-luxury-black">
          <span>Total Price</span>
          <span className="font-serif text-base">INR {finalTotal}</span>
        </div>
        <p className="mt-5 rounded-xl bg-gold-50/20 border border-gold-100/50 px-3 py-2.5 text-[10px] text-text-secondary leading-normal font-light">
          By completing this checkout, you agree to our shipping, cancellation and returns policy guidelines.
        </p>
      </aside>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-gold-300/20 bg-white/95 p-6 shadow-2xl space-y-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-champagne/30 pb-3">
              <div>
                <h3 className="text-lg font-serif font-semibold text-luxury-black">Select Payment Mode</h3>
                <p className="text-[10px] text-text-secondary font-light uppercase tracking-wider">Choose how you'd like to pay</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-text-secondary hover:text-luxury-black text-2xl font-light cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <label 
                className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${
                  paymentMethod === "Online" 
                    ? "border-gold-500 bg-gold-50/10 shadow-xs ring-2 ring-gold-500/10" 
                    : "border-champagne bg-white hover:border-gold-300/40 hover:bg-gold-50/10"
                }`}
                onClick={() => setPaymentMethod("Online")}
              >
                <input
                  type="radio"
                  name="modalPaymentMethod"
                  value="Online"
                  checked={paymentMethod === "Online"}
                  readOnly
                  className="mt-0.5 accent-gold-600 cursor-pointer"
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-luxury-black">Online Payment</p>
                  <p className="text-[10px] text-text-secondary font-light leading-relaxed mt-1">
                    Pay securely via UPI, Card, NetBanking or Wallets using Razorpay.
                  </p>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 rounded-2xl border p-4 transition-all duration-300 ${
                  !isCodAvailable 
                    ? "opacity-50 cursor-not-allowed border-champagne bg-gray-50/50" 
                    : paymentMethod === "COD" 
                      ? "border-gold-500 bg-gold-50/10 shadow-xs ring-2 ring-gold-500/10 cursor-pointer" 
                      : "border-champagne bg-white hover:border-gold-300/40 hover:bg-gold-50/10 cursor-pointer"
                }`}
                onClick={() => isCodAvailable && setPaymentMethod("COD")}
              >
                <input
                  type="radio"
                  name="modalPaymentMethod"
                  value="COD"
                  checked={paymentMethod === "COD"}
                  disabled={!isCodAvailable}
                  readOnly
                  className="mt-0.5 accent-gold-600 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-luxury-black">Cash on Delivery (COD)</p>
                    {!isCodAvailable && (
                      <span className="rounded-full bg-gold-50 border border-gold-200/50 px-2 py-0.5 text-[8px] font-bold uppercase text-gold-700 tracking-wider">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-secondary font-light leading-relaxed mt-1">
                    Place order now and pay with cash or digital options at the time of delivery.
                  </p>
                  {!isCodAvailable && (
                    <p className="text-[9px] text-red-650 font-medium mt-1.5 leading-snug">
                      {!isCodGloballyEnabled 
                        ? "COD is currently disabled website-wide." 
                        : "Some items in your cart do not support COD."}
                    </p>
                  )}
                </div>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 rounded-full border border-champagne bg-white py-3 text-xs font-bold uppercase tracking-widest text-luxury-black hover:bg-gold-50 transition-all cursor-pointer font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmOrder(paymentMethod)}
                className="flex-1 rounded-full bg-gold-500 hover:bg-gold-600 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all cursor-pointer shadow-xs hover:shadow-sm font-semibold"
              >
                {paymentMethod === "COD" ? "Confirm Order" : "Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fadeIn 0.2s ease-out forwards;
          }
          .animate-scale-in {
            animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}
      </style>
    </section>
  );
};

export default Checkout;
