const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const { getStoreInfo } = require("./controllers/adminController");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();


// ✅ CORRECT CORS (SAFE + FLEXIBLE)
const allowedOrigins = [
  "https://giftsnest.vercel.app",
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked"));
    }
  },
  credentials: true,
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get("/", (req, res) => {
  res.json({ message: "Gift store API is running" });
});

// ✅ ROUTES (ADMIN LOGIN SAFE)
app.use("/api/products", productRoutes);
app.use("/api", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.get("/api/store-info", getStoreInfo);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);   // 👈 admin login here
app.use("/api/user", userRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();