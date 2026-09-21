import { useState, useEffect, useMemo } from "react";
import api from "../services/api";

const OUTCOME_STYLES = {
  Connected: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "Not Answered": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Busy: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  "Switched Off": "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30",
  "Wrong Number": "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  "Call Later Requested": "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 font-medium",
  "Call Back Later Requested": "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 font-medium",
  Interested: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold",
  "Interested in Purchase": "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold",
  "Not Interested": "bg-stone-500/15 text-stone-600 dark:text-stone-400 border-stone-500/30 font-medium",
  "Order Placed": "bg-gold-500/20 text-gold-700 dark:text-gold-400 border-gold-500/40 font-bold",
  "Complaint Registered": "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30 font-semibold",
  Escalated: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 font-bold animate-pulse",
  "Issue Resolved": "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold",
};

const PRIORITY_BADGES = {
  Urgent: "bg-red-500 text-white font-bold",
  High: "bg-amber-500 text-white font-semibold",
  Medium: "bg-blue-500 text-white",
  Low: "bg-gray-500 text-white",
};

const CallbackRemarksSection = ({
  callbackId,
  authHeader,
  adminAuth,
  onCallbackUpdated,
  onClose,
}) => {
  const [callback, setCallback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("add-remark"); // 'add-remark', 'history', 'timeline'

  // Form State
  const [callOutcome, setCallOutcome] = useState("Connected");
  const [conversationSummary, setConversationSummary] = useState("");
  const [customerRequirement, setCustomerRequirement] = useState("");
  const [issueDiscussed, setIssueDiscussed] = useState("");
  const [resolutionProvided, setResolutionProvided] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [nextCallbackDate, setNextCallbackDate] = useState("");
  const [followUpPriority, setFollowUpPriority] = useState("Medium");
  const [internalNotes, setInternalNotes] = useState("");
  const [submittingRemark, setSubmittingRemark] = useState(false);

  // Edit Modal State (15-min window rule)
  const [editingRemark, setEditingRemark] = useState(null);
  const [editSummary, setEditSummary] = useState("");
  const [editOutcome, setEditOutcome] = useState("");
  const [editRequirement, setEditRequirement] = useState("");
  const [editIssueDiscussed, setEditIssueDiscussed] = useState("");
  const [editResolution, setEditResolution] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editReason, setEditReason] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  // Live timer tick for 15-min countdown
  useEffect(() => {
    const timer = setInterval(() => setNowTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch full callback details
  const fetchCallback = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/callbacks/${callbackId}`, {
        headers: authHeader?.headers,
      });
      if (res.data?.success && res.data.callback) {
        setCallback(res.data.callback);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load callback details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (callbackId) {
      fetchCallback();
    }
  }, [callbackId]);

  // Check if latest remark is editable (<= 15 mins)
  const latestRemarkInfo = useMemo(() => {
    if (!callback?.callRemarks || callback.callRemarks.length === 0) return null;
    const latest = callback.callRemarks[callback.callRemarks.length - 1];
    const createdMs = new Date(latest.createdAt).getTime();
    const limitMs = 15 * 60 * 1000;
    const diffMs = createdMs + limitMs - nowTimestamp;
    const isExpired = diffMs <= 0;
    const isAuthor =
      adminAuth?.user?.id === latest.employee?._id ||
      adminAuth?.user?.id === latest.employee ||
      adminAuth?.user?._id === latest.employee?._id ||
      adminAuth?.user?._id === latest.employee;
    const isMasterAdmin = adminAuth?.user?.isMasterAdmin === true;
    const canEdit = (isAuthor || isMasterAdmin) && (!isExpired || isMasterAdmin);

    const secondsLeft = Math.max(0, Math.floor(diffMs / 1000));
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const formattedCountdown = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

    return {
      remark: latest,
      isExpired,
      canEdit,
      formattedCountdown,
      isAuthor,
      isMasterAdmin,
    };
  }, [callback, nowTimestamp, adminAuth]);

  // Handle Submit Remark
  const handleSubmitRemark = async (e) => {
    e.preventDefault();
    if (!conversationSummary.trim()) {
      setError("Please provide conversation summary.");
      return;
    }
    if (followUpRequired && !nextCallbackDate) {
      setError("Please specify Next Callback Date & Time for follow-up.");
      return;
    }

    try {
      setSubmittingRemark(true);
      setError("");
      setSuccess("");

      const payload = {
        callOutcome,
        conversationSummary: conversationSummary.trim(),
        customerRequirement: customerRequirement.trim(),
        issueDiscussed: issueDiscussed.trim(),
        resolutionProvided: resolutionProvided.trim(),
        followUpRequired,
        nextCallbackDate: followUpRequired && nextCallbackDate ? new Date(nextCallbackDate).toISOString() : null,
        followUpPriority,
        internalNotes: internalNotes.trim(),
      };

      const res = await api.post(`/callbacks/${callbackId}/remarks`, payload, {
        headers: authHeader?.headers,
      });

      if (res.data?.success) {
        setSuccess("Call remark saved and activity timeline updated!");
        setCallback(res.data.callback);
        // Reset form
        setConversationSummary("");
        setCustomerRequirement("");
        setIssueDiscussed("");
        setResolutionProvided("");
        setFollowUpRequired(false);
        setNextCallbackDate("");
        setInternalNotes("");
        setActiveSubTab("history");

        if (onCallbackUpdated) {
          onCallbackUpdated(res.data.callback);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record call remark.");
    } finally {
      setSubmittingRemark(false);
    }
  };

  // Open Edit Modal for Latest Remark
  const handleOpenEditModal = (remark) => {
    setEditingRemark(remark);
    setEditSummary(remark.conversationSummary || "");
    setEditOutcome(remark.callOutcome || "Connected");
    setEditRequirement(remark.customerRequirement || "");
    setEditIssueDiscussed(remark.issueDiscussed || "");
    setEditResolution(remark.resolutionProvided || "");
    setEditNotes(remark.internalNotes || "");
    setEditReason("");
    setError("");
  };

  // Save Edited Remark
  const handleSaveEditRemark = async (e) => {
    e.preventDefault();
    if (!editSummary.trim()) {
      setError("Conversation summary cannot be empty.");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");

      const res = await api.put(
        `/callbacks/${callbackId}/remarks/${editingRemark._id}`,
        {
          conversationSummary: editSummary.trim(),
          callOutcome: editOutcome,
          customerRequirement: editRequirement.trim(),
          issueDiscussed: editIssueDiscussed.trim(),
          resolutionProvided: editResolution.trim(),
          internalNotes: editNotes.trim(),
          editReason: editReason.trim() || "Corrected within 15-minute window",
        },
        { headers: authHeader?.headers }
      );

      if (res.data?.success) {
        setSuccess("Latest remark successfully updated in audit logs.");
        setCallback(res.data.callback);
        setEditingRemark(null);
        if (onCallbackUpdated) {
          onCallbackUpdated(res.data.callback);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to edit remark.");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500 animate-pulse">
        Loading callback remarks and activity timeline...
      </div>
    );
  }

  if (!callback) {
    return (
      <div className="p-6 text-center text-sm text-red-500">
        Callback request could not be loaded.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A1A1A] text-luxury-black dark:text-white rounded-2xl overflow-hidden shadow-lg border border-gold-300/30">
      {/* Header: Callback Details → Call Remarks */}
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-stone-50 to-white dark:from-[#222] dark:to-[#1A1A1A] flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/30">
              {callback.callbackCode}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                PRIORITY_BADGES[callback.priority] || "bg-gray-500 text-white"
              }`}
            >
              {callback.priority} Priority
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              {callback.status}
            </span>
            {callback.totalCallsMade > 0 && (
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                📞 {callback.totalCallsMade} {callback.totalCallsMade === 1 ? "call made" : "calls made"}
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-serif font-bold text-luxury-black dark:text-white mt-1">
            Callback Details → <span className="text-gold-600 dark:text-gold-400 font-sans">Call Remarks</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Customer: <strong className="text-luxury-black dark:text-white">{callback.customerName}</strong> ·{" "}
            <a
              href={`tel:${callback.customerPhone}`}
              className="text-gold-600 hover:underline font-mono"
            >
              {callback.customerPhone}
            </a>
            {callback.customerEmail && ` · ${callback.customerEmail}`}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick Customer & Follow-up Info Strip */}
      <div className="px-4 py-2.5 bg-gold-500/5 border-b border-gold-200/40 dark:border-gold-900/20 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-gray-400 text-[10px] uppercase font-bold mr-1">Assigned Executive:</span>
            <span className="font-semibold text-luxury-black dark:text-white">
              {callback.assignedToName || "Unassigned"}
            </span>
            {callback.assignedToEmployeeId && (
              <span className="font-mono text-[10px] text-gray-400 ml-1">
                ({callback.assignedToEmployeeId})
              </span>
            )}
          </div>

          {callback.orderCode && (
            <div>
              <span className="text-gray-400 text-[10px] uppercase font-bold mr-1">Linked Order:</span>
              <span className="font-mono text-gold-600 dark:text-gold-400 font-bold">
                {callback.orderCode}
              </span>
            </div>
          )}

          {callback.ticketCode && (
            <div>
              <span className="text-gray-400 text-[10px] uppercase font-bold mr-1">Linked Ticket:</span>
              <span className="font-mono text-gold-600 dark:text-gold-400 font-bold">
                {callback.ticketCode}
              </span>
            </div>
          )}
        </div>

        {callback.followUpRequired && callback.nextCallbackDate && (
          <div className="flex items-center gap-1.5 bg-amber-500/10 dark:bg-amber-900/20 border border-amber-500/30 px-2.5 py-1 rounded-lg">
            <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">
              ⏰ Next Follow-up:
            </span>
            <span className="font-semibold text-luxury-black dark:text-white text-[11px]">
              {new Date(callback.nextCallbackDate).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <span
              className={`ml-1 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                PRIORITY_BADGES[callback.followUpPriority] || "bg-gray-500 text-white"
              }`}
            >
              {callback.followUpPriority}
            </span>
          </div>
        )}
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="m-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="text-sm cursor-pointer">×</button>
        </div>
      )}
      {success && (
        <div className="m-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <span>✅ {success}</span>
          <button onClick={() => setSuccess("")} className="text-sm cursor-pointer">×</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-4 pt-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/2">
        <button
          type="button"
          onClick={() => setActiveSubTab("add-remark")}
          className={`px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "add-remark"
              ? "bg-white dark:bg-[#1A1A1A] text-gold-600 dark:text-gold-400 border-t-2 border-gold-500 shadow-xs"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <span>✍️ Add Call Remark</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("history")}
          className={`px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "history"
              ? "bg-white dark:bg-[#1A1A1A] text-gold-600 dark:text-gold-400 border-t-2 border-gold-500 shadow-xs"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <span>📜 Remark History</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-white/10 font-mono">
            {callback.callRemarks?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("timeline")}
          className={`px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "timeline"
              ? "bg-white dark:bg-[#1A1A1A] text-gold-600 dark:text-gold-400 border-t-2 border-gold-500 shadow-xs"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <span>⏱️ Full Activity Timeline</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-white/10 font-mono">
            {callback.timeline?.length || 0}
          </span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {/* SUBTAB 1: ADD CALL REMARK */}
        {activeSubTab === "add-remark" && (
          <form onSubmit={handleSubmitRemark} className="space-y-4 max-w-3xl">
            {/* Call Outcome Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Call Outcome <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {[
                  "Connected",
                  "Not Answered",
                  "Busy",
                  "Switched Off",
                  "Wrong Number",
                  "Call Later Requested",
                  "Interested",
                  "Not Interested",
                  "Order Placed",
                  "Complaint Registered",
                  "Escalated",
                ].map((outcome) => (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => {
                      setCallOutcome(outcome);
                      if (outcome === "Call Later Requested" || outcome === "Call Back Later Requested") {
                        setFollowUpRequired(true);
                      } else if (outcome === "Order Placed" || outcome === "Not Interested") {
                        setFollowUpRequired(false);
                      }
                    }}
                    className={`p-2 rounded-xl text-xs text-left border transition cursor-pointer flex items-center justify-between ${
                      callOutcome === outcome
                        ? "border-gold-500 bg-gold-500/10 text-gold-700 dark:text-gold-300 font-bold shadow-xs ring-1 ring-gold-500"
                        : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10"
                    }`}
                  >
                    <span className="truncate">{outcome}</span>
                    {callOutcome === outcome && <span className="text-gold-500 text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Summary */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Conversation Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={conversationSummary}
                onChange={(e) => setConversationSummary(e.target.value)}
                placeholder="Key highlights from conversation with customer..."
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-3 text-xs outline-none focus:border-gold-500 focus:bg-white dark:focus:bg-[#222]"
              />
            </div>

            {/* Two Column Details: Customer Requirement & Issue Discussed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Customer Requirement
                </label>
                <textarea
                  rows={2}
                  value={customerRequirement}
                  onChange={(e) => setCustomerRequirement(e.target.value)}
                  placeholder="e.g. 2x Custom Wooden Engraved Keepsakes..."
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Issue Discussed
                </label>
                <textarea
                  rows={2}
                  value={issueDiscussed}
                  onChange={(e) => setIssueDiscussed(e.target.value)}
                  placeholder="e.g. Courier delivery window, discount coupon inquiry..."
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs outline-none focus:border-gold-500"
                />
              </div>
            </div>

            {/* Resolution Provided & Internal Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Resolution Provided
                </label>
                <textarea
                  rows={2}
                  value={resolutionProvided}
                  onChange={(e) => setResolutionProvided(e.target.value)}
                  placeholder="e.g. Explained expedited delivery, sent product proof via email..."
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Internal Notes (Staff Only)
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Confidential notes for team / managers..."
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2.5 text-xs outline-none focus:border-gold-500"
                />
              </div>
            </div>

            {/* FOLLOW-UP MANAGEMENT CARD */}
            <div className="p-4 rounded-xl border border-gold-300/40 dark:border-gold-900/30 bg-gold-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-luxury-black dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followUpRequired}
                    onChange={(e) => setFollowUpRequired(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-gold-500 focus:ring-gold-500"
                  />
                  <span>Follow-up Required</span>
                </label>

                {followUpRequired && (
                  <span className="text-[11px] text-gold-600 dark:text-gold-400 font-semibold">
                    🔔 Automated reminder will notify you, team lead & admin 15 mins prior.
                  </span>
                )}
              </div>

              {followUpRequired && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gold-200/30">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                      Next Callback Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required={followUpRequired}
                      value={nextCallbackDate}
                      onChange={(e) => setNextCallbackDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] p-2 text-xs outline-none focus:border-gold-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                      Follow-up Priority
                    </label>
                    <div className="flex items-center gap-2">
                      {["Low", "Medium", "High", "Urgent"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFollowUpPriority(p)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                            followUpPriority === p
                              ? `${PRIORITY_BADGES[p]} border-transparent shadow-xs`
                              : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#252525] text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={submittingRemark}
                className="px-6 py-2.5 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs shadow-md shadow-gold-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {submittingRemark ? "Saving Call Remark..." : "Save Call Remark & Update Timeline"}
              </button>
            </div>
          </form>
        )}

        {/* SUBTAB 2: REMARK HISTORY */}
        {activeSubTab === "history" && (
          <div className="space-y-4">
            {(!callback.callRemarks || callback.callRemarks.length === 0) ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No call remarks recorded yet. Switch to "Add Call Remark" to log the first attempt.
              </div>
            ) : (
              [...callback.callRemarks].reverse().map((remark, idx) => {
                const isLatest = idx === 0;
                return (
                  <div
                    key={remark._id || idx}
                    className={`p-4 rounded-2xl border transition ${
                      isLatest
                        ? "border-gold-500/40 bg-gold-500/5 shadow-xs"
                        : "border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/2"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            OUTCOME_STYLES[remark.callOutcome] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {remark.callOutcome}
                        </span>

                        <span className="text-xs font-bold text-luxury-black dark:text-white">
                          {remark.employeeName}
                        </span>
                        <span className="font-mono text-[10px] text-gray-400">
                          (ID: {remark.employeeId || "Staff"})
                        </span>

                        {isLatest && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold-500 text-white font-bold">
                            Latest Remark
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400 font-mono">
                          {new Date(remark.createdAt).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>

                        {/* 15-Minute Security Window for Latest Remark */}
                        {isLatest && latestRemarkInfo && (
                          <div>
                            {latestRemarkInfo.canEdit ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(remark)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer flex items-center gap-1 animate-pulse"
                              >
                                <span>✏️ Edit ({latestRemarkInfo.formattedCountdown})</span>
                              </button>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-medium">
                                🔒 Locked (15-min limit passed)
                              </span>
                            )}
                          </div>
                        )}

                        {!isLatest && (
                          <span className="text-[10px] text-gray-400 italic">
                            🔒 Permanent history
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remark Body */}
                    <div className="text-xs text-luxury-black dark:text-white leading-relaxed">
                      <p className="font-medium">{remark.conversationSummary}</p>
                    </div>

                    {/* Detailed Sections if captured */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {remark.customerRequirement && (
                        <div className="p-2 rounded-lg bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Requirement</span>
                          <span>{remark.customerRequirement}</span>
                        </div>
                      )}
                      {remark.resolutionProvided && (
                        <div className="p-2 rounded-lg bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Resolution</span>
                          <span>{remark.resolutionProvided}</span>
                        </div>
                      )}
                      {remark.issueDiscussed && (
                        <div className="p-2 rounded-lg bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Issue Discussed</span>
                          <span>{remark.issueDiscussed}</span>
                        </div>
                      )}
                      {remark.internalNotes && (
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Internal Note</span>
                          <span className="text-amber-800 dark:text-amber-300">{remark.internalNotes}</span>
                        </div>
                      )}
                    </div>

                    {/* Follow-up tag */}
                    {remark.followUpRequired && remark.nextCallbackDate && (
                      <div className="mt-2 text-[11px] text-gold-600 dark:text-gold-400 font-medium">
                        ⏰ Follow-up scheduled for: {new Date(remark.nextCallbackDate).toLocaleString()} (Priority: {remark.followUpPriority || "Medium"})
                      </div>
                    )}

                    {/* Edit History Audit Logs */}
                    {remark.editHistory && remark.editHistory.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-400">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          ✏️ Audit Log: Edited {remark.editHistory.length} {remark.editHistory.length === 1 ? "time" : "times"} within 15-min window
                        </span>
                        {remark.editHistory.map((ed, eIdx) => (
                          <div key={eIdx} className="mt-1 pl-2 border-l-2 border-amber-500/40">
                            Edited by <strong>{ed.editedByName}</strong> at {new Date(ed.editedAt).toLocaleTimeString()} - Reason: "{ed.reason}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SUBTAB 3: FULL ACTIVITY TIMELINE */}
        {activeSubTab === "timeline" && (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gold-500/30">
            {(!callback.timeline || callback.timeline.length === 0) ? (
              <div className="p-4 text-center text-gray-400 text-xs">No activity logged.</div>
            ) : (
              callback.timeline.map((event, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-gold-500 ring-4 ring-white dark:ring-[#1A1A1A] group-hover:scale-125 transition" />

                  <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-gold-500/30 transition">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-luxury-black dark:text-white">
                          {event.title}
                        </span>
                        {event.callOutcome && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold border ${
                              OUTCOME_STYLES[event.callOutcome] || "bg-gray-100"
                            }`}
                          >
                            {event.callOutcome}
                          </span>
                        )}
                      </div>

                      <span className="font-mono text-[10px] text-gray-400">
                        {new Date(event.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}{" "}
                        · {new Date(event.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {event.description}
                    </p>

                    <div className="mt-1.5 text-[10px] text-gray-400">
                      Action performed by: <span className="font-semibold text-luxury-black dark:text-white">{event.performedByName || "System"}</span>
                      {event.performedByEmployeeId && ` (${event.performedByEmployeeId})`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* EDIT MODAL FOR 15-MINUTE WINDOW EDIT */}
      {editingRemark && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 border border-gold-500/40 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-sm font-bold text-luxury-black dark:text-white">
                  Edit Latest Call Remark
                </h3>
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  ⏱️ Allowed within 15-minute window. All edits are logged in audit history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRemark(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditRemark} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Call Outcome
                </label>
                <select
                  value={editOutcome}
                  onChange={(e) => setEditOutcome(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 text-xs outline-none"
                >
                  {[
                    "Connected",
                    "Not Answered",
                    "Busy",
                    "Switched Off",
                    "Wrong Number",
                    "Call Later Requested",
                    "Interested",
                    "Not Interested",
                    "Order Placed",
                    "Complaint Registered",
                    "Escalated",
                  ].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Conversation Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Customer Requirement
                </label>
                <input
                  type="text"
                  value={editRequirement}
                  onChange={(e) => setEditRequirement(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Reason for Edit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Corrected requirement quantity, updated note..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRemark(null)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? "Saving Changes..." : "Save Modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallbackRemarksSection;
