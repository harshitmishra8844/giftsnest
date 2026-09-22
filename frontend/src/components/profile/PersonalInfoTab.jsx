import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { validateName, validateEmail, validatePhone } from "../../utils/validation";

export default function PersonalInfoTab() {
  const { auth, login } = useAuth();
  const [formData, setFormData] = useState({
    name: auth?.name || "",
    email: auth?.email || "",
    mobileNumber: auth?.mobileNumber || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (auth) {
      setFormData({
        name: auth.name || "",
        email: auth.email || "",
        mobileNumber: auth.mobileNumber || "",
      });
    }
  }, [auth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const nameVal = validateName(formData.name);
    if (!nameVal.isValid) {
      setError(nameVal.error);
      return;
    }

    const emailVal = validateEmail(formData.email);
    if (!emailVal.isValid) {
      setError(emailVal.error);
      return;
    }

    let cleanPhone = "";
    if (formData.mobileNumber && formData.mobileNumber.trim().length > 0) {
      const phoneVal = validatePhone(formData.mobileNumber);
      if (!phoneVal.isValid) {
        setError(phoneVal.error);
        return;
      }
      cleanPhone = phoneVal.sanitizedValue;
    }

    try {
      setSaving(true);
      const { data } = await api.put("/user/profile", {
        name: nameVal.sanitizedValue,
        email: emailVal.sanitizedValue,
        mobileNumber: cleanPhone,
      });
      if (data?.token) {
        login(data);
      }
      setSuccess("Your personal profile details have been saved successfully.");
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const isEmailVerified = Boolean(auth?.isEmailVerified || auth?.verificationStatus === "Verified");
  const isPhoneVerified = Boolean(auth?.isPhoneVerified);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
          Account Identification
        </span>
        <h2 className="text-xl font-serif font-bold text-luxury-black mt-1">
          Personal Information
        </h2>
        <p className="text-xs text-text-secondary mt-0.5 font-light">
          Manage your contact credentials for order delivery updates and official invoices.
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

      {/* Main Profile Form */}
      <div className="bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Avatar / Member Status Card */}
          <div className="flex items-center gap-4 border-b border-champagne/20 pb-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-gold-600 to-gold-400 text-white flex items-center justify-center text-xl font-bold font-serif shadow-sm">
              {formData.name ? formData.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-luxury-black">
                {formData.name || "Customer Account"}
              </h3>
              <p className="text-text-secondary text-[11px] font-light">
                Registered Member &bull; {formData.email || "No email"}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <Shield className="w-3 h-3 text-emerald-600" /> Email Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 uppercase tracking-widest bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <ShieldAlert className="w-3 h-3 text-amber-600" /> Email Unverified
                  </span>
                )}
                {isPhoneVerified ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <Shield className="w-3 h-3 text-emerald-600" /> Phone Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-600 uppercase tracking-widest bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200" title="SMS verification mechanism is currently in rollout">
                    📱 Phone Unverified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1.5">
              Full Legal / Delivery Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
              />
            </div>
            <p className="text-[10px] text-text-secondary mt-1 font-light">
              Order confirmations, invoice PDFs, and Store Credit alerts will be dispatched here.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-luxury-black mb-1.5">
              Mobile Number (10-Digit Indian Mobile)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-champagne bg-white text-luxury-black focus:outline-none focus:border-gold-500"
              />
            </div>
            <p className="text-[10px] text-text-secondary mt-1 font-light">
              Used by delivery couriers and concierge specialists for dispatch alerts.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50 shadow-sm text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving Updates..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
