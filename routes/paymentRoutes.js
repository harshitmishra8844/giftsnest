const express = require("express");
const {
  createPaymentOrder,
  verifyPayment,
  completeDemoPayment,
  recordPaymentFailure,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-order", createPaymentOrder);
router.post("/verify", verifyPayment);
router.post("/demo-complete", completeDemoPayment);
router.post("/record-failure", recordPaymentFailure);
router.post("/failure", recordPaymentFailure);

module.exports = router;
