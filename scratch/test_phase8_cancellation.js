const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const RefundRecord = require("../models/RefundRecord");
const StoreCreditAccount = require("../models/StoreCreditAccount");
const StoreCreditTransaction = require("../models/StoreCreditTransaction");
const storeCreditService = require("../services/storeCreditService");
const orderController = require("../controllers/orderController");

const createMockReq = (user, body = {}, params = {}) => ({
  user,
  body,
  params,
  query: {},
  headers: { "user-agent": "Automated Phase 8 Test Runner" },
  ip: "127.0.0.1",
});

const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
};

async function runPhase8Validation() {
  console.log("=== PHASE 8: ORDER CANCELLATION INTEGRATION TEST ===");
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/niyora";
  await mongoose.connect(mongoURI);
  console.log("MongoDB connected successfully");

  const customer = await User.create({
    name: "Cancellation Test Customer",
    email: `cancel_cust_${Date.now()}@example.com`,
    password: "Password123!",
    mobileNumber: "9876543211",
  });

  const product = await Product.create({
    name: "Customized Wooden Photo Frame",
    price: 600,
    stock: 15,
    description: "Personalized engraved frame",
    category: "Decor",
    image: "https://example.com/frame.jpg",
  });

  try {
    // 1. Give customer ₹600 Store Credit
    await storeCreditService.addCredit({
      userId: customer._id,
      amount: 600,
      referenceType: "REFUND",
      referenceId: "SEED-CREDIT",
    });

    // 2. Place 100% Store Credit order (₹600)
    const orderReq = createMockReq(customer, {
      products: [{ productId: product._id, name: product.name, price: 600, quantity: 1 }],
      address: { fullName: customer.name, phone: customer.mobileNumber, line1: "123 Main St", city: "Delhi", state: "Delhi", postalCode: "110001", country: "India" },
      useStoreCredit: true,
      paymentMethod: "Store Credit",
    });
    const orderRes = createMockRes();
    await orderController.createOrder(orderReq, orderRes);

    const order = orderRes.data.order;
    console.log("Created Paid Order:", order.orderCode, "Status:", order.status);

    let balanceInfo = await storeCreditService.getAccountBalance(customer._id);
    console.log("Balance after purchase:", balanceInfo.balance, "(Expected: 0)");
    if (balanceInfo.balance !== 0) throw new Error("Balance should be 0 after purchase");

    let prod = await Product.findById(product._id);
    console.log("Stock after purchase:", prod.stock, "(Expected: 14)");
    if (prod.stock !== 14) throw new Error("Stock should be 14");

    // TEST A: Customer cancels eligible order before processing
    console.log("\nTesting Eligible Pre-Processing Cancellation...");
    const cancelReq = createMockReq(customer, { reason: "Found another product" }, { id: order._id });
    const cancelRes = createMockRes();
    await orderController.customerCancelOrder(cancelReq, cancelRes);

    if (cancelRes.statusCode !== 200) throw new Error("Customer cancellation failed: " + JSON.stringify(cancelRes.data));
    console.log("Cancellation Response Message:", cancelRes.data.message);

    const cancelledOrder = await Order.findById(order._id);
    console.log("Order Status after cancellation:", cancelledOrder.status, "CancelledBy:", cancelledOrder.cancelledBy);
    if (cancelledOrder.status !== "CUSTOMER_CANCELLED" || cancelledOrder.cancelledBy !== "CUSTOMER") {
      throw new Error("Order status must be CUSTOMER_CANCELLED and cancelledBy CUSTOMER!");
    }

    // Verify stock restored
    prod = await Product.findById(product._id);
    console.log("Stock after cancellation:", prod.stock, "(Expected: 15)");
    if (prod.stock !== 15) throw new Error("Stock should be restored to 15!");

    // Verify store credit was restored
    balanceInfo = await storeCreditService.getAccountBalance(customer._id);
    console.log("Balance after cancellation:", balanceInfo.balance, "(Expected: 600)");
    if (balanceInfo.balance !== 600) throw new Error("Store credit balance should be restored to 600!");

    // TEST B: Customer attempts to cancel order when status is 'Processing'
    console.log("\nTesting Ineligible Cancellation when Order is 'Processing'...");
    // Create a new order and advance it to 'Processing'
    const order2 = await Order.create({
      orderCode: `ORD-PROC-${Date.now()}`,
      userId: customer._id,
      email: customer.email,
      products: [{ productId: product._id, name: product.name, price: 600, quantity: 1 }],
      totalPrice: 600,
      paymentMethod: "COD",
      paymentStatus: "Pending",
      status: "Processing",
      orderStatus: "PROCESSING",
      address: { fullName: customer.name, phone: customer.mobileNumber, line1: "123 Main St", city: "Delhi", state: "Delhi", postalCode: "110001", country: "India" },
    });

    const cancelProcReq = createMockReq(customer, { reason: "Changed mind" }, { id: order2._id });
    const cancelProcRes = createMockRes();
    await orderController.customerCancelOrder(cancelProcReq, cancelProcRes);

    console.log("Cancellation in 'Processing' status response code:", cancelProcRes.statusCode);
    if (cancelProcRes.statusCode !== 400) {
      throw new Error("Cancellation must be blocked when status is Processing!");
    }
    console.log("Blocked with message:", cancelProcRes.data.message);

    const order2Check = await Order.findById(order2._id);
    if (order2Check.status !== "Processing") {
      throw new Error("Order status must remain Processing!");
    }

    console.log("✅ Phase 8 (Order Cancellation Integration) Passed 100%!");
  } finally {
    // Cleanup
    await Order.deleteMany({ userId: customer._id });
    await StoreCreditAccount.deleteMany({ userId: customer._id });
    await StoreCreditTransaction.deleteMany({ userId: customer._id });
    await Product.deleteOne({ _id: product._id });
    await User.deleteOne({ _id: customer._id });
    await mongoose.connection.close();
  }
}

runPhase8Validation().catch((err) => {
  console.error("❌ Phase 8 Validation Failed:", err);
  process.exit(1);
});
