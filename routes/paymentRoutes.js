const express = require("express");
const { createPaymentOrder, verifyPayment, completeDemoPayment } = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-order", createPaymentOrder);
router.post("/verify", verifyPayment);
router.post("/demo-complete", completeDemoPayment);

module.exports = router;
