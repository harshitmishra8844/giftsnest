import { useState } from "react";
import { resolveMediaUrl } from "../../services/api";
import {
  RotateCcw,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";

export default function ReplacementsTab({
  returnsList = [],
  loading = false,
  onRefresh,
}) {
  const [selectedClaim, setSelectedClaim] = useState(null);

  // Filter only replacement claims
  const replacementClaims = returnsList.filter(
    (r) =>
      r.type === "Replacement" ||
      r.requestType === "Replacement" ||
      (r.code && String(r.code).startsWith("REP")) ||
      (r.returnCode && String(r.returnCode).startsWith("REP"))
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "Submitted":
      case "Return Requested":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "Under Review":
      case "Investigation In Progress":
        return "bg-amber-50 text-amber-900 border-amber-300";
      case "Approved":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "Pickup Scheduled":
      case "Item Picked Up":
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "Item Received":
      case "Item Received & Verified":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "Replacement Processing":
        return "bg-cyan-50 text-cyan-800 border-cyan-200";
      case "Replacement Shipped":
      case "Delivered":
      case "Completed":
        return "bg-teal-50 text-teal-800 border-teal-300";
      case "Rejected":
        return "bg-rose-50 text-rose-800 border-rose-300";
      default:
        return "bg-gray-50 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white/80 backdrop-blur-md border border-champagne/45 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
            Product Exchange & Replacement Service
          </span>
          <h2 className="text-xl font-serif font-bold text-luxury-black mt-1">
            Replacement Orders
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-light">
            Track reverse pickups, verification, and dispatch of fresh replacement parcels.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-champagne text-xs font-semibold text-luxury-black hover:bg-gold-50/60 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gold-600 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-gold-600 animate-spin" />
          <span>Syncing replacement claims...</span>
        </div>
      ) : replacementClaims.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Claims List */}
          <div className="lg:col-span-1 space-y-3">
            {replacementClaims.map((claim) => {
              const reqCode = claim.requestId || claim.code || claim.returnCode || "REP";
              const isSelected = selectedClaim?._id === claim._id;
              const orderCode = claim.order?.orderCode || claim.orderId?.orderCode || "Order";

              return (
                <div
                  key={claim._id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`rounded-2xl border p-4.5 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-gold-500 bg-gold-50/30 shadow-sm"
                      : "border-champagne/35 bg-white hover:border-gold-300"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-champagne/15 pb-2">
                    <span className="font-mono text-xs font-bold text-luxury-black">{reqCode}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${getStatusColor(claim.status)}`}>
                      {claim.status}
                    </span>
                  </div>

                  <div className="mt-2.5 text-xs text-text-secondary space-y-1 font-light">
                    <p>Order: <strong className="text-luxury-black font-semibold">#{orderCode}</strong></p>
                    <p>Reason: <span className="text-luxury-black">{claim.returnReason || claim.reason || "Defect / Exchange"}</span></p>
                    <p className="text-[10px] text-gray-400">
                      Requested: {new Date(claim.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Claim Detail Pane */}
          <div className="lg:col-span-2">
            {selectedClaim ? (
              <div className="rounded-3xl border border-champagne/45 bg-white p-6 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-champagne/20 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
                      Replacement Claim #{selectedClaim.requestId || selectedClaim.code || selectedClaim.returnCode}
                    </span>
                    <h3 className="text-base font-serif font-bold text-luxury-black mt-0.5">
                      Order #{selectedClaim.order?.orderCode || selectedClaim.orderId?.orderCode || "Order"}
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedClaim.status)}`}>
                    {selectedClaim.status}
                  </span>
                </div>

                {/* Replacement Parcel Tracking */}
                {selectedClaim.replacementOrder ? (
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/20 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-purple-600" />
                        Dispatched Replacement Parcel
                      </span>
                      <span className="bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-full text-[9px]">
                        {selectedClaim.replacementOrder.status || "Processing"}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2 pt-1 text-purple-900 font-light">
                      <p>Replacement ID: <strong className="font-mono font-semibold text-luxury-black">{selectedClaim.replacementOrder.replacementId}</strong></p>
                      <p>Courier: <strong className="font-semibold text-luxury-black capitalize">{selectedClaim.replacementOrder.courier || "Delhivery"}</strong></p>
                      <p>Tracking AWB: <strong className="font-mono font-semibold text-luxury-black">{selectedClaim.replacementOrder.trackingId || "Pending"}</strong></p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-champagne/40 bg-gold-50/10 p-4 text-xs text-text-secondary font-light">
                    Replacement parcel will be created and dispatched once the returned product is received and inspected at our warehouse.
                  </div>
                )}

                {/* Reverse Pickup */}
                {selectedClaim.pickupDetails?.trackingId && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/20 p-4 space-y-1.5 text-xs">
                    <span className="font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-indigo-600" />
                      Reverse Pickup Details
                    </span>
                    <div className="grid sm:grid-cols-3 gap-2 pt-1 text-indigo-900 font-light">
                      <p>Courier: <strong className="font-semibold text-luxury-black capitalize">{selectedClaim.pickupDetails.courier || "Delhivery"}</strong></p>
                      <p>Pickup AWB: <strong className="font-mono font-semibold text-luxury-black">{selectedClaim.pickupDetails.trackingId}</strong></p>
                      <p>Status: <strong className="font-semibold text-luxury-black">{selectedClaim.pickupDetails.pickupStatus || "Scheduled"}</strong></p>
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-luxury-black">
                    Items for Replacement ({selectedClaim.items?.length || 0})
                  </h4>
                  <div className="divide-y divide-champagne/20 border border-champagne/30 rounded-2xl p-2 bg-white">
                    {selectedClaim.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3.5 py-2.5 px-2">
                        {item.image && (
                          <img
                            src={resolveMediaUrl(item.image)}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-xl border border-champagne/30"
                          />
                        )}
                        <div className="flex-1 min-w-0 text-xs">
                          <p className="font-serif font-semibold text-luxury-black truncate">{item.name}</p>
                          <p className="text-[10px] text-text-secondary mt-0.5">
                            Exchange Quantity: <strong className="text-luxury-black">{item.quantity}</strong>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div className="rounded-2xl bg-gray-50 border border-champagne/20 p-4 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                    Reason for Replacement:
                  </span>
                  <p className="text-luxury-black font-medium">{selectedClaim.returnReason || selectedClaim.reason || "Defective / damaged on delivery"}</p>
                  {selectedClaim.customerMessage && (
                    <p className="text-text-secondary italic mt-1 font-light">"{selectedClaim.customerMessage}"</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-champagne bg-white/50 p-12 text-center flex flex-col justify-center items-center h-64 text-xs text-text-secondary">
                <RotateCcw className="w-8 h-8 text-gold-500 mb-2" />
                <h4 className="font-serif font-semibold text-luxury-black">Select a Replacement Claim</h4>
                <p className="text-[11px] mt-1">Select any replacement claim to view reverse pickup and dispatch details.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-champagne/45 bg-white p-12 text-center text-xs text-text-secondary space-y-2">
          <div className="w-12 h-12 rounded-full bg-gold-50 border border-gold-200 text-gold-600 flex items-center justify-center mx-auto text-lg">
            🔁
          </div>
          <h4 className="font-serif font-semibold text-luxury-black">No Replacement Requests</h4>
          <p className="max-w-sm mx-auto text-[11px] font-light">
            If an item in your order arrives damaged or incorrect, you can request an exchange from your Order History.
          </p>
        </div>
      )}
    </div>
  );
}
