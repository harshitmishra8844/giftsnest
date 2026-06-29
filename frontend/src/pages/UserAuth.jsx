import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { saveUserAuth } from "../services/userAuth";

const UserAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/login" : "/register";
      const payload = mode === "login" ? { email: form.email, password: form.password } : form;
      const { data } = await api.post(endpoint, payload);
      saveUserAuth(data);
      const redirectTo = location.state?.redirectTo || "/my-profile";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-xs animate-fade-in">
      <h2 className="text-2xl font-serif font-light text-luxury-black">{mode === "login" ? "Welcome back" : "Create account"}</h2>
      <p className="mt-1 text-xs text-text-secondary font-light">Access your profile, orders and tracking updates.</p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        {mode === "register" ? (
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Full name"
            required
            className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
          />
        ) : null}
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="Email address"
          required
          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
        />
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="Password"
          required
          className="w-full rounded-full border border-champagne bg-white px-4 py-2.5 text-xs transition-all focus:border-gold-500 focus:bg-gold-50/20 focus:ring-1 focus:ring-gold-500/20 outline-none"
        />
        {error ? <p className="text-xs text-red-650 font-medium">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gold-500 hover:bg-gold-600 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-sm cursor-pointer"
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode((prev) => (prev === "login" ? "register" : "login"))}
        className="mt-4 text-xs font-bold uppercase tracking-wider text-gold-700 hover:text-gold-800 transition cursor-pointer"
      >
        {mode === "login" ? "New user? Create an account" : "Already have an account? Login"}
      </button>
    </section>
  );
};

export default UserAuth;
