import { useEffect } from "react";

const CartToast = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return undefined;
    // Auto-dismiss keeps feedback lightweight and non-blocking.
    const timeoutId = setTimeout(onClose, 1800);
    return () => clearTimeout(timeoutId);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50">
      <div className="cart-toast-enter rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
        {message}
      </div>
    </div>
  );
};

export default CartToast;
