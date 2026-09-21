const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const ReturnRequest = require("../models/ReturnRequest");
const ReplacementOrder = require("../models/ReplacementOrder");
const RefundRecord = require("../models/RefundRecord");
const ReturnActivityLog = require("../models/ReturnActivityLog");
const ReturnSetting = require("../models/ReturnSetting");
const Notification = require("../models/Notification");
const returnController = require("../controllers/returnController");
const inventoryService = require("../services/inventoryService");

// Helper to mock Express req and res
function mockReqRes(reqData = {}, user = null) {
  const req = {
    body: reqData.body || {},
    params: reqData.params || {},
    query: reqData.query || {},
    user: user || reqData.user || null,
  };
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
    send(payload) {
      this.data = payload;
      return this;
    },
  };
  return { req, res };
}

async function runSystemTests() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/niyora-gifts";
  console.log("==================================================");
  console.log("RUNNING AUTOMATED TEST SUITE: RETURN & REPLACEMENT SYSTEM");
  console.log("==================================================");
  await mongoose.connect(mongoUri);
  console.log("Connected to database:", mongoose.connection.name);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 0. Ensure Settings
    await ReturnSetting.findOneAndUpdate(
      { singletonKey: "settings" },
      { returnWindowDays: 7, replacementWindowDays: 7, allowPersonalizedExceptions: true, enabled: true },
      { upsert: true }
    );

    // Create Test Customer & Admin
    const customer = await User.findOneAndUpdate(
      { email: "testcustomer_returns@niyora.com" },
      { name: "Test Customer", email: "testcustomer_returns@niyora.com", password: "Password123!", role: "user" },
      { upsert: true, new: true }
    );

    const admin = await User.findOneAndUpdate(
      { email: "testadmin_returns@niyora.com" },
      { name: "Concierge Admin", email: "testadmin_returns@niyora.com", password: "Password123!", role: "admin", isAdmin: true, isMasterAdmin: true },
      { upsert: true, new: true, returnDocument: "after" }
    );

    // Create Standard Product & Personalized Product
    const normalProduct = await Product.create({
      name: "Luxury Silk Box Test",
      description: "Test product for returns",
      price: 1500,
      stock: 20,
      image: "https://example.com/box.jpg",
      category: "Luxury Boxes",
      isNonReturnable: false,
      isPersonalized: false,
    });

    const personalizedProduct = await Product.create({
      name: "Custom Engraved Crystal Frame Test",
      description: "Personalized frame",
      price: 2500,
      stock: 15,
      image: "https://example.com/crystal.jpg",
      category: "Personalized",
      isNonReturnable: true,
      isPersonalized: true,
    });

    const defaultAddress = {
      fullName: "Test Customer",
      phone: "9876543210",
      line1: "123 Luxury Road",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
      country: "India",
    };

    console.log("\n--- TEST GROUP 1: ELIGIBILITY & POLICIES ---");

    // Test 1.1: Non-delivered order cannot be returned
    const pendingOrder = await Order.create({
      userId: customer._id,
      products: [{ productId: normalProduct._id, name: normalProduct.name, price: normalProduct.price, quantity: 1 }],
      totalPrice: 1500,
      status: "Processing",
      paymentMethod: "Online",
      paymentStatus: "Paid",
      address: defaultAddress,
    });

    const { req: req1, res: res1 } = mockReqRes({
      body: {
        orderId: pendingOrder._id,
        productId: normalProduct._id,
        returnReason: "Damaged Product",
      }
    }, customer);

    await returnController.submitReturnRequest(req1, res1);
    assert(res1.statusCode === 400 && res1.data.message.includes("Delivered"), "Non-delivered orders cannot be returned");

    // Test 1.2: Order delivered outside 7-day window
    const oldDeliveredDate = new Date();
    oldDeliveredDate.setDate(oldDeliveredDate.getDate() - 10); // 10 days ago

    const expiredOrder = await Order.create({
      userId: customer._id,
      products: [{ productId: normalProduct._id, name: normalProduct.name, price: normalProduct.price, quantity: 1 }],
      totalPrice: 1500,
      status: "Delivered",
      deliveredAt: oldDeliveredDate,
      updatedAt: oldDeliveredDate,
      paymentMethod: "Online",
      paymentStatus: "Paid",
      address: defaultAddress,
    });

    const { req: req2, res: res2 } = mockReqRes({
      body: {
        orderId: expiredOrder._id,
        productId: normalProduct._id,
        returnReason: "Defective Product",
      }
    }, customer);

    await returnController.submitReturnRequest(req2, res2);
    assert(res2.statusCode === 400 && res2.data.message.includes("window has expired"), "Orders older than return window (7 days) are rejected");

    // Test 1.3: Personalized product with standard reason rejected
    const freshDelivery = new Date();
    const deliveredOrder = await Order.create({
      userId: customer._id,
      products: [
        { productId: normalProduct._id, name: normalProduct.name, price: normalProduct.price, quantity: 1 },
        { productId: personalizedProduct._id, name: personalizedProduct.name, price: personalizedProduct.price, quantity: 1 },
      ],
      totalPrice: 4000,
      status: "Delivered",
      deliveredAt: freshDelivery,
      updatedAt: freshDelivery,
      paymentMethod: "Online",
      paymentStatus: "Paid",
      address: defaultAddress,
    });

    const { req: req3, res: res3 } = mockReqRes({
      body: {
        orderId: deliveredOrder._id,
        productId: personalizedProduct._id,
        returnReason: "Other", // Non-exception reason
        customerMessage: "Changed my mind",
      }
    }, customer);

    await returnController.submitReturnRequest(req3, res3);
    assert(res3.statusCode === 400 && res3.data.message.includes("non-returnable"), "Personalized product with subjective reason (Other/Changed mind) rejected");

    // Test 1.4: Personalized product with Damaged Product exception allowed
    const { req: req4, res: res4 } = mockReqRes({
      body: {
        orderId: deliveredOrder._id,
        productId: personalizedProduct._id,
        returnReason: "Damaged Product", // Valid Exception
        customerMessage: "Crystal frame glass was cracked upon arrival",
        requestType: "Replacement",
      }
    }, customer);

    await returnController.submitReturnRequest(req4, res4);
    assert(res4.statusCode === 201 && res4.data.success, "Personalized product with Damaged Product exception is accepted");
    const repRequest = res4.data.returnRequest;
    assert(repRequest && repRequest.requestId.startsWith("REP-2026-"), "Generates valid REP-2026-XXXXXX request ID for replacement");

    // Test 1.5: Duplicate return request prevention
    const { req: req5, res: res5 } = mockReqRes({
      body: {
        orderId: deliveredOrder._id,
        productId: personalizedProduct._id,
        returnReason: "Damaged Product",
      }
    }, customer);

    await returnController.submitReturnRequest(req5, res5);
    assert(res5.statusCode === 400 && res5.data.message.includes("already exists"), "Duplicate active claim for the same product is prevented");

    console.log("\n--- TEST GROUP 2: STANDARD RETURN 10-STATUS LIFECYCLE & INVENTORY ---");

    // Create a fresh return for normal product
    const { req: req6, res: res6 } = mockReqRes({
      body: {
        orderId: deliveredOrder._id,
        productId: normalProduct._id,
        returnReason: "Defective Product",
        requestType: "Return",
        customerMessage: "Defective stitching on the box",
      }
    }, customer);

    await returnController.submitReturnRequest(req6, res6);
    assert(res6.statusCode === 201 && res6.data.returnRequest.requestId.startsWith("RET-2026-"), "Generates valid RET-2026-XXXXXX request ID for return");
    const returnReq = res6.data.returnRequest;

    // 2.1: Admin moves to Under Review
    const { req: reqReview, res: resReview } = mockReqRes({
      body: {
        requestId: returnReq._id,
        status: "Under Review",
        adminRemarks: "Reviewing unboxing details",
      }
    }, admin);
    await returnController.adminUpdateRequestStatus(reqReview, resReview);
    assert(resReview.statusCode === 200 && resReview.data.returnRequest.status === "Under Review", "Transitioned to 'Under Review'");

    // 2.2: Admin Approves
    const { req: reqApprove, res: resApprove } = mockReqRes({
      body: {
        requestId: returnReq._id,
        status: "Approved",
        adminRemarks: "Claim verified and approved for pickup",
      }
    }, admin);
    await returnController.adminUpdateRequestStatus(reqApprove, resApprove);
    assert(resApprove.statusCode === 200 && resApprove.data.returnRequest.status === "Approved", "Transitioned to 'Approved'");

    // 2.3: Admin schedules Reverse Pickup
    const { req: reqPickup, res: resPickup } = mockReqRes({
      body: {
        requestId: returnReq._id,
        courier: "Delhivery",
        trackingId: "DL987654321IN",
        pickupDate: new Date(),
        adminRemarks: "Delhivery pickup scheduled",
      }
    }, admin);
    await returnController.adminSchedulePickup(reqPickup, resPickup);
    assert(resPickup.statusCode === 200 && resPickup.data.returnRequest.status === "Pickup Scheduled", "Pickup scheduled and status set to 'Pickup Scheduled'");

    // 2.4: Admin verifies physically & restocks (Idempotency test)
    const stockBefore = (await Product.findById(normalProduct._id)).stock;
    const { req: reqVerify, res: resVerify } = mockReqRes({
      body: {
        requestId: returnReq._id,
        restockProduct: true,
        conditionNotes: "Box restored and verified undamaged",
      }
    }, admin);
    await returnController.adminVerifyAndRestock(reqVerify, resVerify);
    const stockAfterFirst = (await Product.findById(normalProduct._id)).stock;
    assert(resVerify.statusCode === 200 && stockAfterFirst === stockBefore + 1, "Restocked returned item: stock incremented by 1 after physical verification");

    // Second verification call (idempotency check)
    await returnController.adminVerifyAndRestock(reqVerify, resVerify);
    const stockAfterSecond = (await Product.findById(normalProduct._id)).stock;
    assert(stockAfterSecond === stockAfterFirst, "Restock idempotency: duplicate verification does NOT add stock again");

    // 2.5: Admin processes Refund
    const { req: reqRefund, res: resRefund } = mockReqRes({
      body: {
        requestId: returnReq._id,
        refundAmount: 1500,
        refundMethod: "UPI",
        transactionReference: "UPI9988776655",
        remarks: "Refund initiated via UPI",
      }
    }, admin);
    await returnController.adminProcessRefund(reqRefund, resRefund);
    assert(resRefund.statusCode === 200 && resRefund.data.returnRequest.status === "Refund Completed", "Refund processed: status transitioned to 'Refund Completed'");

    // Verify RefundRecord in DB
    const refundRec = await RefundRecord.findOne({ requestId: returnReq._id });
    assert(refundRec && refundRec.refundAmount === 1500 && refundRec.refundId.startsWith("REF-2026-"), "RefundRecord created with unique REF-2026-XXXXXX code");

    // Prevent duplicate refund
    const { req: reqRefundDup, res: resRefundDup } = mockReqRes({
      body: {
        requestId: returnReq._id,
        refundAmount: 1500,
      }
    }, admin);
    await returnController.adminProcessRefund(reqRefundDup, resRefundDup);
    assert(resRefundDup.statusCode === 400 && resRefundDup.data.message.includes("already been processed"), "Duplicate refund processing is prevented");

    console.log("\n--- TEST GROUP 3: REPLACEMENT LIFECYCLE & INVENTORY RESERVATION ---");

    // 3.1: Approve replacement request
    const { req: reqApproveRep, res: resApproveRep } = mockReqRes({
      body: {
        requestId: repRequest._id,
        status: "Approved",
        adminRemarks: "Approved for crystal frame replacement",
      }
    }, admin);
    await returnController.adminUpdateRequestStatus(reqApproveRep, resApproveRep);

    // 3.2: Schedule pickup for replacement item
    const { req: reqPickupRep, res: resPickupRep } = mockReqRes({
      body: {
        requestId: repRequest._id,
        courier: "Bluedart",
        trackingId: "BD554433221IN",
        pickupDate: new Date(),
      }
    }, admin);
    await returnController.adminSchedulePickup(reqPickupRep, resPickupRep);

    // 3.3: Mark received
    const { req: reqVerifyRep, res: resVerifyRep } = mockReqRes({
      body: {
        requestId: repRequest._id,
        restockProduct: false, // Broken crystal is discarded, not restocked!
        conditionNotes: "Glass shattered, logged for insurance and discarded",
      }
    }, admin);
    await returnController.adminVerifyAndRestock(reqVerifyRep, resVerifyRep);
    assert(resVerifyRep.statusCode === 200 && resVerifyRep.data.returnRequest.status === "Item Received", "Replacement item received and inspected");

    // 3.4: Create replacement order & reserve stock
    const crystalStockBefore = (await Product.findById(personalizedProduct._id)).stock;
    const { req: reqCreateRepOrder, res: resCreateRepOrder } = mockReqRes({
      body: {
        requestId: repRequest._id,
        remarks: "Replacement crystal frame order generated",
      }
    }, admin);
    await returnController.adminCreateReplacementOrder(reqCreateRepOrder, resCreateRepOrder);
    const crystalStockAfter = (await Product.findById(personalizedProduct._id)).stock;
    assert(resCreateRepOrder.statusCode === 200 && crystalStockAfter === crystalStockBefore - 1, "Replacement order creation atomically reserved stock (-1)");

    const repOrderDoc = await ReplacementOrder.findOne({ requestId: repRequest._id });
    assert(repOrderDoc && repOrderDoc.replacementId.startsWith("REP-ORDER-2026-"), "ReplacementOrder document created with unique code");

    // 3.5: Dispatch replacement parcel
    const { req: reqDispatch, res: resDispatch } = mockReqRes({
      body: {
        requestId: repRequest._id,
        courier: "Delhivery",
        trackingId: "DL-FORWARD-112233",
        remarks: "Replacement parcel dispatched with secure bubblewrap",
      }
    }, admin);
    await returnController.adminDispatchReplacement(reqDispatch, resDispatch);
    assert(resDispatch.statusCode === 200 && resDispatch.data.returnRequest.status === "Replacement Shipped", "Replacement parcel dispatched and status set to 'Replacement Shipped'");

    console.log("\n--- TEST GROUP 4: AUDIT LOGGING & MULTI-CHANNEL NOTIFICATIONS ---");

    // Check ReturnActivityLog entries
    const returnLogs = await ReturnActivityLog.find({ requestId: returnReq._id }).sort({ timestamp: 1 });
    assert(returnLogs.length >= 4, `Activity audit logs created (${returnLogs.length} events logged for return claim)`);

    const repLogs = await ReturnActivityLog.find({ requestId: repRequest._id }).sort({ timestamp: 1 });
    assert(repLogs.length >= 4, `Activity audit logs created (${repLogs.length} events logged for replacement claim)`);

    // Check In-App Notifications
    const customerNotifications = await Notification.find({ $or: [{ userId: customer._id }, { recipient: customer._id }] });
    assert(customerNotifications.length >= 2, `Customer received real-time in-app notifications (${customerNotifications.length} notifications logged)`);

    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    // Clean up test data
    await Order.deleteMany({ userId: customer._id });
    await ReturnRequest.deleteMany({ customerId: customer._id });
    await ReplacementOrder.deleteMany({ originalOrderId: deliveredOrder._id });
    await RefundRecord.deleteMany({ requestId: { $in: [returnReq._id, repRequest._id] } });
    await ReturnActivityLog.deleteMany({ requestId: { $in: [returnReq._id, repRequest._id] } });
    await Notification.deleteMany({ $or: [{ userId: customer._id }, { recipient: customer._id }] });
    await Product.deleteMany({ _id: { $in: [normalProduct._id, personalizedProduct._id] } });
    await User.deleteMany({ email: { $in: ["testcustomer_returns@niyora.com", "testadmin_returns@niyora.com"] } });

    console.log("Test data cleanup completed successfully.");
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  }
}

runSystemTests();
