import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { saveUserAuth } from "../services/userAuth";

const UserAuth = () => {
  const navigate = useNavigate();
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
      navigate("/my-profile");
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-emerald-900">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
      <p className="mt-1 text-sm text-gray-600">Access your profile, orders and tracking updates.</p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        {mode === "register" ? (
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Full name"
            required
            className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-sm"
          />
        ) : null}
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="Email address"
          required
          className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="Password"
          required
          className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-sm"
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode((prev) => (prev === "login" ? "register" : "login"))}
        className="mt-4 text-sm font-medium text-emerald-700 hover:text-emerald-800"
      >
        {mode === "login" ? "New user? Create an account" : "Already have an account? Login"}
      </button>
    </section>
  );
};

export default UserAuth;
