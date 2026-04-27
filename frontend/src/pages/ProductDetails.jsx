import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { getUserAuth } from "../services/userAuth";

const ProductDetails = () => {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
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
  const [openSection, setOpenSection] = useState("description");

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
    if (galleryImages.length > 0) setActiveImage(galleryImages[0]);
  }, [galleryImages]);

  const relatedProducts = useMemo(() => {
    if (!product?._id) return [];
    const currentCategory = String(product.category || "").toLowerCase();
    return allProducts
      .filter((item) => item?._id !== product._id)
      .filter((item) => String(item.category || "").toLowerCase() === currentCategory)
      .slice(0, 4);
  }, [allProducts, product]);

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
  const rating = Math.max(0, Math.min(5, Number(product.rating || 0)));
  const numReviews = Math.max(0, Number(product.numReviews || 0));
  const reviews = Array.isArray(product.reviews) ? [...product.reviews].reverse() : [];
  const userAuth = getUserAuth();
  const myReview = reviews.find((item) => String(item.user) === String(userAuth?._id)) || null;

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
    if (!product) return;
    addToCart(product);
    navigate("/cart");
  };

  useEffect(() => {
    if (!myReview) return;
    setReviewForm({
      rating: String(Math.max(1, Math.min(5, Number(myReview.rating || 5)))),
      comment: String(myReview.comment || ""),
    });
  }, [myReview?._id]);

  const selectedRating = Number(reviewForm.rating || 5);
  const deliveryEstimate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

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

  const toggleSection = (sectionKey) => {
    setOpenSection((prev) => (prev === sectionKey ? "" : sectionKey));
  };

  return (
    <section className="space-y-6 pb-24 md:pb-0">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-8">
        <div className="mb-5 text-sm text-gray-500">
          <Link to="/products" className="hover:text-emerald-700">Products</Link> / <span className="text-gray-700">{product.category}</span> / {product.name}
        </div>
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="group overflow-hidden rounded-2xl">
              <img
                src={activeImage || "https://via.placeholder.com/900x700?text=GiftNest"}
                alt={product.name}
                className="h-[360px] w-full rounded-2xl object-cover transition duration-300 group-hover:scale-105 md:h-[560px]"
              />
            </div>
            {galleryImages.length > 1 ? (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {galleryImages.map((imageUrl) => (
                  <button
                    key={imageUrl}
                    type="button"
                    onClick={() => setActiveImage(imageUrl)}
                    className={`overflow-hidden rounded-lg border-2 transition ${activeImage === imageUrl ? "border-emerald-600" : "border-transparent hover:border-emerald-200"}`}
                  >
                    <img src={imageUrl} alt={product.name} className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{product.category}</p>
              <h1 className="mt-1 text-3xl font-bold leading-tight text-gray-900">{product.name}</h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <span className="font-semibold text-amber-600">{rating.toFixed(1)} ★</span>
                <span className="underline underline-offset-2">({numReviews} reviews)</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-3xl font-bold text-gray-900">INR {product.price}</p>
              <p className={`mt-1 text-sm font-medium ${outOfStock ? "text-red-600" : "text-emerald-700"}`}>
                {outOfStock ? "Currently unavailable" : `${stock} available for quick dispatch`}
              </p>
              <div className="mt-3 grid gap-2 text-xs text-gray-600">
                <p className="rounded-lg bg-emerald-50 px-2.5 py-2">Estimated delivery by <span className="font-semibold text-gray-900">{deliveryEstimate}</span></p>
                <p className="rounded-lg bg-emerald-50 px-2.5 py-2">Free secure packaging on every gift order</p>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => addToCart(product)}
                  className="rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {outOfStock ? "Sold out" : "Add to Cart"}
                </button>
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => {
                    addToCart(product);
                    navigate("/checkout");
                  }}
                  className="rounded-full border border-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Buy now
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => toggleSection("description")}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900"
                >
                  Product Description
                  <span>{openSection === "description" ? "−" : "+"}</span>
                </button>
                {openSection === "description" ? (
                  <p className="border-t border-gray-200 px-4 py-3 text-sm leading-6 text-gray-700">{product.description}</p>
                ) : null}
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => toggleSection("delivery")}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900"
                >
                  Delivery & Returns
                  <span>{openSection === "delivery" ? "−" : "+"}</span>
                </button>
                {openSection === "delivery" ? (
                  <ul className="space-y-1 border-t border-gray-200 px-4 py-3 text-sm text-gray-700">
                    <li>Standard delivery in 2-5 business days.</li>
                    <li>Same-day delivery available in selected cities.</li>
                    <li>Easy return/replacement for damaged items.</li>
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
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
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-emerald-100 bg-white p-3 shadow-[0_-6px_16px_rgba(0,0,0,0.08)] md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">INR {product.price}</p>
            <p className={`text-xs ${outOfStock ? "text-red-600" : "text-gray-600"}`}>
              {outOfStock ? "Out of stock" : `${stock} in stock`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => addToCart(product)}
              className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Add to Cart
            </button>
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => {
                addToCart(product);
                navigate("/checkout");
              }}
              className="rounded-full border border-emerald-600 px-4 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-60"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductDetails;
