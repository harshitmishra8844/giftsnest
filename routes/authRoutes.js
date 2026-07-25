const express = require("express");
const { checkEmail, registerSendOtp, verifyOtp, googleLogin } = require("../controllers/authController");
const {
  validateBody,
  checkEmailSchema,
  registerSendOtpSchema,
  verifyOtpSchema,
  googleLoginSchema,
} = require("../middleware/validationMiddleware");

const router = express.Router();

router.post("/check-email", validateBody(checkEmailSchema), checkEmail);
router.post("/register-send-otp", validateBody(registerSendOtpSchema), registerSendOtp);
router.post("/verify-otp", validateBody(verifyOtpSchema), verifyOtp);
router.post("/google-login", validateBody(googleLoginSchema), googleLogin);

module.exports = router;
