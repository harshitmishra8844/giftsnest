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

  const handleSubmit = async (event) => {
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
        paymentMethod,
      };

      const { data } = await api.post("/orders", payload);
      const appOrder = data.order;

      if (paymentMethod === "COD") {
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
          color: "#047857",
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
      <section className="rounded-3xl border border-gray-200/40 bg-white/70 backdrop-blur-md p-12 text-center shadow-sm max-w-xl mx-auto">
        <h2 className="text-2xl font-serif font-light text-gray-950">No items to checkout</h2>
        <p className="mt-2.5 text-xs text-gray-500 font-light leading-relaxed">Your cart is empty right now. Add curated gifts to continue.</p>
        <Link
          to="/products"
          className="mt-6 inline-flex rounded-full bg-emerald-950 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-900 transition-all duration-300 shadow-sm"
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
        className="space-y-6 rounded-3xl border border-gray-200/40 bg-white/70 backdrop-blur-md p-6 shadow-sm"
      >
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 p-6 text-white shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300">Secure Checkout</p>
          <h2 className="mt-1.5 text-2xl font-serif font-light tracking-tight">Complete your order</h2>
          <p className="mt-1 text-xs text-emerald-100/70 font-light">
            Premium packaging, express delivery options, and secure Razorpay payment integrations.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-serif font-semibold text-gray-950 border-b border-gray-100 pb-2">Delivery Address</h3>

          {hasSavedAddresses ? (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-white/60 p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Shipping to</p>

              {(() => {
                const selectedAddr = savedAddresses.find(addr => addr._id === selectedAddressId) || savedAddresses.find(addr => addr.isDefault) || savedAddresses[0];
                return (
                  <div className="rounded-xl border border-gray-100 bg-white p-4 text-xs shadow-sm font-light text-gray-600 space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold font-serif text-sm text-gray-950">{selectedAddr.label}</span>
                      {selectedAddr.isDefault && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-100/40 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-800 tracking-wider">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 font-medium">{selectedAddr.fullName}</p>
                    <p>{selectedAddr.line1}</p>
                    <p>
                      {selectedAddr.city}, {selectedAddr.state} {selectedAddr.postalCode}
                    </p>
                    <p>{selectedAddr.country}</p>
                    <p className="text-gray-900 mt-1 font-normal">📞 {selectedAddr.phone}</p>
                  </div>
                );
              })()}

              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                  To change address, visit your{" "}
                  <Link to="/my-profile" className="text-emerald-800 hover:text-emerald-950 font-bold transition-colors">
                    profile settings
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-white/60 p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold text-gray-900">Add delivery address</p>
              <p className="text-xs text-gray-500 font-light leading-relaxed mb-4">
                No saved address found. Please add your address in profile, then return to complete order.
              </p>
              <Link
                to="/my-profile"
                state={{ activeTab: "addresses", openAddressForm: true, returnTo: "/checkout" }}
                className="inline-flex items-center rounded-full bg-emerald-950 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-900 transition-colors shadow-sm"
              >
                Go to My Addresses
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200/40 bg-white/70 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-2.5">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100/40">
              <svg className="w-4 h-4 text-emerald-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-serif font-semibold text-gray-950">Payment Method</h3>
              <p className="text-[10px] text-gray-400 font-light uppercase tracking-wider">Choose your preferred checkout mode</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${paymentMethod === "Online" ? "border-emerald-500 bg-emerald-50/15 shadow-sm ring-2 ring-emerald-500/10" : "border-gray-150 bg-white hover:border-emerald-300/40 hover:bg-gray-50/40"}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="Online"
                checked={paymentMethod === "Online"}
                onChange={() => setPaymentMethod("Online")}
                className="mt-0.5 accent-emerald-950"
              />
              <div className="text-left">
                <p className="text-xs font-semibold text-gray-950">Online Payment</p>
                <p className="text-[10px] text-gray-400 font-light leading-relaxed mt-1">Pay securely via UPI, Card, NetBanking or Wallets using Razorpay.</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${paymentMethod === "COD" ? "border-emerald-500 bg-emerald-50/15 shadow-sm ring-2 ring-emerald-500/10" : "border-gray-150 bg-white hover:border-emerald-300/40 hover:bg-gray-50/40"}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={paymentMethod === "COD"}
                onChange={() => setPaymentMethod("COD")}
                className="mt-0.5 accent-emerald-950"
              />
              <div className="text-left">
                <p className="text-xs font-semibold text-gray-950">Cash on Delivery (COD)</p>
                <p className="text-[10px] text-gray-400 font-light leading-relaxed mt-1">Place order now and pay with cash or digital options at the time of delivery.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100/80 bg-amber-50/5 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100">
              <svg className="w-4 h-4 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-serif font-bold text-gray-950">{"Coupons & offers"}</p>
              <p className="text-[10px] text-gray-400 font-light uppercase tracking-wider">Select an active coupon or enter a code below</p>
            </div>
          </div>

          {(couponsLoading || activeCoupons.length > 0) && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Active coupons</p>
              {couponsLoading ? (
                <p className="text-xs text-amber-700 font-light">Loading offers…</p>
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
                              ? "border-emerald-450 bg-emerald-50/40"
                              : meetsMin
                                ? "border-gray-150 bg-white hover:border-amber-200/50"
                                : "border-gray-100 bg-gray-50/50"
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="font-mono text-xs font-bold text-emerald-950 tracking-wider">{c.code}</p>
                            <p className="text-[11px] font-semibold text-emerald-800">{formatCouponOfferLabel(c)}</p>
                            <p className="text-[10px] text-gray-400 font-light">
                              Min. order ₹{minCart}
                              {c.endDate ? ` · Valid till ${formatCouponEndDate(c.endDate)}` : ""}
                            </p>
                            {!meetsMin && !isApplied ? (
                              <p className="text-[10px] font-semibold text-amber-700">
                                Add ₹{Number(shortBy.toFixed(0))} more to use this coupon
                              </p>
                            ) : null}
                          </div>
                          {isApplied ? (
                            <span className="shrink-0 rounded-full bg-emerald-950 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                              Applied
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => applyCouponWithCode(c.code)}
                              disabled={applyingCoupon || !meetsMin}
                              className="shrink-0 rounded-full bg-emerald-950 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
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

          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Enter coupon code</p>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code (e.g., GIFT10)"
              className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs transition-all focus:border-emerald-500 focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={applyingCoupon}
              className="rounded-full bg-emerald-950 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
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
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {info}
            </div>
          )}
          {couponData && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold text-emerald-950">
                    {couponData.code ? (
                      <>
                        <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-emerald-900 ring-1 ring-emerald-100">
                          {couponData.code}
                        </span>
                        <span className="ml-2 font-medium text-emerald-800">applied successfully</span>
                      </>
                    ) : (
                      <span className="font-medium text-emerald-800">Discount applied</span>
                    )}
                  </p>
                  <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500 font-light">
                    <span>{couponData.message}</span>
                    <span className="shrink-0 font-bold text-emerald-800">-₹{couponData.discountAmount}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:text-red-750 transition-colors"
                >
                  Remove
                </button>
              </div>
              {couponData.couponEndDate ? (
                <p className="mt-2.5 inline-flex items-center rounded-full border border-emerald-100 bg-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                  Coupon valid until {formatCouponEndDate(couponData.couponEndDate)}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {error ? <p className="text-xs text-red-650 font-medium">{error}</p> : null}
        {info ? <p className="text-xs text-emerald-800 font-medium">{info}</p> : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white/50 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gray-400">100% Secure Payment</div>
          <div className="rounded-xl border border-gray-100 bg-white/50 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gray-400">Premium Packaging</div>
          <div className="rounded-xl border border-gray-100 bg-white/50 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gray-400">Fast Delivery Support</div>
        </div>

        <button
          type="submit"
          disabled={placingOrder}
          className="w-full rounded-full bg-emerald-950 px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-75 transition-all duration-300 shadow-sm"
        >
          {placingOrder 
            ? (paymentMethod === "COD" ? "Placing your order..." : "Processing secure payment...") 
            : (paymentMethod === "COD" ? `Place COD Order (INR ${finalTotal})` : "Pay now")
          }
        </button>
      </form>

      <aside className="h-fit rounded-3xl border border-gray-200/40 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
        <h3 className="text-sm font-serif font-semibold text-gray-950 border-b border-gray-100 pb-2">Order Summary</h3>
        <ul className="mt-3.5 space-y-2.5 text-xs text-gray-600 font-light border-b border-gray-100 pb-3.5">
          {cartItems.map((item) => (
            <li key={item._id} className="flex items-center justify-between gap-3">
              <span className="truncate max-w-[170px]">{item.name} x {item.quantity}</span>
              <span className="font-semibold font-serif text-gray-900">INR {item.price * item.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3.5 space-y-2.5 text-xs text-gray-500 font-light border-b border-gray-100 pb-3.5">
          <p className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-gray-800">INR {subtotal}</span>
          </p>
          <p className="flex items-center justify-between">
            <span>Discount</span>
            <span className="text-emerald-800 font-bold">- INR {discountAmount}</span>
          </p>
        </div>
        <div className="mt-3.5 flex items-center justify-between text-sm font-semibold text-gray-950">
          <span>Total Price</span>
          <span className="font-serif text-base">INR {finalTotal}</span>
        </div>
        <p className="mt-5 rounded-xl bg-gray-50/50 border border-gray-100/50 px-3 py-2.5 text-[10px] text-gray-400 leading-normal font-light">
          By completing this checkout, you agree to our shipping, cancellation and returns policy guidelines.
        </p>
      </aside>
    </section>
  );
};

export default Checkout;
