import { useEffect, useState } from "react";
import api from "../services/api";

const CampaignsTab = ({ authHeader }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create campaign form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("Email");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [segmentId, setSegmentId] = useState("All");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCampaignsAndSegments = async () => {
    try {
      setLoading(true);
      setError("");
      const [campRes, segRes] = await Promise.all([
        api.get("/admin/crm/campaigns", authHeader),
        api.get("/admin/crm/segments", authHeader),
      ]);
      setCampaigns(campRes.data || []);
      setSegments(segRes.data || []);
    } catch (err) {
      setError("Failed to load campaigns catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignsAndSegments();
  }, [authHeader]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!name || !content) return;

    try {
      setSubmitting(true);
      setError("");
      const payload = {
        name,
        channel,
        content,
        segmentId,
        scheduledAt: scheduledAt || null,
      };
      if (channel === "Email") {
        payload.subject = subject || "Special Promotion Offer";
      }

      await api.post("/admin/crm/campaigns", payload, authHeader);
      setSuccess("Campaign added successfully!");
      setName("");
      setSubject("");
      setContent("");
      setSegmentId("All");
      setScheduledAt("");
      setShowCreateForm(false);
      fetchCampaignsAndSegments();
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to launch campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelCampaign = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this scheduled campaign?")) return;
    try {
      setError("");
      await api.put(`/admin/crm/campaigns/${id}/status`, { status: "Cancelled" }, authHeader);
      setSuccess("Campaign cancelled.");
      fetchCampaignsAndSegments();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to cancel campaign.");
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this campaign? All matching queue items will be cleared.")) return;
    try {
      setError("");
      await api.delete(`/admin/crm/campaigns/${id}`, authHeader);
      setSuccess("Campaign run deleted successfully.");
      fetchCampaignsAndSegments();
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete campaign.");
    }
  };

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
          <h3 className="text-lg font-serif text-luxury-black font-semibold">CRM Marketing Campaigns</h3>
          <p className="text-xs text-gray-500 font-light mt-0.5">Design email blasts, SMS, WhatsApp templates, and device broadcasts.</p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm cursor-pointer"
          >
            + Create Campaign
          </button>
        )}
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

      {showCreateForm ? (
        <form onSubmit={handleCreateCampaign} className="rounded-3xl border border-gold-200/20 bg-white p-6 space-y-4">
          <h4 className="text-sm font-serif font-bold text-gray-950 uppercase tracking-wide border-b border-gold-200/10 pb-2">
            Configure Campaign Broadcast
          </h4>

          <div className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Campaign Name</label>
              <input
                required
                placeholder="e.g. Diwali Premium Cake Launch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Delivery Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-3 py-2 outline-none focus:border-gold-500"
              >
                <option value="Email">Email Blast</option>
                <option value="SMS">SMS Message</option>
                <option value="WhatsApp">WhatsApp Campaign</option>
                <option value="Push">Push Notification</option>
                <option value="Website Notification">In-App Notification</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Target Segment</label>
              <select
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-3 py-2 outline-none focus:border-gold-500"
              >
                <option value="All">All Shoppers</option>
                {segments.map((seg) => (
                  <option key={seg._id} value={seg._id}>{seg.name} ({seg.memberCount} members)</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Schedule Launch (Leave empty for instant dispatch)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {channel === "Email" && (
            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Subject Line</label>
              <input
                required
                placeholder="e.g. Enjoy 15% off your next gift box order! 🎁"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5 text-xs">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Campaign Content (HTML allowed for emails)</label>
            <textarea
              required
              rows={5}
              placeholder={channel === "Email" ? "<h1>Hello,</h1><p>Enjoy our luxury selections...</p>" : "Type your campaign message text here..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="rounded-2xl border border-gray-200 p-4 outline-none focus:border-gold-500 font-light"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting ? "Launching..." : "Launch Campaign"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-full bg-white border border-gray-200 text-gray-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((camp) => (
            <div key={camp._id} className="rounded-2xl border border-gold-200/20 bg-white p-5 space-y-3 hover-float transition-all shadow-2xs">
              <div className="flex items-center justify-between border-b border-gray-50 pb-2 flex-wrap gap-2 text-xs">
                <div>
                  <h4 className="font-serif font-bold text-gray-900 text-sm">{camp.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 px-2 py-0.2 text-[8px] font-bold uppercase tracking-wider">
                      {camp.channel}
                    </span>
                    <span className="text-[9px] text-gray-400 font-light">Target: {camp.segmentId === "All" ? "All Shoppers" : "Segment"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
                    camp.status === "Completed" ? "bg-emerald-50 border border-emerald-100 text-emerald-800" :
                    camp.status === "Running" ? "bg-sky-50 border border-sky-100 text-sky-800 animate-pulse" :
                    camp.status === "Scheduled" ? "bg-amber-50 border border-amber-100 text-amber-800" :
                    "bg-gray-150 border border-gray-200 text-gray-500"
                  }`}>
                    {camp.status}
                  </span>

                  {camp.status === "Scheduled" && (
                    <button
                      onClick={() => handleCancelCampaign(camp._id)}
                      className="rounded-full border border-danger-lux/30 text-danger-lux px-3 py-1 text-[9px] font-bold uppercase hover:bg-danger-lux hover:text-white transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteCampaign(camp._id)}
                    className="rounded-full border border-red-200 text-red-600 px-3 py-1 text-[9px] font-bold uppercase hover:bg-red-50 transition cursor-pointer ml-1.5"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 text-center text-xs">
                <div className="bg-cream/40 rounded-xl p-2.5 border border-gold-200/5">
                  <span className="block text-[8px] font-bold uppercase text-gray-400">Total Sent</span>
                  <p className="font-bold text-gray-900 mt-0.5">{camp.metrics?.sentCount || 0}</p>
                </div>
                <div className="bg-cream/40 rounded-xl p-2.5 border border-gold-200/5">
                  <span className="block text-[8px] font-bold uppercase text-gray-400">Scheduled Date</span>
                  <p className="font-bold text-gray-700 mt-0.5">
                    {camp.scheduledAt ? new Date(camp.scheduledAt).toLocaleDateString() : "Instant"}
                  </p>
                </div>
                <div className="bg-cream/40 rounded-xl p-2.5 border border-gold-200/5">
                  <span className="block text-[8px] font-bold uppercase text-gray-400">Conversion Rate</span>
                  <p className="font-bold text-emerald-700 mt-0.5">
                    {camp.metrics?.sentCount > 0 ? `${Math.round((camp.metrics.clickCount / camp.metrics.sentCount) * 100)}%` : "0%"}
                  </p>
                </div>
                <div className="bg-cream/40 rounded-xl p-2.5 border border-gold-200/5">
                  <span className="block text-[8px] font-bold uppercase text-gray-400">Revenue Generated</span>
                  <p className="font-bold text-gray-900 mt-0.5">₹{(camp.metrics?.revenueGenerated || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <div className="rounded-2xl border border-gray-150/40 bg-white p-12 text-center text-gray-400 font-light">
              No marketing campaigns created yet. Click "+ Create Campaign" above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CampaignsTab;
