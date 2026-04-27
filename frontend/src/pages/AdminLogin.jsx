import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getAdminAuth, saveAdminAuth } from "../services/adminAuth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = getAdminAuth();
    if (existing?.token && existing?.isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
      };
      const { data } = await api.post("/admin/login", payload);
      saveAdminAuth(data);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-emerald-900">Admin Login</h2>
      <p className="mt-1 text-sm text-gray-600">
        Sign in to manage products, orders, offers and store settings.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Admin email"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-sm"
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-sm"
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Login to Dashboard"}
        </button>
      </form>
    </section>
  );
};

export default AdminLogin;
