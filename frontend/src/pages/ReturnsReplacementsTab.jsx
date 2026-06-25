import React, { useState, useEffect } from "react";
import api, { resolveMediaUrl } from "../services/api";
import { getAdminAuth } from "../services/adminAuth";

const ReturnsReplacementsTab = () => {
  const [activeSubTab, setActiveSubTab] = useState("returns"); // "returns" or "replacements"
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [note, setNote] = useState("");
  const [courier, setCourier] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [showShipForm, setShowShipForm] = useState(false);
  const [createReplacementOrder, setCreateReplacementOrder] = useState(true);

  const authHeader = {
    headers: { Authorization: `Bearer ${getAdminAuth()?.token}` },
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint =
        activeSubTab === "returns"
          ? "/admin-requests"
          : "/admin-replacements";
      const { data } = await api.get(`/returns${endpoint}`, authHeader);
      setRequests(data || []);
    } catch (err) {
      setError(`Failed to load ${activeSubTab} requests.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    setFilterStatus("All");
    setNote("");
    setCourier("");
    setTrackingId("");
    setShowShipForm(false);
  }, [activeSubTab]);

  const handleUpdateStatus = async (id, newStatus, payload = {}) => {
    setError("");
    setSuccess("");
    try {
      const endpoint =
        activeSubTab === "returns"
          ? `/admin-requests/${id}`
          : `/admin-replacements/${id}`;
      await api.put(
        `/returns${endpoint}`,
        { status: newStatus, ...payload },
        authHeader
      );
      setSuccess(`${activeSubTab === "returns" ? "Return" : "Replacement"} updated successfully.`);
      fetchRequests();
      setNote("");
      setShowShipForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status.");
    }
  };

  const returnStatusFilters = [
    "All",
    "Pending",
    "Under Review",
    "Approved",
    "Pickup Scheduled",
    "Item Received",
    "Refund Processed",
    "Rejected",
  ];

  const replacementStatusFilters = [
    "All",
    "Pending",
    "Under Review",
    "Investigation In Progress",
    "Evidence Verified",
    "Approved",
    "Pickup Scheduled",
    "Item Picked Up",
    "Item Received & Verified",
    "Replacement Packed",
    "Shipped",
    "Delivered",
    "Rejected",
  ];

  const currentFilters =
    activeSubTab === "returns" ? returnStatusFilters : replacementStatusFilters;

  const filteredRequests = requests.filter(
    (req) => filterStatus === "All" || req.status === filterStatus
  );

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Sub-tab Navigation */}
      <div className="flex border-b border-gold-200/20 dark:border-gold-900/20">
        <button
          onClick={() => setActiveSubTab("returns")}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
            activeSubTab === "returns"
              ? "border-b-2 border-gold-500 text-gold-600 dark:text-gold-400"
              : "text-gray-500 hover:text-gold-500 cursor-pointer"
          }`}
        >
          Return Requests
        </button>
        <button
          onClick={() => setActiveSubTab("replacements")}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
            activeSubTab === "replacements"
              ? "border-b-2 border-gold-500 text-gold-600 dark:text-gold-400"
              : "text-gray-500 hover:text-gold-500 cursor-pointer"
          }`}
        >
          Replacement Requests
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-600">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-xs font-medium text-green-600">
          ✓ {success}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {currentFilters.map((status) => {
          const count =
            status === "All"
              ? requests.length
              : requests.filter((r) => r.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterStatus === status
                  ? "bg-gold-500 text-white shadow-md shadow-gold-500/20 border border-gold-500"
                  : "bg-white/50 dark:bg-white/5 border border-gold-200/20 dark:border-gold-900/20 text-gray-lux dark:text-gray-400 hover:border-gold-500"
              }`}
            >
              {status} ({count})
            </button>
          );
        })}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center text-sm font-medium text-gold-500 py-10">
          Loading requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-gold-200/10 bg-white/50 dark:bg-white/5 p-10 text-center shadow-sm">
          <p className="text-sm font-serif text-gray-lux dark:text-gray-400">
            No {activeSubTab} found for the selected filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((req) => (
            <div
              key={req._id}
              className="flex flex-col rounded-2xl border border-gold-200/20 dark:border-gold-900/20 bg-white/70 dark:bg-[#1C1C1C] p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between border-b border-gold-200/10 dark:border-gold-900/10 pb-3">
                <div>
                  <p className="font-mono text-xs font-bold text-gold-600 dark:text-gold-400">
                    #{req.returnCode || req.replacementCode}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                    req.status === "Approved" ||
                    req.status === "Refund Processed" ||
                    req.status === "Delivered"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : req.status === "Rejected"
                      ? "bg-red-50 text-red-600 border border-red-200"
                      : "bg-gold-50 text-gold-600 border border-gold-200"
                  }`}
                >
                  {req.status}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Customer</p>
                  <p className="text-xs font-medium text-luxury-black dark:text-white">
                    {req.customerId?.name || "Unknown"}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {req.customerId?.email} | {req.customerId?.mobileNumber}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Order ID</p>
                  <p className="text-xs text-luxury-black dark:text-white">
                    {req.orderId?.orderCode}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Reason</p>
                  <p className="text-xs font-medium text-red-600">{req.reason}</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {req.description}
                  </p>
                </div>

                {req.codRefundMethod && (
                  <div className="rounded-xl border border-gold-300/30 bg-gold-50/5 dark:bg-gold-950/5 p-3 space-y-1.5 mt-2">
                    <p className="text-[10px] font-bold uppercase text-gold-600 dark:text-gold-400 tracking-wider border-b border-gold-200/10 dark:border-gold-900/10 pb-1">💸 COD Refund Details</p>
                    <p className="text-xs">Method: <strong className="text-luxury-black dark:text-white">{req.codRefundMethod}</strong></p>
                    {req.codRefundMethod === "UPI" ? (
                      <p className="text-xs">UPI ID: <strong className="text-luxury-black dark:text-white">{req.codRefundDetails?.upiId}</strong></p>
                    ) : (
                      <div className="space-y-0.5 text-xs">
                        <p>Holder: <strong className="text-luxury-black dark:text-white">{req.codRefundDetails?.accountHolderName}</strong></p>
                        <p>Bank: <strong className="text-luxury-black dark:text-white">{req.codRefundDetails?.bankName}</strong></p>
                        <p>Account: <strong className="text-luxury-black dark:text-white">{req.codRefundDetails?.accountNumber}</strong></p>
                        <p>IFSC: <strong className="text-luxury-black dark:text-white uppercase">{req.codRefundDetails?.ifscCode}</strong></p>
                      </div>
                    )}
                  </div>
                )}

                {req.images && req.images.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">
                      Attached Photos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {req.images.map((img, i) => (
                        <a
                          key={i}
                          href={resolveMediaUrl(img.url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={resolveMediaUrl(img.url)}
                            alt="Return Evidence"
                            className="h-12 w-12 rounded-lg border border-gold-200/20 object-cover hover:opacity-80 transition"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {req.video && req.video.url && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">
                      Unboxing Video
                    </p>
                    <video
                      src={resolveMediaUrl(req.video.url)}
                      controls
                      className="w-full rounded-lg border border-gold-200/20 max-h-40 bg-black/5"
                    />
                  </div>
                )}

                {req.pickupDetails?.trackingId && (
                  <div className="rounded-xl border border-gold-300/30 bg-gold-50/5 dark:bg-gold-950/5 p-3 space-y-1.5 mt-2">
                    <p className="text-[10px] font-bold uppercase text-gold-600 dark:text-gold-400 tracking-wider border-b border-gold-200/10 dark:border-gold-900/10 pb-1">📦 Reverse Pickup Logistics</p>
                    <p className="text-xs text-luxury-black dark:text-white">Courier: <strong>{req.pickupDetails.courier || "Registered Partner"}</strong></p>
                    <p className="text-xs text-luxury-black dark:text-white">AWB Tracking ID: <strong>{req.pickupDetails.trackingId}</strong></p>
                    {req.pickupDetails.pickupDate && (
                      <p className="text-xs text-luxury-black dark:text-white">Scheduled: <strong>{new Date(req.pickupDetails.pickupDate).toLocaleDateString()}</strong></p>
                    )}
                  </div>
                )}

                {req.shippingDetails?.trackingId && (
                  <div className="rounded-xl border border-gold-300/30 bg-gold-50/5 dark:bg-gold-950/5 p-3 space-y-1.5 mt-2">
                    <p className="text-[10px] font-bold uppercase text-gold-600 dark:text-gold-400 tracking-wider border-b border-gold-200/10 dark:border-gold-900/10 pb-1">🚚 Forward Shipping Logistics</p>
                    <p className="text-xs text-luxury-black dark:text-white">Courier: <strong>{req.shippingDetails.courier || "Registered Partner"}</strong></p>
                    <p className="text-xs text-luxury-black dark:text-white">AWB Tracking ID: <strong>{req.shippingDetails.trackingId}</strong></p>
                    {req.shippingDetails.shippedDate && (
                      <p className="text-xs text-luxury-black dark:text-white">Shipped: <strong>{new Date(req.shippingDetails.shippedDate).toLocaleDateString()}</strong></p>
                    )}
                    {req.shippingDetails.deliveredDate && (
                      <p className="text-xs text-luxury-black dark:text-white">Delivered: <strong>{new Date(req.shippingDetails.deliveredDate).toLocaleDateString()}</strong></p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 border-t border-gold-200/10 dark:border-gold-900/10 pt-4 space-y-2">
                {activeSubTab === "returns" && req.status === "Pending" && (
                  <button
                    onClick={() => handleUpdateStatus(req._id, "Under Review")}
                    className="w-full rounded-full border border-gold-500 text-gold-600 dark:text-gold-400 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-500/10 cursor-pointer transition"
                  >
                    Mark as Under Review
                  </button>
                )}

                {activeSubTab === "replacements" && req.status === "Pending" && (
                  <button
                    onClick={() => handleUpdateStatus(req._id, "Under Review")}
                    className="w-full rounded-full border border-gold-500 text-gold-600 dark:text-gold-400 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-500/10 cursor-pointer transition"
                  >
                    Mark as Under Review
                  </button>
                )}

                {activeSubTab === "replacements" && req.status === "Under Review" && (
                  <button
                    onClick={() => handleUpdateStatus(req._id, "Investigation In Progress")}
                    className="w-full rounded-full border border-gold-500 text-gold-600 dark:text-gold-400 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-500/10 cursor-pointer transition mb-2"
                  >
                    Start Investigation
                  </button>
                )}

                {activeSubTab === "replacements" && req.status === "Investigation In Progress" && (
                  <button
                    onClick={() => handleUpdateStatus(req._id, "Evidence Verified")}
                    className="w-full rounded-full border border-gold-500 text-gold-600 dark:text-gold-400 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-500/10 cursor-pointer transition mb-2"
                  >
                    Mark Evidence Verified
                  </button>
                )}

                {((activeSubTab === "returns" && (req.status === "Pending" || req.status === "Under Review")) ||
                  (activeSubTab === "replacements" && (req.status === "Pending" || req.status === "Under Review" || req.status === "Investigation In Progress" || req.status === "Evidence Verified"))) ? (
                  <>
                    {activeSubTab === "replacements" && (
                      <div className="mb-3 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={createReplacementOrder}
                          onChange={(e) =>
                            setCreateReplacementOrder(e.target.checked)
                          }
                          className="rounded border-gold-200 text-gold-500 focus:ring-gold-500"
                        />
                        <label className="text-xs text-gray-600 dark:text-gray-300">
                          Create replacement zero-value order
                        </label>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleUpdateStatus(req._id, "Approved", {
                            note: note.trim() || "Request approved.",
                            createReplacementOrder:
                              activeSubTab === "replacements"
                                ? createReplacementOrder
                                : undefined,
                          })
                        }
                        className="flex-1 rounded-full bg-emerald-600 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 cursor-pointer transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(req._id, "Rejected", {
                            note: note.trim() || "Request rejected.",
                          })
                        }
                        className="flex-1 rounded-full bg-red-600 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 cursor-pointer transition"
                      >
                        Reject
                      </button>
                    </div>
                  </>
                ) : null}

                {/* Return Specific Steps */}
                {activeSubTab === "returns" && req.status === "Approved" && (
                  <button
                    onClick={() => setShowShipForm(req._id)}
                    className="w-full rounded-full bg-gold-500 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-hover cursor-pointer transition"
                  >
                    Schedule Pickup
                  </button>
                )}

                {activeSubTab === "returns" && req.status === "Pickup Scheduled" && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(req._id, "Item Received", {
                        note: "Item received at warehouse.",
                      })
                    }
                    className="w-full rounded-full bg-gold-500 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-hover cursor-pointer transition"
                  >
                    Mark Item Received
                  </button>
                )}

                {activeSubTab === "returns" && req.status === "Item Received" && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(req._id, "Refund Processed", {
                        note: "Refund processed successfully.",
                      })
                    }
                    className="w-full rounded-full bg-emerald-600 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 cursor-pointer transition"
                  >
                    Process Refund
                  </button>
                )}

                {/* Replacement Specific Steps */}
                {activeSubTab === "replacements" && req.status === "Approved" && (
                  <button
                    onClick={() => setShowShipForm(req._id)}
                    className="w-full rounded-full bg-gold-500 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-hover cursor-pointer transition"
                  >
                    Schedule Reverse Pickup
                  </button>
                )}

                {activeSubTab === "replacements" && req.status === "Pickup Scheduled" && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(req._id, "Item Picked Up", {
                        note: "Item picked up from customer.",
                      })
                    }
                    className="w-full rounded-full bg-gold-500 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-hover cursor-pointer transition"
                  >
                    Mark as Picked Up
                  </button>
                )}

                {activeSubTab === "replacements" && req.status === "Item Picked Up" && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(req._id, "Item Received & Verified", {
                        note: "Item received at warehouse and verified.",
                      })
                    }
                    className="w-full rounded-full bg-gold-500 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-hover cursor-pointer transition"
                  >
                    Verify & Receive Item
                  </button>
                )}

                {activeSubTab === "replacements" && req.status === "Item Received & Verified" && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(req._id, "Replacement Packed", {
                        note: "Replacement product packaged and ready.",
                      })
                    }
                    className="w-full rounded-full bg-gold-500 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-hover cursor-pointer transition"
                  >
                    Mark as Packed
                  </button>
                )}

                {activeSubTab === "replacements" && req.status === "Replacement Packed" && (
                  <button
                    onClick={() => setShowShipForm(req._id)}
                    className="w-full rounded-full bg-gold-500 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gold-hover cursor-pointer transition"
                  >
                    Dispatch / Ship Replacement
                  </button>
                )}

                {activeSubTab === "replacements" && req.status === "Shipped" && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(req._id, "Delivered", {
                        note: "Replacement delivered to customer.",
                        shippingDetails: { deliveredDate: new Date() },
                      })
                    }
                    className="w-full rounded-full bg-emerald-600 text-white py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 cursor-pointer transition"
                  >
                    Confirm Delivery
                  </button>
                )}

                {/* Note Field */}
                {req.status !== "Rejected" &&
                  req.status !== "Refund Processed" &&
                  req.status !== "Delivered" && (
                    <textarea
                      placeholder="Add an internal log note..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      className="mt-2 w-full rounded-xl border border-gold-200/50 dark:border-gold-900/50 bg-white/50 dark:bg-black/50 p-2 text-xs outline-none focus:border-gold-500 text-luxury-black dark:text-white"
                    />
                  )}

                {/* Shipping Details Form */}
                {showShipForm === req._id && (
                  <div className="mt-3 rounded-xl border border-gold-200/50 bg-gold-50/30 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase text-gold-600">
                      {(activeSubTab === "returns" || (activeSubTab === "replacements" && req.status === "Approved")) ? "Reverse Pickup Details" : "Forward Shipping Details"}
                    </p>
                    <input
                      placeholder="Courier Name"
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      className="w-full rounded-lg border border-gold-200/50 p-2 text-xs outline-none focus:border-gold-500"
                    />
                    <input
                      placeholder="Tracking ID"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      className="w-full rounded-lg border border-gold-200/50 p-2 text-xs outline-none focus:border-gold-500"
                    />
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          if (!courier || !trackingId) return;
                          if (activeSubTab === "returns" || (activeSubTab === "replacements" && req.status === "Approved")) {
                            handleUpdateStatus(req._id, "Pickup Scheduled", {
                              pickupDetails: {
                                courier,
                                trackingId,
                                pickupDate: new Date(),
                              },
                              note: note || "Pickup scheduled.",
                            });
                          } else {
                            handleUpdateStatus(req._id, "Shipped", {
                              shippingDetails: {
                                courier,
                                trackingId,
                                shippedDate: new Date(),
                              },
                              note: note || "Replacement dispatched.",
                            });
                          }
                        }}
                        className="flex-1 rounded-full bg-gold-500 text-white py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowShipForm(false)}
                        className="flex-1 rounded-full border border-gray-300 text-gray-500 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReturnsReplacementsTab;
