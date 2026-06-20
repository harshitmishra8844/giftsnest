import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import QuantityStepper from "../components/QuantityStepper";

const Cart = () => {
  const { state } = useLocation();
  const { cartItems, itemCount, totalPrice, updateQuantity, removeFromCart } = useCart();

  const subtotal = Number(totalPrice.toFixed(2));

  if (cartItems.length === 0) {
    return (
      <section className="rounded-3xl border border-gray-200/40 bg-white/70 backdrop-blur-md p-12 text-center shadow-sm max-w-xl mx-auto">
        {state?.orderSuccess ? (
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 py-2 px-4 rounded-full border border-emerald-100/30 inline-block">{state.orderSuccess}</p>
        ) : null}
        <h2 className="text-2xl font-serif font-light text-gray-950">Your cart is empty</h2>
        <p className="mt-2.5 text-xs text-gray-500 font-light leading-relaxed">Add a few curated gifts and custom keepsakes to continue your celebration.</p>
        <Link
          to="/products"
          className="mt-6 inline-flex rounded-full bg-emerald-950 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-900 transition-all duration-300 shadow-sm"
        >
          Browse Products
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_320px] pb-16">
      <div className="space-y-4">
        <h2 className="text-2xl font-serif font-light text-gray-950">Shopping Cart ({itemCount})</h2>
        {cartItems.map((item) => (
          <article
            key={item._id}
            className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/60 p-4 shadow-sm backdrop-blur-sm hover:border-amber-300/20 transition-all duration-300 sm:flex-row"
          >
            <div className="h-24 w-full sm:w-28 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center p-1 border border-gray-100/50">
              <img 
                src={item.customization?.uploadedImage || item.image} 
                alt={item.name} 
                className="h-full w-full object-contain" 
              />
            </div>
            <div className="flex w-full flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-serif font-semibold text-gray-950">{item.name}</h3>
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{item.category}</p>
                {item.customization && (
                  <div className="mt-2 space-y-1 rounded-lg bg-emerald-50/20 p-2.5 border border-emerald-100/10">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">Customized Details</p>
                    {item.customization.text && (
                      <p className="text-[11px] text-gray-600 font-light">Text: "{item.customization.text}"</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 font-light">Style:</span>
                      <span className="text-[11px] text-gray-600 font-light">
                        {item.customization.textSize} text, {item.customization.position} position
                      </span>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-sm font-semibold font-serif text-gray-900">INR {item.price}</p>
              </div>

              <div className="flex items-center gap-4">
                <QuantityStepper
                  quantity={item.quantity}
                  onDecrease={() => updateQuantity(item._id, item.quantity - 1)}
                  onIncrease={() => updateQuantity(item._id, item.quantity + 1)}
                  decreaseAriaLabel={`Decrease ${item.name} quantity`}
                  increaseAriaLabel={`Increase ${item.name} quantity`}
                  className="rounded-full border-gray-200 bg-white"
                  buttonClassName="h-7 w-7 text-xs"
                  valueClassName="text-xs"
                />
                <button
                  onClick={() => removeFromCart(item._id)}
                  className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-2xl border border-gray-100 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
        <h3 className="text-sm font-serif font-semibold text-gray-950 border-b border-gray-100 pb-2">Order Summary</h3>
        <div className="mt-4 space-y-3.5 text-xs text-gray-550 font-light">
          <p className="flex items-center justify-between">
            <span>Total items</span>
            <span className="font-semibold text-gray-800">{itemCount}</span>
          </p>
          <p className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm font-semibold text-gray-950">
            <span>Subtotal</span>
            <span className="font-serif">INR {subtotal}</span>
          </p>
        </div>
        <Link
          to="/checkout"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-950 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-900 transition-all duration-300 shadow-sm"
        >
          Proceed to Checkout
        </Link>
      </aside>
    </section>
  );
};

export default Cart;
