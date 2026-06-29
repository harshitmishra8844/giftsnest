const User = require("../models/User");
const Order = require("../models/Order");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const LoginActivityLog = require("../models/LoginActivityLog");
const ActivityLog = require("../models/ActivityLog");
const Newsletter = require("../models/Newsletter");
const { logActivity } = require("../services/logService");

// Helper to check if current admin is Master Admin
const isMasterAdmin = (req) => {
  return req.user && req.user.isMasterAdmin === true;
};

// @desc    Get paginated, filtered list of customers
// @route   GET /api/admin/customers
// @access  Private (CUSTOMERS_VIEW)
const getCustomers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const {
      search,
      status,
      emailVerified,
      phoneVerified,
      newsletter,
      isGuest,
      hasCart,
      hasWishlist,
      abandonedCart,
      city,
      state,
      country,
      pincode,
      registrationDateStart,
      registrationDateEnd,
      lastLoginStart,
      lastLoginEnd,
      minOrders,
      maxOrders,
      minSpend,
      maxSpend,
      sortField,
      sortOrder,
    } = req.query;

    const matchQuery = { isAdmin: { $ne: true } };

    // Default status behavior: Hide deleted users unless explicitly requested
    if (status) {
      matchQuery.status = status;
    } else {
      matchQuery.status = { $ne: "Deleted" };
    }

    // Text search
    if (search) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      matchQuery.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { mobileNumber: searchRegex },
      ];
    }

    // Verification Status
    if (emailVerified === "true" || phoneVerified === "true") {
      matchQuery.verificationStatus = "Verified";
    } else if (emailVerified === "false" || phoneVerified === "false") {
      matchQuery.verificationStatus = "Pending";
    }

    // Guest Status
    if (isGuest === "true") {
      matchQuery.isGuest = true;
    } else if (isGuest === "false") {
      matchQuery.isGuest = false;
    }

    // Newsletter subscription filter
    if (newsletter) {
      const newsletterEmails = await Newsletter.find().distinct("email");
      if (newsletter === "true") {
        matchQuery.email = { $in: newsletterEmails };
      } else {
        matchQuery.email = { $nin: newsletterEmails };
      }
    }

    // Cart filter
    if (hasCart === "true") {
      matchQuery.cart = { $exists: true, $not: { $size: 0 } };
    } else if (hasCart === "false") {
      matchQuery.$or = [
        { cart: { $exists: false } },
        { cart: { $size: 0 } }
      ];
    }

    // Abandoned Cart: has cart items
    if (abandonedCart === "true") {
      matchQuery.cart = { $exists: true, $not: { $size: 0 } };
    }

    // Address elements filters
    if (city) matchQuery["addresses.city"] = new RegExp(city.trim(), "i");
    if (state) matchQuery["addresses.state"] = new RegExp(state.trim(), "i");
    if (country) matchQuery["addresses.country"] = new RegExp(country.trim(), "i");
    if (pincode) matchQuery["addresses.postalCode"] = new RegExp(pincode.trim(), "i");

    // Registration Date range
    if (registrationDateStart || registrationDateEnd) {
      matchQuery.createdAt = {};
      if (registrationDateStart) matchQuery.createdAt.$gte = new Date(registrationDateStart);
      if (registrationDateEnd) {
        const end = new Date(registrationDateEnd);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    // Last Login range
    if (lastLoginStart || lastLoginEnd) {
      matchQuery.lastLogin = {};
      if (lastLoginStart) matchQuery.lastLogin.$gte = new Date(lastLoginStart);
      if (lastLoginEnd) {
        const end = new Date(lastLoginEnd);
        end.setHours(23, 59, 59, 999);
        matchQuery.lastLogin.$lte = end;
      }
    }

    // Build lookup & addFields aggregation pipeline
    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "userId",
          as: "orders",
        },
      },
      {
        $lookup: {
          from: "wishlists",
          localField: "_id",
          foreignField: "user_id",
          as: "wishlist",
        },
      },
      {
        $addFields: {
          totalOrders: { $size: "$orders" },
          totalSpent: { $sum: "$orders.totalPrice" },
          wishlistCount: { $size: "$wishlist" },
          lastOrderDate: { $max: "$orders.createdAt" },
        },
      },
    ];

    // Post-calculation filters (Orders & Spend count)
    const postMatch = {};
    if (minOrders !== undefined && minOrders !== "") {
      postMatch.totalOrders = { $gte: parseInt(minOrders) };
    }
    if (maxOrders !== undefined && maxOrders !== "") {
      postMatch.totalOrders = { ...postMatch.totalOrders, $lte: parseInt(maxOrders) };
    }
    if (minSpend !== undefined && minSpend !== "") {
      postMatch.totalSpent = { $gte: parseFloat(minSpend) };
    }
    if (maxSpend !== undefined && maxSpend !== "") {
      postMatch.totalSpent = { ...postMatch.totalSpent, $lte: parseFloat(maxSpend) };
    }
    if (hasWishlist === "true") {
      postMatch.wishlistCount = { $gt: 0 };
    } else if (hasWishlist === "false") {
      postMatch.wishlistCount = 0;
    }

    if (Object.keys(postMatch).length > 0) {
      pipeline.push({ $match: postMatch });
    }

    // Sort setup
    const sort = {};
    if (sortField) {
      let field = sortField;
      if (sortField === "registrationDate") field = "createdAt";
      sort[field] = sortOrder === "desc" ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }
    pipeline.push({ $sort: sort });

    // Perform facet check for pagination counts & paginated data in a single database round-trip
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    });

    const results = await User.aggregate(pipeline);
    const data = results[0]?.data || [];
    const totalCount = results[0]?.metadata?.[0]?.total || 0;

    return res.status(200).json({
      customers: data,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCustomers: totalCount,
    });
  } catch (error) {
    console.error("Get customers error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve customers list" });
  }
};

// @desc    Get detailed customer profile
// @route   GET /api/admin/customers/:id
// @access  Private (CUSTOMERS_VIEW)
const getCustomerProfile = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await User.findById(customerId).select("-password").lean();
    if (!customer || customer.isAdmin) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // 1. Fetch address lists
    const defaultShipping = customer.addresses?.find((a) => a.isDefault) || null;
    const billingAddress = customer.addresses?.[0] || null; // standard fallback
    const savedAddresses = customer.addresses || [];

    // 2. Fetch order history
    const orders = await Order.find({ userId: customerId }).sort({ createdAt: -1 }).lean();
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const averageOrderValue = totalOrders > 0 ? Number((totalSpent / totalOrders).toFixed(2)) : 0;
    const lastOrder = orders[0] || null;

    // 3. Fetch Wishlist items
    const wishlistItems = await Wishlist.find({ user_id: customerId })
      .populate("product_id")
      .lean();
    const wishlist = wishlistItems.filter((w) => w.product_id).map((w) => w.product_id);

    // 4. Fetch Cart items (populate products)
    const cartPopulated = await User.findById(customerId)
      .populate("cart.product")
      .select("cart")
      .lean();
    const cart = cartPopulated?.cart || [];

    // 5. Fetch Recently viewed products
    const recentPopulated = await User.findById(customerId)
      .populate("recentlyViewed.product")
      .select("recentlyViewed")
      .lean();
    const recentlyViewed = recentPopulated?.recentlyViewed || [];

    // 6. Fetch reviews submitted by customer
    const productsWithReviews = await Product.find({ "reviews.user": customerId }).lean();
    const reviews = [];
    productsWithReviews.forEach((p) => {
      p.reviews?.forEach((r) => {
        if (r.user?.toString() === customerId) {
          reviews.push({
            productId: p._id,
            productName: p.name,
            productImage: p.image,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            verifiedPurchase: r.verifiedPurchase,
          });
        }
      });
    });

    // 7. Fetch coupons usage
    const couponUsage = orders
      .filter((o) => o.couponCode)
      .map((o) => ({
        orderId: o._id,
        orderCode: o.orderCode,
        couponCode: o.couponCode,
        discountAmount: o.discountAmount,
        date: o.createdAt,
      }));

    // 8. Fetch notifications
    const notifications = await Notification.find({ recipient: customerId })
      .sort({ createdAt: -1 })
      .lean();

    // 9. Fetch Login History (Requires Master Admin permissions or standard display)
    let loginHistory = [];
    if (isMasterAdmin(req)) {
      loginHistory = await LoginActivityLog.find({ userId: customerId })
        .sort({ loginTime: -1 })
        .limit(50)
        .lean();
    }

    // 10. Fetch activity logs (Requires Master Admin permissions or standard display)
    let activityTimeline = [];
    if (isMasterAdmin(req)) {
      activityTimeline = await ActivityLog.find({ userId: customerId })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();
    }

    // Newsletter subscription status check
    const isNewsletterSubscribed = await Newsletter.exists({ email: customer.email.toLowerCase() });

    return res.status(200).json({
      profile: {
        ...customer,
        isNewsletterSubscribed: !!isNewsletterSubscribed,
      },
      addresses: {
        defaultShipping,
        billingAddress,
        savedAddresses,
      },
      orderInfo: {
        totalOrders,
        totalSpent,
        averageOrderValue,
        lastOrder,
        orderHistory: orders,
      },
      wishlist,
      cart,
      recentlyViewed,
      reviews,
      coupons: couponUsage,
      notifications,
      loginHistory,
      activityTimeline,
    });
  } catch (error) {
    console.error("Get customer profile error:", error.message);
    return res.status(500).json({ message: "Failed to load customer profile details" });
  }
};

// @desc    Suspend or unsuspend a customer account
// @route   PUT /api/admin/customers/:id/status
// @access  Private (CUSTOMERS_EDIT)
const updateCustomerStatus = async (req, res) => {
  try {
    const customerId = req.params.id;
    const { status, reason, notes } = req.body;

    if (!["Active", "Suspended", "Pending Verification"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value. Choose Active, Suspended, or Pending Verification." });
    }

    const customer = await User.findById(customerId);
    if (!customer || customer.isAdmin) {
      return res.status(404).json({ message: "Customer account not found" });
    }

    const previousStatus = customer.status;
    customer.status = status;

    if (status === "Suspended") {
      customer.suspension = {
        reason: reason || "Suspended by administrator",
        suspendedBy: req.user._id,
        date: new Date(),
        notes: notes || "",
      };
    } else {
      // Clear suspension info on unsuspend
      customer.suspension = {
        reason: "",
        suspendedBy: null,
        date: null,
        notes: "",
      };
    }

    await customer.save();

    // Log action to activity audit
    const actionKeyword = status === "Suspended" ? "CUSTOMER_SUSPENDED" : "CUSTOMER_UNSUSPENDED";
    const logDetails = status === "Suspended"
      ? `Suspended customer ${customer.name} (${customer.email}). Reason: ${reason || "None specified"}`
      : `Unsuspended/activated customer ${customer.name} (${customer.email})`;

    await logActivity(req.user._id, req.user.name, actionKeyword, logDetails, req);

    return res.status(200).json({
      message: `Customer account status updated successfully to ${status}`,
      customer,
    });
  } catch (error) {
    console.error("Update customer status error:", error.message);
    return res.status(500).json({ message: "Failed to update customer account status" });
  }
};

// @desc    Soft delete customer
// @route   DELETE /api/admin/customers/:id
// @access  Private (Master Admin only)
const softDeleteCustomer = async (req, res) => {
  try {
    const hasPermission = isMasterAdmin(req) || req.user?.permissions?.includes("CUSTOMERS_DELETE") || req.user?.permissions?.includes("ALL");
    if (!hasPermission) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions to soft delete customer records." });
    }

    const customerId = req.params.id;
    const customer = await User.findById(customerId);
    if (!customer || customer.isAdmin) {
      return res.status(404).json({ message: "Customer account not found" });
    }

    customer.status = "Deleted";
    await customer.save();

    await logActivity(
      req.user._id,
      req.user.name,
      "CUSTOMER_DELETED",
      `Soft deleted customer ${customer.name} (${customer.email})`,
      req
    );

    return res.status(200).json({ message: "Customer soft-deleted successfully. Record remains intact for analytics." });
  } catch (error) {
    console.error("Soft delete customer error:", error.message);
    return res.status(500).json({ message: "Failed to soft delete customer record" });
  }
};

// @desc    Restore soft deleted customer
// @route   POST /api/admin/customers/:id/restore
// @access  Private (Master Admin or CUSTOMERS_DELETE permission)
const restoreCustomer = async (req, res) => {
  try {
    const hasPermission = isMasterAdmin(req) || req.user?.permissions?.includes("CUSTOMERS_DELETE") || req.user?.permissions?.includes("ALL");
    if (!hasPermission) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions to restore customer records." });
    }

    const customerId = req.params.id;
    const customer = await User.findById(customerId);
    if (!customer || customer.isAdmin) {
      return res.status(404).json({ message: "Customer account not found" });
    }

    customer.status = "Active";
    await customer.save();

    await logActivity(
      req.user._id,
      req.user.name,
      "CUSTOMER_RESTORED",
      `Restored soft-deleted customer ${customer.name} (${customer.email})`,
      req
    );

    return res.status(200).json({ message: "Customer restored successfully to Active status.", customer });
  } catch (error) {
    console.error("Restore customer error:", error.message);
    return res.status(500).json({ message: "Failed to restore customer record" });
  }
};

// @desc    Permanently delete customer account and related records
// @route   DELETE /api/admin/customers/:id/permanent
// @access  Private (Master Admin or CUSTOMERS_PURGE permission)
const permanentDeleteCustomer = async (req, res) => {
  try {
    const hasPermission = isMasterAdmin(req) || req.user?.permissions?.includes("CUSTOMERS_PURGE") || req.user?.permissions?.includes("ALL");
    if (!hasPermission) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions to permanently delete customer records." });
    }

    const customerId = req.params.id;
    const customer = await User.findById(customerId);
    if (!customer || customer.isAdmin) {
      return res.status(404).json({ message: "Customer account not found" });
    }

    // Delete the customer record permanently
    await User.findByIdAndDelete(customerId);

    // Delete related user documents: login logs and notifications
    const LoginActivityLog = require("../models/LoginActivityLog");
    const Notification = require("../models/Notification");
    await Promise.all([
      LoginActivityLog.deleteMany({ userId: customerId }),
      Notification.deleteMany({ recipient: customerId }),
    ]);

    await logActivity(
      req.user._id,
      req.user.name,
      "CUSTOMER_PERMANENTLY_DELETED",
      `Permanently deleted customer account: name="${customer.name}", email="${customer.email}"`,
      req
    );

    return res.status(200).json({ message: "Customer account and associated logs permanently deleted from database." });
  } catch (error) {
    console.error("Permanent delete customer error:", error.message);
    return res.status(500).json({ message: "Failed to permanently delete customer record" });
  }
};

// @desc    Add private internal administrative notes
// @route   POST /api/admin/customers/:id/notes
// @access  Private (CUSTOMERS_EDIT)
const addCustomerNote = async (req, res) => {
  try {
    const customerId = req.params.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Note text is required" });
    }

    const customer = await User.findById(customerId);
    if (!customer || customer.isAdmin) {
      return res.status(404).json({ message: "Customer account not found" });
    }

    customer.notes.push({
      text: text.trim(),
      adminName: req.user.name,
      date: new Date(),
    });

    await customer.save();

    await logActivity(
      req.user._id,
      req.user.name,
      "CUSTOMER_NOTE_ADDED",
      `Added private internal note to customer ${customer.name} (${customer.email})`,
      req
    );

    return res.status(200).json({ message: "Private note saved successfully.", notes: customer.notes });
  } catch (error) {
    console.error("Add customer note error:", error.message);
    return res.status(500).json({ message: "Failed to save internal private note" });
  }
};

// @desc    Send notifications to customer(s)
// @route   POST /api/admin/customers/notifications
// @access  Private (CUSTOMERS_NOTIFY)
const sendCustomerNotifications = async (req, res) => {
  try {
    const { recipientIds, title, message, type } = req.body;

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ message: "At least one recipient ID is required" });
    }
    if (!title || !message || !type) {
      return res.status(400).json({ message: "Title, message, and notification type are required" });
    }

    const notificationsToCreate = recipientIds.map((userId) => ({
      recipient: userId,
      title: title.trim(),
      message: message.trim(),
      type,
      status: "Sent",
      sentBy: req.user._id,
    }));

    await Notification.insertMany(notificationsToCreate);

    await logActivity(
      req.user._id,
      req.user.name,
      "CUSTOMER_NOTIFICATION_SENT",
      `Sent administrative notification ("${title}") to ${recipientIds.length} customer(s)`,
      req
    );

    return res.status(201).json({ message: `Notifications successfully sent to ${recipientIds.length} customer(s).` });
  } catch (error) {
    console.error("Send notifications error:", error.message);
    return res.status(500).json({ message: "Failed to dispatch notifications" });
  }
};

// @desc    Handle bulk status changes or tagging
// @route   POST /api/admin/customers/bulk
// @access  Private (CUSTOMERS_EDIT)
const bulkCustomerAction = async (req, res) => {
  try {
    const { customerIds, action, payload } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({ message: "Selected customer IDs list is required" });
    }

    if (action === "Suspend") {
      const reason = payload?.reason || "Bulk suspended by admin";
      await User.updateMany(
        { _id: { $in: customerIds }, isAdmin: { $ne: true } },
        {
          $set: {
            status: "Suspended",
            suspension: {
              reason,
              suspendedBy: req.user._id,
              date: new Date(),
              notes: payload?.notes || "",
            },
          },
        }
      );
      await logActivity(req.user._id, req.user.name, "CUSTOMER_BULK_SUSPEND", `Bulk suspended ${customerIds.length} customer(s)`, req);
    } else if (action === "Unsuspend") {
      await User.updateMany(
        { _id: { $in: customerIds }, isAdmin: { $ne: true } },
        {
          $set: {
            status: "Active",
            suspension: { reason: "", suspendedBy: null, date: null, notes: "" },
          },
        }
      );
      await logActivity(req.user._id, req.user.name, "CUSTOMER_BULK_UNSUSPEND", `Bulk unsuspended/activated ${customerIds.length} customer(s)`, req);
    } else if (action === "Soft Delete") {
      const hasPermission = isMasterAdmin(req) || req.user?.permissions?.includes("CUSTOMERS_DELETE") || req.user?.permissions?.includes("ALL");
      if (!hasPermission) {
        return res.status(403).json({ message: "Access denied. Insufficient permissions to bulk soft delete records." });
      }
      await User.updateMany(
        { _id: { $in: customerIds }, isAdmin: { $ne: true } },
        { $set: { status: "Deleted" } }
      );
      await logActivity(req.user._id, req.user.name, "CUSTOMER_BULK_DELETE", `Bulk soft deleted ${customerIds.length} customer(s)`, req);
    } else if (action === "Restore") {
      const hasPermission = isMasterAdmin(req) || req.user?.permissions?.includes("CUSTOMERS_DELETE") || req.user?.permissions?.includes("ALL");
      if (!hasPermission) {
        return res.status(403).json({ message: "Access denied. Insufficient permissions to bulk restore records." });
      }
      await User.updateMany(
        { _id: { $in: customerIds }, isAdmin: { $ne: true } },
        { $set: { status: "Active" } }
      );
      await logActivity(req.user._id, req.user.name, "CUSTOMER_BULK_RESTORE", `Bulk restored ${customerIds.length} customer(s)`, req);
    } else if (action === "Permanent Delete") {
      const hasPermission = isMasterAdmin(req) || req.user?.permissions?.includes("CUSTOMERS_PURGE") || req.user?.permissions?.includes("ALL");
      if (!hasPermission) {
        return res.status(403).json({ message: "Access denied. Insufficient permissions to bulk permanently delete records." });
      }
      await User.deleteMany({ _id: { $in: customerIds }, isAdmin: { $ne: true } });
      const LoginActivityLog = require("../models/LoginActivityLog");
      const Notification = require("../models/Notification");
      await Promise.all([
        LoginActivityLog.deleteMany({ userId: { $in: customerIds } }),
        Notification.deleteMany({ recipient: { $in: customerIds } }),
      ]);
      await logActivity(req.user._id, req.user.name, "CUSTOMER_BULK_PERMANENT_DELETE", `Bulk permanently deleted ${customerIds.length} customer(s) from database`, req);
    } else if (action === "Assign Tag") {
      const tag = payload?.tag;
      if (!tag || !tag.trim()) {
        return res.status(400).json({ message: "Tag value is required" });
      }
      // Add tag to the tags array of selected customers ensuring uniqueness
      await User.updateMany(
        { _id: { $in: customerIds }, isAdmin: { $ne: true } },
        { $addToSet: { tags: tag.trim() } }
      );
      await logActivity(req.user._id, req.user.name, "CUSTOMER_BULK_TAGGED", `Bulk assigned tag "${tag}" to ${customerIds.length} customer(s)`, req);
    } else {
      return res.status(400).json({ message: "Invalid action type specified" });
    }

    return res.status(200).json({ message: `Bulk action "${action}" completed successfully on ${customerIds.length} customer(s).` });
  } catch (error) {
    console.error("Bulk action error:", error.message);
    return res.status(500).json({ message: "Failed to execute bulk operations" });
  }
};

// @desc    Export helper to get full detailed information of specific/filtered users
// @route   POST /api/admin/customers/export-data
// @access  Private (CUSTOMERS_VIEW)
const exportCustomersData = async (req, res) => {
  try {
    const { customerIds, columns, relations } = req.body;
    
    // Master admin security check for exporting complete DB
    if ((!customerIds || customerIds.length === 0) && !isMasterAdmin(req)) {
      return res.status(403).json({ message: "Access denied. Master Admin credentials required to export full database." });
    }

    let query = { isAdmin: { $ne: true } };
    if (customerIds && customerIds.length > 0) {
      query._id = { $in: customerIds };
    }

    const customers = await User.find(query).select("-password").lean();
    const exportResult = [];

    for (const c of customers) {
      const row = {};
      
      // Load standard fields
      if (!columns || columns.includes("Name")) row.Name = c.name;
      if (!columns || columns.includes("Email")) row.Email = c.email;
      if (!columns || columns.includes("Phone")) row.Phone = c.mobileNumber || "";
      if (!columns || columns.includes("Status")) row.Status = c.status;
      if (!columns || columns.includes("Registration Date")) row.RegistrationDate = c.createdAt;
      if (!columns || columns.includes("Login Method")) row.LoginMethod = c.loginMethod || "OTP";
      if (!columns || columns.includes("Last Login")) row.LastLogin = c.lastLogin;
      if (!columns || columns.includes("Newsletter Status")) {
        const isSub = await Newsletter.exists({ email: c.email.toLowerCase() });
        row.NewsletterStatus = isSub ? "Subscribed" : "Not Subscribed";
      }

      // Populate relations if checked
      if (relations?.includes("Orders") || !columns || columns.includes("Orders") || columns.includes("Total Spend")) {
        const orders = await Order.find({ userId: c._id }).lean();
        if (relations?.includes("Orders")) {
          row.OrdersList = orders.map((o) => `${o.orderCode} (INR ${o.totalPrice})`).join(", ");
        }
        if (!columns || columns.includes("Orders")) row.OrdersCount = orders.length;
        if (!columns || columns.includes("Total Spend")) row.TotalSpend = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
      }

      if (relations?.includes("Addresses") || !columns || columns.includes("Addresses")) {
        const addrs = c.addresses || [];
        if (relations?.includes("Addresses")) {
          row.AddressesList = addrs.map((a) => `${a.fullName}, ${a.line1}, ${a.city}, ${a.state}`).join(" | ");
        }
        if (!columns || columns.includes("Addresses")) row.AddressCount = addrs.length;
      }

      if (relations?.includes("Wishlist") || !columns || columns.includes("Wishlist Count")) {
        const count = await Wishlist.countDocuments({ user_id: c._id });
        if (!columns || columns.includes("Wishlist Count")) row.WishlistCount = count;
        if (relations?.includes("Wishlist")) {
          const items = await Wishlist.find({ user_id: c._id }).populate("product_id").lean();
          row.WishlistItems = items.filter(i => i.product_id).map(i => i.product_id.name).join(", ");
        }
      }

      if (relations?.includes("Cart") || !columns || columns.includes("Cart Count")) {
        const count = c.cart?.length || 0;
        if (!columns || columns.includes("Cart Count")) row.CartCount = count;
        if (relations?.includes("Cart")) {
          const cartPopulated = await User.findById(c._id).populate("cart.product").select("cart").lean();
          row.CartItems = cartPopulated?.cart?.filter(i => i.product).map(i => `${i.product.name} (x${i.quantity})`).join(", ") || "";
        }
      }

      if (relations?.includes("Reviews")) {
        const prods = await Product.find({ "reviews.user": c._id }).lean();
        const revList = [];
        prods.forEach(p => {
          p.reviews?.forEach(r => {
            if (r.user?.toString() === c._id.toString()) {
              revList.push(`${p.name}: ${r.rating} stars - "${r.comment}"`);
            }
          });
        });
        row.Reviews = revList.join(" | ");
      }

      if (relations?.includes("Notifications")) {
        const notifs = await Notification.find({ recipient: c._id }).lean();
        row.NotificationsList = notifs.map(n => `[${n.type}] ${n.title} - status: ${n.status}`).join(" | ");
      }

      if (relations?.includes("Coupons")) {
        const oWithC = await Order.find({ userId: c._id, couponCode: { $ne: "" } }).lean();
        row.CouponsUsed = oWithC.map(o => `${o.couponCode} (Discount: INR ${o.discountAmount})`).join(", ");
      }

      if (relations?.includes("Login History") && isMasterAdmin(req)) {
        const logs = await LoginActivityLog.find({ userId: c._id }).sort({ loginTime: -1 }).limit(10).lean();
        row.LoginHistory = logs.map(l => `${new Date(l.loginTime).toISOString()} - ${l.ipAddress} (${l.browser}/${l.device})`).join(" | ");
      }

      if (relations?.includes("Activity Logs") && isMasterAdmin(req)) {
        const acts = await ActivityLog.find({ userId: c._id }).sort({ timestamp: -1 }).limit(10).lean();
        row.ActivityTimeline = acts.map(a => `[${a.action}] ${a.details} (${new Date(a.timestamp).toISOString()})`).join(" | ");
      }

      exportResult.push(row);
    }

    await logActivity(
      req.user._id,
      req.user.name,
      "CUSTOMER_EXPORTED",
      `Exported customer dataset of ${customers.length} records.`,
      req
    );

    return res.status(200).json(exportResult);
  } catch (error) {
    console.error("Export customer data error:", error.message);
    return res.status(500).json({ message: "Failed to compile customer export dataset" });
  }
};

// @desc    Get dashboard metrics and analytics charts
// @route   GET /api/admin/customers/analytics
// @access  Private (CUSTOMERS_VIEW)
const getCustomerAnalytics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Core customer counts
    const totalCustomers = await User.countDocuments({ isAdmin: { $ne: true } });
    const newCustomersToday = await User.countDocuments({ isAdmin: { $ne: true }, createdAt: { $gte: today } });
    const newCustomersThisMonth = await User.countDocuments({ isAdmin: { $ne: true }, createdAt: { $gte: firstOfMonth } });
    
    const activeCustomers = await User.countDocuments({ isAdmin: { $ne: true }, status: "Active" });
    const suspendedCustomers = await User.countDocuments({ isAdmin: { $ne: true }, status: "Suspended" });
    const deletedCustomers = await User.countDocuments({ isAdmin: { $ne: true }, status: "Deleted" });

    // 2. Cart & Wishlist counts
    const customersWithCart = await User.countDocuments({ isAdmin: { $ne: true }, cart: { $exists: true, $not: { $size: 0 } } });
    const wishlistUsersList = await Wishlist.find().distinct("user_id");
    const customersWithWishlist = wishlistUsersList.length;

    // Abandoned Cart: has cart items
    const abandonedCartUsers = customersWithCart;

    // 3. Spends and Orders
    const ordersGroup = await Order.aggregate([
      { $match: { userId: { $ne: null } } },
      {
        $group: {
          _id: "$userId",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$totalPrice" },
        },
      },
    ]);

    const returningCustomers = ordersGroup.filter((u) => u.orderCount > 1).length;
    const totalSpentSum = ordersGroup.reduce((sum, u) => sum + u.totalSpent, 0);
    const averageCustomerSpend = totalCustomers > 0 ? Number((totalSpentSum / totalCustomers).toFixed(2)) : 0;

    // 4. Highest spending customers
    const highestSpendingIds = [...ordersGroup]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
    
    const highestSpendingCustomers = [];
    for (const h of highestSpendingIds) {
      const u = await User.findById(h._id).select("name email mobileNumber").lean();
      if (u) {
        highestSpendingCustomers.push({
          ...u,
          totalSpent: h.totalSpent,
          orderCount: h.orderCount,
        });
      }
    }

    // 5. Geographic splits (Top Cities, Top States)
    const geoAggregate = await User.aggregate([
      { $match: { isAdmin: { $ne: true }, "addresses.0": { $exists: true } } },
      { $unwind: "$addresses" },
      {
        $group: {
          _id: { city: "$addresses.city", state: "$addresses.state" },
          count: { $sum: 1 },
        },
      },
    ]);

    const citiesMap = {};
    const statesMap = {};

    geoAggregate.forEach((g) => {
      const city = String(g._id.city).trim().toUpperCase();
      const state = String(g._id.state).trim().toUpperCase();
      if (city) citiesMap[city] = (citiesMap[city] || 0) + g.count;
      if (state) statesMap[state] = (statesMap[state] || 0) + g.count;
    });

    const topCities = Object.entries(citiesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topStates = Object.entries(statesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // 6. Monthly Registrations (Last 6 Months)
    const monthlyRegistrations = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const count = await User.countDocuments({
        isAdmin: { $ne: true },
        createdAt: { $gte: start, $lte: end },
      });

      const label = d.toLocaleString("default", { month: "short", year: "numeric" });
      monthlyRegistrations.push({ label, count });
    }

    return res.status(200).json({
      metrics: {
        totalCustomers,
        newCustomersToday,
        newCustomersThisMonth,
        activeCustomers,
        suspendedCustomers,
        deletedCustomers,
        returningCustomers,
        customersWithCart,
        customersWithWishlist,
        abandonedCartUsers,
        averageCustomerSpend,
      },
      highestSpendingCustomers,
      topCities,
      topStates,
      monthlyRegistrations,
    });
  } catch (error) {
    console.error("Get customer analytics error:", error.message);
    return res.status(500).json({ message: "Failed to compile customer dashboard analytics metrics" });
  }
};

module.exports = {
  getCustomers,
  getCustomerProfile,
  updateCustomerStatus,
  softDeleteCustomer,
  restoreCustomer,
  permanentDeleteCustomer,
  addCustomerNote,
  sendCustomerNotifications,
  bulkCustomerAction,
  exportCustomersData,
  getCustomerAnalytics,
};
