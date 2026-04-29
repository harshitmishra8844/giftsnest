import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import QuantityStepper from "../components/QuantityStepper";

const Cart = () => {
  const { state } = useLocation();
  const { cartItems, itemCount, totalPrice, updateQuantity, removeFromCart } = useCart();

  const subtotal = Number(totalPrice.toFixed(2));

  if (cartItems.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        {state?.orderSuccess ? (
          <p className="mb-3 text-sm font-medium text-green-600">{state.orderSuccess}</p>
        ) : null}
        <h2 className="text-2xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="mt-2 text-gray-600">Add a few personalized gifts and they will appear here.</p>
        <Link
          to="/products"
          className="mt-6 inline-flex rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Browse Products
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Shopping Cart ({itemCount})</h2>
        {cartItems.map((item) => (
          <article
            key={item._id}
            className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:flex-row"
          >
            <img 
              src={item.customization?.uploadedImage || item.image} 
              alt={item.name} 
              className="h-24 w-full rounded-xl object-cover sm:w-28" 
            />
            <div className="flex w-full flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.category}</p>
                {item.customization && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-emerald-600 font-medium">Customized Product</p>
                    {item.customization.text && (
                      <p className="text-xs text-gray-600">Text: "{item.customization.text}"</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Style:</span>
                      <span className="text-xs text-gray-500">
                        {item.customization.textSize} text, {item.customization.position} position
                      </span>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-sm font-semibold text-gray-900">INR {item.price}</p>
              </div>

              <div className="flex items-center gap-3">
                <QuantityStepper
                  quantity={item.quantity}
                  onDecrease={() => updateQuantity(item._id, item.quantity - 1)}
                  onIncrease={() => updateQuantity(item._id, item.quantity + 1)}
                  decreaseAriaLabel={`Decrease ${item.name} quantity`}
                  increaseAriaLabel={`Increase ${item.name} quantity`}
                />
                <button
                  onClick={() => removeFromCart(item._id)}
                  className="text-sm font-medium text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Order Summary</h3>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <p className="flex items-center justify-between">
            <span>Total items</span>
            <span>{itemCount}</span>
          </p>
          <p className="flex items-center justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
            <span>Total</span>
            <span>INR {subtotal}</span>
          </p>
        </div>
        <Link
          to="/checkout"
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Proceed to Checkout
        </Link>
      </aside>
    </section>
  );
};

export default Cart;
