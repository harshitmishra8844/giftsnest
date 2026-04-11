import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { saveAdminAuth } from "../services/adminAuth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/admin/login", form);
      saveAdminAuth(data);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
      <p className="mt-1 text-sm text-gray-600">Sign in to manage products and orders.</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <input
          name="email"
          type="email"
          placeholder="Admin email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Login as Admin"}
        </button>
      </form>
    </section>
  );
};

export default AdminLogin;
