const Newsletter = require("../models/Newsletter");

// @desc    Subscribe an email to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
const subscribeEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Basic email format check
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    // Check if email already exists
    const existingSub = await Newsletter.findOne({ email });
    if (existingSub) {
      return res.status(409).json({ message: "This email is already subscribed!" });
    }

    // Create subscription
    await Newsletter.create({ email });

    return res.status(201).json({
      success: true,
      message: "Thank you for subscribing to our newsletter!",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error.message);
    
    // Handle duplicate key error (just in case of race condition)
    if (error.code === 11000) {
      return res.status(409).json({ message: "This email is already subscribed!" });
    }

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    return res.status(500).json({ message: "Subscription failed. Please try again later." });
  }
};

// @desc    Get all subscribers
// @route   GET /api/admin/newsletter/subscribers
// @access  Private/Admin
const getNewsletterSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find({}).sort({ createdAt: -1 });
    return res.status(200).json(subscribers);
  } catch (error) {
    console.error("Get subscribers error:", error.message);
    return res.status(500).json({ message: "Failed to fetch subscribers" });
  }
};

// @desc    Delete a subscriber
// @route   DELETE /api/admin/newsletter/subscribers/:id
// @access  Private/Admin
const deleteNewsletterSubscriber = async (req, res) => {
  try {
    const subscriber = await Newsletter.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber not found" });
    }
    await subscriber.deleteOne();
    return res.status(200).json({ message: "Subscriber removed successfully" });
  } catch (error) {
    console.error("Delete subscriber error:", error.message);
    return res.status(500).json({ message: "Failed to delete subscriber" });
  }
};

module.exports = {
  subscribeEmail,
  getNewsletterSubscribers,
  deleteNewsletterSubscriber,
};

