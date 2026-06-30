import { useEffect, useState } from "react";
import api from "../services/api";

const AlertsTab = ({ authHeader, adminAuth }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Resolving alerts modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/admin/crm/alerts", authHeader);
      setAlerts(data || []);
    } catch (err) {
      setError("Failed to load active system alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [authHeader]);

  const handleOpenResolve = (target) => {
    setResolveTarget(target);
    setResolveNotes("");
    setShowResolveModal(true);
  };

  const handleConfirmResolve = async (e) => {
    e.preventDefault();
    if (!resolveNotes.trim() || !resolveTarget) return;

    try {
      setSubmitting(true);
      setError("");
      await api.put(`/admin/crm/alerts/${resolveTarget._id}/resolve`, {
        notes: resolveNotes.trim(),
      }, authHeader);

      setSuccess("Alert marked as resolved.");
      setShowResolveModal(false);
      fetchAlerts();
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError("Failed to resolve alert.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlert = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this alert log?")) return;
    try {
      setError("");
      await api.delete(`/admin/crm/alerts/${id}`, authHeader);
      setSuccess("Alert deleted successfully.");
      fetchAlerts();
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError("Failed to delete alert.");
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesSeverity = severityFilter === "All" || a.severity === severityFilter;
    const matchesStatus = statusFilter === "All" || a.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });

  if (loading) {
    return (
      <div className="h-60 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex items-center justify-between border-b border-gold-200/10 pb-4">
        <div>
          <h3 className="text-lg font-serif text-luxury-black font-semibold">Live CRM Alert Engine</h3>
          <p className="text-xs text-gray-550 font-light mt-0.5">Diagnose high-value shopper actions, dormancy notices, payment glitches, and order abuse flags.</p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2.5 text-xs font-semibold">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 outline-none focus:border-gold-500"
          >
            <option value="Active">Active Alerts</option>
            <option value="Resolved">Resolved Logs</option>
            <option value="All">All Severity Logs</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 outline-none focus:border-gold-500"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {success && (
        <div className="rounded-xl bg-success-lux/10 border border-success-lux/20 p-3 text-xs text-success-lux font-medium">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-danger-lux/10 border border-danger-lux/20 p-3 text-xs text-danger-lux font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div 
            key={alert._id} 
            className={`rounded-2xl border bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover-float transition-all shadow-2xs ${
              alert.severity === "Critical" ? "border-red-300 bg-red-50/5" :
              alert.severity === "High" ? "border-amber-300 bg-amber-50/5" :
              alert.severity === "Medium" ? "border-gold-300/40" :
              "border-gold-200/20"
            }`}
          >
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex rounded-full border px-2 py-0.2 text-[8px] font-bold uppercase tracking-wider ${
                  alert.severity === "Critical" ? "bg-red-50 text-red-800 border-red-150" :
                  alert.severity === "High" ? "bg-amber-50 text-amber-800 border-amber-150" :
                  alert.severity === "Medium" ? "bg-gold-50 text-gold-700 border-gold-200" :
                  "bg-gray-50 text-gray-500 border-gray-150"
                }`}>
                  {alert.severity}
                </span>

                <h4 className="font-serif font-bold text-gray-900 text-sm">{alert.title}</h4>
              </div>

              <p className="text-gray-600 font-light leading-normal max-w-2xl">{alert.message}</p>
              <div className="text-[10px] text-gray-400 font-light space-x-2">
                <span>Shopper: <strong className="font-medium text-gray-900">{alert.userId?.name || "—"}</strong> ({alert.userId?.email || "—"})</span>
                <span>•</span>
                <span>Created: {new Date(alert.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="shrink-0 text-xs text-right flex items-center gap-2">
              {alert.status === "Active" ? (
                <button
                  onClick={() => handleOpenResolve(alert)}
                  className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-5 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Resolve
                </button>
              ) : (
                <div className="text-[10px] text-gray-450 text-left sm:text-right space-y-0.5">
                  <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 px-2 py-0.2 text-[8px] font-bold uppercase">
                    Resolved
                  </span>
                  <p className="font-light italic mt-1">"{alert.notes}"</p>
                </div>
              )}

              <button
                onClick={() => handleDeleteAlert(alert._id)}
                className="rounded-full border border-red-200 hover:bg-red-50 text-red-650 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {filteredAlerts.length === 0 && (
          <div className="rounded-2xl border border-gray-150/40 bg-white p-12 text-center text-gray-400 font-light">
            No system generated alerts match these filters.
          </div>
        )}
      </div>

      {/* Resolve Dialog Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/45 backdrop-blur-sm cursor-pointer"
            onClick={() => setShowResolveModal(false)}
          />
          <form onSubmit={handleConfirmResolve} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-gold-200/20 relative z-10 animate-scale-up">
            <header className="flex items-center justify-between border-b border-gold-200/10 pb-2">
              <h3 className="text-sm font-serif font-bold text-gray-950 uppercase tracking-wide">
                Resolve System Alert
              </h3>
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 cursor-pointer h-7 w-7 flex items-center justify-center"
              >
                ✕
              </button>
            </header>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Concierge Resolution Notes</label>
              <textarea
                required
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Explain the corrective action taken to close this alert trigger..."
                rows={4}
                className="rounded-2xl border border-gray-200 p-3 font-light outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-gold-200/10">
              <button
                type="submit"
                disabled={submitting || !resolveNotes.trim()}
                className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-xs transition"
              >
                {submitting ? "Resolving..." : "Complete Resolution"}
              </button>
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="rounded-full bg-white border border-gray-200 text-gray-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AlertsTab;
