const express = require("express");
const { checkEmail, registerSendOtp, verifyOtp } = require("../controllers/authController");

const router = express.Router();

router.post("/check-email", checkEmail);
router.post("/register-send-otp", registerSendOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
