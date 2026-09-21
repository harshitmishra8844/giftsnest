const Ticket = require("../models/Ticket");
const TicketMessage = require("../models/TicketMessage");
const TaskAssignment = require("../models/TaskAssignment");
const CustomerInteraction = require("../models/CustomerInteraction");
const SlaTracking = require("../models/SlaTracking");
const TicketCounter = require("../models/TicketCounter");
const SlaPolicy = require("../models/SlaPolicy");
const User = require("../models/User");
const Role = require("../models/Role");
const CustomerTimeline = require("../models/CustomerTimeline");
const { createAndDispatchNotification } = require("./notificationService");

/**
 * Role mapping table by inbound interaction source
 */
const SOURCE_TO_ROLE_MAP = {
  "Callback Request": "Callback Executive",
  "Return Request": "Return Executive",
  "Replacement Request": "Return Executive",
  "Refund Request": "Refund Executive",
  "Order Issue": "Order Executive",
  "Payment Issue": "Order Executive",
  "Complaint": "Support Executive",
  "Product Inquiry": "Support Executive",
  "Contact Form": "Support Executive",
  "WhatsApp Inquiry": "Support Executive",
  "Email Inquiry": "Support Executive",
  "Direct Support": "Support Executive",
};

/**
 * Find an available employee matching the target role, selecting the least loaded
 */
const findAvailableExecutive = async (targetRoleName) => {
  try {
    const roleDoc = await Role.findOne({ name: targetRoleName });
    if (!roleDoc) return null;

    // Find active users with this role
    const candidates = await User.find({
      isAdmin: true,
      status: "Active",
      $or: [{ roles: roleDoc._id }, { designation: targetRoleName }],
    }).select("_id name email designation department");

    if (!candidates || candidates.length === 0) {
      return null;
    }

    // Pick candidate with lowest number of active (Open/Assigned/In Progress) tickets
    const candidateIds = candidates.map((c) => c._id);
    const loadCounts = await Ticket.aggregate([
      {
        $match: {
          assignedAgent: { $in: candidateIds },
          status: { $in: ["New", "Open", "Assigned", "In Progress"] },
        },
      },
      {
        $group: {
          _id: "$assignedAgent",
          count: { $sum: 1 },
        },
      },
    ]);

    const loadMap = {};
    loadCounts.forEach((lc) => {
      loadMap[lc._id.toString()] = lc.count;
    });

    let bestCandidate = candidates[0];
    let minLoad = loadMap[bestCandidate._id.toString()] || 0;

    for (let i = 1; i < candidates.length; i++) {
      const load = loadMap[candidates[i]._id.toString()] || 0;
      if (load < minLoad) {
        minLoad = load;
        bestCandidate = candidates[i];
      }
    }

    return bestCandidate;
  } catch (err) {
    console.warn("[ticketHub] Error finding available executive:", err.message);
    return null;
  }
};

/**
 * Calculate SLA deadlines based on source and priority
 */
const calculateSlaDeadlines = async (source, priority) => {
  let firstResponseMinutes = 60;
  let resolutionMinutes = 1440; // 24 hours

  try {
    let policy = await SlaPolicy.findOne({
      isActive: true,
      $or: [
        { source, priority },
        { source, priority: "All" },
        { source: "All", priority },
        { source: "All", priority: "All" },
      ],
    }).sort({ priority: 1, source: 1 });

    if (policy) {
      firstResponseMinutes = policy.firstResponseMinutes;
      resolutionMinutes = policy.resolutionMinutes;
    } else {
      // Default heuristics
      if (source === "Callback Request") {
        firstResponseMinutes = 15;
        resolutionMinutes = 240;
      } else if (priority === "Critical" || priority === "Urgent") {
        firstResponseMinutes = 30;
        resolutionMinutes = 720;
      }
    }
  } catch (err) {
    console.warn("[ticketHub] SLA calculation error, using fallback defaults:", err.message);
  }

  const now = Date.now();
  return {
    firstResponseDue: new Date(now + firstResponseMinutes * 60 * 1000),
    resolutionDue: new Date(now + resolutionMinutes * 60 * 1000),
  };
};

/**
 * Central Ticket Hub creation routine:
 * Generates NG-TKT-YYYY-000001, calculates SLA, auto-assigns role executive, and dispatches alerts.
 */
const createCustomerServiceTicket = async ({
  source = "Contact Form",
  customerName = "Customer",
  customerPhone = "",
  customerEmail = "",
  customerId = null,
  subject = "Customer Inquiry",
  message = "",
  orderId = null,
  orderCode = "",
  returnRequestId = null,
  priority = "Medium",
  category = "General Query",
  type = "Support",
  metadata = {},
}) => {
  try {
    // 1. Generate sequential NG-TKT-YYYY-000001 ticket code
    const ticketCode = await TicketCounter.getNextTicketCode();

    // 2. SLA deadlines
    const { firstResponseDue, resolutionDue } = await calculateSlaDeadlines(source, priority);

    // 3. Auto-assign role executive based on source
    const targetRoleName = SOURCE_TO_ROLE_MAP[source] || "Support Executive";
    const assignedExecutive = await findAvailableExecutive(targetRoleName);

    const initialMessages = [];
    if (message && message.trim()) {
      initialMessages.push({
        sender: customerId || null,
        senderName: customerName,
        isAdmin: false,
        message: message.trim(),
        createdAt: new Date(),
      });
    }

    const ticket = await Ticket.create({
      ticketCode,
      source,
      user: customerId || null,
      customerName: customerName.trim(),
      customerPhone: customerPhone ? customerPhone.trim() : "",
      customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : "",
      subject: subject.trim(),
      category,
      type,
      priority,
      status: assignedExecutive ? "Assigned" : "New",
      order: orderId || null,
      orderCode: orderCode || "",
      returnRequest: returnRequestId || null,
      assignedAgent: assignedExecutive ? assignedExecutive._id : null,
      assignedRole: targetRoleName,
      assignedDepartment: assignedExecutive ? assignedExecutive.department : null,
      assignedAt: assignedExecutive ? new Date() : null,
      firstResponseDue,
      resolutionDue,
      isOverdue: false,
      slaBreached: false,
      messages: initialMessages,
      transferHistory: [],
    });

    console.info(`[TicketHub] Created ${ticketCode} from ${source}. Assigned to: ${assignedExecutive ? assignedExecutive.name : "Unassigned Queue"}`);

    // 4. Record Initial Message in ticket_messages collection
    if (message && message.trim()) {
      try {
        await TicketMessage.create({
          ticketId: ticket._id,
          ticketCode,
          sender: customerId || null,
          senderName: customerName.trim(),
          senderRole: "Customer",
          isAdmin: false,
          message: message.trim(),
          attachments: metadata.attachments || [],
        });
      } catch (msgErr) {
        console.warn("[TicketHub] TicketMessage record creation failed:", msgErr.message);
      }
    }

    // 5. Record Task Assignment in task_assignments collection
    try {
      await TaskAssignment.create({
        taskType: type === "Return" ? "Return" : "Ticket",
        taskId: ticket._id,
        taskCode: ticketCode,
        assignedTo: assignedExecutive ? assignedExecutive._id : null,
        assignedToName: assignedExecutive ? assignedExecutive.name : "Unassigned Queue",
        assignedRole: targetRoleName,
        assignedBy: null,
        assignedByName: "System Auto-Router",
        assignedAt: new Date(),
        status: assignedExecutive ? "Active" : "Active",
        slaDeadline: resolutionDue,
        notes: `Auto-routed based on inbound interaction source: ${source}`,
      });
    } catch (taskErr) {
      console.warn("[TicketHub] TaskAssignment creation failed:", taskErr.message);
    }

    // 6. Record Customer Interaction in customer_interactions collection
    try {
      await CustomerInteraction.create({
        customerId: customerId || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : "",
        customerPhone: customerPhone ? customerPhone.trim() : "",
        interactionType: source,
        ticketId: ticket._id,
        ticketCode,
        referenceId: orderCode || (returnRequestId ? returnRequestId.toString() : ""),
        channel: source.includes("WhatsApp") ? "WhatsApp" : (source.includes("Email") ? "Email" : (source.includes("Callback") ? "Phone" : "Web")),
        summary: `${source}: ${subject.trim()}`,
        metadata: { priority, category, ...metadata },
        handledBy: assignedExecutive ? assignedExecutive._id : null,
        handledByName: assignedExecutive ? assignedExecutive.name : "Unassigned Queue",
        timestamp: new Date(),
      });
    } catch (interactErr) {
      console.warn("[TicketHub] CustomerInteraction creation failed:", interactErr.message);
    }

    // 7. Initialize SLA Tracking in sla_tracking collection
    try {
      await SlaTracking.create({
        taskType: type === "Return" ? "Return" : (source === "Callback Request" ? "Callback" : (source === "Refund Request" ? "Refund" : "Ticket")),
        taskId: ticket._id,
        taskCode: ticketCode,
        source,
        priority,
        assignedTo: assignedExecutive ? assignedExecutive._id : null,
        assignedRole: targetRoleName,
        firstResponseDue,
        resolutionDue,
        callbackDue: source === "Callback Request" ? firstResponseDue : null,
        refundDue: source === "Refund Request" ? resolutionDue : null,
        isOverdue: false,
      });
    } catch (slaErr) {
      console.warn("[TicketHub] SlaTracking creation failed:", slaErr.message);
    }

    // 8. Log interaction in CustomerTimeline if user is registered
    if (customerId) {
      try {
        await CustomerTimeline.create({
          userId: customerId,
          eventType: "TICKET_CREATED",
          title: `Ticket Created: ${ticketCode}`,
          description: `Inquiry received via ${source}: "${subject}". Assigned to ${targetRoleName}.`,
          metadata: { ticketId: ticket._id, ticketCode, source, priority },
        });
      } catch {}
    }

    // 9. Notify assigned executive and Master Admin
    const notifyPayload = {
      role: "admin",
      category: "SUPPORT",
      event: "TICKET_CREATED",
      title: `🎫 New Ticket ${ticketCode} (${source})`,
      message: `Customer ${customerName} submitted ${source}: "${subject}". Priority: ${priority}.`,
      priority,
      link: `/niyora-admin-portal-2026/dashboard?tab=support&ticketId=${ticket._id}`,
      metadata: { ticketId: ticket._id, ticketCode, source, customerName },
    };

    if (assignedExecutive) {
      await createAndDispatchNotification({
        ...notifyPayload,
        recipient: assignedExecutive._id,
        userId: assignedExecutive._id,
        role: "staff",
      });
    }

    // Broadcast to Master Admins
    await createAndDispatchNotification({
      ...notifyPayload,
      role: "admin",
    });

    return ticket;
  } catch (error) {
    console.error("[TicketHub] Failed to create customer service ticket:", error);
    throw error;
  }
};

module.exports = {
  createCustomerServiceTicket,
  findAvailableExecutive,
  calculateSlaDeadlines,
  SOURCE_TO_ROLE_MAP,
};
