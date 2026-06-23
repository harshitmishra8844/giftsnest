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
      navigate("/niyora-admin-portal-2026/dashboard", { replace: true });
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
      navigate("/niyora-admin-portal-2026/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-ivory relative overflow-hidden px-4">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-gold-200/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-gold-100/30 blur-3xl pointer-events-none" />
      
      <section className="w-full max-w-md rounded-3xl border border-gold-200/40 bg-white/80 backdrop-blur-lg p-8 md:p-10 shadow-2xl relative z-10 hover-float">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-md mb-4">
            <span className="text-lg font-serif font-bold text-white">N</span>
          </div>
          <h2 className="text-2xl font-serif tracking-wide text-luxury-black font-semibold">
            Niyora Gifts
          </h2>
          <p className="text-[10px] tracking-[0.25em] text-gold-600 font-bold uppercase mt-1">
            Executive Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-lux">
              Admin Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. admin@niyoragifts.com"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-gold-200/50 bg-white/60 px-4 py-3 text-xs text-luxury-black transition-all focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/10 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-lux">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-gold-200/50 bg-white/60 px-4 py-3 text-xs text-luxury-black transition-all focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/10 outline-none"
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-danger-lux/10 border border-danger-lux/20 text-xs text-danger-lux font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 rounded-xl bg-gold-500 hover:bg-gold-hover active:bg-gold-700 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            {loading ? "Signing in..." : "Access Console"}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gold-100/50 text-center">
          <p className="text-[10px] text-gray-400 font-light tracking-wider">
            Secured Admin Environment
          </p>
        </div>
      </section>
    </div>
  );
};

export default AdminLogin;
