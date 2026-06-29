import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const AuthModal = () => {
  const { isModalOpen, closeLoginModal, login } = useAuth();
  const [step, setStep] = useState("email"); // email, register, verify
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  
  // OTP input state
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const otpInputsRef = useRef([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

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

  if (!isModalOpen) return null;

  const handleClose = () => {
    // Reset form states on close
    setStep("email");
    setEmail("");
    setName("");
    setMobileNumber("");
    setOtp(new Array(6).fill(""));
    setError("");
    setSuccess("");
    closeLoginModal();
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
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobileNumber || !email) return;

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
        handleClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.");
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
        // Resend register OTP
        await api.post("/register-send-otp", { name, email, mobileNumber });
      } else {
        // Resend standard login OTP
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

    // Auto-focus next field if a digit is typed
    if (cleanValue !== "" && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      // If current field is empty, clear and focus previous field
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
      
      // Focus appropriate input box
      const nextFocusIndex = Math.min(pasteData.length, 5);
      otpInputsRef.current[nextFocusIndex]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        onClick={handleClose}
        className="fixed inset-0 bg-luxury-black/60 backdrop-blur-md animate-fade-in-backdrop"
      />

      {/* Modal Card */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-md rounded-3xl border border-gold-300/35 p-7 md:p-9 shadow-[0_20px_60px_rgba(212,175,55,0.15)] relative overflow-hidden animate-slide-up bg-gradient-to-b from-white to-[#FAF7F2] z-10"
      >
        {/* Top Gold Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-gold-350 via-gold-500 to-gold-300" />

        {/* Background ambient lights */}
        <div className="absolute -right-24 -top-24 w-48 h-48 bg-gold-400/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-gold-500/8 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 rounded-full bg-stone-100 hover:bg-gold-100/50 p-2 text-luxury-black/60 hover:text-gold-700 transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 shadow-xs border border-transparent hover:border-gold-300/30"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-gold-600 to-gold-400 p-[1.5px] shadow-md animate-float-subtle">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-luxury-black text-gold-300 text-base font-serif font-bold">
              N
            </div>
          </div>
          <h2 className="text-2xl font-serif font-light uppercase tracking-widest text-luxury-black mt-3.5">Niyora Gifts</h2>
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-gold-600 mt-1">Curated Gifting</p>
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-gold-400/50 to-transparent mx-auto mt-4" />
        </div>

        {/* Step 1: Email Form */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-5 animate-fade-in">
            <div className="text-center mb-4">
              <h3 className="text-xl font-serif font-medium tracking-wide text-luxury-black">Welcome Back</h3>
              <p className="text-xs text-text-secondary mt-1.5 font-light leading-relaxed">Enter your email address to log in or create a secure account.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gold-700 uppercase tracking-[0.2em] mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. customer@example.com"
                className="w-full rounded-full border border-gold-300/40 bg-white/80 px-6 py-3.5 text-xs tracking-wide transition-all duration-300 focus:border-gold-500 focus:bg-white focus:ring-4 focus:ring-gold-500/10 outline-none placeholder:text-gray-400/50 shadow-xs"
              />
            </div>

            {error && <p className="text-xs text-red-650 font-medium text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gold-500 hover:bg-gold-600 px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-98"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : "Proceed"}
            </button>
          </form>
        )}

        {/* Step 2: Register Form */}
        {step === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-5 animate-fade-in">
            <div className="text-center mb-4">
              <h3 className="text-xl font-serif font-medium tracking-wide text-luxury-black">Create Account</h3>
              <p className="text-xs text-text-secondary mt-1.5 font-light leading-relaxed">
                Email <span className="font-semibold text-luxury-black">{email}</span> is not registered yet. Please enter registration details.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gold-700 uppercase tracking-[0.2em] mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-full border border-gold-300/40 bg-white/80 px-6 py-3.5 text-xs tracking-wide transition-all duration-300 focus:border-gold-500 focus:bg-white focus:ring-4 focus:ring-gold-500/10 outline-none placeholder:text-gray-400/50 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gold-700 uppercase tracking-[0.2em] mb-2">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-full border border-gold-300/40 bg-white/80 px-6 py-3.5 text-xs tracking-wide transition-all duration-300 focus:border-gold-500 focus:bg-white focus:ring-4 focus:ring-gold-500/10 outline-none placeholder:text-gray-400/50 shadow-xs"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-650 font-medium text-center">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("email")}
                className="flex-1 rounded-full border border-gold-300 bg-transparent px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-luxury-black transition hover:bg-gold-50/50 cursor-pointer active:scale-98"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 rounded-full bg-gold-500 hover:bg-gold-600 px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg cursor-pointer transition duration-300 hover:-translate-y-0.5 active:scale-98"
              >
                {loading ? "Sending OTP..." : "Register"}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Verification (OTP) Form */}
        {step === "verify" && (
          <form onSubmit={handleVerifySubmit} className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h3 className="text-xl font-serif font-medium tracking-wide text-luxury-black">Verify Your Email</h3>
              <p className="text-xs text-text-secondary mt-1.5 font-light leading-relaxed">
                We sent a 6-digit verification code to
                <br />
                <span className="font-semibold text-luxury-black">{email}</span>.
              </p>
            </div>

            {/* OTP input container */}
            <div className="flex justify-center items-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={digit}
                  ref={(el) => (otpInputsRef.current[index] = el)}
                  onChange={(e) => handleOtpChange(e.target, index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  className="w-11 h-12 text-center text-lg font-serif font-semibold border rounded-xl border-gold-300/40 bg-white shadow-xs focus:border-gold-500 focus:bg-gold-50/10 focus:ring-4 focus:ring-gold-500/10 outline-none transition-all duration-300"
                />
              ))}
            </div>

            {success && <p className="text-xs text-gold-800 bg-gold-50/80 border border-gold-200/30 px-3.5 py-2.5 rounded-2xl text-center font-medium">{success}</p>}
            {error && <p className="text-xs text-red-650 text-center font-medium">{error}</p>}

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading || otp.join("").length !== 6}
                className="w-full rounded-full bg-gold-500 hover:bg-gold-600 px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition duration-300 active:scale-98"
              >
                {loading ? "Verifying..." : "Verify & Log In"}
              </button>

              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-xs text-text-secondary font-light">
                    Resend code in <span className="font-semibold text-luxury-black">{resendTimer}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-xs font-bold uppercase tracking-widest text-gold-700 hover:text-gold-900 transition-colors cursor-pointer bg-transparent border-0"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>

            <div className="text-center border-t border-gold-200/20 pt-4">
              <button
                type="button"
                onClick={() => {
                  setStep(name ? "register" : "email");
                  setError("");
                  setSuccess("");
                  setOtp(new Array(6).fill(""));
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-gold-700 hover:text-luxury-black transition-colors cursor-pointer bg-transparent border-0"
              >
                Change Email / Restart
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
