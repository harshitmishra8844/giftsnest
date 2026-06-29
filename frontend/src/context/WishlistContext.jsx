import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const { auth, showLoginModal } = useAuth();
  const token = auth?.token;

  // Show a toast message that auto-dismisses after 1800ms
  const showToast = (message) => {
    setToastMessage(message);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 1800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Sync wishlist from backend
  const syncWishlist = async () => {
    if (!token) {
      setWishlistItems([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await api.get("/wishlist");
      if (Array.isArray(data)) {
        setWishlistItems(data);
      }
    } catch (err) {
      console.error("Failed to load wishlist:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Perform sync on token changes (login/logout)
  useEffect(() => {
    syncWishlist();
  }, [token]);

  // Add to wishlist logic
  const addToWishlist = async (product) => {
    if (!token) {
      // Store pending action
      localStorage.setItem("pending_wishlist_add", product._id);
      showLoginModal();
      return;
    }

    // Optimistic update
    const simulatedItem = {
      _id: `temp-${Date.now()}`,
      user_id: auth?._id || "",
      product_id: product,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setWishlistItems((prev) => {
      // Avoid duplicate checks locally
      if (prev.some((item) => item.product_id?._id === product._id)) {
        return prev;
      }
      return [...prev, simulatedItem];
    });
    showToast("Added to Wishlist ❤️");

    try {
      const { data } = await api.post("/wishlist/add", { product_id: product._id });
      // Replace the temporary simulated item with the actual populated database item
      setWishlistItems((prev) =>
        prev.map((item) => (item.product_id?._id === product._id ? data : item))
      );
    } catch (err) {
      console.error("Failed to add to wishlist API:", err);
      // Revert optimistic update
      setWishlistItems((prev) => prev.filter((item) => item.product_id?._id !== product._id));
      showToast(err.response?.data?.message || "Failed to add item to wishlist");
    }
  };

  // Remove from wishlist logic
  const removeFromWishlist = async (productId) => {
    if (!token) return;

    // Keep backup for potential reversion
    let removedItem = null;
    setWishlistItems((prev) => {
      removedItem = prev.find((item) => item.product_id?._id === productId);
      return prev.filter((item) => item.product_id?._id !== productId);
    });
    showToast("Removed from Wishlist");

    try {
      await api.delete("/wishlist/remove", { data: { product_id: productId } });
    } catch (err) {
      console.error("Failed to remove from wishlist API:", err);
      // Revert optimistic update if backup exists
      if (removedItem) {
        setWishlistItems((prev) => [...prev, removedItem]);
      }
      showToast(err.response?.data?.message || "Failed to remove item");
    }
  };

  // Auto add pending wishlist item on login
  useEffect(() => {
    const checkPendingAdd = async () => {
      const pendingId = localStorage.getItem("pending_wishlist_add");
      if (token && pendingId) {
        // Clear immediately to prevent infinite loop or multiple additions
        localStorage.removeItem("pending_wishlist_add");
        try {
          const { data } = await api.post("/wishlist/add", { product_id: pendingId });
          setWishlistItems((prev) => {
            if (prev.some((item) => item.product_id?._id === pendingId)) {
              return prev;
            }
            return [...prev, data];
          });
          showToast("Added to Wishlist ❤️");
        } catch (err) {
          console.error("Failed to add pending wishlist item:", err);
        }
      }
    };
    checkPendingAdd();
  }, [token]);

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => item.product_id?._id === productId);
  };

  const toggleWishlist = async (product) => {
    if (isInWishlist(product._id)) {
      await removeFromWishlist(product._id);
    } else {
      return await addToWishlist(product);
    }
  };

  const value = {
    wishlistItems,
    wishlistCount: wishlistItems.length,
    isLoading,
    syncWishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    showToast,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
      {toastMessage && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
          <div className="cart-toast-enter rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
            {toastMessage}
          </div>
        </div>
      )}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }
  return context;
};
