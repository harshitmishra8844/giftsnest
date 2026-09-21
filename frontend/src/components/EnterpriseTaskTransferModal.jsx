import { useState } from "react";
import api from "../services/api";

const ENTERPRISE_ROLES = [
  { id: "Operations Manager", label: "Operations Manager", group: "Management", icon: "🏢" },
  { id: "Customer Support Manager", label: "Customer Support Manager", group: "Management", icon: "🎧" },
  { id: "Sales Manager", label: "Sales Manager", group: "Management", icon: "📈" },
  { id: "Callback Executive", label: "Callback Executive", group: "Executive", icon: "📞" },
  { id: "Support Executive", label: "Support Executive", group: "Executive", icon: "💬" },
  { id: "Return Executive", label: "Return Executive", group: "Executive", icon: "🔄" },
  { id: "Refund Executive", label: "Refund Executive", group: "Executive", icon: "💸" },
  { id: "Order Executive", label: "Order Executive", group: "Executive", icon: "📦" },
  { id: "Logistics Executive", label: "Logistics Executive", group: "Executive", icon: "🚚" },
  { id: "Inventory Executive", label: "Inventory Executive", group: "Executive", icon: "📊" },
  { id: "Master Admin", label: "Master Admin", group: "Super Admin", icon: "👑" },
];

const EnterpriseTaskTransferModal = ({
  isOpen = true,
  taskData = null,
  taskType: directTaskType,
  taskId: directTaskId,
  taskCode: directTaskCode,
  authHeader,
  employees = [],
  onSuccess,
  onTransferSuccess,
  onClose,
}) => {
  const effectiveTaskId = directTaskId || taskData?.taskId || taskData?._id;
  const rawTaskType = directTaskType || taskData?.taskType || "Ticket";
  const effectiveTaskCode = directTaskCode || taskData?.taskCode || taskData?.ticketCode || taskData?.callbackCode || "";

  const effectiveTaskType =
    String(rawTaskType).toLowerCase() === "callback"
      ? "Callback"
      : String(rawTaskType).toLowerCase() === "return"
      ? "Return"
      : String(rawTaskType).toLowerCase() === "refund"
      ? "Refund"
      : String(rawTaskType).toLowerCase() === "order"
      ? "Order"
      : "Ticket";

  const [targetRole, setTargetRole] = useState("Return Executive");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [priority, setPriority] = useState("High");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState("");

  if (isOpen === false) return null;

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!effectiveTaskId) {
      setError("Task ID is missing. Please close and re-open the transfer modal.");
      return;
    }
    if (!targetRole) {
      setError("Please select a target role.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for the task transfer.");
      return;
    }

    try {
      setTransferring(true);
      setError("");

      const res = await api.post(
        "/tasks/transfer",
        {
          taskType: effectiveTaskType,
          taskId: effectiveTaskId,
          targetRole,
          targetEmployeeId: targetEmployeeId || null,
          priority,
          reason: reason.trim(),
          notes: notes.trim(),
        },
        { headers: authHeader?.headers }
      );

      if (res.data?.success) {
        if (onTransferSuccess) onTransferSuccess(res.data);
        if (onSuccess) onSuccess(res.data);
        if (onClose) onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Task transfer failed.");
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 border border-gold-500/40 shadow-2xl animate-fade-in text-luxury-black dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>🔄</span> Transfer {effectiveTaskType}: <span className="font-mono text-gold-600 dark:text-gold-400">{effectiveTaskCode}</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Route this task to a specialized department executive with full audit logs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleTransfer} className="mt-4 space-y-4 text-xs">
          {/* Target Role Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Target Role / Department <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ENTERPRISE_ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setTargetRole(role.id)}
                  className={`p-2 rounded-xl text-left border transition cursor-pointer flex items-center gap-1.5 ${
                    targetRole === role.id
                      ? "border-gold-500 bg-gold-500/10 text-gold-700 dark:text-gold-300 font-bold ring-1 ring-gold-500"
                      : "border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <span>{role.icon}</span>
                  <span className="truncate text-[11px]">{role.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional specific employee & priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Assign Specific Staff (Optional)
              </label>
              <select
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 outline-none focus:border-gold-500"
              >
                <option value="">-- Auto-assign least loaded --</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.designation || "Staff"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Task Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 outline-none focus:border-gold-500 font-semibold"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
                <option value="Critical">Critical (Immediate Escalation)</option>
              </select>
            </div>
          </div>

          {/* Reason for Transfer */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Reason for Transfer <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Customer requested replacement; transferring to Return Executive for evidence check"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 outline-none focus:border-gold-500"
            />
          </div>

          {/* Transfer Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Handover Notes & Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Detailed observations or specific next actions required..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 outline-none focus:border-gold-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transferring}
              className="px-6 py-2 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs shadow-md shadow-gold-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {transferring ? "Transferring..." : `Transfer to ${targetRole}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnterpriseTaskTransferModal;
