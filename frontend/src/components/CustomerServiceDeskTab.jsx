import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import { getAdminAuth } from "../services/adminAuth";

const VERIFICATION_METHODS = [
  "Registered Mobile Number",
  "Registered Email",
  "Order Number",
  "Last Order Verification",
  "OTP Verification",
];

const RETURN_REASONS = [
  "Damaged Product",
  "Wrong Product Received",
  "Missing Item",
  "Defective Product",
  "Quality Not as Expected",
  "Size / Dimension Mismatch",
  "Other",
];

const CALL_OUTCOMES = [
  "Resolved on Call",
  "Action Initiated",
  "Follow-up Scheduled",
  "Callback Requested",
  "Escalated",
  "Customer Unreachable",
];

const ASSIGNED_TEAMS = [
  "Return Team",
  "Refund Team",
  "Logistics Team",
  "Inventory Team",
  "Technical Team",
];

export default function CustomerServiceDeskTab({ authHeader }) {
  // Authentication helper
  const getEffectiveAuthHeader = () => {
    if (authHeader && authHeader.headers) return authHeader;
    const admin = getAdminAuth();
    if (admin?.token) {
      return { headers: { Authorization: `Bearer ${admin.token}` } };
    }
    return {};
  };

  const currentAdmin = useMemo(() => getAdminAuth() || {}, []);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected Customer & 360 Profile
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [activeProfileTab, setActiveProfileTab] = useState("orders"); // "orders", "returns", "refunds", "tickets", "callbacks", "remarks", "verifications"

  // Feedback alerts
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 6000);
  };

  // Verification Widget State
  const [verifyMethod, setVerifyMethod] = useState("Registered Mobile Number");
  const [verifyStatus, setVerifyStatus] = useState("Confirmed");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Action Modals State
  const [activeModal, setActiveModal] = useState(null); // "return", "replacement", "refund", "ticket", "callback", "remark", "reports", "approvals"
  const [actionLoading, setActionLoading] = useState(false);

  // Form State: Return & Replacement
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [customerConsent, setCustomerConsent] = useState(true);
  const [callRefId, setCallRefId] = useState("");
  const [internalCallId, setInternalCallId] = useState("");
  const [targetTeam, setTargetTeam] = useState("Return Team");
  const [codRefundMethod, setCodRefundMethod] = useState("UPI");
  const [codUpiId, setCodUpiId] = useState("");

  // Form State: Refund Request (Enterprise Workflow)
  const [refundType, setRefundType] = useState("Full");
  const [customRefundAmount, setCustomRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("Original Source");
  const [refundReason, setRefundReason] = useState("Damaged Product");
  const [customerExplanation, setCustomerExplanation] = useState("");
  const [executiveRemarks, setExecutiveRemarks] = useState("");
  const [refundContactSource, setRefundContactSource] = useState("Phone Call");
  const [refundEvidenceUrl, setRefundEvidenceUrl] = useState("");
  const [refundJustification, setRefundJustification] = useState("");

  // Form State: Support Ticket
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("General Query");
  const [ticketPriority, setTicketPriority] = useState("Medium");
  const [ticketMessage, setTicketMessage] = useState("");

  // Form State: Callback
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackPurpose, setCallbackPurpose] = useState("");
  const [callbackPriority, setCallbackPriority] = useState("Medium");

  // Form State: Call Remarks
  const [callOutcome, setCallOutcome] = useState("Resolved on Call");
  const [discussionSummary, setDiscussionSummary] = useState("");
  const [customerRequestText, setCustomerRequestText] = useState("");
  const [actionTakenText, setActionTakenText] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [internalNotesText, setInternalNotesText] = useState("");

  // Pending Approvals Queue
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalActionNotes, setApprovalActionNotes] = useState({});

  // Reports
  const [reportsData, setReportsData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // 1. Search Customers
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

    setSearchLoading(true);
    setHasSearched(true);
    setErrorMsg("");
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.get(`/agent-assist/search?q=${encodeURIComponent(searchQuery.trim())}`, header);
      setSearchResults(res.data.customers || []);
      if (res.data.customers?.length === 1) {
        // Auto-select single match
        loadCustomer360(res.data.customers[0]._id);
      }
    } catch (err) {
      console.error("Search failed:", err);
      showError(err.response?.data?.message || "Customer search failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  // 2. Load Customer 360 Profile
  const loadCustomer360 = async (customerId) => {
    if (!customerId) return;
    setSelectedCustomerId(customerId);
    setProfileLoading(true);
    setErrorMsg("");
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.get(`/agent-assist/customer/${customerId}/360`, header);
      setProfileData(res.data);
      // Auto prefill latest order if exists
      if (res.data.orders && res.data.orders.length > 0) {
        setSelectedOrder(res.data.orders[0]);
        if (res.data.orders[0].products?.length > 0) {
          setSelectedProduct(res.data.orders[0].products[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load customer 360:", err);
      showError(err.response?.data?.message || "Failed to load customer profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  // 3. Verify Customer Identity Over Call
  const handleVerifyCustomer = async () => {
    if (!selectedCustomerId) return;
    setVerifying(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.post(
        "/agent-assist/verify-customer",
        {
          customerId: selectedCustomerId,
          verificationMethod: verifyMethod,
          confirmationStatus: verifyStatus,
          notes: verifyNotes,
        },
        header
      );
      showSuccess(res.data.message || "Customer verified on call!");
      setVerifyNotes("");
      loadCustomer360(selectedCustomerId);
    } catch (err) {
      console.error("Verification error:", err);
      showError(err.response?.data?.message || "Failed to verify customer.");
    } finally {
      setVerifying(false);
    }
  };

  // 4. Submit Agent Created Return
  const handleCreateReturn = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedOrder || !selectedProduct) {
      showError("Please select a customer, order, and product item.");
      return;
    }
    if (!customerConsent) {
      showError("Customer consent must be recorded as 'Consent Received' before submitting.");
      return;
    }

    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const payload = {
        customerId: selectedCustomerId,
        orderId: selectedOrder._id,
        items: [
          {
            productId: selectedProduct.productId || selectedProduct._id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            quantity: Number(itemQuantity) || 1,
            image: selectedProduct.image || "",
          },
        ],
        returnReason: reason,
        description,
        evidenceImages: evidenceUrl.trim() ? [{ url: evidenceUrl.trim() }] : [],
        customerConsent: "Consent Received",
        callReferenceId: callRefId,
        internalCallId,
        assignedTeam: targetTeam,
        codRefundMethod: selectedOrder.paymentMethod === "COD" ? codRefundMethod : "",
        codRefundDetails: selectedOrder.paymentMethod === "COD" && codRefundMethod === "UPI" ? { upiId: codUpiId } : {},
      };

      const res = await api.post("/agent-assist/returns", payload, header);
      showSuccess(res.data.message || "Return request created successfully.");
      setActiveModal(null);
      resetActionForms();
      loadCustomer360(selectedCustomerId);
    } catch (err) {
      console.error("Create return failed:", err);
      showError(err.response?.data?.message || "Failed to create return request.");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Submit Agent Created Replacement
  const handleCreateReplacement = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedOrder || !selectedProduct) {
      showError("Please select a customer, order, and product item.");
      return;
    }
    if (!customerConsent) {
      showError("Customer consent must be recorded as 'Consent Received'.");
      return;
    }

    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const payload = {
        customerId: selectedCustomerId,
        orderId: selectedOrder._id,
        items: [
          {
            productId: selectedProduct.productId || selectedProduct._id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            quantity: Number(itemQuantity) || 1,
            image: selectedProduct.image || "",
          },
        ],
        returnReason: reason,
        description,
        evidenceImages: evidenceUrl.trim() ? [{ url: evidenceUrl.trim() }] : [],
        customerConsent: "Consent Received",
        callReferenceId: callRefId,
        internalCallId,
        assignedTeam: targetTeam,
      };

      const res = await api.post("/agent-assist/replacements", payload, header);
      showSuccess(res.data.message || "Replacement request created successfully.");
      setActiveModal(null);
      resetActionForms();
      loadCustomer360(selectedCustomerId);
    } catch (err) {
      console.error("Create replacement failed:", err);
      showError(err.response?.data?.message || "Failed to create replacement.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Submit Agent Created Refund (Routes to Refund Team Queue)
  const handleCreateRefund = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedOrder) {
      showError("Please select a customer and order.");
      return;
    }
    if (!customerConsent) {
      showError("Customer consent must be recorded as 'Consent Received'.");
      return;
    }
    if (!refundReason) {
      showError("Refund reason is required.");
      return;
    }
    if (!customerExplanation.trim() && !refundJustification.trim()) {
      showError("Customer explanation or justification is required.");
      return;
    }

    const calculatedAmount = refundType === "Full" ? selectedOrder.totalPrice : Number(customRefundAmount);
    if (!calculatedAmount || calculatedAmount <= 0) {
      showError("Please specify a valid refund amount.");
      return;
    }

    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const payload = {
        customerId: selectedCustomerId,
        customerName: profileData?.customer?.name || selectedOrder.address?.fullName || "Customer",
        customerEmail: profileData?.customer?.email || selectedOrder.email || "",
        customerPhone: profileData?.customer?.mobileNumber || selectedOrder.address?.phone || "",
        orderId: selectedOrder._id,
        orderNumber: selectedOrder.orderCode,
        refundType,
        refundAmount: calculatedAmount,
        refundMethod,
        refundReason: refundReason || "Customer Return",
        customerExplanation: customerExplanation.trim() || refundJustification.trim(),
        executiveRemarks: executiveRemarks.trim() || refundJustification.trim(),
        supportingEvidence: refundEvidenceUrl.trim() ? [{ url: refundEvidenceUrl.trim(), name: "Uploaded Evidence" }] : [],
        source: refundContactSource,
      };

      const res = await api.post("/refunds/raise", payload, header);
      showSuccess(res.data.message || "Refund request submitted to Refund Team Queue.");
      setActiveModal(null);
      resetActionForms();
      loadCustomer360(selectedCustomerId);
    } catch (err) {
      console.error("Create refund failed:", err);
      showError(err.response?.data?.message || "Failed to initiate refund.");
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Submit Support Ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !ticketSubject.trim() || !ticketMessage.trim()) {
      showError("Subject and initial message are required.");
      return;
    }

    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const payload = {
        customerId: selectedCustomerId,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        category: ticketCategory,
        priority: ticketPriority,
        orderId: selectedOrder ? selectedOrder._id : null,
        customerConsent: customerConsent ? "Consent Received" : "Consent Not Received",
        callReferenceId: callRefId,
      };

      const res = await api.post("/agent-assist/tickets", payload, header);
      showSuccess(res.data.message || "Support ticket created successfully.");
      setActiveModal(null);
      resetActionForms();
      loadCustomer360(selectedCustomerId);
    } catch (err) {
      console.error("Create ticket failed:", err);
      showError(err.response?.data?.message || "Failed to create support ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Submit Callback Follow-Up
  const handleCreateCallback = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !callbackDate) {
      showError("Please specify a scheduled callback date and time.");
      return;
    }

    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const payload = {
        customerId: selectedCustomerId,
        scheduledDate: callbackDate,
        purpose: callbackPurpose,
        priority: callbackPriority,
        orderId: selectedOrder ? selectedOrder._id : null,
      };

      const res = await api.post("/agent-assist/callbacks", payload, header);
      showSuccess(res.data.message || "Callback scheduled.");
      setActiveModal(null);
      resetActionForms();
      loadCustomer360(selectedCustomerId);
    } catch (err) {
      console.error("Schedule callback failed:", err);
      showError(err.response?.data?.message || "Failed to schedule callback.");
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Submit Call Remarks
  const handleAddCallRemark = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !discussionSummary.trim()) {
      showError("Discussion summary is required.");
      return;
    }

    setActionLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const payload = {
        customerId: selectedCustomerId,
        orderId: selectedOrder ? selectedOrder._id : null,
        callOutcome,
        discussionSummary: discussionSummary.trim(),
        customerRequest: customerRequestText.trim(),
        actionTaken: actionTakenText.trim(),
        nextFollowUpDate: nextFollowUp || null,
        internalNotes: internalNotesText.trim(),
        customerConsent: customerConsent ? "Consent Received" : "Consent Not Received",
        callRecordingReference: callRefId.trim(),
        internalCallId: internalCallId.trim(),
      };

      const res = await api.post("/agent-assist/remarks", payload, header);
      showSuccess(res.data.message || "Call remarks logged.");
      setActiveModal(null);
      resetActionForms();
      loadCustomer360(selectedCustomerId);
    } catch (err) {
      console.error("Log call remarks failed:", err);
      showError(err.response?.data?.message || "Failed to save call remarks.");
    } finally {
      setActionLoading(false);
    }
  };

  // 10. Load Pending Refund Approvals Queue
  const fetchPendingApprovals = async () => {
    setApprovalsLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.get("/agent-assist/refunds/pending-approval", header);
      setPendingApprovals(res.data.refunds || []);
    } catch (err) {
      console.error("Failed to load approval queue:", err);
    } finally {
      setApprovalsLoading(false);
    }
  };

  // 11. Approve or Reject Refund
  const handleApproveRejectRefund = async (refundId, action) => {
    try {
      const header = getEffectiveAuthHeader();
      const remarks = approvalActionNotes[refundId] || "";
      const res = await api.patch(
        `/agent-assist/refunds/${refundId}/approval`,
        { action, remarks },
        header
      );
      showSuccess(res.data.message || `Refund successfully ${action.toLowerCase()}d.`);
      fetchPendingApprovals();
      if (selectedCustomerId) loadCustomer360(selectedCustomerId);
    } catch (err) {
      console.error(`Refund ${action} failed:`, err);
      showError(err.response?.data?.message || `Failed to ${action.toLowerCase()} refund.`);
    }
  };

  // 12. Load Reports
  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const res = await api.get("/agent-assist/reports", header);
      setReportsData(res.data);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setReportsLoading(false);
    }
  };

  // 13. Export CSV
  const handleExportCsv = () => {
    const admin = getAdminAuth();
    const token = admin?.token || "";
    window.open(`/api/agent-assist/reports/export?token=${token}`, "_blank");
  };

  const resetActionForms = () => {
    setDescription("");
    setEvidenceUrl("");
    setCustomerConsent(true);
    setCallRefId("");
    setInternalCallId("");
    setRefundJustification("");
    setRefundReason("Damaged Product");
    setCustomerExplanation("");
    setExecutiveRemarks("");
    setRefundContactSource("Phone Call");
    setRefundEvidenceUrl("");
    setCustomRefundAmount("");
    setTicketSubject("");
    setTicketMessage("");
    setCallbackDate("");
    setCallbackPurpose("");
    setDiscussionSummary("");
    setCustomerRequestText("");
    setActionTakenText("");
    setNextFollowUp("");
    setInternalNotesText("");
  };

  // Open modal with pre-selected order & item
  const openActionModal = (modalType, order = null, product = null) => {
    if (order) setSelectedOrder(order);
    if (product) setSelectedProduct(product);
    setActiveModal(modalType);
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-gray-800 dark:text-gray-100">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <p className="font-semibold text-sm">{successMsg}</p>
          </div>
          <button type="button" onClick={() => setSuccessMsg("")} className="text-sm font-bold opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="font-semibold text-sm">{errorMsg}</p>
          </div>
          <button type="button" onClick={() => setErrorMsg("")} className="text-sm font-bold opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header & Quick Action Shortcuts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6 rounded-3xl border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-3 bg-gradient-to-tr from-amber-500 to-gold-400 text-white rounded-2xl text-2xl shadow-sm">🤝</span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Customer Service Desk</h1>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Agent-Assisted Phone Call Operations — Verification, Returns, Replacements, Refunds & Support
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              fetchPendingApprovals();
              setActiveModal("approvals");
            }}
            className="px-4 py-2.5 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>⚖️</span>
            <span>Refund Approvals</span>
            {pendingApprovals.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] ml-1">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              fetchReports();
              setActiveModal("reports");
            }}
            className="px-4 py-2.5 rounded-2xl bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>📈</span>
            <span>Agent Performance</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Universal Search Bar */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 rounded-3xl border border-gray-200/80 dark:border-gray-800/80 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Customer by Name, Mobile Number, Email, Order Code (#ORD-...), Ticket ID, or Return ID..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={searchLoading}
            className="px-6 py-3.5 rounded-2xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {searchLoading ? (
              <span>Searching...</span>
            ) : (
              <>
                <span>Search Customer</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* Search Results Dropdown/Chips */}
        {hasSearched && (
          <div className="pt-2">
            {searchResults.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">No matching customers found for "{searchQuery}".</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Matching Customers ({searchResults.length}):</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.map((cust) => {
                    const isSelected = selectedCustomerId === cust._id;
                    return (
                      <div
                        key={cust._id}
                        onClick={() => loadCustomer360(cust._id)}
                        className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-gold-500/10 border-gold-500/50 ring-2 ring-gold-500/30"
                            : "bg-gray-50/70 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 hover:border-gold-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-gold-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
                            {cust.name?.charAt(0)?.toUpperCase() || "C"}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{cust.name}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{cust.mobileNumber || cust.email}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Orders: <strong className="text-gray-700 dark:text-gray-300">{cust.ordersCount}</strong> • Active Tkts: {cust.activeTicketsCount}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gold-600 dark:text-gold-400">
                          {isSelected ? "Active ✓" : "Select →"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading state for 360 profile */}
      {profileLoading && (
        <div className="p-12 text-center bg-white/50 dark:bg-gray-900/50 rounded-3xl border border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">Loading Customer 360 profile & order history...</p>
        </div>
      )}

      {/* Active Customer 360 Workspace */}
      {profileData && profileData.customer && !profileLoading && (
        <div className="space-y-6">
          {/* Customer Overview & Identity Verification Card */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 rounded-3xl border border-gray-200/80 dark:border-gray-800/80 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-200/80 dark:border-gray-800/80">
              {/* Profile Details */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-gold-400 text-white font-black text-2xl flex items-center justify-center shadow-md">
                  {profileData.customer.name?.charAt(0)?.toUpperCase() || "C"}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{profileData.customer.name}</h2>
                    {profileData.customer.isVerifiedOnCall ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                        <span>🛡️</span> Verified on Call
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                        <span>⚠️</span> Identity Pending Verification
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                      Status: {profileData.customer.status || "Active"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span>📞 {profileData.customer.mobileNumber || "No Phone"}</span>
                    <span>✉️ {profileData.customer.email || "No Email"}</span>
                    <span>Member since: {new Date(profileData.customer.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Financial & Order Metric Badges */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Lifetime Value</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{profileData.customer.lifetimeValue?.toLocaleString()}</p>
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Orders</p>
                  <p className="text-base font-black text-gray-800 dark:text-gray-200">{profileData.customer.totalOrders}</p>
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Orders</p>
                  <p className="text-base font-black text-blue-600 dark:text-blue-400">{profileData.customer.activeOrdersCount}</p>
                </div>
              </div>
            </div>

            {/* Verification Widget Bar */}
            <div className="p-4 rounded-2xl bg-gold-500/5 dark:bg-gold-500/10 border border-gold-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-2xl">🔐</span>
                <div>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Customer Identity Verification</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Verify caller details before initiating returns, refunds, or replacement requests.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-end">
                <select
                  value={verifyMethod}
                  onChange={(e) => setVerifyMethod(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-semibold"
                >
                  {VERIFICATION_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select
                  value={verifyStatus}
                  onChange={(e) => setVerifyStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-semibold"
                >
                  <option value="Confirmed">Confirmed (Verified)</option>
                  <option value="Failed">Failed (Mismatch)</option>
                  <option value="Pending">Pending Info</option>
                </select>

                <button
                  type="button"
                  disabled={verifying}
                  onClick={handleVerifyCustomer}
                  className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {verifying ? "Logging..." : "Confirm Verification ✓"}
                </button>
              </div>
            </div>

            {/* Agent Action Buttons Bar (Always accessible once customer is loaded) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Agent Assisted Actions:</p>
                {!profileData.customer.isVerifiedOnCall && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    * Reminder: Verify customer above before taking action
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                <button
                  type="button"
                  onClick={() => openActionModal("return")}
                  className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold text-xs transition flex flex-col items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="text-lg">📦</span>
                  <span>Create Return</span>
                </button>

                <button
                  type="button"
                  onClick={() => openActionModal("replacement")}
                  className="p-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition flex flex-col items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="text-lg">🔄</span>
                  <span>Create Replacement</span>
                </button>

                <button
                  type="button"
                  onClick={() => openActionModal("refund")}
                  className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition flex flex-col items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="text-lg">💰</span>
                  <span>Issue Refund</span>
                </button>

                <button
                  type="button"
                  onClick={() => openActionModal("ticket")}
                  className="p-3 rounded-2xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100/60 dark:hover:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold text-xs transition flex flex-col items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="text-lg">🎫</span>
                  <span>Open Ticket</span>
                </button>

                <button
                  type="button"
                  onClick={() => openActionModal("callback")}
                  className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold text-xs transition flex flex-col items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="text-lg">📞</span>
                  <span>Schedule Callback</span>
                </button>

                <button
                  type="button"
                  onClick={() => openActionModal("remark")}
                  className="p-3 rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-xs transition flex flex-col items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="text-lg">✍️</span>
                  <span>Log Remarks</span>
                </button>
              </div>
            </div>
          </div>

          {/* Customer 360 Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto pb-2">
            {[
              { id: "orders", label: `Orders (${profileData.orders?.length || 0})`, icon: "📦" },
              { id: "returns", label: `Returns & Replacements (${profileData.returnRequests?.length || 0})`, icon: "🔄" },
              { id: "refunds", label: `Refund Records (${profileData.refundRecords?.length || 0})`, icon: "💰" },
              { id: "tickets", label: `Support Tickets (${profileData.tickets?.length || 0})`, icon: "🎧" },
              { id: "callbacks", label: `Callbacks (${profileData.callbacks?.length || 0})`, icon: "📞" },
              { id: "remarks", label: `Call Remarks & Logs (${profileData.callRemarks?.length || 0})`, icon: "📝" },
              { id: "verifications", label: `Verification Audit (${profileData.verificationLogs?.length || 0})`, icon: "🛡️" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveProfileTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeProfileTab === tab.id
                    ? "bg-gold-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Sub-Tab 1: Orders with Line Items */}
          {activeProfileTab === "orders" && (
            <div className="space-y-4">
              {profileData.orders?.length === 0 ? (
                <div className="p-8 text-center bg-white/40 dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 text-sm text-gray-500">
                  No orders placed by this customer yet.
                </div>
              ) : (
                profileData.orders.map((ord) => (
                  <div
                    key={ord._id}
                    className="p-5 rounded-3xl bg-white/70 dark:bg-gray-900/70 border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-gray-900 dark:text-white">Order #{ord.orderCode}</span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {ord.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            Payment: {ord.paymentMethod} ({ord.paymentStatus})
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Placed on: {new Date(ord.createdAt).toLocaleString()} • Total Amount: <strong className="text-emerald-600 dark:text-emerald-400">₹{ord.totalPrice}</strong>
                        </p>
                      </div>

                      {/* Quick Actions for this Order */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openActionModal("return", ord)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 font-bold text-xs transition cursor-pointer"
                        >
                          Return Order
                        </button>
                        <button
                          type="button"
                          onClick={() => openActionModal("replacement", ord)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20 font-bold text-xs transition cursor-pointer"
                        >
                          Replace Item
                        </button>
                        <button
                          type="button"
                          onClick={() => openActionModal("refund", ord)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs transition cursor-pointer"
                        >
                          Issue Refund
                        </button>
                      </div>
                    </div>

                    {/* Order Line Items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {ord.products?.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-xl border border-gray-200 dark:border-gray-700" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">🎁</div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{item.name}</p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                Qty: {item.quantity} • ₹{item.price}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-right">
                            <button
                              type="button"
                              onClick={() => openActionModal("return", ord, item)}
                              className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              Return Item
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal("replacement", ord, item)}
                              className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              Replace Item
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sub-Tab 2: Returns & Replacements */}
          {activeProfileTab === "returns" && (
            <div className="space-y-3">
              {profileData.returnRequests?.length === 0 ? (
                <div className="p-8 text-center bg-white/40 dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 text-sm text-gray-500">
                  No return or replacement requests for this customer.
                </div>
              ) : (
                profileData.returnRequests.map((ret) => (
                  <div
                    key={ret._id}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">#{ret.requestId || ret.returnCode}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400">
                          {ret.requestType}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          {ret.status}
                        </span>
                        {ret.isAgentCreated && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-600">
                            AGENT CREATED ({ret.createdAgentName})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Reason: <strong>{ret.returnReason || ret.reason}</strong> • Team: {ret.assignedTeam || "Return Team"} • Date: {new Date(ret.createdAt).toLocaleString()}
                      </p>
                      {ret.callReferenceId && (
                        <p className="text-[11px] text-gray-400 mt-0.5">📞 Call Ref: {ret.callReferenceId}</p>
                      )}
                    </div>

                    <div className="text-right text-xs">
                      <span className="font-semibold text-gray-400">Items: {ret.items?.length || 1}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sub-Tab 3: Refunds */}
          {activeProfileTab === "refunds" && (
            <div className="space-y-3">
              {profileData.refundRecords?.length === 0 ? (
                <div className="p-8 text-center bg-white/40 dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 text-sm text-gray-500">
                  No refund transactions on record.
                </div>
              ) : (
                profileData.refundRecords.map((ref) => (
                  <div
                    key={ref._id}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">#{ref.refundId}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          ₹{ref.refundAmount} ({ref.refundType || "Full"})
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600">
                          Stage: {ref.approvalStage || "Directly Approved"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Method: {ref.refundMethod} • Status: {ref.refundStatus} • Processed by: {ref.agentName || ref.processedByName || "Support"}
                      </p>
                      {ref.refundJustification && (
                        <p className="text-xs text-gray-400 italic mt-0.5">"{ref.refundJustification}"</p>
                      )}
                    </div>

                    <div className="text-right text-xs text-gray-400">
                      {new Date(ref.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sub-Tab 4: Support Tickets */}
          {activeProfileTab === "tickets" && (
            <div className="space-y-3">
              {profileData.tickets?.length === 0 ? (
                <div className="p-8 text-center bg-white/40 dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 text-sm text-gray-500">
                  No support tickets recorded for this customer.
                </div>
              ) : (
                profileData.tickets.map((t) => (
                  <div
                    key={t._id}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">#{t.ticketCode}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          {t.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600">
                          Priority: {t.priority}
                        </span>
                      </div>
                      <h4 className="font-semibold text-xs text-gray-800 dark:text-gray-200 mt-1">{t.subject}</h4>
                      <p className="text-xs text-gray-400">
                        Assigned: {t.assignedAgent?.name || "Unassigned"} • Category: {t.category}
                      </p>
                    </div>

                    <div className="text-right text-xs text-gray-400">
                      {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sub-Tab 5: Callbacks */}
          {activeProfileTab === "callbacks" && (
            <div className="space-y-3">
              {profileData.callbacks?.length === 0 ? (
                <div className="p-8 text-center bg-white/40 dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 text-sm text-gray-500">
                  No callback follow-ups scheduled.
                </div>
              ) : (
                profileData.callbacks.map((cb) => (
                  <div
                    key={cb._id}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">#{cb.callbackCode}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          {cb.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Purpose: {cb.notes || "Follow-up"}</p>
                      <p className="text-xs text-gray-400">Scheduled: {new Date(cb.nextCallbackDate).toLocaleString()}</p>
                    </div>

                    <div className="text-right text-xs text-gray-400">
                      Assigned to: {cb.assignedToName || "Staff"}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sub-Tab 6: Call Remarks History (Append-only) */}
          {activeProfileTab === "remarks" && (
            <div className="space-y-3">
              {profileData.callRemarks?.length === 0 ? (
                <div className="p-8 text-center bg-white/40 dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 text-sm text-gray-500">
                  No live call remarks recorded yet. Use the "Log Remarks" action above to record notes.
                </div>
              ) : (
                profileData.callRemarks.map((rem) => (
                  <div
                    key={rem._id}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400">
                          {rem.callOutcome}
                        </span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Agent: {rem.agentName} ({rem.agentRole})
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(rem.createdAt).toLocaleString()}</span>
                    </div>

                    <p className="text-xs text-gray-800 dark:text-gray-200 font-medium">
                      <strong>Summary:</strong> {rem.discussionSummary}
                    </p>

                    {rem.customerRequest && (
                      <p className="text-xs text-gray-500"><strong>Customer Request:</strong> {rem.customerRequest}</p>
                    )}
                    {rem.actionTaken && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400"><strong>Action Taken:</strong> {rem.actionTaken}</p>
                    )}
                    {rem.nextFollowUpDate && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        <strong>Next Follow-Up:</strong> {new Date(rem.nextFollowUpDate).toLocaleString()}
                      </p>
                    )}
                    {rem.callRecordingReference && (
                      <p className="text-[11px] text-gray-400">📞 Recording / Call Ref: {rem.callRecordingReference}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sub-Tab 7: Verification Logs */}
          {activeProfileTab === "verifications" && (
            <div className="space-y-3">
              {profileData.verificationLogs?.length === 0 ? (
                <div className="p-8 text-center bg-white/40 dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800 text-sm text-gray-500">
                  No verification records found.
                </div>
              ) : (
                profileData.verificationLogs.map((v) => (
                  <div
                    key={v._id}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900 dark:text-white">{v.verificationMethod}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          v.confirmationStatus === "Confirmed"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}>
                          {v.confirmationStatus}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Verified By: {v.verifiedByName} ({v.verifiedByRole})</p>
                      {v.notes && <p className="text-xs text-gray-400 italic">Notes: "{v.notes}"</p>}
                    </div>

                    <div className="text-right text-xs text-gray-400">
                      {new Date(v.verifiedAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL 1: CREATE RETURN REQUEST
         ======================================================== */}
      {activeModal === "return" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📦</span> Create Return Request (On Call)
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-4 text-xs">
              {/* Select Order */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Select Order *</label>
                <select
                  value={selectedOrder?._id || ""}
                  onChange={(e) => {
                    const ord = profileData?.orders?.find((o) => o._id === e.target.value);
                    setSelectedOrder(ord);
                    if (ord?.products?.length > 0) setSelectedProduct(ord.products[0]);
                  }}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                >
                  {profileData?.orders?.map((o) => (
                    <option key={o._id} value={o._id}>
                      #{o.orderCode} (₹{o.totalPrice}) — {new Date(o.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Item */}
              {selectedOrder?.products && (
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Select Product Item *</label>
                  <select
                    value={selectedProduct?.productId || selectedProduct?._id || ""}
                    onChange={(e) => {
                      const prod = selectedOrder.products.find((p) => (p.productId || p._id) === e.target.value);
                      setSelectedProduct(prod);
                    }}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                  >
                    {selectedOrder.products.map((p, idx) => (
                      <option key={idx} value={p.productId || p._id}>
                        {p.name} (Qty: {p.quantity} • ₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Return Reason */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Return Reason *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Customer Discussion / Description */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Customer Message / Remarks</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details explained by the customer on the call..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>

              {/* Optional Evidence URL */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Evidence Photo / Video Link (Optional)</label>
                <input
                  type="text"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://... or customer shared image URL"
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>

              {/* Assigned Team */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Assign To Team</label>
                <select
                  value={targetTeam}
                  onChange={(e) => setTargetTeam(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                >
                  {ASSIGNED_TEAMS.map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              {/* Call Reference ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Call Recording / Ref ID</label>
                  <input
                    type="text"
                    value={callRefId}
                    onChange={(e) => setCallRefId(e.target.value)}
                    placeholder="e.g. REC-98421"
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Internal Call ID</label>
                  <input
                    type="text"
                    value={internalCallId}
                    onChange={(e) => setInternalCallId(e.target.value)}
                    placeholder="e.g. CALL-2026-001"
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  />
                </div>
              </div>

              {/* Customer Consent Checkbox */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="consentCheck"
                  checked={customerConsent}
                  onChange={(e) => setCustomerConsent(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-gold-500 focus:ring-gold-500 cursor-pointer"
                />
                <label htmlFor="consentCheck" className="text-xs font-bold text-amber-800 dark:text-amber-300 cursor-pointer">
                  Customer Consent Verified: Customer explicitly consented to initiating this Return Request over the call.
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Submit Return Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: CREATE REPLACEMENT REQUEST
         ======================================================== */}
      {activeModal === "replacement" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🔄</span> Create Replacement Request (Reserve Stock)
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateReplacement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Select Order *</label>
                <select
                  value={selectedOrder?._id || ""}
                  onChange={(e) => {
                    const ord = profileData?.orders?.find((o) => o._id === e.target.value);
                    setSelectedOrder(ord);
                    if (ord?.products?.length > 0) setSelectedProduct(ord.products[0]);
                  }}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                >
                  {profileData?.orders?.map((o) => (
                    <option key={o._id} value={o._id}>
                      #{o.orderCode} (₹{o.totalPrice}) — {new Date(o.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrder?.products && (
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Select Item for Replacement *</label>
                  <select
                    value={selectedProduct?.productId || selectedProduct?._id || ""}
                    onChange={(e) => {
                      const prod = selectedOrder.products.find((p) => (p.productId || p._id) === e.target.value);
                      setSelectedProduct(prod);
                    }}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                  >
                    {selectedOrder.products.map((p, idx) => (
                      <option key={idx} value={p.productId || p._id}>
                        {p.name} (Qty: {p.quantity} • ₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Replacement Reason *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Reason Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why the customer requested a replacement..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>

              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs">
                ℹ️ <strong>Inventory Reservation:</strong> 1 replacement unit will be reserved from stock immediately upon creation.
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="repConsent"
                  checked={customerConsent}
                  onChange={(e) => setCustomerConsent(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-gold-500 focus:ring-gold-500 cursor-pointer"
                />
                <label htmlFor="repConsent" className="text-xs font-bold text-amber-800 dark:text-amber-300 cursor-pointer">
                  Customer Consent Verified: Customer consented to dispatching a replacement.
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Approve & Reserve Replacement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: CREATE REFUND REQUEST (FULL OR PARTIAL)
         ======================================================== */}
      {activeModal === "refund" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>💰</span> Issue Refund Request (On Call)
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateRefund} className="space-y-4 text-xs">
              {/* Contact Source Channel */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Customer Contact Channel *</label>
                <select
                  value={refundContactSource}
                  onChange={(e) => setRefundContactSource(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                >
                  <option value="Phone Call">📞 Phone Call</option>
                  <option value="Callback Request">📲 Callback Request</option>
                  <option value="Support Ticket">🎫 Support Ticket</option>
                  <option value="Email">✉️ Email</option>
                  <option value="WhatsApp Inquiry">💬 WhatsApp Inquiry</option>
                  <option value="Complaint">⚠️ Complaint</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                  <input
                    type="text"
                    readOnly
                    value={profileData?.customer?.name || "Customer"}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold text-gray-600 dark:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Order Number *</label>
                  <select
                    value={selectedOrder?._id || ""}
                    onChange={(e) => setSelectedOrder(profileData?.orders?.find((o) => o._id === e.target.value))}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                  >
                    {profileData?.orders?.map((o) => (
                      <option key={o._id} value={o._id}>
                        #{o.orderCode} — Total: ₹{o.totalPrice} ({o.paymentMethod})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Full vs Partial Refund */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Refund Type *</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="refType"
                      checked={refundType === "Full"}
                      onChange={() => setRefundType("Full")}
                    />
                    <span>Full Refund (₹{selectedOrder?.totalPrice || 0})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="refType"
                      checked={refundType === "Partial"}
                      onChange={() => setRefundType("Partial")}
                    />
                    <span>Partial Refund</span>
                  </label>
                </div>
              </div>

              {refundType === "Partial" && (
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Partial Refund Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedOrder?.totalPrice || 100000}
                    value={customRefundAmount}
                    onChange={(e) => setCustomRefundAmount(e.target.value)}
                    placeholder="Enter amount to refund..."
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Refund Reason *</label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                  >
                    <option value="Damaged Product">Damaged Product</option>
                    <option value="Order Cancellation">Order Cancellation</option>
                    <option value="Wrong Product Received">Wrong Product Received</option>
                    <option value="Missing Item">Missing Item</option>
                    <option value="Defective Product">Defective Product</option>
                    <option value="Delay in Delivery">Delay in Delivery</option>
                    <option value="Customer Complaint">Customer Complaint</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Payout Method *</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                  >
                    <option value="Original Source">Original Source ({selectedOrder?.paymentMethod || "Prepaid"})</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Store Credit">Store Credit / Wallet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Customer Explanation *</label>
                <textarea
                  rows={2}
                  value={customerExplanation}
                  onChange={(e) => setCustomerExplanation(e.target.value)}
                  placeholder="Record customer's exact statement/explanation for requesting a refund..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Executive Remarks (Audit Record)</label>
                <textarea
                  rows={2}
                  value={executiveRemarks}
                  onChange={(e) => setExecutiveRemarks(e.target.value)}
                  placeholder="Executive's initial assessment, verified call outcome, or recommendation for the Refund Team..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Supporting Evidence URL (Optional)</label>
                <input
                  type="text"
                  value={refundEvidenceUrl}
                  onChange={(e) => setRefundEvidenceUrl(e.target.value)}
                  placeholder="https://... photo, chat log, or call transcript link"
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                />
              </div>

              {/* Policy & Separation of Duties Notice */}
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs leading-relaxed">
                ℹ️ <strong>Workflow Policy:</strong> As a Customer Service Executive, submitting this form generates a sequential refund record (<code>REF-YYYY-000001</code>) and routes it directly to the <strong>Refund Team Queue</strong>. Only authorized Refund Team members verify payments and execute gateway payouts.
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="refConsent"
                  checked={customerConsent}
                  onChange={(e) => setCustomerConsent(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-gold-500 focus:ring-gold-500 cursor-pointer"
                />
                <label htmlFor="refConsent" className="text-xs font-bold text-amber-800 dark:text-amber-300 cursor-pointer">
                  Customer Consent Verified: Customer consented to this refund payout request on call.
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {actionLoading ? "Submitting..." : "Raise Refund Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: CREATE SUPPORT TICKET
         ======================================================== */}
      {activeModal === "ticket" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🎫</span> Open Support Ticket (On Call)
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Ticket subject..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                  >
                    <option value="General Query">General Query</option>
                    <option value="Product Inquiry">Product Inquiry</option>
                    <option value="Order Issue">Order Issue</option>
                    <option value="Complaint">Complaint</option>
                    <option value="Return / Replacement">Return / Replacement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Initial Message *</label>
                <textarea
                  rows={4}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Detailed notes from the customer conversation..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition disabled:opacity-50"
                >
                  {actionLoading ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: SCHEDULE CALLBACK
         ======================================================== */}
      {activeModal === "callback" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📞</span> Schedule Callback Follow-Up
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCallback} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Purpose / Notes</label>
                <textarea
                  rows={3}
                  value={callbackPurpose}
                  onChange={(e) => setCallbackPurpose(e.target.value)}
                  placeholder="What needs to be discussed on this callback?..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={callbackPriority}
                  onChange={(e) => setCallbackPriority(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition disabled:opacity-50"
                >
                  {actionLoading ? "Scheduling..." : "Schedule Callback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 6: LOG CALL REMARKS
         ======================================================== */}
      {activeModal === "remark" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>✍️</span> Record Call Remarks & Outcome
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddCallRemark} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Call Outcome *</label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold"
                >
                  {CALL_OUTCOMES.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Discussion Summary *</label>
                <textarea
                  rows={3}
                  value={discussionSummary}
                  onChange={(e) => setDiscussionSummary(e.target.value)}
                  placeholder="Summary of what was discussed during the phone call..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Customer Request</label>
                  <input
                    type="text"
                    value={customerRequestText}
                    onChange={(e) => setCustomerRequestText(e.target.value)}
                    placeholder="Specific request made..."
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Action Taken</label>
                  <input
                    type="text"
                    value={actionTakenText}
                    onChange={(e) => setActionTakenText(e.target.value)}
                    placeholder="What action was taken on the call..."
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Next Follow-Up Date</label>
                  <input
                    type="datetime-local"
                    value={nextFollowUp}
                    onChange={(e) => setNextFollowUp(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Call Recording / Ref ID</label>
                  <input
                    type="text"
                    value={callRefId}
                    onChange={(e) => setCallRefId(e.target.value)}
                    placeholder="e.g. REC-8492"
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Internal Notes (Private Staff View)</label>
                <textarea
                  rows={2}
                  value={internalNotesText}
                  onChange={(e) => setInternalNotesText(e.target.value)}
                  placeholder="Private notes for other agents..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Call Remark"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 7: REFUND APPROVALS QUEUE (FOR TEAM LEADS / MANAGERS)
         ======================================================== */}
      {activeModal === "approvals" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>⚖️</span> Team Lead Refund Approval Queue
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            {approvalsLoading ? (
              <div className="p-8 text-center text-xs font-semibold text-gray-500">Loading queue...</div>
            ) : pendingApprovals.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 italic">No refunds currently waiting for approval.</div>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map((ref) => (
                  <div
                    key={ref._id}
                    className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">#{ref.refundId}</span>
                        <span className="ml-2 text-xs font-bold text-emerald-600">₹{ref.refundAmount} ({ref.refundType})</span>
                        <p className="text-xs text-gray-500">Order: #{ref.orderId?.orderCode} • Agent: {ref.agentName} ({ref.agentRole})</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600">
                        Pending Sign-Off
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      <strong>Justification:</strong> {ref.refundJustification || "None provided"}
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add approval / rejection note..."
                        value={approvalActionNotes[ref._id] || ""}
                        onChange={(e) =>
                          setApprovalActionNotes({
                            ...approvalActionNotes,
                            [ref._id]: e.target.value,
                          })
                        }
                        className="flex-1 p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleApproveRejectRefund(ref._id, "Approve")}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        Approve ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveRejectRefund(ref._id, "Reject")}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        Reject ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 8: AGENT PERFORMANCE & REPORTS
         ======================================================== */}
      {activeModal === "reports" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📈</span> Agent Customer Service Performance
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            {reportsLoading ? (
              <div className="p-8 text-center text-xs font-semibold text-gray-500">Calculating metrics...</div>
            ) : !reportsData ? (
              <div className="p-8 text-center text-xs text-gray-400">Failed to load reports.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Verifications</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">{reportsData.metrics?.totalVerifications || 0}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Returns Created</p>
                    <p className="text-lg font-black text-rose-600">{reportsData.metrics?.agentReturnsCount || 0}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Replacements</p>
                    <p className="text-lg font-black text-indigo-600">{reportsData.metrics?.agentReplacementsCount || 0}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Total Refunded</p>
                    <p className="text-lg font-black text-emerald-600">₹{reportsData.metrics?.totalRefundAmount?.toLocaleString() || 0}</p>
                  </div>
                </div>

                {/* Call Outcomes Distribution */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Call Outcomes Breakdown:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {reportsData.callOutcomes?.map((co) => (
                      <div key={co.outcome} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs flex justify-between">
                        <span>{co.outcome}</span>
                        <strong className="text-gold-600">{co.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <span>📥</span>
                    <span>Download Full CSV Report</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
