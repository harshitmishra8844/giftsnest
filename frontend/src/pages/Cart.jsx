import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import QuantityStepper from "../components/QuantityStepper";
import { resolveMediaUrl } from "../services/api";

const Cart = () => {
  const { state } = useLocation();
  const { cartItems, itemCount, totalPrice, updateQuantity, removeFromCart } = useCart();

  const subtotal = Number(totalPrice.toFixed(2));

  if (cartItems.length === 0) {
    return (
      <section className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-12 text-center shadow-xs max-w-xl mx-auto">
        {state?.orderSuccess ? (
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gold-800 bg-gold-50/50 py-2 px-4 rounded-full border border-gold-200/30 inline-block">{state.orderSuccess}</p>
        ) : null}
        <h2 className="text-2xl font-serif font-light text-luxury-black">Your cart is empty</h2>
        <p className="mt-2.5 text-xs text-text-secondary font-light leading-relaxed">Add a few curated gifts and custom keepsakes to continue your celebration.</p>
        <Link
          to="/products"
          className="mt-6 inline-flex rounded-full bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 shadow-sm font-semibold"
        >
          Browse Products
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_320px] pb-16">
      <div className="space-y-4">
        <h2 className="text-2xl font-serif font-light text-luxury-black">Shopping Cart ({itemCount})</h2>
        {cartItems.map((item) => (
          <article
            key={item.cartItemId || item._id}
            className="flex flex-col gap-4 rounded-2xl border border-champagne/45 bg-white/70 p-4 shadow-xs backdrop-blur-sm hover:border-gold-300/40 transition-all duration-300 sm:flex-row"
          >
            <div className="h-24 w-full sm:w-28 rounded-xl overflow-hidden bg-gold-50/20 flex-shrink-0 flex items-center justify-center p-1 border border-champagne/20">
              <img 
                src={resolveMediaUrl(item.customization?.uploadedImage || item.image)} 
                alt={item.name} 
                className="h-full w-full object-contain" 
              />
            </div>
            <div className="flex w-full flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-serif font-semibold text-luxury-black">{item.name}</h3>
                <p className="text-[9px] font-bold uppercase tracking-wider text-gold-600 mt-0.5">{item.category}</p>
                {item.customization && (item.customization.text || item.customization.uploadedImage || item.customization.textSize || item.customization.position) && (
                  <div className="mt-2 space-y-1 rounded-lg bg-gold-50/20 p-2.5 border border-gold-100/10">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gold-800">Customized Details</p>
                    {item.customization.text && (
                      <p className="text-[11px] text-text-secondary font-light">Text: "{item.customization.text}"</p>
                    )}
                    {item.customization.uploadedImage && (
                      <p className="text-[11px] text-text-secondary font-light">Photo: Uploaded ✓</p>
                    )}
                    {(item.customization.textSize || item.customization.position) && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-text-secondary font-light">Style:</span>
                        <span className="text-[11px] text-text-secondary font-light">
                          {item.customization.textSize || ""} {item.customization.textSize && "text"}
                          {item.customization.textSize && item.customization.position && ", "}
                          {item.customization.position || ""} {item.customization.position && "position"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-2 text-sm font-semibold font-serif text-luxury-black">INR {item.price}</p>
              </div>

              <div className="flex items-center gap-4">
                <QuantityStepper
                  quantity={item.quantity}
                  onDecrease={() => updateQuantity(item.cartItemId || item._id, item.quantity - 1)}
                  onIncrease={() => updateQuantity(item.cartItemId || item._id, item.quantity + 1)}
                  decreaseAriaLabel={`Decrease ${item.name} quantity`}
                  increaseAriaLabel={`Increase ${item.name} quantity`}
                  className="rounded-full border-champagne bg-white"
                  buttonClassName="h-7 w-7 text-xs text-luxury-black hover:bg-gold-50"
                  valueClassName="text-xs text-luxury-black"
                />
                <button
                  onClick={() => removeFromCart(item.cartItemId || item._id)}
                  className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-2xl border border-champagne/45 bg-white/70 p-5 shadow-xs backdrop-blur-sm">
        <h3 className="text-sm font-serif font-semibold text-luxury-black border-b border-champagne/30 pb-2">Order Summary</h3>
        <div className="mt-4 space-y-3.5 text-xs text-text-secondary font-light">
          <p className="flex items-center justify-between">
            <span>Total items</span>
            <span className="font-semibold text-luxury-black">{itemCount}</span>
          </p>
          <p className="flex items-center justify-between border-t border-champagne/30 pt-3 text-sm font-semibold text-luxury-black">
            <span>Subtotal</span>
            <span className="font-serif">INR {subtotal}</span>
          </p>
        </div>
        <Link
          to="/checkout"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gold-500 hover:bg-gold-600 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 shadow-sm font-semibold"
        >
          Proceed to Checkout
        </Link>
      </aside>
    </section>
  );
};

export default Cart;
