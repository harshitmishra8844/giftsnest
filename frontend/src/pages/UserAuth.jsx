import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { 
  ShieldCheck, 
  Zap, 
  Truck, 
  Heart, 
  Sparkles, 
  Mail, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft,
  Phone,
  User as UserIcon
} from "lucide-react";

const UserAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, login } = useAuth();
  
  const [step, setStep] = useState("email"); // email, register, verify
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // OTP input state
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const otpInputsRef = useRef([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Redesign custom UI states
  const [emailTouched, setEmailTouched] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);

  // If user is already logged in, redirect them
  useEffect(() => {
    if (auth?.token) {
      const queryParams = new URLSearchParams(location.search);
      const queryRedirect = queryParams.get("redirectTo");
      const redirectTo = location.state?.redirectTo || queryRedirect || "/my-profile";
      navigate(redirectTo, { replace: true });
    }
  }, [auth, navigate, location]);

  // Focus the first OTP input when verification screen mounts
  useEffect(() => {
    if (step === "verify") {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Resend code countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const isValidEmailFormat = (emailStr) => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(emailStr);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/check-email", { email });
      if (data.exists) {
        setStep("verify");
        setResendTimer(60);
        setSuccess(data.message || "OTP sent successfully.");
      } else {
        setStep("register");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify email. Please try again.");
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpEmailSubmit = (e) => {
    e.preventDefault();
    setEmailTouched(true);

    if (!email) {
      setError("Email address is required.");
      return;
    }

    if (!isValidEmailFormat(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    handleEmailSubmit(e);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobileNumber || !email) return;
    if (!agreeTerms) {
      setError("You must agree to the Terms & Conditions to create an account.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/register-send-otp", {
        name,
        email,
        mobileNumber,
      });
      setStep("verify");
      setResendTimer(60);
      setSuccess(data.message || "OTP sent successfully for registration.");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please check details.");
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const isRegister = step === "register" || (name !== "" && mobileNumber !== "");
      const payload = {
        email,
        otp: otpCode,
        register: isRegister,
      };

      if (isRegister) {
        payload.name = name;
        payload.mobileNumber = mobileNumber;
      }

      const { data } = await api.post("/verify-otp", payload);
      setSuccess("Successfully verified!");
      setTimeout(() => {
        login(data);
        const queryParams = new URLSearchParams(location.search);
        const queryRedirect = queryParams.get("redirectTo");
        const redirectTo = location.state?.redirectTo || queryRedirect || "/my-profile";
        navigate(redirectTo, { replace: true });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.");
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setError("");
    setLoading(true);
    try {
      if (name && mobileNumber) {
        await api.post("/register-send-otp", { name, email, mobileNumber });
      } else {
        await api.post("/check-email", { email });
      }
      setOtp(new Array(6).fill(""));
      setResendTimer(60);
      setSuccess("A new verification code has been sent.");
      otpInputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend code. Please wait.");
    } finally {
      setLoading(false);
    }
  };

  // OTP inputs key behaviors
  const handleOtpChange = (element, index, value) => {
    const cleanValue = value.replace(/[^0-9]/g, "").slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    if (cleanValue !== "" && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        otpInputsRef.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pasteData.length > 0) {
      const pasteArray = pasteData.split("");
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasteArray[i] || "";
      }
      setOtp(newOtp);
      
      const nextFocusIndex = Math.min(pasteData.length, 5);
      otpInputsRef.current[nextFocusIndex]?.focus();
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-4 px-4 sm:px-6 lg:px-8">
      {/* Inline styles for custom animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-6px); }
          30%, 60%, 90% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        .animate-fade-slide {
          animation: fadeSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <section 
        className={`w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-gold-300/25 bg-[#FDFCF9] shadow-[0_20px_50px_rgba(212,175,55,0.08)] min-h-[580px] transition-all duration-500 ${shakeForm ? "animate-shake" : ""}`}
      >
        {/* Left Column - Branding and Trust Points */}
        <div className="lg:col-span-5 relative overflow-hidden bg-luxury-black text-white p-8 md:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gold-500/20">
          {/* Ambient overlays */}
          <div 
            className="absolute inset-0 z-0 opacity-15 bg-cover bg-center transition-opacity duration-700" 
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80')` }} 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-black via-luxury-black/90 to-[#121212] z-0" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none z-0" />

          {/* Top Brand Tag */}
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-gold-600 text-sm font-serif font-bold text-white shadow-md">
                N
              </span>
              <div>
                <h2 className="text-lg font-serif font-light uppercase tracking-wider text-white">Niyora Gifts</h2>
                <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-gold-400">Curated Gifting</p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <h1 className="text-3xl font-light font-serif leading-tight">Welcome Back</h1>
              <p className="text-xs text-gray-300 font-light leading-relaxed">
                Continue your gifting journey with Niyora Gifts. Log in to personalize cards, manage deliveries, and keep track of your loved ones' special events.
              </p>
            </div>

            {/* Trust Points */}
            <div className="space-y-4 pt-6">
              <div className="flex items-start gap-3 group">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-gold-400 group-hover:bg-gold-500/15 group-hover:border-gold-500/30 transition-all duration-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">Secure Login</h4>
                  <p className="text-[10px] text-gray-400 font-light mt-0.5">Your email address and shopping detail security is our priority.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 group">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-gold-400 group-hover:bg-gold-500/15 group-hover:border-gold-500/30 transition-all duration-300">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">Fast Checkout</h4>
                  <p className="text-[10px] text-gray-400 font-light mt-0.5">Speed up your gifting by pre-filling verified shipping details.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 group">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-gold-400 group-hover:bg-gold-500/15 group-hover:border-gold-500/30 transition-all duration-300">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">Track Orders</h4>
                  <p className="text-[10px] text-gray-400 font-light mt-0.5">Check current delivery statuses of cakes, flowers, and custom cups.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Why Login Info Card */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:border-gold-500/25 hover:bg-white/8 transition-all duration-300">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Why Login?
              </h4>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-gray-300 font-light">
                <li className="flex items-center gap-1">✓ Exclusive Offers</li>
                <li className="flex items-center gap-1">✓ Save Wishlist</li>
                <li className="flex items-center gap-1">✓ Order History</li>
                <li className="flex items-center gap-1">✓ Personal Suggestions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column - Authentication Forms */}
        <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center relative overflow-hidden bg-[#FDFCF9]">
          {/* Background glowing shapes */}
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-gold-400/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-md mx-auto relative z-10">

            {/* Errors from Server */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2.5 animate-fade-slide">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Success feedback */}
            {success && step !== "verify" && (
              <div className="mb-5 p-3.5 rounded-xl border border-gold-300/30 bg-gold-50/45 text-gold-800 text-xs flex items-center gap-2.5 animate-fade-slide">
                <CheckCircle className="w-4 h-4 shrink-0 text-gold-600" />
                <span className="font-medium">{success}</span>
              </div>
            )}

            {/* ==================== VIEW 1: OTP EMAIL SUBMISSION ==================== */}
            {step === "email" && (
              <form onSubmit={handleOtpEmailSubmit} className="space-y-5 animate-fade-slide">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-serif font-medium tracking-wide text-luxury-black">OTP Sign In</h3>
                  <p className="text-xs text-text-secondary mt-1.5 font-light">Fast & passwordless login using a secure email code.</p>
                </div>

                <div className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label className="block text-[9px] font-bold text-luxury-black uppercase tracking-[0.15em] mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailTouched) setEmailTouched(true);
                        }}
                        onBlur={() => setEmailTouched(true)}
                        placeholder="e.g. customer@example.com"
                        className={`w-full rounded-xl border ${emailTouched && !isValidEmailFormat(email) ? "border-red-400 focus:ring-red-200" : "border-gold-300/40 focus:border-gold-500"} bg-white pl-10 pr-4 py-3 text-xs tracking-wide transition-all focus:bg-gold-50/10 focus:ring-4 focus:ring-gold-500/5 outline-none placeholder:text-gray-400/60 shadow-xs`}
                      />
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    {emailTouched && !email && (
                      <p className="text-[10px] text-red-500 mt-1 font-medium">Email address is required.</p>
                    )}
                    {emailTouched && email && !isValidEmailFormat(email) && (
                      <p className="text-[10px] text-red-500 mt-1 font-medium">Please enter a valid email format.</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-luxury-black hover:bg-[#D4AF37] py-3.5 text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:text-white transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer border border-[#D4AF37]/35 hover:border-transparent active:scale-95 flex items-center justify-center gap-2 mt-2 disabled:opacity-65 animate-pulse-subtle"
                >
                  {loading ? "Sending Code..." : (
                    <>
                      <span>Receive OTP</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="text-center pt-6 border-t border-gold-300/10 mt-6">
                  <span className="text-[11px] text-text-secondary">New to Niyora Gifts? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("register");
                      setError("");
                    }}
                    className="text-[11px] font-bold text-gold-600 hover:text-gold-700 transition cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {/* ==================== VIEW 2: REGISTER DETAILS ==================== */}
            {step === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-5 animate-fade-slide">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-serif font-medium tracking-wide text-luxury-black font-semibold">Join Niyora Gifts</h3>
                  <p className="text-xs text-text-secondary mt-1.5 font-light">
                    Email <span className="font-semibold text-luxury-black">{email || "your address"}</span> is new. Please complete registration.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Email verification input if not set before */}
                  {!email && (
                    <div>
                      <label className="block text-[9px] font-bold text-luxury-black uppercase tracking-[0.15em] mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="customer@example.com"
                          className="w-full rounded-xl border border-gold-300/40 bg-white pl-10 pr-4 py-3 text-xs tracking-wide transition-all focus:border-gold-500 focus:bg-gold-50/10 focus:ring-4 focus:ring-gold-500/5 outline-none placeholder:text-gray-400/60 shadow-xs"
                        />
                        <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Name Input */}
                  <div>
                    <label className="block text-[9px] font-bold text-luxury-black uppercase tracking-[0.15em] mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full rounded-xl border border-gold-300/40 bg-white pl-10 pr-4 py-3 text-xs tracking-wide transition-all focus:border-gold-500 focus:bg-gold-50/10 focus:ring-4 focus:ring-gold-500/5 outline-none placeholder:text-gray-400/60 shadow-xs"
                      />
                      <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Mobile Input */}
                  <div>
                    <label className="block text-[9px] font-bold text-luxury-black uppercase tracking-[0.15em] mb-1.5">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full rounded-xl border border-gold-300/40 bg-white pl-10 pr-4 py-3 text-xs tracking-wide transition-all focus:border-gold-500 focus:bg-gold-50/10 focus:ring-4 focus:ring-gold-500/5 outline-none placeholder:text-gray-400/60 shadow-xs"
                      />
                      <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  <div className="flex items-start gap-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      required
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="rounded border-gold-300/45 text-gold-500 focus:ring-gold-500 mt-0.5 cursor-pointer"
                    />
                    <label htmlFor="agreeTerms" className="text-[11px] text-text-secondary font-light leading-relaxed select-none cursor-pointer">
                      I agree to the{" "}
                      <Link to="/terms-conditions" target="_blank" className="font-semibold text-gold-700 hover:text-gold-800 underline">
                        Terms & Conditions
                      </Link>{" "}
                      and website usage policies of Niyora Gifts.
                    </label>
                  </div>
                </div>

                <div className="flex gap-3.5 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError("");
                    }}
                    className="flex-1 rounded-full border border-gold-300/50 bg-white px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-luxury-black transition hover:bg-gold-50/50 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-2 rounded-full bg-luxury-black hover:bg-[#D4AF37] px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg cursor-pointer transition duration-300 border border-[#D4AF37]/35 hover:border-transparent active:scale-95 flex items-center justify-center"
                  >
                    {loading ? "Sending OTP..." : "Get OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* ==================== VIEW 3: OTP VERIFICATION ==================== */}
            {step === "verify" && (
              <form onSubmit={handleVerifySubmit} className="space-y-6 animate-fade-slide" onPaste={handleOtpPaste}>
                <div className="text-center">
                  <h3 className="text-xl font-serif font-medium tracking-wide text-luxury-black">Verify Email</h3>
                  <p className="text-xs text-text-secondary mt-1.5 font-light leading-relaxed">
                    We sent a 6-digit secure code to
                    <br />
                    <span className="font-semibold text-luxury-black">{email}</span>
                  </p>
                </div>

                {/* 6 Digit Inputs */}
                <div className="flex justify-center items-center gap-2.5 py-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      value={digit}
                      ref={(el) => (otpInputsRef.current[index] = el)}
                      onChange={(e) => handleOtpChange(e.target, index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      className="w-10 h-12 sm:w-11 sm:h-12 text-center text-lg font-serif font-semibold border rounded-xl border-gold-300/40 bg-white shadow-xs focus:border-gold-500 focus:bg-gold-50/10 focus:ring-4 focus:ring-gold-500/5 outline-none transition duration-300"
                    />
                  ))}
                </div>

                {success && (
                  <p className="text-xs text-gold-700 bg-gold-50/60 border border-gold-250 px-3 py-2 rounded-xl text-center font-medium animate-fade-slide">
                    {success}
                  </p>
                )}

                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={loading || otp.join("").length !== 6}
                    className="w-full rounded-full bg-luxury-black hover:bg-[#D4AF37] py-3.5 text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg cursor-pointer transition duration-300 border border-[#D4AF37]/35 hover:border-transparent active:scale-95 flex items-center justify-center"
                  >
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </button>

                  <div className="text-center pt-2">
                    {resendTimer > 0 ? (
                      <p className="text-xs text-text-secondary font-light">
                        Resend code in <span className="font-semibold text-luxury-black">{resendTimer}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-xs font-bold uppercase tracking-widest text-gold-700 hover:text-gold-800 transition cursor-pointer bg-transparent border-0"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-center border-t border-gold-300/10 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(name ? "register" : "email");
                      setError("");
                      setSuccess("");
                      setOtp(new Array(6).fill(""));
                    }}
                    className="text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-luxury-black transition cursor-pointer bg-transparent border-0"
                  >
                    Change Email / Restart
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </section>
    </div>
  );
};

export default UserAuth;
