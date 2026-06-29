import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const UserAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, login } = useAuth();
  
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

  // If user is already logged in, redirect them
  useEffect(() => {
    if (auth?.token) {
      const redirectTo = location.state?.redirectTo || "/my-profile";
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
        const redirectTo = location.state?.redirectTo || "/my-profile";
        navigate(redirectTo, { replace: true });
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
    <section 
      className="mx-auto max-w-md rounded-3xl border border-gold-300/35 p-7 md:p-9 shadow-[0_20px_50px_rgba(212,175,55,0.06)] relative overflow-hidden animate-fade-in"
      style={{ backgroundColor: "#FDFCF9" }}
    >
      {/* Top Gold Accent Bar */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300" />

      {/* Ambient backgrounds */}
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-gold-400/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold-600 to-gold-400 text-base font-serif font-bold text-white shadow-md">
          N
        </span>
        <h2 className="text-2xl font-serif font-light uppercase tracking-wider text-luxury-black mt-3">Niyora Gifts</h2>
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gold-600">Curated Gifting</p>
        <div className="w-12 h-[1px] bg-gold-300/40 mx-auto mt-4" />
      </div>

      {/* Step 1: Email Form */}
      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-5">
          <div className="text-center mb-4">
            <h3 className="text-xl font-serif font-medium tracking-wide text-luxury-black">Welcome Back</h3>
            <p className="text-xs text-text-secondary mt-1.5 font-light leading-relaxed">Access your profile, orders and tracking updates.</p>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-luxury-black uppercase tracking-[0.15em] mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@example.com"
              className="w-full rounded-xl border border-gold-300/40 bg-white px-5 py-3 text-xs tracking-wide transition-all focus:border-gold-500 focus:bg-gold-50/10 focus:ring-4 focus:ring-gold-500/5 outline-none placeholder:text-gray-400/60 shadow-xs"
            />
          </div>

          {error && <p className="text-xs text-red-650 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-luxury-black hover:bg-[#D4AF37] px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:text-white transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer border border-[#D4AF37]/35 hover:border-transparent active:scale-98"
          >
            {loading ? "Please wait..." : "Proceed"}
          </button>
        </form>
      )}

      {/* Step 2: Register Form */}
      {step === "register" && (
        <form onSubmit={handleRegisterSubmit} className="space-y-5">
          <div className="text-center mb-4">
            <h3 className="text-xl font-serif font-medium tracking-wide text-luxury-black">Create Account</h3>
            <p className="text-xs text-text-secondary mt-1.5 font-light leading-relaxed">
              Email <span className="font-semibold text-luxury-black">{email}</span> is not registered yet. Please enter registration details.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-luxury-black uppercase tracking-[0.15em] mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full rounded-xl border border-gold-300/40 bg-white px-5 py-3 text-xs tracking-wide transition-all focus:border-gold-500 focus:bg-gold-50/10 focus:ring-4 focus:ring-gold-500/5 outline-none placeholder:text-gray-400/60 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-luxury-black uppercase tracking-[0.15em] mb-1.5">Mobile Number</label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full rounded-xl border border-gold-300/40 bg-white px-5 py-3 text-xs tracking-wide transition-all focus:border-gold-500 focus:bg-gold-50/10 focus:ring-4 focus:ring-gold-500/5 outline-none placeholder:text-gray-400/60 shadow-xs"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-650 font-medium">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("email")}
              className="flex-1 rounded-full border border-gold-300/50 bg-white px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-luxury-black transition hover:bg-gold-50/50 cursor-pointer active:scale-98"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 rounded-full bg-luxury-black hover:bg-[#D4AF37] px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg cursor-pointer transition duration-300 border border-[#D4AF37]/35 hover:border-transparent active:scale-98"
            >
              {loading ? "Sending OTP..." : "Register"}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Verification (OTP) Form */}
      {step === "verify" && (
        <form onSubmit={handleVerifySubmit} className="space-y-6" onPaste={handleOtpPaste}>
          <div className="text-center">
            <h3 className="text-xl font-serif font-medium tracking-wide text-luxury-black">Verify Your Email</h3>
            <p className="text-xs text-text-secondary mt-1.5 font-light leading-relaxed">
              We sent a 6-digit verification code to
              <br />
              <span className="font-semibold text-luxury-black">{email}</span>.
            </p>
          </div>

          <div className="flex justify-center items-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={digit}
                ref={(el) => (otpInputsRef.current[index] = el)}
                onChange={(e) => handleOtpChange(e.target, index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(e, index)}
                className="w-11 h-12 text-center text-lg font-serif font-semibold border rounded-xl border-gold-300/40 bg-white shadow-xs focus:border-gold-500 focus:bg-gold-50/10 focus:ring-4 focus:ring-gold-500/5 outline-none transition duration-350"
              />
            ))}
          </div>

          {success && <p className="text-xs text-gold-700 bg-gold-50/50 border border-gold-200/20 px-3 py-2 rounded-xl text-center font-medium">{success}</p>}
          {error && <p className="text-xs text-red-650 text-center font-medium">{error}</p>}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6}
              className="w-full rounded-full bg-luxury-black hover:bg-[#D4AF37] px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg cursor-pointer transition duration-300 border border-[#D4AF37]/35 hover:border-transparent active:scale-98"
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
                  className="text-xs font-bold uppercase tracking-widest text-gold-700 hover:text-gold-800 transition cursor-pointer bg-transparent border-0"
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>

          <div className="text-center">
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
    </section>
  );
};

export default UserAuth;
