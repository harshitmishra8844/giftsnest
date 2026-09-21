const Ticket = require("../models/Ticket");
const CallbackRequest = require("../models/CallbackRequest");
const SlaTracking = require("../models/SlaTracking");
const User = require("../models/User");
const { createAndDispatchNotification } = require("./notificationService");

let slaInterval = null;

/**
 * Scan active tickets, callbacks, and refunds for SLA breaches and auto-escalate
 */
const checkSlaViolations = async () => {
  try {
    const now = new Date();

    // Find Managers and Master Admins for escalation alert
    const managers = await User.find({
      isAdmin: true,
      status: "Active",
      $or: [
        { isMasterAdmin: true },
        { designation: { $regex: /manager|lead|director/i } },
      ],
    }).select("_id name email");

    // 1. TICKET SLA CHECKS (First Response & Resolution Deadlines)
    const overdueTickets = await Ticket.find({
      status: { $in: ["New", "Open", "Assigned", "In Progress", "Waiting Customer", "Waiting for Customer"] },
      $or: [
        { firstResponseDue: { $lt: now }, firstResponseAt: null },
        { resolutionDue: { $lt: now } },
      ],
    }).populate("assignedAgent", "name email");

    if (overdueTickets && overdueTickets.length > 0) {
      console.info(`[SLA Worker] Found ${overdueTickets.length} tickets breaching SLA deadlines. Auto-escalating...`);

      for (const ticket of overdueTickets) {
        const wasAlreadyBreached = ticket.slaBreached;
        ticket.isOverdue = true;
        ticket.slaBreached = true;
        ticket.status = "Escalated";
        ticket.priority = "Critical";
        ticket.escalatedAt = ticket.escalatedAt || now;
        ticket.escalatedReason = "SLA Violation: Target response/resolution time elapsed without closure.";

        ticket.internalNotes.push({
          note: `[SLA AUTO-ESCALATION]: SLA threshold breached at ${now.toLocaleTimeString()}. Ticket auto-escalated to Critical priority.`,
          authorName: "SLA Monitor Engine",
          createdAt: now,
        });

        await ticket.save();

        // Update sla_tracking record
        try {
          await SlaTracking.findOneAndUpdate(
            { $or: [{ taskId: ticket._id }, { taskCode: ticket.ticketCode }] },
            {
              $set: {
                isOverdue: true,
                resolutionBreached: true,
                firstResponseBreached: !ticket.firstResponseAt && ticket.firstResponseDue < now,
                escalatedAt: ticket.escalatedAt,
                escalationReason: ticket.escalatedReason,
              },
            }
          );
        } catch {}

        // Only notify managers once when breach is first triggered
        if (!wasAlreadyBreached) {
          const title = `🚨 SLA BREACH: Ticket ${ticket.ticketCode} Auto-Escalated!`;
          const message = `Ticket ${ticket.ticketCode} (${ticket.subject}) has breached SLA resolution deadline. Current status: Escalated (Critical). Assigned: ${ticket.assignedAgent ? ticket.assignedAgent.name : "Unassigned"}.`;

          for (const mgr of managers) {
            await createAndDispatchNotification({
              recipient: mgr._id,
              userId: mgr._id,
              role: "admin",
              category: "SUPPORT",
              event: "SLA_BREACH_ESCALATION",
              title,
              message,
              priority: "Critical",
              link: `/niyora-admin-portal-2026/dashboard?tab=support&ticketId=${ticket._id}`,
              metadata: {
                ticketId: ticket._id,
                ticketCode: ticket.ticketCode,
                source: ticket.source,
              },
            });
          }
        }
      }
    }

    // 2. CALLBACK SLA CHECKS (Callback Time Deadlines)
    const overdueCallbacks = await CallbackRequest.find({
      status: { $in: ["Pending", "Assigned", "Follow-up Scheduled"] },
      nextCallbackDate: { $lt: now, $ne: null },
    }).populate("assignedTo", "name email");

    if (overdueCallbacks && overdueCallbacks.length > 0) {
      for (const cb of overdueCallbacks) {
        if (cb.status !== "Escalated") {
          cb.status = "Escalated";
          cb.priority = "Urgent";
          cb.timeline.push({
            action: "SLA_BREACH_AUTO_ESCALATED",
            title: "Callback SLA Breached",
            description: `Scheduled callback time (${new Date(cb.nextCallbackDate).toLocaleString()}) elapsed without contact. Auto-escalated to Urgent.`,
            performedByName: "SLA Monitor Engine",
            timestamp: now,
          });
          await cb.save();

          try {
            await SlaTracking.findOneAndUpdate(
              { $or: [{ taskId: cb._id }, { taskCode: cb.callbackCode }] },
              {
                $set: {
                  isOverdue: true,
                  callbackBreached: true,
                  escalatedAt: now,
                  escalationReason: "Scheduled callback deadline elapsed",
                },
              }
            );
          } catch {}

          // Notify
          const alertTitle = `🚨 Overdue Callback: ${cb.callbackCode}`;
          const alertMsg = `Callback for ${cb.customerName} (${cb.customerPhone}) is overdue! Scheduled for ${new Date(cb.nextCallbackDate).toLocaleTimeString()}.`;
          for (const mgr of managers) {
            await createAndDispatchNotification({
              recipient: mgr._id,
              userId: mgr._id,
              role: "admin",
              category: "CALLBACK",
              event: "SLA_BREACH_ESCALATION",
              title: alertTitle,
              message: alertMsg,
              priority: "Urgent",
              link: `/niyora-admin-portal-2026/dashboard?tab=callbacks&id=${cb._id}`,
              metadata: { callbackId: cb._id, callbackCode: cb.callbackCode },
            });
          }
        }
      }
    }

    // 3. REFUND SLA CHECKS (Overdue Refund Tracking in sla_tracking)
    const overdueRefunds = await SlaTracking.find({
      taskType: "Refund",
      refundDue: { $lt: now },
      refundAt: null,
      isOverdue: false,
    });

    if (overdueRefunds && overdueRefunds.length > 0) {
      for (const rf of overdueRefunds) {
        rf.isOverdue = true;
        rf.refundBreached = true;
        rf.escalatedAt = now;
        rf.escalationReason = "Refund processing window elapsed";
        await rf.save();

        for (const mgr of managers) {
          await createAndDispatchNotification({
            recipient: mgr._id,
            userId: mgr._id,
            role: "admin",
            category: "PAYMENT",
            event: "SLA_BREACH_ESCALATION",
            title: `🚨 Refund SLA Breached: ${rf.taskCode}`,
            message: `Refund task ${rf.taskCode} has breached disbursement SLA window without processing!`,
            priority: "Critical",
            link: `/niyora-admin-portal-2026/dashboard?tab=returns-replacements`,
            metadata: { taskCode: rf.taskCode },
          });
        }
      }
    }
  } catch (error) {
    console.error("[SLA Worker] Error running SLA violation check:", error.message);
  }
};

/**
 * Start the SLA monitoring background worker (60s cycle)
 */
const startSlaWorker = () => {
  if (slaInterval) return;
  console.info("[SLA Worker] SLA monitor and auto-escalation engine initialized (60s cycle).");

  // Initial check on startup
  checkSlaViolations();

  // Run every 60 seconds
  slaInterval = setInterval(checkSlaViolations, 60 * 1000);
};

const stopSlaWorker = () => {
  if (slaInterval) {
    clearInterval(slaInterval);
    slaInterval = null;
  }
};

module.exports = {
  startSlaWorker,
  stopSlaWorker,
  checkSlaViolations,
};
