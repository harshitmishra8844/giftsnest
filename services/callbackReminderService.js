const CallbackRequest = require("../models/CallbackRequest");
const User = require("../models/User");
const { createAndDispatchNotification } = require("./notificationService");

let reminderTimer = null;

/**
 * Check for callbacks with upcoming scheduled follow-ups and send auto-reminders
 */
const checkUpcomingCallbackReminders = async () => {
  try {
    const now = new Date();
    // Check callbacks scheduled within the next 15 minutes that haven't been reminded
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // within last hour if server just booted

    const pendingReminders = await CallbackRequest.find({
      followUpRequired: true,
      status: { $in: ["Pending", "Assigned", "Follow-up Scheduled", "Attempted"] },
      nextCallbackDate: { $gte: windowStart, $lte: windowEnd },
      reminderSent: { $ne: true },
    }).populate("assignedTo department");

    if (!pendingReminders || pendingReminders.length === 0) {
      return;
    }

    // Find Master Admins & Team Leaders
    const masterAdmins = await User.find({
      $or: [{ isMasterAdmin: true }, { role: "admin", isAdmin: true }],
      status: "Active",
    }).select("_id name email role isMasterAdmin department");

    for (const callback of pendingReminders) {
      const scheduledTimeStr = callback.nextCallbackDate
        ? new Date(callback.nextCallbackDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "Soon";

      const priority = callback.followUpPriority || callback.priority || "High";
      const title = `📞 Scheduled Callback: ${callback.customerName}`;
      const message = `Follow-up call with ${callback.customerName} (${callback.customerPhone}) is scheduled at ${scheduledTimeStr}. Priority: ${priority}. Action: ${callback.subject || "Customer Follow-up"}.`;
      const link = `/niyora-admin-portal-2026/dashboard?tab=callbacks&id=${callback._id}`;

      const notifiedUserIds = new Set();

      // 1. Notify Assigned Employee
      if (callback.assignedTo && callback.assignedTo._id) {
        await createAndDispatchNotification({
          recipient: callback.assignedTo._id,
          userId: callback.assignedTo._id,
          role: "staff",
          category: "CALLBACK",
          event: "CALLBACK_REMINDER_DUE",
          title,
          message: `[Your Assigned Callback] ${message}`,
          priority,
          link,
          metadata: {
            callbackId: callback._id,
            callbackCode: callback.callbackCode,
            customerName: callback.customerName,
            customerPhone: callback.customerPhone,
            nextCallbackDate: callback.nextCallbackDate,
            priority,
          },
        });
        notifiedUserIds.add(callback.assignedTo._id.toString());
      }

      // 2. Notify Team Leader (if assigned to a department)
      if (callback.department) {
        const teamLeaders = await User.find({
          department: callback.department._id || callback.department,
          status: "Active",
          $or: [
            { designation: { $regex: /lead|manager|supervisor|head/i } },
            { role: { $regex: /lead|manager|supervisor|head/i } },
          ],
        }).select("_id name");

        for (const leader of teamLeaders) {
          if (!notifiedUserIds.has(leader._id.toString())) {
            await createAndDispatchNotification({
              recipient: leader._id,
              userId: leader._id,
              role: "admin",
              category: "CALLBACK",
              event: "CALLBACK_REMINDER_DUE",
              title,
              message: `[Team Lead Notice - Assigned: ${callback.assignedToName || "Staff"}] ${message}`,
              priority,
              link,
              metadata: {
                callbackId: callback._id,
                callbackCode: callback.callbackCode,
                assignedToName: callback.assignedToName,
              },
            });
            notifiedUserIds.add(leader._id.toString());
          }
        }
      }

      // 3. Notify Master Admins
      for (const admin of masterAdmins) {
        if (!notifiedUserIds.has(admin._id.toString())) {
          await createAndDispatchNotification({
            recipient: admin._id,
            userId: admin._id,
            role: "admin",
            category: "CALLBACK",
            event: "CALLBACK_REMINDER_DUE",
            title,
            message: `[Admin Alert - Assigned: ${callback.assignedToName || "Unassigned"}] ${message}`,
            priority,
            link,
            metadata: {
              callbackId: callback._id,
              callbackCode: callback.callbackCode,
              customerName: callback.customerName,
              assignedToName: callback.assignedToName,
            },
          });
          notifiedUserIds.add(admin._id.toString());
        }
      }

      // 4. Update callback document
      callback.reminderSent = true;
      callback.reminderSentAt = new Date();
      callback.timeline.push({
        action: "AUTO_REMINDER_DISPATCHED",
        title: "Auto Reminder Dispatched",
        description: `Automated reminder dispatched before ${scheduledTimeStr} to Assigned Employee (${callback.assignedToName || "Staff"}), Team Leader, and Master Admin.`,
        performedByName: "System Scheduler",
        timestamp: new Date(),
      });

      await callback.save();
    }
  } catch (error) {
    console.error("[CallbackReminder] Error checking scheduled reminders:", error.message);
  }
};

/**
 * Start the recurring callback reminder worker
 */
const startCallbackReminderWorker = () => {
  if (reminderTimer) return;
  console.info("[CallbackReminder] Auto-reminder worker initialized (60s cycle).");

  // Initial check on boot
  checkUpcomingCallbackReminders();

  // Run every 60 seconds
  reminderTimer = setInterval(checkUpcomingCallbackReminders, 60 * 1000);
};

const stopCallbackReminderWorker = () => {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
};

module.exports = {
  startCallbackReminderWorker,
  stopCallbackReminderWorker,
  checkUpcomingCallbackReminders,
};
