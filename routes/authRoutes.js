const express = require("express");
const { checkEmail, registerSendOtp, verifyOtp, googleLogin } = require("../controllers/authController");

const router = express.Router();

router.post("/check-email", checkEmail);
router.post("/register-send-otp", registerSendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/google-login", googleLogin);

module.exports = router;
