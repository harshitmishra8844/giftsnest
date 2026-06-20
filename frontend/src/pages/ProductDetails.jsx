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

  // Personalization fields
  const [customText, setCustomText] = useState("");
  const [customImage, setCustomImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setCustomImage(data.imageUrl);
    } catch (err) {
      console.error("Error uploading personalization image:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const isCustomizationValid = useMemo(() => {
    if (!product?.isPersonalized) return true;

    // Check text field:
    if (product.personalizationTextLabel) {
      if (!customText.trim()) return false;
      if (product.personalizationTextLimit && customText.length > product.personalizationTextLimit) {
        return false;
      }
    }

    // Check image field:
    if (product.personalizationImageRequired) {
      if (!customImage) return false;
    }

    return true;
  }, [product, customText, customImage]);

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
    const currentCategories = String(product.category || "")
      .split(",")
      .map((cat) => cat.trim().toLowerCase())
      .filter(Boolean);
    return allProducts
      .filter((item) => item?._id !== product._id)
      .filter((item) => {
        const itemCategories = String(item.category || "")
          .split(",")
          .map((cat) => cat.trim().toLowerCase())
          .filter(Boolean);
        return itemCategories.some((cat) => currentCategories.includes(cat));
      })
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
  const cartQuantity = cartItems
    .filter((item) => item._id === product._id)
    .reduce((sum, item) => sum + item.quantity, 0);
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
    let payload = { ...product };
    if (product.isPersonalized) {
      payload.customization = {
        text: product.personalizationTextLabel ? customText : "",
        uploadedImage: customImage,
      };
      payload.cartItemId = `${product._id}-${JSON.stringify(payload.customization)}`;
    }
    addToCart(payload);
    setToastMessage(`${product.name} added to cart`);
    setRecentlyAdded(true);
  };

  const handleBuyNow = () => {
    let payload = { ...product };
    if (product.isPersonalized) {
      payload.customization = {
        text: product.personalizationTextLabel ? customText : "",
        uploadedImage: customImage,
      };
      payload.cartItemId = `${product._id}-${JSON.stringify(payload.customization)}`;
    }
    addToCart(payload);
    navigate("/checkout");
  };

  const handleDecreaseQty = () => {
    if (cartQuantity <= 0) return;
    const match = cartItems.find((item) => item._id === product._id);
    if (match) {
      updateQuantity(match.cartItemId || match._id, match.quantity - 1);
    }
  };

  const handleIncreaseQty = () => {
    const match = cartItems.find((item) => item._id === product._id);
    if (match) {
      updateQuantity(match.cartItemId || match._id, match.quantity + 1);
    } else {
      handleAddToCart();
    }
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
    <section className="space-y-8 pb-24 md:pb-0">
      <div className="rounded-3xl border border-gray-200/40 bg-white/70 backdrop-blur-md p-6 shadow-sm md:p-10">
        <div className="mb-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">
          <Link to="/products" className="hover:text-amber-750 transition-colors">Products</Link>
          {String(product.category || "")
            .split(",")
            .map((cat) => cat.trim())
            .filter(Boolean)
            .map((cat) => (
              <span key={cat}>
                {" "}
                /{" "}
                <Link
                  to={`/products?category=${encodeURIComponent(cat)}`}
                  className="hover:text-amber-700 font-bold text-gray-500 transition-colors"
                >
                  {cat}
                </Link>
              </span>
            ))}
          {" "}
          / <span className="text-gray-400 font-normal">{product.name}</span>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Left Column: Image Gallery */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <div
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/30 shadow-inner flex items-center justify-center p-6 h-[340px] md:h-[520px] transition-all duration-300 hover:shadow-sm"
              onMouseMove={handleImageMouseMove}
              onMouseLeave={() => setZoomOrigin("center center")}
              onTouchStart={handleImageTouchStart}
              onTouchEnd={handleImageTouchEnd}
            >
              <img
                src={activeImage || "https://via.placeholder.com/900x700?text=Niyora+Gifts"}
                alt={product.name}
                className="max-h-full max-w-full cursor-zoom-in rounded-xl object-contain transition-all duration-500 ease-out group-hover:scale-[1.05]"
                style={{ transformOrigin: zoomOrigin }}
                onClick={() => setLightboxOpen(true)}
              />
              {galleryImages.length > 0 ? (
                <div className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3.5 py-1.5 text-[10px] font-semibold text-white tracking-widest">
                  {Math.max(1, galleryImages.indexOf(activeImage) + 1)} / {galleryImages.length}
                </div>
              ) : null}
              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goToPrevImage}
                    aria-label="Previous image"
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/95 px-3.5 py-2.5 text-xs font-bold text-gray-800 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-white backdrop-blur-sm"
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    onClick={goToNextImage}
                    aria-label="Next image"
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/95 px-3.5 py-2.5 text-xs font-bold text-gray-800 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-white backdrop-blur-sm"
                  >
                    {">"}
                  </button>
                </>
              ) : null}
            </div>
            {galleryImages.length > 1 ? (
              <div className="mt-4 grid grid-cols-5 gap-2.5">
                {galleryImages.map((imageUrl) => (
                  <button
                    key={imageUrl}
                    type="button"
                    onClick={() => {
                      setUserInteractedWithGallery(true);
                      setActiveImage(imageUrl);
                    }}
                    className={`overflow-hidden rounded-xl border transition-all duration-200 aspect-square flex items-center justify-center p-1.5 bg-gray-50 ${
                      activeImage === imageUrl
                        ? "scale-[1.03] border-amber-600 shadow-sm bg-white"
                        : "border-gray-100 hover:scale-[1.01] hover:border-amber-200"
                    }`}
                  >
                    <img src={imageUrl} alt={product.name} className="max-h-full max-w-full object-contain transition duration-200 hover:brightness-105" />
                  </button>
                ))}
              </div>
            ) : null}
            
            {/* Gallery Checkout Bar for Tablet/Desktop */}
            <div className="mt-6 hidden grid-cols-2 gap-4 sm:grid">
              {!product.isPersonalized && cartQuantity > 0 ? (
                <QuantityStepper
                  quantity={cartQuantity}
                  onDecrease={handleDecreaseQty}
                  onIncrease={handleIncreaseQty}
                  increaseDisabled={outOfStock || reachedMaxStock}
                  decreaseAriaLabel={`Decrease ${product.name} quantity`}
                  increaseAriaLabel={`Increase ${product.name} quantity`}
                  className="rounded-full border-gray-200 bg-white"
                />
              ) : (
                <button
                  type="button"
                  disabled={outOfStock || (product.isPersonalized && !isCustomizationValid) || uploadingImage}
                  onClick={handleAddToCart}
                  className="rounded-full bg-amber-600 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-300 shadow-sm"
                >
                  {outOfStock ? "Sold out" : uploadingImage ? "Uploading..." : recentlyAdded ? "Added ✓" : "Add to Cart"}
                </button>
              )}
              <button
                type="button"
                disabled={outOfStock || (product.isPersonalized && !isCustomizationValid) || uploadingImage}
                onClick={handleBuyNow}
                className="rounded-full bg-emerald-950 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-300 shadow-sm"
              >
                Buy Now
              </button>
            </div>
          </div>

          {/* Right Column: Info and options */}
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-700">{product.category}</p>
              <h1 className="mt-1.5 text-3xl md:text-4xl font-serif font-light tracking-tight text-gray-950 leading-tight">{product.name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500 font-light">
                <span className="inline-flex items-center rounded-full bg-emerald-950 px-3 py-1 font-bold text-[10px] text-white tracking-wider">
                  {rating.toFixed(1)} ★
                </span>
                <span className="tracking-wide">{numReviews} customer reviews</span>
                <span className="text-gray-200">|</span>
                <span className={`font-semibold tracking-wider uppercase text-[10px] ${outOfStock ? "text-red-600" : "text-emerald-800"}`}>
                  {outOfStock ? "Sold Out" : `${stock} available`}
                </span>
              </div>
            </div>

            {/* Personalization Options */}
            {product.isPersonalized && (
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/20 via-white to-emerald-50/10 p-5 shadow-sm space-y-4 animate-[fadeIn_0.3s_ease-out] ring-1 ring-amber-100/20">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <span className="text-base">✨</span>
                  <div>
                    <h3 className="text-xs font-serif font-bold text-gray-950">Personalize Your Gift</h3>
                    <p className="text-[9px] text-gray-400 font-light uppercase tracking-wider">Configure your custom options below</p>
                  </div>
                </div>

                {/* Text personalization */}
                {product.personalizationTextLabel && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700">
                      {product.personalizationTextLabel} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        maxLength={product.personalizationTextLimit || 20}
                        placeholder={`Enter personalization text (max ${product.personalizationTextLimit || 20} chars)`}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs transition-all focus:border-amber-500 focus:bg-amber-50/10 focus:ring-1 focus:ring-amber-500/20 placeholder:text-gray-400 font-light"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-medium text-gray-400">
                        {customText.length}/{product.personalizationTextLimit || 20}
                      </div>
                    </div>
                  </div>
                )}

                {/* Image upload personalization */}
                {(product.personalizationImageLabel || product.personalizationImageRequired) && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700">
                      {product.personalizationImageLabel || "Upload Photo"} {product.personalizationImageRequired && <span className="text-red-500">*</span>}
                    </label>
                    
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <div className="border border-dashed border-gray-300 rounded-xl p-3.5 text-center hover:border-amber-500 transition-colors bg-white/40 cursor-pointer relative group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="space-y-1 text-xs text-gray-550">
                            <svg className="w-6 h-6 mx-auto text-gray-400 group-hover:text-amber-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="font-semibold text-[10px] group-hover:text-amber-700 transition-colors duration-200">Click to upload photo</p>
                          </div>
                        </div>
                      </div>

                      {/* Photo preview */}
                      {(customImage || uploadingImage) && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-1 border border-gray-150 shadow-inner relative flex-shrink-0 animate-[popIn_0.2s_ease-out]">
                          {uploadingImage ? (
                            <div className="flex flex-col items-center gap-1 animate-pulse">
                              <svg className="animate-spin h-4.5 w-4.5 text-amber-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-[7px] text-amber-750 font-bold uppercase tracking-wider">Uploading</span>
                            </div>
                          ) : (
                            <>
                              <img src={customImage} alt="Custom Preview" className="max-h-full max-w-full object-contain rounded-lg" />
                              <button
                                type="button"
                                onClick={() => setCustomImage("")}
                                className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-black text-white w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold transition-all"
                                aria-label="Remove image"
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Price & Primary Purchase Card */}
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline gap-3">
                <p className="text-3xl font-serif font-light text-gray-950">INR {product.price}</p>
                <p className="text-sm text-gray-400 line-through font-light">INR {comparePrice}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/35">Special Price</p>
              </div>

              {/* Purchase Options directly inside details column */}
              <div className="grid grid-cols-2 gap-3 py-1">
                {!product.isPersonalized && cartQuantity > 0 ? (
                  <QuantityStepper
                    quantity={cartQuantity}
                    onDecrease={handleDecreaseQty}
                    onIncrease={handleIncreaseQty}
                    increaseDisabled={outOfStock || reachedMaxStock}
                    decreaseAriaLabel={`Decrease ${product.name} quantity`}
                    increaseAriaLabel={`Increase ${product.name} quantity`}
                    className="rounded-full border-gray-200 bg-white"
                  />
                ) : (
                  <button
                    type="button"
                    disabled={outOfStock || (product.isPersonalized && !isCustomizationValid) || uploadingImage}
                    onClick={handleAddToCart}
                    className="rounded-full bg-amber-600 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-300 shadow-sm"
                  >
                    {outOfStock ? "Sold out" : uploadingImage ? "Uploading..." : recentlyAdded ? "Added ✓" : "Add to Cart"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={outOfStock || (product.isPersonalized && !isCustomizationValid) || uploadingImage}
                  onClick={handleBuyNow}
                  className="rounded-full bg-emerald-950 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-300 shadow-sm"
                >
                  Buy Now
                </button>
              </div>

              <div className="border-t border-gray-100 pt-4 grid gap-2 text-xs text-gray-500 font-light">
                <p>
                  Estimated delivery by{" "}
                  <span className="font-semibold text-gray-800">
                    {deliveryTimeText || deliveryEstimate}
                  </span>
                </p>
                {materialText ? (
                  <p>
                    Material: <span className="font-semibold text-gray-800">{materialText}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {/* Highlights */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-serif font-semibold text-gray-950 border-b border-gray-100 pb-2">Highlights</h2>
              <ul className="mt-3.5 grid gap-2.5 text-xs text-gray-600 leading-relaxed font-light">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Product Description */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-serif font-semibold text-gray-950 border-b border-gray-100 pb-2">Product Description</h2>
              <p className="mt-3 text-xs leading-relaxed text-gray-600 font-light whitespace-pre-line">{product.description}</p>
            </div>

            {/* Specifications */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-serif font-semibold text-gray-950 border-b border-gray-100 pb-2">Specifications</h2>
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-100">
                {specifications.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className={`grid gap-2 px-4 py-2.5 text-xs md:grid-cols-[180px_1fr] ${
                      index !== specifications.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <p className="font-medium text-gray-400">{item.label}</p>
                    <p className="text-gray-800 font-light">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Services info merged at the bottom of specifications */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 pb-2 border-b border-gray-100">Delivery & Boutique Services</p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 text-xs text-gray-600">
                <div className="rounded-xl bg-gray-50/50 px-3.5 py-3 border border-gray-100/50 font-light">Same-day support in selected cities</div>
                <div className="rounded-xl bg-gray-50/50 px-3.5 py-3 border border-gray-100/50 font-light">Replacement help for damaged orders</div>
                <div className="rounded-xl bg-gray-50/50 px-3.5 py-3 border border-gray-100/50 font-light font-sans tracking-wide">Secure checkout & premium packaging</div>
                <div className="rounded-xl bg-gray-50/50 px-3.5 py-3 border border-gray-100/50 font-light">Order tracking code provided</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200/40 bg-white/70 backdrop-blur-md p-6 shadow-sm md:p-10">
        <h2 className="text-lg font-serif font-semibold text-gray-950 border-b border-gray-100 pb-3">Customer Reviews</h2>
        <p className="mt-2 text-xs text-gray-500 font-light">
          {numReviews > 0
            ? `Rated ${rating.toFixed(1)} out of 5 by ${numReviews} customers.`
            : "No reviews yet. Be the first to review this product after purchase."}
        </p>
        {reviews.length > 0 ? (
          <div className="mt-4 space-y-4">
            {reviews.map((item) => (
              <article key={item._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-950">{item.name}</p>
                    {item.verifiedPurchase ? (
                      <span className="rounded-full bg-emerald-50 border border-emerald-100/40 px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-800 tracking-wider">
                        Verified Purchase
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs font-bold text-amber-600">{Number(item.rating || 0).toFixed(1)} ★</p>
                </div>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed font-light">{item.comment}</p>
                <p className="mt-2.5 text-[9px] text-gray-400 font-light tracking-wide uppercase">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : ""}
                </p>
              </article>
            ))}
          </div>
        ) : null}
        <form onSubmit={submitReview} className="mt-6 grid gap-4 rounded-2xl border border-emerald-100/40 bg-emerald-50/10 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">{myReview ? "Edit Your Review" : "Write a Review"}</p>
          <div className="flex items-center gap-1.5">{[1, 2, 3, 4, 5].map(renderStar)}</div>
          <textarea
            value={reviewForm.comment}
            onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
            rows={3}
            placeholder="Share your experience with this product"
            className="rounded-xl border border-emerald-100/60 bg-white px-3.5 py-3 text-xs focus:ring-1 focus:ring-emerald-500 font-light placeholder:text-gray-400"
            disabled={submittingReview || (userAuth?.token && !canReview)}
            required
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submittingReview || checkingReviewEligibility || (userAuth?.token && !canReview)}
              className="rounded-full bg-emerald-950 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-300 shadow-sm"
            >
              {submittingReview ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
            </button>
            {myReview ? (
              <button
                type="button"
                onClick={handleDeleteMyReview}
                disabled={submittingReview}
                className="rounded-full border border-red-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-60 transition-all duration-200"
              >
                Delete Review
              </button>
            ) : null}
            {!userAuth?.token ? (
              <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-emerald-800 hover:text-emerald-950">
                Login to review
              </Link>
            ) : null}
            {userAuth?.token && !canReview && !checkingReviewEligibility ? (
              <button
                type="button"
                onClick={buyToReview}
                className="text-xs font-bold uppercase tracking-widest text-emerald-800 hover:text-emerald-950"
              >
                Buy this product to review
              </button>
            ) : null}
          </div>
          {reviewMessage ? <p className="text-xs text-gray-500 font-light">{reviewMessage}</p> : null}
          {needsPurchaseHint ? (
            <p className="text-xs text-amber-800 font-light">
              You can post a review after placing an order for this product from your account.
            </p>
          ) : null}
          {userAuth?.token && !canReview && !checkingReviewEligibility ? (
            <p className="text-xs text-amber-800 font-light">Review form is unlocked only after purchase.</p>
          ) : null}
        </form>
      </div>

      {relatedProducts.length > 0 ? (
        <div className="rounded-3xl border border-gray-200/40 bg-white/70 backdrop-blur-md p-6 shadow-sm md:p-10">
          <h2 className="text-lg font-serif font-semibold text-gray-950 border-b border-gray-100 pb-3">Related Products</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => {
              const cardImage = item.image || item.images?.[0] || "https://via.placeholder.com/400x300?text=Niyora+Gifts";
              const itemQuantity = cartQuantityById[item._id] || 0;
              return (
                <article key={item._id} className="group rounded-2xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md hover:border-amber-300/30 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <Link to={`/products/${item.slug || item._id}`} className="block overflow-hidden rounded-xl bg-gray-50 aspect-[4/3]">
                      <img src={cardImage} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </Link>
                    <p className="mt-3 line-clamp-1 text-xs font-serif font-bold text-gray-950 group-hover:text-amber-800 transition-colors">{item.name}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-wider font-bold text-gray-400">{item.category}</p>
                    <p className="mt-2 text-sm font-semibold font-serif text-gray-900">INR {item.price}</p>
                  </div>
                  <div className="mt-4">
                    {itemQuantity > 0 ? (
                      <QuantityStepper
                        quantity={itemQuantity}
                        onDecrease={() => updateQuantity(item._id, itemQuantity - 1)}
                        onIncrease={() => handleCardAdd(item)}
                        increaseDisabled={
                          Number.isFinite(Number(item.stock)) && itemQuantity >= Number(item.stock)
                        }
                        decreaseAriaLabel={`Decrease ${item.name} quantity`}
                        increaseAriaLabel={`Increase ${item.name} quantity`}
                        buttonClassName="h-7 w-7 text-xs"
                        valueClassName="text-xs"
                        className="rounded-full border-gray-200 bg-white"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCardAdd(item)}
                        disabled={Number.isFinite(Number(item.stock)) && Number(item.stock) <= 0}
                        className="w-full rounded-full bg-emerald-950 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200"
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
        <div className="rounded-3xl border border-gray-200/40 bg-white/70 backdrop-blur-md p-6 shadow-sm md:p-10">
          <h2 className="text-lg font-serif font-semibold text-gray-950 border-b border-gray-100 pb-3">Recently Viewed</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {recentlyViewedProducts.map((item) => {
              const cardImage = item.image || item.images?.[0] || "https://via.placeholder.com/400x300?text=Niyora+Gifts";
              const itemQuantity = cartQuantityById[item._id] || 0;
              return (
                <article key={item._id} className="group rounded-2xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md hover:border-amber-200/30 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <Link to={`/products/${item.slug || item._id}`} className="block overflow-hidden rounded-xl bg-gray-50 aspect-square">
                      <img src={cardImage} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </Link>
                    <Link
                      to={`/products/${item.slug || item._id}`}
                      className="mt-3 block line-clamp-1 text-xs font-serif font-bold text-gray-950 group-hover:text-amber-800 transition-colors"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-[9px] uppercase tracking-wider font-bold text-gray-400">{item.category}</p>
                    <p className="mt-2 text-sm font-semibold font-serif text-gray-900">INR {item.price}</p>
                  </div>
                  <div className="mt-4">
                    {itemQuantity > 0 ? (
                      <QuantityStepper
                        quantity={itemQuantity}
                        onDecrease={() => updateQuantity(item._id, itemQuantity - 1)}
                        onIncrease={() => handleCardAdd(item)}
                        increaseDisabled={
                          Number.isFinite(Number(item.stock)) && itemQuantity >= Number(item.stock)
                        }
                        decreaseAriaLabel={`Decrease ${item.name} quantity`}
                        increaseAriaLabel={`Increase ${item.name} quantity`}
                        buttonClassName="h-7 w-7 text-xs"
                        valueClassName="text-xs"
                        className="rounded-full border-gray-200 bg-white"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCardAdd(item)}
                        disabled={Number.isFinite(Number(item.stock)) && Number(item.stock) <= 0}
                        className="w-full rounded-full bg-emerald-950 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200"
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
        <div className="fixed inset-0 z-50 bg-black/90 p-4 backdrop-blur-[4px] animate-[fadeIn_.22s_ease-out] md:p-8 flex flex-col justify-between">
          <div className="flex justify-end w-full">
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close image preview"
              className="rounded-full bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold text-white uppercase tracking-widest hover:bg-white/20 transition-all duration-200"
            >
              Close
            </button>
          </div>
          <div className="mx-auto flex h-[75vh] w-full max-w-5xl items-center justify-center relative">
            <button
              type="button"
              onClick={goToPrevImage}
              className="absolute left-0 z-10 hidden rounded-full bg-white/10 border border-white/10 px-4 py-3 text-lg font-bold text-white hover:bg-white/20 transition-all duration-200 md:block"
              aria-label="Previous image"
            >
              {"<"}
            </button>
            <img
              src={activeImage || "https://via.placeholder.com/900x700?text=Niyora+Gifts"}
              alt={product.name}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl animate-[popIn_.22s_ease-out]"
            />
            <button
              type="button"
              onClick={goToNextImage}
              className="absolute right-0 z-10 hidden rounded-full bg-white/10 border border-white/10 px-4 py-3 text-lg font-bold text-white hover:bg-white/20 transition-all duration-200 md:block"
              aria-label="Next image"
            >
              {">"}
            </button>
          </div>
          <p className="text-center text-xs font-semibold text-gray-400 tracking-widest uppercase">
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

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur-md p-3.5 shadow-lg md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold font-serif text-gray-950">INR {product.price}</p>
            <p className={`text-[10px] uppercase font-bold tracking-wider ${outOfStock ? "text-red-650" : "text-emerald-800"}`}>
              {outOfStock ? "Sold out" : `${stock} available`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!product.isPersonalized && cartQuantity > 0 ? (
              <QuantityStepper
                quantity={cartQuantity}
                onDecrease={handleDecreaseQty}
                onIncrease={handleIncreaseQty}
                increaseDisabled={outOfStock || reachedMaxStock}
                decreaseAriaLabel={`Decrease ${product.name} quantity`}
                increaseAriaLabel={`Increase ${product.name} quantity`}
                buttonClassName="h-7 w-7 text-xs"
                valueClassName="text-xs"
                className="rounded-full border-gray-200 bg-white"
              />
            ) : (
              <button
                type="button"
                disabled={outOfStock || (product.isPersonalized && !isCustomizationValid) || uploadingImage}
                onClick={handleAddToCart}
                className="rounded-full bg-amber-600 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-60 transition-all duration-200"
              >
                {uploadingImage ? "Uploading..." : recentlyAdded ? "Added ✓" : "Add to Cart"}
              </button>
            )}
            <button
              type="button"
              disabled={outOfStock || (product.isPersonalized && !isCustomizationValid) || uploadingImage}
              onClick={handleBuyNow}
              className="rounded-full bg-emerald-950 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-60 transition-all duration-200"
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
