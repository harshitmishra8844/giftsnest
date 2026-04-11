import { useState } from "react";
import api from "../services/api";

const initialForm = {
  name: "",
  price: "",
  description: "",
  category: "",
};

const AddProduct = () => {
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!file) {
      setError("Please select an image file.");
      return;
    }

    try {
      setLoading(true);

      const uploadData = new FormData();
      uploadData.append("image", file);
      const uploadResponse = await api.post("/upload", uploadData);

      const payload = {
        ...form,
        price: Number(form.price),
        image: uploadResponse.data.imageUrl,
      };

      const productResponse = await api.post("/products", payload);
      setMessage(`Product added successfully: ${productResponse.data.product.name}`);
      setForm(initialForm);
      setFile(null);
      event.target.reset();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add product.");
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
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />

        {message ? <p className="text-sm text-green-600">{message}</p> : null}
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
