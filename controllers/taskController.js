const Ticket = require("../models/Ticket");
const CallbackRequest = require("../models/CallbackRequest");
const TaskTransfer = require("../models/TaskTransfer");
const TaskAssignment = require("../models/TaskAssignment");
const EmployeeActivityLog = require("../models/EmployeeActivityLog");
const SupportNote = require("../models/SupportNote");
const SlaTracking = require("../models/SlaTracking");
const ReturnRequest = require("../models/ReturnRequest");
const RefundRecord = require("../models/RefundRecord");
const Order = require("../models/Order");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { findAvailableExecutive } = require("../services/ticketHubService");
const { createAndDispatchNotification } = require("../services/notificationService");

/**
 * @desc    Get Employee Work Desk (Scoped to current logged-in employee)
 * @route   GET /api/tasks/my-desk
 * @access  Private (Staff / Admin)
 */
const getEmployeeWorkDesk = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Assigned Tickets
    const assignedTickets = await Ticket.find({
      assignedAgent: userId,
      status: { $nin: ["Resolved", "Closed"] },
    })
      .sort({ priority: -1, createdAt: -1 })
      .populate("order", "orderCode status totalAmount");

    // 2. Assigned Callbacks
    const assignedCallbacks = await CallbackRequest.find({
      assignedTo: userId,
      status: { $nin: ["Completed", "Cancelled"] },
    }).sort({ nextCallbackDate: 1, createdAt: -1 });

    // 3. Today's Tasks
    const todaysTickets = assignedTickets.filter(
      (t) => new Date(t.createdAt) >= startOfToday || (t.firstResponseDue && new Date(t.firstResponseDue) >= startOfToday)
    );
    const todaysCallbacks = assignedCallbacks.filter(
      (c) =>
        (c.nextCallbackDate && new Date(c.nextCallbackDate) >= startOfToday && new Date(c.nextCallbackDate) <= new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)) ||
        new Date(c.createdAt) >= startOfToday
    );

    // 4. Follow-ups
    const followUps = assignedCallbacks.filter((c) => c.followUpRequired);

    // 5. Overdue Tasks
    const overdueTickets = assignedTickets.filter(
      (t) => t.isOverdue || (t.resolutionDue && new Date(t.resolutionDue) < now) || (t.firstResponseDue && !t.firstResponseAt && new Date(t.firstResponseDue) < now)
    );
    const overdueCallbacks = assignedCallbacks.filter(
      (c) => c.nextCallbackDate && new Date(c.nextCallbackDate) < now && c.status !== "Completed"
    );

    // 6. Escalated Tasks
    const escalatedTickets = assignedTickets.filter(
      (t) => t.status === "Escalated" || t.priority === "Critical"
    );
    const escalatedCallbacks = assignedCallbacks.filter(
      (c) => c.status === "Escalated" || c.priority === "Urgent"
    );

    return res.json({
      success: true,
      role: req.user.designation || req.user.role,
      counts: {
        totalAssigned: assignedTickets.length + assignedCallbacks.length,
        today: todaysTickets.length + todaysCallbacks.length,
        followUps: followUps.length,
        overdue: overdueTickets.length + overdueCallbacks.length,
        escalated: escalatedTickets.length + escalatedCallbacks.length,
      },
      tasks: {
        assignedTickets,
        assignedCallbacks,
        todaysTickets,
        todaysCallbacks,
        followUps,
        overdueTickets,
        overdueCallbacks,
        escalatedTickets,
        escalatedCallbacks,
      },
    });
  } catch (error) {
    console.error("Error fetching employee work desk:", error);
    return res.status(500).json({ message: "Failed to load work desk: " + error.message });
  }
};

/**
 * @desc    Get Manager Dashboard & Department Performance
 * @route   GET /api/tasks/manager-overview
 * @access  Private (Managers / Master Admin)
 */
const getManagerOverview = async (req, res) => {
  try {
    const now = new Date();

    // Fetch all pending tickets across all departments
    const pendingTickets = await Ticket.find({
      status: { $nin: ["Resolved", "Closed"] },
    })
      .sort({ createdAt: -1 })
      .populate("assignedAgent", "name email designation department");

    // Fetch active callbacks
    const pendingCallbacks = await CallbackRequest.find({
      status: { $nin: ["Completed", "Cancelled"] },
    }).populate("assignedTo", "name email designation");

    // SLA Violations
    const slaViolations = pendingTickets.filter(
      (t) => t.slaBreached || t.isOverdue || (t.resolutionDue && new Date(t.resolutionDue) < now)
    );

    // Escalations
    const escalations = pendingTickets.filter(
      (t) => t.status === "Escalated" || t.priority === "Critical"
    );

    // Team Performance aggregation
    const employees = await User.find({ isAdmin: true, status: "Active" }).select(
      "name email designation department employeeId"
    );

    const performanceMap = {};
    employees.forEach((emp) => {
      performanceMap[emp._id.toString()] = {
        id: emp._id,
        name: emp.name,
        email: emp.email,
        employeeId: emp.employeeId,
        designation: emp.designation || "Staff",
        assignedCount: 0,
        resolvedCount: 0,
        overdueCount: 0,
        escalatedCount: 0,
      };
    });

    // Tally active assignments
    pendingTickets.forEach((t) => {
      if (t.assignedAgent && performanceMap[t.assignedAgent._id?.toString()]) {
        performanceMap[t.assignedAgent._id.toString()].assignedCount++;
        if (t.isOverdue || t.slaBreached) {
          performanceMap[t.assignedAgent._id.toString()].overdueCount++;
        }
        if (t.status === "Escalated" || t.priority === "Critical") {
          performanceMap[t.assignedAgent._id.toString()].escalatedCount++;
        }
      }
    });

    // Fetch recent resolved tickets count for metrics
    const resolvedLast30Days = await Ticket.countDocuments({
      status: { $in: ["Resolved", "Closed"] },
      resolvedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    return res.json({
      success: true,
      metrics: {
        totalPendingTickets: pendingTickets.length,
        totalPendingCallbacks: pendingCallbacks.length,
        totalSlaViolations: slaViolations.length,
        totalEscalations: escalations.length,
        resolvedLast30Days,
      },
      slaViolations,
      escalations,
      teamLeaderboard: Object.values(performanceMap),
    });
  } catch (error) {
    console.error("Error fetching manager overview:", error);
    return res.status(500).json({ message: "Failed to load manager overview: " + error.message });
  }
};

/**
 * @desc    Universal Task Transfer Engine
 * @route   POST /api/tasks/transfer
 * @access  Private (Staff / Admin)
 */
const transferTask = async (req, res) => {
  try {
    const {
      taskType = "Ticket",
      taskId,
      targetRole,
      targetEmployeeId,
      reason,
      priority,
      notes = "",
    } = req.body;

    if (!taskId || !targetRole || !reason || !String(reason).trim()) {
      return res.status(400).json({
        message: "Task ID, Target Role, and Reason for transfer are required.",
      });
    }

    // Normalize taskType
    const rawType = String(taskType || "Ticket").trim().toLowerCase();
    let normalizedTaskType = "Ticket";
    if (rawType === "callback") normalizedTaskType = "Callback";
    else if (rawType === "return") normalizedTaskType = "Return";
    else if (rawType === "refund") normalizedTaskType = "Refund";
    else if (rawType === "order") normalizedTaskType = "Order";

    let taskCode = "";
    let targetUser = null;

    // 1. Resolve target user if specified, otherwise find available executive with that role
    if (targetEmployeeId) {
      targetUser = await User.findById(targetEmployeeId).select("name email designation department");
    } else {
      targetUser = await findAvailableExecutive(targetRole);
    }

    const fromRole = req.user.designation || req.user.role || "Staff";
    const transferRecord = {
      fromUser: req.user._id,
      fromUserName: req.user.name,
      fromRole,
      toUser: targetUser ? targetUser._id : null,
      toUserName: targetUser ? targetUser.name : "Unassigned Queue",
      toRole: targetRole,
      reason: reason.trim(),
      priority: priority || "Medium",
      notes: notes.trim(),
      timestamp: new Date(),
    };

    if (normalizedTaskType === "Ticket") {
      const ticket = await Ticket.findById(taskId);
      if (!ticket) return res.status(404).json({ message: "Ticket not found." });

      taskCode = ticket.ticketCode;
      ticket.assignedAgent = targetUser ? targetUser._id : null;
      ticket.assignedRole = targetRole;
      ticket.assignedDepartment = targetUser ? targetUser.department : ticket.assignedDepartment;
      ticket.status = targetUser ? "Assigned" : "New";
      if (priority) ticket.priority = priority;

      ticket.transferHistory.push(transferRecord);
      ticket.internalNotes.push({
        note: `[TASK TRANSFERRED]: From ${req.user.name} (${fromRole}) to ${targetRole} (${targetUser ? targetUser.name : "Queue"}). Reason: "${reason}". Notes: ${notes}`,
        authorName: req.user.name,
        author: req.user._id,
        createdAt: new Date(),
      });

      await ticket.save();
    } else if (normalizedTaskType === "Callback") {
      const callback = await CallbackRequest.findById(taskId);
      if (!callback) return res.status(404).json({ message: "Callback request not found." });

      taskCode = callback.callbackCode;
      callback.assignedTo = targetUser ? targetUser._id : null;
      callback.assignedToName = targetUser ? targetUser.name : "Unassigned Queue";
      if (priority) callback.priority = priority;

      callback.timeline.push({
        action: "TASK_TRANSFERRED",
        title: `Task Transferred to ${targetRole}`,
        description: `Transferred by ${req.user.name}. Reason: ${reason}. Notes: ${notes}`,
        performedBy: req.user._id,
        performedByName: req.user.name,
        timestamp: new Date(),
      });

      await callback.save();
    } else if (normalizedTaskType === "Return") {
      const returnReq = await ReturnRequest.findById(taskId);
      if (!returnReq) return res.status(404).json({ message: "Return request not found." });

      taskCode = returnReq.requestId || returnReq.returnCode;
      returnReq.statusHistory.push({
        status: returnReq.status,
        note: `[TASK TRANSFERRED to ${targetRole}]: Reason: "${reason}". Notes: ${notes}`,
        updatedBy: req.user._id,
        updatedAt: new Date(),
      });

      await returnReq.save();
    } else if (normalizedTaskType === "Refund") {
      const refundDoc = await RefundRecord.findById(taskId);
      taskCode = refundDoc ? refundDoc.refundId : String(taskId);
    } else if (normalizedTaskType === "Order") {
      const orderDoc = await Order.findById(taskId);
      if (orderDoc) taskCode = orderDoc.orderCode;
    }

    // 2. Record in global TaskTransfer collection for cross-department audit
    const standaloneTransfer = await TaskTransfer.create({
      taskType: normalizedTaskType,
      taskId,
      taskCode: taskCode || String(taskId),
      fromUser: req.user._id,
      fromUserName: req.user.name,
      fromRole,
      toUser: targetUser ? targetUser._id : null,
      toUserName: targetUser ? targetUser.name : "Unassigned Queue",
      toRole: targetRole,
      reason: reason.trim(),
      priority: priority || "Medium",
      notes: notes.trim(),
      status: "Transferred",
    });

    // 3. Record in task_assignments collection
    try {
      await TaskAssignment.create({
        taskType: normalizedTaskType,
        taskId,
        taskCode: taskCode || String(taskId),
        assignedTo: targetUser ? targetUser._id : null,
        assignedToName: targetUser ? targetUser.name : "Unassigned Queue",
        assignedRole: targetRole,
        assignedBy: req.user._id,
        assignedByName: req.user.name,
        assignedAt: new Date(),
        status: "Active",
        notes: `Transferred from ${req.user.name} (${fromRole}). Reason: ${reason}. Notes: ${notes}`,
      });
    } catch (assignErr) {
      console.warn("[transferTask] TaskAssignment creation failed:", assignErr.message);
    }

    // 4. Record internal SupportNote
    try {
      await SupportNote.create({
        targetType: normalizedTaskType,
        targetId: taskId,
        targetCode: taskCode || String(taskId),
        author: req.user._id,
        authorName: req.user.name,
        authorRole: fromRole,
        note: `[TASK TRANSFERRED to ${targetRole}]: Reason: "${reason}". Notes: "${notes}"`,
        isPrivate: true,
      });
    } catch (noteErr) {
      console.warn("[transferTask] SupportNote creation failed:", noteErr.message);
    }

    // 5. Log in employee_activity_logs
    try {
      await EmployeeActivityLog.create({
        employeeId: req.user._id,
        employeeName: req.user.name,
        role: fromRole,
        action: "TASK_TRANSFERRED",
        targetType: taskType === "Ticket" ? "Ticket" : (taskType === "Callback" ? "Callback" : (taskType === "Return" ? "Return" : "System")),
        targetId: taskId,
        targetCode: taskCode || String(taskId),
        details: `Transferred ${taskType} ${taskCode} to ${targetRole}. Reason: ${reason}`,
        metadata: { targetRole, targetUserId: targetUser ? targetUser._id : null, reason, priority },
      });
    } catch (empLogErr) {
      console.warn("[transferTask] EmployeeActivityLog creation failed:", empLogErr.message);
    }

    // 6. Log to system ActivityLog
    try {
      await ActivityLog.create({
        user: req.user._id,
        action: "TASK_TRANSFERRED",
        description: `${req.user.name} transferred ${taskType} ${taskCode} to ${targetRole}. Reason: ${reason}`,
        metadata: { taskId, taskCode, targetRole, reason },
      });
    } catch {}

    // 7. Notify recipient executive and Master Admin
    const alertTitle = `🔄 Task Transferred: ${taskCode} (${targetRole})`;
    const alertMsg = `Task ${taskCode} has been transferred to you by ${req.user.name}. Reason: "${reason}". Priority: ${priority || "Medium"}.`;
    const link =
      taskType === "Ticket"
        ? `/niyora-admin-portal-2026/dashboard?tab=support&ticketId=${taskId}`
        : (taskType === "Return"
          ? `/niyora-admin-portal-2026/dashboard?tab=returns-replacements&id=${taskId}`
          : `/niyora-admin-portal-2026/dashboard?tab=callbacks&id=${taskId}`);

    if (targetUser) {
      await createAndDispatchNotification({
        recipient: targetUser._id,
        userId: targetUser._id,
        role: "staff",
        category: "SUPPORT",
        event: "TASK_TRANSFERRED",
        title: alertTitle,
        message: alertMsg,
        priority: priority || "Medium",
        link,
        metadata: { taskId, taskCode, fromUser: req.user.name, reason },
      });
    }

    // Broadcast to Master Admin
    await createAndDispatchNotification({
      role: "admin",
      category: "SUPPORT",
      event: "TASK_TRANSFERRED",
      title: `[Admin Oversight] ${alertTitle}`,
      message: `Task ${taskCode} transferred from ${req.user.name} to ${targetUser ? targetUser.name : targetRole}. Reason: ${reason}.`,
      priority: priority || "Medium",
      link,
    });

    return res.status(200).json({
      success: true,
      message: `Task ${taskCode} successfully transferred to ${targetRole}.`,
      transferRecord: standaloneTransfer,
    });
  } catch (error) {
    console.error("Error transferring task:", error);
    return res.status(500).json({ message: "Task transfer failed: " + error.message });
  }
};

/**
 * @desc    Master Admin Control Center: Reassign task or override
 * @route   PATCH /api/tasks/:id/reassign
 * @access  Private (Master Admin only)
 */
const reassignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { taskType = "Ticket", newAssigneeId, overrideNotes = "" } = req.body;

    const newAssignee = await User.findById(newAssigneeId).select("name email designation department");
    if (!newAssignee) {
      return res.status(404).json({ message: "Target employee not found." });
    }

    if (taskType === "Ticket") {
      const ticket = await Ticket.findById(id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found." });

      const prev = ticket.assignedAgent;
      ticket.assignedAgent = newAssignee._id;
      ticket.assignedRole = newAssignee.designation || ticket.assignedRole;
      ticket.assignedDepartment = newAssignee.department || ticket.assignedDepartment;
      ticket.status = "Assigned";

      ticket.internalNotes.push({
        note: `[MASTER ADMIN OVERRIDE]: Reassigned to ${newAssignee.name} by Master Admin. Notes: ${overrideNotes}`,
        authorName: req.user.name,
        author: req.user._id,
        createdAt: new Date(),
      });

      await ticket.save();
    } else if (taskType === "Callback") {
      const callback = await CallbackRequest.findById(id);
      if (!callback) return res.status(404).json({ message: "Callback not found." });

      callback.assignedTo = newAssignee._id;
      callback.assignedToName = newAssignee.name;
      callback.assignedToEmployeeId = newAssignee.employeeId || "";
      callback.status = "Assigned";

      callback.timeline.push({
        action: "MASTER_ADMIN_REASSIGN",
        title: "Reassigned by Master Admin",
        description: `Master Admin reassigned callback to ${newAssignee.name}. Notes: ${overrideNotes}`,
        performedBy: req.user._id,
        performedByName: req.user.name,
        timestamp: new Date(),
      });

      await callback.save();
    }

    return res.json({
      success: true,
      message: `Task successfully reassigned to ${newAssignee.name} by Master Admin.`,
    });
  } catch (error) {
    console.error("Error reassigning task:", error);
    return res.status(500).json({ message: "Reassignment failed: " + error.message });
  }
};

module.exports = {
  getEmployeeWorkDesk,
  getManagerOverview,
  transferTask,
  reassignTask,
};
