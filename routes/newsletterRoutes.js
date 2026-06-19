const express = require("express");
const { subscribeEmail } = require("../controllers/newsletterController");

const router = express.Router();

router.post("/subscribe", subscribeEmail);

module.exports = router;
