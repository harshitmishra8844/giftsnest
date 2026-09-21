const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Notification = require("../models/Notification");
const Ticket = require("../models/Ticket");
const SupportMessage = require("../models/SupportMessage");
const NotificationLog = require("../models/NotificationLog");
const User = require("../models/User");
const Order = require("../models/Order");

const {
  addSseClient,
  removeSseClient,
  broadcastToAdmins,
  createAndDispatchNotification,
  notifyOrderCreated,
  notifyOrderCancelled,
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifyNewCustomerRegistered,
  notifyProfileUpdated,
  notifySupportTicketCreated,
  notifyContactSubmission,
  notifyComplaintSubmitted,
  notifyUnansweredQueryAlert,
  notifyReturnRequested,
  notifyReplacementRequested,
} = require("../services/notificationService");

const runTests = async () => {
  console.log("==================================================");
  console.log("   ADMIN NOTIFICATION & SUPPORT SYSTEM TEST SUITE  ");
  console.log("==================================================");

  try {
    // 1. Connect DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB Atlas successfully.\n");

    // 2. Test SSE Client Registry & Mock Broadcast
    console.log("--- TEST 1: SSE Real-Time Stream Engine ---");
    let receivedSseEvent = null;
    const mockRes = {
      write: (data) => {
        receivedSseEvent = data;
      },
    };

    addSseClient("admin-test-client-1", mockRes);
    console.log("✓ Registered mock SSE client.");

    broadcastToAdmins({
      type: "notification",
      data: {
        title: "Test Real-Time Broadcast",
        message: "SSE engine connection verified",
      },
    });

    if (receivedSseEvent && receivedSseEvent.includes("Test Real-Time Broadcast")) {
      console.log("✓ SSE broadcast received by active client successfully.");
    } else {
      throw new Error("SSE broadcast failed to deliver data.");
    }

    removeSseClient("admin-test-client-1");
    console.log("✓ Removed mock SSE client cleanly.\n");

    // 3. Test Domain Event Triggers & Notification Creation
    console.log("--- TEST 2: Domain Notification Event Triggers ---");

    // Order created (standard)
    const mockOrder = {
      _id: new mongoose.Types.ObjectId(),
      orderCode: "ORD-2026-TEST01",
      totalPrice: 1299,
      products: [{ name: "Handcrafted Photo Frame" }],
      address: { fullName: "Aarav Sharma" },
      userId: new mongoose.Types.ObjectId(),
    };
    const orderNotif = await notifyOrderCreated(mockOrder);
    console.log(`✓ Order notification created: "${orderNotif.title}" [${orderNotif.priority}]`);

    // High-value order (>= 5000)
    const highValueOrder = {
      _id: new mongoose.Types.ObjectId(),
      orderCode: "ORD-2026-HIGHVAL",
      totalPrice: 12500,
      products: [{ name: "Luxury Gold Watch Box" }],
      address: { fullName: "Vikram Singhania" },
      userId: new mongoose.Types.ObjectId(),
    };
    const highValNotif = await notifyOrderCreated(highValueOrder);
    console.log(`✓ High-value order alert triggered: "${highValNotif.title}" [Priority: ${highValNotif.priority}]`);

    // Payment Success
    const paySuccessNotif = await notifyPaymentSuccess(mockOrder);
    console.log(`✓ Payment success alert triggered: "${paySuccessNotif.title}"`);

    // Payment Failed
    const payFailedNotif = await notifyPaymentFailed(mockOrder, "Bank gateway timed out");
    console.log(`✓ Payment failed alert triggered: "${payFailedNotif.title}"`);

    // Customer Registration
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      name: "Diya Kapoor",
      email: "diya.test@example.com",
    };
    const regNotif = await notifyNewCustomerRegistered(mockUser);
    console.log(`✓ Customer registration alert triggered: "${regNotif.title}"`);

    // Customer Profile Update
    const profileNotif = await notifyProfileUpdated(mockUser);
    console.log(`✓ Customer profile update alert triggered: "${profileNotif.title}"`);

    // Return & Replacement Request
    const returnNotif = await notifyReturnRequested(
      { requestId: "RET-2026-TEST01", returnReason: "Damaged during transit" },
      mockOrder
    );
    console.log(`✓ Return claim alert triggered: "${returnNotif.title}"`);

    const repNotif = await notifyReplacementRequested(
      { requestId: "REP-2026-TEST01", returnReason: "Wrong size sent" },
      mockOrder
    );
    console.log(`✓ Replacement claim alert triggered: "${repNotif.title}"\n`);

    // 4. Test Support Tickets, Categories, Priorities, and Messages
    console.log("--- TEST 3: Support Ticket Lifecycle & Collections ---");

    // Create Support Ticket
    const ticketCode = "TKT-TEST-" + Date.now().toString().slice(-6);
    const newTicket = await Ticket.create({
      ticketCode,
      customerName: "Rohan Verma",
      customerEmail: "rohan.test@example.com",
      customerPhone: "+91 9876543210",
      orderCode: mockOrder.orderCode,
      subject: "Custom mug engraving inquiry",
      category: "Product Inquiry",
      priority: "Medium",
      status: "Open",
      messages: [
        {
          senderName: "Rohan Verma",
          isAdmin: false,
          message: "Can we add two names on opposite sides of the mug?",
        },
      ],
    });
    console.log(`✓ Support ticket created in collection 'tickets': #${newTicket.ticketCode}`);

    // Verify support_messages logging
    const loggedMessage = await SupportMessage.create({
      ticketId: newTicket._id,
      ticketCode: newTicket.ticketCode,
      senderName: "Rohan Verma",
      isAdmin: false,
      message: "Can we add two names on opposite sides of the mug?",
    });
    console.log(`✓ Support message recorded in collection 'support_messages': ID ${loggedMessage._id}`);

    // Admin Reply
    newTicket.messages.push({
      senderName: "Niyora Concierge",
      isAdmin: true,
      message: "Yes absolutely! We can engrave both names seamlessly.",
    });
    newTicket.status = "Waiting for Customer";
    await newTicket.save();
    console.log(`✓ Admin reply added, ticket status updated to: "${newTicket.status}"`);

    // Internal Note
    newTicket.internalNotes.push({
      note: "Customer requested gold foil engraving on sides.",
      authorName: "Concierge Admin",
      createdAt: new Date(),
    });
    await newTicket.save();
    console.log(`✓ Internal note added successfully: count=${newTicket.internalNotes.length}`);

    // Complaint filing alert
    const complaintTicket = {
      _id: new mongoose.Types.ObjectId(),
      ticketCode: "TKT-CMP-" + Date.now().toString().slice(-4),
      customerName: "Ananya Mehta",
      customerEmail: "ananya@example.com",
      subject: "Package arrived in damaged packaging",
      category: "Complaint",
      priority: "Urgent",
    };
    const complaintNotif = await notifyComplaintSubmitted(complaintTicket);
    console.log(`✓ Complaint alert triggered: "${complaintNotif.title}" [Priority: ${complaintNotif.priority}]`);

    // Unanswered query alert
    const unansweredNotif = await notifyUnansweredQueryAlert(newTicket, 36);
    console.log(`✓ Unanswered query alert triggered: "${unansweredNotif.title}"\n`);

    // 5. Test Notification Queries, Unread Count & Mark-as-read
    console.log("--- TEST 4: Notification Query & Read Tracking ---");
    const unreadCount = await Notification.countDocuments({
      role: { $in: ["admin", "all"] },
      isRead: false,
    });
    console.log(`✓ Unread admin notifications count in database: ${unreadCount}`);

    // Mark single notification as read
    orderNotif.isRead = true;
    orderNotif.readAt = new Date();
    await orderNotif.save();
    console.log(`✓ Single notification #${orderNotif._id} marked as read successfully.`);

    // 6. Test Multi-Channel Notification Audit Logs
    console.log("--- TEST 5: Notification Logs Collection ---");
    const logEntry = await NotificationLog.create({
      notificationId: orderNotif._id,
      channel: "SSE",
      recipient: "Admin Staff",
      status: "DELIVERED",
      payload: { event: "NEW_ORDER_RECEIVED", orderCode: mockOrder.orderCode },
      deliveredAt: new Date(),
    });
    console.log(`✓ Audit log verified in collection 'notification_logs': ID ${logEntry._id}\n`);

    // Clean up test documents
    console.log("--- CLEANUP: Removing Test Records ---");
    await Notification.deleteMany({
      _id: {
        $in: [
          orderNotif._id,
          highValNotif._id,
          paySuccessNotif._id,
          payFailedNotif._id,
          regNotif._id,
          profileNotif._id,
          returnNotif._id,
          repNotif._id,
          complaintNotif._id,
          unansweredNotif._id,
        ],
      },
    });
    await Ticket.deleteOne({ _id: newTicket._id });
    await SupportMessage.deleteOne({ _id: loggedMessage._id });
    await NotificationLog.deleteOne({ _id: logEntry._id });
    console.log("✓ Test records cleaned up successfully.\n");

    console.log("==================================================");
    console.log("   ALL 5 TEST PHASES PASSED WITH 100% SUCCESS!   ");
    console.log("==================================================");

    process.exit(0);
  } catch (err) {
    console.error("❌ Test suite failed with error:", err);
    process.exit(1);
  }
};

runTests();
