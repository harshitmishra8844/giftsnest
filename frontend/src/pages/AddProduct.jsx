import { useState } from "react";
import api from "../services/api";

const initialForm = {
  name: "",
  price: "",
  description: "",
  highlightsText: "",
  specificationsText: "",
  deliveryTime: "",
  material: "",
  dimensions: "",
  weight: "",
  occasion: "",
  careInstructions: "",
  category: "",
};

const AddProduct = () => {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devUploadWarning, setDevUploadWarning] = useState("");

  const getUploadErrorMessage = (err) => {
    const status = err?.response?.status;
    const apiMessage = String(err?.response?.data?.message || "").trim();
    if (status === 503) {
      return (
        "Image upload failed: Cloudinary is not configured on the deployed server. " +
        "Add CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) and redeploy backend."
      );
    }
    return apiMessage || err.message || "Failed to add product.";
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setDevUploadWarning("");

    if (!files.length && !uploadedImages.length) {
      setError("Please select at least one image file.");
      return;
    }

    try {
      setLoading(true);

      const uploadedFromFiles = [];
      let fallbackWarning = "";
      for (const file of files) {
        const uploadData = new FormData();
        uploadData.append("image", file);
        const uploadResponse = await api.post("/upload", uploadData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        if (uploadResponse.data?.imageUrl) {
          uploadedFromFiles.push(uploadResponse.data.imageUrl);
        }
        if (uploadResponse.data?.message && !uploadResponse.data.message.toLowerCase().includes("successfully")) {
          fallbackWarning = uploadResponse.data.message;
        }
      }

      const allImages = Array.from(new Set([...uploadedImages, ...uploadedFromFiles].filter(Boolean)));

      const payload = {
        ...form,
        price: Number(form.price),
        image: allImages[0],
        images: allImages,
        highlights: String(form.highlightsText || "")
          .split(/\r?\n/)
          .map((item) => item.replace(/^[-\u2022]\s*/, "").trim())
          .filter(Boolean),
        specifications: String(form.specificationsText || "")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const separatorIndex = line.indexOf(":");
            if (separatorIndex === -1) return null;
            return {
              label: line.slice(0, separatorIndex).trim(),
              value: line.slice(separatorIndex + 1).trim(),
            };
          })
          .filter((item) => item?.label && item?.value),
      };
      const manualSpecs = payload.specifications || [];
      const normalizedQuickSpecs = [
        { label: "Delivery Time", value: String(form.deliveryTime || "").trim() },
        { label: "Material", value: String(form.material || "").trim() },
        { label: "Dimensions", value: String(form.dimensions || "").trim() },
        { label: "Weight", value: String(form.weight || "").trim() },
        { label: "Occasion", value: String(form.occasion || "").trim() },
        { label: "Care Instructions", value: String(form.careInstructions || "").trim() },
      ].filter((item) => item.value);
      const quickSpecLabels = new Set(normalizedQuickSpecs.map((item) => item.label.toLowerCase()));
      payload.specifications = [
        ...normalizedQuickSpecs,
        ...manualSpecs.filter((item) => !quickSpecLabels.has(String(item.label || "").toLowerCase())),
      ];
      delete payload.highlightsText;
      delete payload.specificationsText;
      delete payload.deliveryTime;
      delete payload.material;
      delete payload.dimensions;
      delete payload.weight;
      delete payload.occasion;
      delete payload.careInstructions;

      const productResponse = await api.post("/products", payload);
      setMessage(`Product added successfully: ${productResponse.data.product.name}`);
      if (fallbackWarning) {
        setDevUploadWarning(fallbackWarning);
      }
      setForm(initialForm);
      setFiles([]);
      setUploadedImages([]);
      event.target.reset();
    } catch (err) {
      setError(getUploadErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h2 className="text-2xl font-bold text-gray-900">Add New Product</h2>
      <p className="mt-1 text-sm text-gray-600">
        Upload a product image to Cloudinary and save the product to database.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <input name="name" placeholder="Product name" value={form.name} onChange={handleChange} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input name="price" type="number" min="1" placeholder="Price" value={form.price} onChange={handleChange} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input name="category" placeholder="Category" value={form.category} onChange={handleChange} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} required rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <textarea
          name="highlightsText"
          placeholder={"Highlights (one point per line)\nPremium quality\nGift-ready packaging"}
          value={form.highlightsText}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <textarea
          name="specificationsText"
          placeholder={"Specifications (one per line: Label: Value)\nBrand: Niyora Gifts\nMaterial: Wood"}
          value={form.specificationsText}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          name="deliveryTime"
          placeholder="Delivery time (e.g. 2-4 days)"
          value={form.deliveryTime}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          name="material"
          placeholder="Material (e.g. Ceramic, MDF Wood)"
          value={form.material}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          name="dimensions"
          placeholder="Dimensions (e.g. 10 x 8 x 4 inch)"
          value={form.dimensions}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          name="weight"
          placeholder="Weight (e.g. 450g)"
          value={form.weight}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          name="occasion"
          placeholder="Occasion (e.g. Birthday, Anniversary)"
          value={form.occasion}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <textarea
          name="careInstructions"
          placeholder="Care instructions (e.g. Wipe with dry cloth, avoid direct sunlight)"
          value={form.careInstructions}
          onChange={handleChange}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          required={uploadedImages.length === 0}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        {files.length > 0 ? (
          <p className="text-xs text-gray-600">{files.length} image{files.length > 1 ? "s" : ""} selected for upload.</p>
        ) : null}
        <textarea
          value={uploadedImages.join("\n")}
          onChange={(e) =>
            setUploadedImages(
              String(e.target.value || "")
                .split(/\r?\n|,/)
                .map((item) => item.trim())
                .filter(Boolean)
            )
          }
          rows={3}
          placeholder="Optional image URLs (one per line or comma separated)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />

        {message ? <p className="text-sm text-green-600">{message}</p> : null}
        {devUploadWarning ? <p className="text-sm text-amber-700">{devUploadWarning}</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Uploading..." : "Upload & Save Product"}
        </button>
      </form>
    </section>
  );
};

export default AddProduct;
