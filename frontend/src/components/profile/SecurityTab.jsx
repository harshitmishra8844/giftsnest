import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  Lock,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SecurityTab() {
  const { auth, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await api.put("/user/profile", {
        password: currentPassword,
        newPassword: newPassword,
      });
      setSuccess("Your account password has been updated securely.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Password update error:", err);
      setError(err.response?.data?.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
          Account Protection
        </span>
        <h2 className="text-xl font-serif font-bold text-luxury-black mt-1">
          Security & Access Controls
        </h2>
        <p className="text-xs text-text-secondary mt-0.5 font-light">
          Manage your login password and review account security status.
        </p>
      </div>

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Password Form */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs">
          <h3 className="text-base font-serif font-bold text-luxury-black mb-1 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-gold-600" />
            Update Password
          </h3>
          <p className="text-xs text-text-secondary mb-5 font-light">
            Choose a strong passphrase with at least 6 characters.
          </p>

          <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1">
                  New Password *
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {saving ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        {/* Security Summary & Session Termination */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-champagne/45 bg-white/70 backdrop-blur-md p-6 shadow-xs space-y-3 text-xs">
            <h4 className="font-serif font-bold text-luxury-black flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Security Check
            </h4>
            <div className="space-y-2 text-text-secondary font-light text-[11px]">
              <p className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Encrypted JWT session tokens</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Store Credit race-condition protection active</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Audited finance & refund ledger isolation</span>
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-200 bg-rose-50/30 p-6 shadow-xs space-y-3 text-xs">
            <h4 className="font-serif font-bold text-rose-950 flex items-center gap-1.5">
              <LogOut className="w-4 h-4 text-rose-600" />
              Session Logout
            </h4>
            <p className="text-[11px] text-rose-900 font-light leading-relaxed">
              Sign out of your active browser session on this device.
            </p>
            <button
              type="button"
              onClick={logout}
              className="w-full py-2 px-4 rounded-full border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 font-bold uppercase tracking-wider transition cursor-pointer text-[10px]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
