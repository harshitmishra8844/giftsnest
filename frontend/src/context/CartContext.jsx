import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const readStoredCart = () => {
  try {
    const raw = localStorage.getItem("giftnest_cart");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Max units allowed in cart for this line (Infinity if stock not tracked). */
const maxStockForItem = (item) => {
  if (item?.stock === undefined || item?.stock === null) return Number.POSITIVE_INFINITY;
  const n = Number(item.stock);
  if (!Number.isFinite(n)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor(n));
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(readStoredCart);

  useEffect(() => {
    localStorage.setItem("giftnest_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product) => {
    const image = product.image || product.images?.[0] || "https://via.placeholder.com/600x400?text=Gift";
    const max = maxStockForItem(product);
    if (max <= 0) return;

    setCartItems((prevItems) => {
      const existing = prevItems.find((item) => item._id === product._id);
      if (existing) {
        const merged = { ...existing, ...product, image: image || existing.image };
        const cap = maxStockForItem(merged);
        const nextQty = Math.min(existing.quantity + 1, cap);
        if (nextQty === existing.quantity) return prevItems;
        return prevItems.map((item) =>
          item._id === product._id ? { ...merged, quantity: nextQty } : item
        );
      }

      return [
        ...prevItems,
        {
          ...product,
          image,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCartItems((prevItems) => prevItems.filter((item) => item._id !== productId));
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item._id !== productId) return item;
        const cap = maxStockForItem(item);
        const q = Math.min(Math.max(1, Math.floor(Number(quantity))), cap);
        return { ...item, quantity: q };
      })
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item._id !== productId));
  };

  const clearCart = () => setCartItems([]);

  const totals = useMemo(() => {
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { itemCount, totalPrice };
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    ...totals,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
};
