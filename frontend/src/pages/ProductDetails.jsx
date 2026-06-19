import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { getUserAuth } from "../services/userAuth";
import QuantityStepper from "../components/QuantityStepper";
import CartToast from "../components/CartToast";

const ProductDetails = () => {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { cartItems, addToCart, updateQuantity } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: "5", comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [needsPurchaseHint, setNeedsPurchaseHint] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [checkingReviewEligibility, setCheckingReviewEligibility] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [zoomOrigin, setZoomOrigin] = useState("center center");
  const [recentlyViewedIds, setRecentlyViewedIds] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [userInteractedWithGallery, setUserInteractedWithGallery] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [recentlyAdded, setRecentlyAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/products/${idOrSlug}`);
        setProduct(data);
      } catch {
        setError("Unable to load product details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [idOrSlug]);

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const { data } = await api.get("/products");
        setAllProducts(Array.isArray(data) ? data : []);
      } catch {
        setAllProducts([]);
      }
    };

    fetchAllProducts();
  }, []);

  const userAuth = getUserAuth();

  useEffect(() => {
    const checkEligibility = async () => {
      if (!product?._id || !userAuth?.token) {
        setCanReview(false);
        return;
      }
      try {
        setCheckingReviewEligibility(true);
        const { data } = await api.get(`/products/${product._id}/review-eligibility`);
        setCanReview(Boolean(data?.canReview));
      } catch {
        setCanReview(false);
      } finally {
        setCheckingReviewEligibility(false);
      }
    };

    checkEligibility();
  }, [product?._id, userAuth?.token]);

  const galleryImages = useMemo(() => {
    const imgs = Array.isArray(product?.images) ? product.images : [];
    return Array.from(new Set([product?.image, ...imgs].filter(Boolean)));
  }, [product]);

  useEffect(() => {
    if (galleryImages.length > 0) {
      setActiveImage(galleryImages[0]);
    }
  }, [galleryImages]);

  useEffect(() => {
    if (!galleryImages.length || userInteractedWithGallery) return;
    const intervalId = setInterval(() => {
      setActiveImage((prev) => {
        const currentIndex = galleryImages.indexOf(prev);
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        return galleryImages[(safeIndex + 1) % galleryImages.length];
      });
    }, 3500);
    return () => clearInterval(intervalId);
  }, [galleryImages, userInteractedWithGallery]);

  useEffect(() => {
    if (!recentlyAdded) return undefined;
    const timeoutId = setTimeout(() => setRecentlyAdded(false), 1200);
    return () => clearTimeout(timeoutId);
  }, [recentlyAdded]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") goToPrevImage();
      if (event.key === "ArrowRight") goToNextImage();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, galleryImages, activeImage]);

  useEffect(() => {
    if (!product?._id) return;
    const storageKey = "gift_recently_viewed_products";
    const existing = (() => {
      try {
        const raw = localStorage.getItem(storageKey);
        return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })();
    const next = [product._id, ...existing.filter((id) => String(id) !== String(product._id))].slice(0, 12);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setRecentlyViewedIds(next.filter((id) => String(id) !== String(product._id)));
  }, [product?._id]);

  const relatedProducts = useMemo(() => {
    if (!product?._id) return [];
    const currentCategory = String(product.category || "").toLowerCase();
    return allProducts
      .filter((item) => item?._id !== product._id)
      .filter((item) => String(item.category || "").toLowerCase() === currentCategory)
      .slice(0, 4);
  }, [allProducts, product]);

  const recentlyViewedProducts = useMemo(() => {
    if (!recentlyViewedIds.length) return [];
    const mapById = new Map(allProducts.map((item) => [String(item._id), item]));
    return recentlyViewedIds.map((id) => mapById.get(String(id))).filter(Boolean).slice(0, 6);
  }, [allProducts, recentlyViewedIds]);

  const cartQuantityById = useMemo(
    () =>
      cartItems.reduce((acc, item) => {
        acc[item._id] = item.quantity;
        return acc;
      }, {}),
    [cartItems]
  );

  const highlights = useMemo(() => {
    if (Array.isArray(product?.highlights) && product.highlights.length > 0) {
      return product.highlights.filter(Boolean);
    }
    return String(product?.description || "")
      .split(/[\n.]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);
  }, [product]);

  const specifications = useMemo(() => {
    if (Array.isArray(product?.specifications) && product.specifications.length > 0) {
      return product.specifications.filter((item) => item?.label && item?.value);
    }
    return [
      { label: "Category", value: String(product?.category || "Gift") },
      { label: "Availability", value: Number(product?.stock ?? 0) > 0 ? "In Stock" : "Out of Stock" },
      { label: "Customizable", value: product?.customisable === false ? "No" : "Yes" },
    ];
  }, [product]);
  const findSpecValue = (label) =>
    String(
      specifications.find(
        (item) => String(item?.label || "").trim().toLowerCase() === label.toLowerCase()
      )?.value || ""
    ).trim();
  const deliveryTimeText = findSpecValue("Delivery Time");
  const materialText = findSpecValue("Material");

  const reviews = Array.isArray(product?.reviews) ? [...product.reviews].reverse() : [];
  const myReview = reviews.find((item) => String(item.user) === String(userAuth?._id)) || null;

  useEffect(() => {
    if (!myReview) return;
    setReviewForm({
      rating: String(Math.max(1, Math.min(5, Number(myReview.rating || 5)))),
      comment: String(myReview.comment || ""),
    });
  }, [myReview]);

  if (loading) {
    return <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">Loading product details...</section>;
  }

  if (error || !product) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <p className="text-red-600">{error || "Product not found."}</p>
        <Link to="/products" className="mt-4 inline-flex rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white">
          Back to Products
        </Link>
      </section>
    );
  }

  const stock = Number(product.stock ?? 0);
  const outOfStock = Number.isFinite(stock) && stock <= 0;
  const cartQuantity = cartItems.find((item) => item._id === product._id)?.quantity || 0;
  const reachedMaxStock = Number.isFinite(stock) && cartQuantity >= stock;
  const rating = Math.max(0, Math.min(5, Number(product.rating || 0)));
  const numReviews = Math.max(0, Number(product.numReviews || 0));

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewMessage("");
    setNeedsPurchaseHint(false);
    if (!userAuth?.token) {
      setReviewMessage("Please login to submit a review.");
      return;
    }
    try {
      setSubmittingReview(true);
      if (myReview) {
        await api.put(`/products/${product._id}/reviews/me`, {
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment.trim(),
        });
      } else {
        await api.post(`/products/${product._id}/reviews`, {
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment.trim(),
        });
      }
      const { data } = await api.get(`/products/${idOrSlug}`);
      setProduct(data);
      setReviewForm({ rating: "5", comment: "" });
      setReviewMessage(myReview ? "Review updated successfully." : "Review submitted successfully.");
    } catch (err) {
      const apiMessage = err.response?.data?.message || "Failed to submit review.";
      setReviewMessage(apiMessage);
      if (String(apiMessage).toLowerCase().includes("purchased")) {
        setNeedsPurchaseHint(true);
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteMyReview = async () => {
    if (!myReview) return;
    setReviewMessage("");
    try {
      setSubmittingReview(true);
      await api.delete(`/products/${product._id}/reviews/me`);
      const { data } = await api.get(`/products/${idOrSlug}`);
      setProduct(data);
      setReviewForm({ rating: "5", comment: "" });
      setReviewMessage("Review deleted.");
    } catch (err) {
      setReviewMessage(err.response?.data?.message || "Failed to delete review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const buyToReview = () => {
    addToCart(product);
    navigate("/cart");
  };

  const handleAddToCart = () => {
    addToCart(product);
    setToastMessage(`${product.name} added to cart`);
    setRecentlyAdded(true);
  };

  const handleDecreaseQty = () => {
    if (cartQuantity <= 0) return;
    updateQuantity(product._id, cartQuantity - 1);
  };

  const handleIncreaseQty = () => {
    addToCart(product);
    setToastMessage(`${product.name} added to cart`);
  };

  const handleCardAdd = (item) => {
    addToCart(item);
    setToastMessage(`${item.name} added to cart`);
  };

  const selectedRating = Number(reviewForm.rating || 5);
  const deliveryEstimate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
  const comparePrice = Math.max(Number(product.price || 0), Math.round(Number(product.price || 0) * 1.18));

  const goToPrevImage = () => {
    if (!galleryImages.length) return;
    setUserInteractedWithGallery(true);
    const currentIndex = Math.max(0, galleryImages.indexOf(activeImage));
    const prevIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    setActiveImage(galleryImages[prevIndex]);
  };

  const goToNextImage = () => {
    if (!galleryImages.length) return;
    setUserInteractedWithGallery(true);
    const currentIndex = Math.max(0, galleryImages.indexOf(activeImage));
    const nextIndex = (currentIndex + 1) % galleryImages.length;
    setActiveImage(galleryImages[nextIndex]);
  };

  const handleImageTouchStart = (event) => {
    setTouchStartX(event.touches?.[0]?.clientX ?? null);
  };

  const handleImageTouchEnd = (event) => {
    if (touchStartX === null) return;
    const endX = event.changedTouches?.[0]?.clientX ?? null;
    if (endX === null) return;
    const diff = endX - touchStartX;
    if (Math.abs(diff) < 40) return;
    setUserInteractedWithGallery(true);
    if (diff > 0) goToPrevImage();
    else goToNextImage();
    setTouchStartX(null);
  };

  const handleImageMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin(`${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`);
  };

  const renderStar = (value) => (
    <button
      key={value}
      type="button"
      onClick={() => setReviewForm((prev) => ({ ...prev, rating: String(value) }))}
      className={`text-2xl leading-none ${value <= selectedRating ? "text-amber-500" : "text-gray-300"}`}
      aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
      disabled={submittingReview}
    >
      ★
    </button>
  );

  return (
    <section className="space-y-6 pb-24 md:pb-0">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-8">
        <div className="mb-5 text-sm text-gray-500">
          <Link to="/products" className="hover:text-emerald-700">Products</Link> / <span className="text-gray-700">{product.category}</span> / {product.name}
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.9fr_0.95fr_0.72fr]">
          <div className="xl:sticky xl:top-24 xl:h-fit">
            <div
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm"
              onMouseMove={handleImageMouseMove}
              onMouseLeave={() => setZoomOrigin("center center")}
              onTouchStart={handleImageTouchStart}
              onTouchEnd={handleImageTouchEnd}
            >
              <img
                src={activeImage || "https://via.placeholder.com/900x700?text=GiftNest"}
                alt={product.name}
                className="h-[360px] w-full cursor-zoom-in rounded-2xl object-cover transition-all duration-500 ease-out group-hover:scale-[1.22] md:h-[560px]"
                style={{ transformOrigin: zoomOrigin }}
                onClick={() => setLightboxOpen(true)}
              />
              {galleryImages.length > 0 ? (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">
                  {Math.max(1, galleryImages.indexOf(activeImage) + 1)} / {galleryImages.length}
                </div>
              ) : null}
              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goToPrevImage}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-bold text-gray-800 shadow transition-all duration-200 hover:scale-105 hover:bg-white"
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    onClick={goToNextImage}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-bold text-gray-800 shadow transition-all duration-200 hover:scale-105 hover:bg-white"
                  >
                    {">"}
                  </button>
                </>
              ) : null}
            </div>
            {galleryImages.length > 1 ? (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {galleryImages.map((imageUrl) => (
                  <button
                    key={imageUrl}
                    type="button"
                    onClick={() => {
                      setUserInteractedWithGallery(true);
                      setActiveImage(imageUrl);
                    }}
                    className={`overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                      activeImage === imageUrl
                        ? "scale-[1.02] border-emerald-600 shadow-sm"
                        : "border-transparent hover:scale-[1.01] hover:border-emerald-200"
                    }`}
                  >
                    <img src={imageUrl} alt={product.name} className="h-20 w-full object-cover transition duration-200 hover:brightness-105" />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {cartQuantity > 0 ? (
                <QuantityStepper
                  quantity={cartQuantity}
                  onDecrease={handleDecreaseQty}
                  onIncrease={handleIncreaseQty}
                  increaseDisabled={outOfStock || reachedMaxStock}
                  decreaseAriaLabel={`Decrease ${product.name} quantity`}
                  increaseAriaLabel={`Increase ${product.name} quantity`}
                  className="rounded-xl"
                />
              ) : (
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={handleAddToCart}
                  className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {outOfStock ? "Sold out" : recentlyAdded ? "Added ✓" : "Add to Cart"}
                </button>
              )}
              <button
                type="button"
                disabled={outOfStock}
                onClick={() => {
                  handleAddToCart();
                  navigate("/checkout");
                }}
                className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Buy Now
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{product.category}</p>
              <h1 className="mt-1 text-3xl font-bold leading-tight text-gray-900">{product.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span className="inline-flex items-center rounded-md bg-emerald-600 px-2.5 py-1 font-semibold text-white">
                  {rating.toFixed(1)} ★
                </span>
                <span>{numReviews} ratings & reviews</span>
                <span className={`font-medium ${outOfStock ? "text-red-600" : "text-emerald-700"}`}>
                  {outOfStock ? "Currently unavailable" : `${stock} units in stock`}
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-end gap-3">
                <p className="text-3xl font-bold text-gray-900">INR {product.price}</p>
                <p className="text-sm text-gray-500 line-through">INR {comparePrice}</p>
                <p className="text-sm font-semibold text-emerald-700">Special price</p>
              </div>
              <div className="grid gap-2 text-sm text-gray-700">
                <p>
                  Estimated delivery by{" "}
                  <span className="font-semibold text-gray-900">
                    {deliveryTimeText || deliveryEstimate}
                  </span>
                </p>
                {materialText ? (
                  <p>
                    Material: <span className="font-semibold text-gray-900">{materialText}</span>
                  </p>
                ) : null}
                <p>Free secure gift packaging and order tracking included.</p>
                <p>Admin-managed highlights and product specs are shown below.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">Highlights</h2>
              <ul className="mt-3 grid gap-2 text-sm text-gray-700">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">Product Description</h2>
              <p className="mt-3 text-sm leading-7 text-gray-700">{product.description}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">Specifications</h2>
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-100">
                {specifications.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className={`grid gap-2 px-4 py-3 text-sm md:grid-cols-[180px_1fr] ${
                      index !== specifications.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <p className="font-medium text-gray-500">{item.label}</p>
                    <p className="text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Quick Buy</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">INR {product.price}</p>
              <p className="text-xs text-gray-600">
                {outOfStock ? "Out of stock right now" : `Only ${stock} left, order soon`}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {cartQuantity > 0 ? (
                  <QuantityStepper
                    quantity={cartQuantity}
                    onDecrease={handleDecreaseQty}
                    onIncrease={handleIncreaseQty}
                    increaseDisabled={outOfStock || reachedMaxStock}
                    decreaseAriaLabel={`Decrease ${product.name} quantity`}
                    increaseAriaLabel={`Increase ${product.name} quantity`}
                    className="rounded-xl"
                    buttonClassName="h-7 w-7"
                    valueClassName="text-xs"
                  />
                ) : (
                  <button
                    type="button"
                    disabled={outOfStock}
                    onClick={handleAddToCart}
                    className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {recentlyAdded ? "Added ✓" : "Add to Cart"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => {
                    handleAddToCart();
                    navigate("/checkout");
                  }}
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Buy Now
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Delivery & Services</p>
              <div className="mt-3 space-y-3 text-sm text-gray-700">
                <div className="rounded-xl bg-gray-50 px-3 py-3">
                  Delivery by{" "}
                  <span className="font-semibold text-gray-900">
                    {deliveryTimeText || deliveryEstimate}
                  </span>
                </div>
                {materialText ? (
                  <div className="rounded-xl bg-gray-50 px-3 py-3">
                    Material: <span className="font-semibold text-gray-900">{materialText}</span>
                  </div>
                ) : null}
                <div className="rounded-xl bg-gray-50 px-3 py-3">Same-day support in selected cities</div>
                <div className="rounded-xl bg-gray-50 px-3 py-3">Replacement help for damaged orders</div>
                <div className="rounded-xl bg-gray-50 px-3 py-3">Secure checkout and order tracking</div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Why shoppers like this</p>
              <div className="mt-3 grid gap-2">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                  Rich admin-managed details
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                  Multi-image product gallery
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                  Verified purchase reviews
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Customer Reviews</h2>
        <p className="mt-1 text-sm text-gray-600">
          {numReviews > 0
            ? `Rated ${rating.toFixed(1)} out of 5 by ${numReviews} customers.`
            : "No reviews yet. Be the first to review this product after purchase."}
        </p>
        {reviews.length > 0 ? (
          <div className="mt-4 space-y-3">
            {reviews.map((item) => (
              <article key={item._id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.name}
                    {item.verifiedPurchase ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                        Verified Purchase
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs font-semibold text-amber-600">{Number(item.rating || 0).toFixed(1)} ★</p>
                </div>
                <p className="mt-1 text-sm text-gray-700">{item.comment}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : ""}
                </p>
              </article>
            ))}
          </div>
        ) : null}
        <form onSubmit={submitReview} className="mt-5 grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <p className="text-sm font-semibold text-emerald-900">{myReview ? "Edit Your Review" : "Write a Review"}</p>
          <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map(renderStar)}</div>
          <textarea
            value={reviewForm.comment}
            onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
            rows={3}
            placeholder="Share your experience with this product"
            className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm"
            disabled={submittingReview || (userAuth?.token && !canReview)}
            required
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submittingReview || checkingReviewEligibility || (userAuth?.token && !canReview)}
              className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingReview ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
            </button>
            {myReview ? (
              <button
                type="button"
                onClick={handleDeleteMyReview}
                disabled={submittingReview}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Delete Review
              </button>
            ) : null}
            {!userAuth?.token ? (
              <Link to="/login" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                Login to review
              </Link>
            ) : null}
            {userAuth?.token && !canReview && !checkingReviewEligibility ? (
              <button
                type="button"
                onClick={buyToReview}
                className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                Buy this product to review
              </button>
            ) : null}
          </div>
          {reviewMessage ? <p className="text-xs text-gray-600">{reviewMessage}</p> : null}
          {needsPurchaseHint ? (
            <p className="text-xs text-amber-700">
              You can post a review after placing an order for this product from your account.
            </p>
          ) : null}
          {userAuth?.token && !canReview && !checkingReviewEligibility ? (
            <p className="text-xs text-amber-700">Review form is unlocked only after purchase.</p>
          ) : null}
        </form>
      </div>

      {relatedProducts.length > 0 ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Related Products</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => {
              const cardImage = item.image || item.images?.[0] || "https://via.placeholder.com/400x300?text=GiftNest";
              return (
                <article key={item._id} className="rounded-xl border border-gray-200 p-3">
                  <Link to={`/products/${item.slug || item._id}`} className="block">
                    <img src={cardImage} alt={item.name} className="h-36 w-full rounded-lg object-cover" />
                  </Link>
                  <p className="mt-2 line-clamp-1 text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.category}</p>
                  <p className="mt-2 text-sm font-bold text-gray-900">INR {item.price}</p>
                  <div className="mt-3">
                    {(cartQuantityById[item._id] || 0) > 0 ? (
                      <QuantityStepper
                        quantity={cartQuantityById[item._id] || 0}
                        onDecrease={() => updateQuantity(item._id, (cartQuantityById[item._id] || 0) - 1)}
                        onIncrease={() => handleCardAdd(item)}
                        increaseDisabled={
                          Number.isFinite(Number(item.stock)) && (cartQuantityById[item._id] || 0) >= Number(item.stock)
                        }
                        decreaseAriaLabel={`Decrease ${item.name} quantity`}
                        increaseAriaLabel={`Increase ${item.name} quantity`}
                        buttonClassName="h-7 w-7"
                        valueClassName="text-xs"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCardAdd(item)}
                        disabled={Number.isFinite(Number(item.stock)) && Number(item.stock) <= 0}
                        className="w-full rounded-full bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {Number.isFinite(Number(item.stock)) && Number(item.stock) <= 0 ? "Sold out" : "Add to Cart"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {recentlyViewedProducts.length > 0 ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recently Viewed</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {recentlyViewedProducts.map((item) => {
              const cardImage = item.image || item.images?.[0] || "https://via.placeholder.com/400x300?text=GiftNest";
              return (
                <article key={item._id} className="rounded-xl border border-gray-200 p-3">
                  <Link to={`/products/${item.slug || item._id}`} className="block">
                    <img src={cardImage} alt={item.name} className="h-28 w-full rounded-lg object-cover" />
                  </Link>
                  <Link
                    to={`/products/${item.slug || item._id}`}
                    className="mt-2 block line-clamp-1 text-sm font-semibold text-gray-900 hover:text-emerald-700"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-xs text-gray-500">{item.category}</p>
                  <p className="mt-2 text-sm font-bold text-gray-900">INR {item.price}</p>
                  <div className="mt-3">
                    {(cartQuantityById[item._id] || 0) > 0 ? (
                      <QuantityStepper
                        quantity={cartQuantityById[item._id] || 0}
                        onDecrease={() => updateQuantity(item._id, (cartQuantityById[item._id] || 0) - 1)}
                        onIncrease={() => handleCardAdd(item)}
                        increaseDisabled={
                          Number.isFinite(Number(item.stock)) && (cartQuantityById[item._id] || 0) >= Number(item.stock)
                        }
                        decreaseAriaLabel={`Decrease ${item.name} quantity`}
                        increaseAriaLabel={`Increase ${item.name} quantity`}
                        buttonClassName="h-7 w-7"
                        valueClassName="text-xs"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCardAdd(item)}
                        disabled={Number.isFinite(Number(item.stock)) && Number(item.stock) <= 0}
                        className="w-full rounded-full bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {Number.isFinite(Number(item.stock)) && Number(item.stock) <= 0 ? "Sold out" : "Add to Cart"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {lightboxOpen ? (
        <div className="fixed inset-0 z-50 bg-black/85 p-4 backdrop-blur-[2px] animate-[fadeIn_.22s_ease-out] md:p-8">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image preview"
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-gray-900 transition hover:scale-105 hover:bg-white"
          >
            Close
          </button>
          <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center">
            <button
              type="button"
              onClick={goToPrevImage}
              className="mr-3 hidden rounded-full bg-white/90 px-4 py-3 text-lg font-bold text-gray-900 transition-all duration-200 hover:scale-105 hover:bg-white md:block"
              aria-label="Previous image"
            >
              {"<"}
            </button>
            <img
              src={activeImage || "https://via.placeholder.com/900x700?text=GiftNest"}
              alt={product.name}
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain shadow-2xl animate-[popIn_.22s_ease-out]"
            />
            <button
              type="button"
              onClick={goToNextImage}
              className="ml-3 hidden rounded-full bg-white/90 px-4 py-3 text-lg font-bold text-gray-900 transition-all duration-200 hover:scale-105 hover:bg-white md:block"
              aria-label="Next image"
            >
              {">"}
            </button>
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-white">
            {Math.max(1, galleryImages.indexOf(activeImage) + 1)} / {galleryImages.length}
          </p>
        </div>
      ) : null}

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes popIn {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
          }
        `}
      </style>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-emerald-100 bg-white p-3 shadow-[0_-6px_16px_rgba(0,0,0,0.08)] md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">INR {product.price}</p>
            <p className={`text-xs ${outOfStock ? "text-red-600" : "text-gray-600"}`}>
              {outOfStock ? "Out of stock" : `${stock} in stock`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cartQuantity > 0 ? (
              <QuantityStepper
                quantity={cartQuantity}
                onDecrease={handleDecreaseQty}
                onIncrease={handleIncreaseQty}
                increaseDisabled={outOfStock || reachedMaxStock}
                decreaseAriaLabel={`Decrease ${product.name} quantity`}
                increaseAriaLabel={`Increase ${product.name} quantity`}
                buttonClassName="h-7 w-7"
                valueClassName="text-xs"
              />
            ) : (
              <button
                type="button"
                disabled={outOfStock}
                onClick={handleAddToCart}
                className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {recentlyAdded ? "Added ✓" : "Add to Cart"}
              </button>
            )}
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => {
                handleAddToCart();
                navigate("/checkout");
              }}
              className="rounded-full border border-emerald-600 px-4 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-60"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
      <CartToast message={toastMessage} onClose={() => setToastMessage("")} />
    </section>
  );
};

export default ProductDetails;
