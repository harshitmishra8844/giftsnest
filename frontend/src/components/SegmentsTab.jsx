import { useEffect, useState } from "react";
import api from "../services/api";

const SegmentsTab = ({ authHeader }) => {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Segment builder state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spentMin, setSpentMin] = useState("");
  const [spentMax, setSpentMax] = useState("");
  const [ordersMin, setOrdersMin] = useState("");
  const [ordersMax, setOrdersMax] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [gender, setGender] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [lastLoginDays, setLastLoginDays] = useState("");
  const [cartAbandoned, setCartAbandoned] = useState(false);
  const [birthdayThisMonth, setBirthdayThisMonth] = useState(false);
  const [anniversaryThisMonth, setAnniversaryThisMonth] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/admin/crm/segments", authHeader);
      setSegments(data || []);
    } catch (err) {
      setError("Failed to load customer segments list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [authHeader]);

  const handleCreateSegment = async (e) => {
    e.preventDefault();
    if (!name) return;

    try {
      setSubmitting(true);
      setError("");
      const filters = {};
      
      if (spentMin !== "") filters.spentMin = spentMin;
      if (spentMax !== "") filters.spentMax = spentMax;
      if (ordersMin !== "") filters.ordersMin = ordersMin;
      if (ordersMax !== "") filters.ordersMax = ordersMax;
      if (city.trim() !== "") filters.city = city.trim();
      if (state.trim() !== "") filters.state = state.trim();
      if (gender !== "") filters.gender = gender;
      if (ageMin !== "") filters.ageMin = ageMin;
      if (ageMax !== "") filters.ageMax = ageMax;
      if (lastLoginDays !== "") filters.lastLoginDays = lastLoginDays;
      if (cartAbandoned) filters.cartAbandoned = true;
      if (birthdayThisMonth) filters.birthdayThisMonth = true;
      if (anniversaryThisMonth) filters.anniversaryThisMonth = true;

      await api.post("/admin/crm/segments", {
        name,
        description,
        filters,
      }, authHeader);

      setSuccess(`Segment "${name}" created successfully.`);
      setName("");
      setDescription("");
      setSpentMin("");
      setSpentMax("");
      setOrdersMin("");
      setOrdersMax("");
      setCity("");
      setState("");
      setGender("");
      setAgeMin("");
      setAgeMax("");
      setLastLoginDays("");
      setCartAbandoned(false);
      setBirthdayThisMonth(false);
      setAnniversaryThisMonth(false);
      setShowCreateForm(false);
      fetchSegments();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create segment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSegment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer segment?")) return;
    try {
      setError("");
      await api.delete(`/admin/crm/segments/${id}`, authHeader);
      setSuccess("Segment removed.");
      fetchSegments();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to delete segment.");
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
          <h3 className="text-lg font-serif text-luxury-black font-semibold">Dynamic Customer Segmentation</h3>
          <p className="text-xs text-gray-500 font-light mt-0.5">Filter customer cohorts based on transaction history, loyalty levels, and locations.</p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm cursor-pointer"
          >
            + Create Segment Builder
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
        <form onSubmit={handleCreateSegment} className="rounded-3xl border border-gold-200/20 bg-white p-6 space-y-4">
          <h4 className="text-sm font-serif font-bold text-gray-950 uppercase tracking-wide border-b border-gold-200/10 pb-2">
            Configure Cohort Parameters
          </h4>

          <div className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cohort Name</label>
              <input
                required
                placeholder="e.g. Maharashtra VIP Buyers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Dossier / Note Description</label>
              <input
                placeholder="Brief summary describing this customer list segment..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Minimum Spending (INR)</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={spentMin}
                onChange={(e) => setSpentMin(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Maximum Spending (INR)</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={spentMax}
                onChange={(e) => setSpentMax(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Minimum Orders Count</label>
              <input
                type="number"
                placeholder="e.g. 2"
                value={ordersMin}
                onChange={(e) => setOrdersMin(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Maximum Orders Count</label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={ordersMax}
                onChange={(e) => setOrdersMax(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">City Address</label>
              <input
                placeholder="e.g. Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">State Address</label>
              <input
                placeholder="e.g. Maharashtra"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Age Range (Min)</label>
              <input
                type="number"
                placeholder="e.g. 18"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Age Range (Max)</label>
              <input
                type="number"
                placeholder="e.g. 60"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Shopper Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-3 py-2 outline-none focus:border-gold-500"
              >
                <option value="">Any</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Inactivity Limit (Days since last login)</label>
              <input
                type="number"
                placeholder="e.g. 30"
                value={lastLoginDays}
                onChange={(e) => setLastLoginDays(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold pt-2 text-gray-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cartAbandoned}
                onChange={(e) => setCartAbandoned(e.target.checked)}
                className="rounded text-gold-500 h-4 w-4 cursor-pointer"
              />
              Show Cart Abandoners Only
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={birthdayThisMonth}
                onChange={(e) => setBirthdayThisMonth(e.target.checked)}
                className="rounded text-gold-500 h-4 w-4 cursor-pointer"
              />
              Has Birthday This Month
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={anniversaryThisMonth}
                onChange={(e) => setAnniversaryThisMonth(e.target.checked)}
                className="rounded text-gold-500 h-4 w-4 cursor-pointer"
              />
              Has Anniversary This Month
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gold-200/10">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting ? "Analyzing Database..." : "Save Cohort Segment"}
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
        <div className="grid gap-4 sm:grid-cols-2">
          {segments.map((seg) => (
            <div key={seg._id} className="rounded-2xl border border-gold-200/20 bg-white p-5 flex flex-col justify-between hover-float transition-all shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <h4 className="font-serif font-bold text-gray-900 text-sm">{seg.name}</h4>
                  <span className="rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider">
                    {seg.memberCount} Members
                  </span>
                </div>
                <p className="text-xs text-gray-550 font-light leading-normal">{seg.description || "No description set for this cohort list segment."}</p>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-gray-50">
                <span className="text-[10px] text-gray-400 font-light">Dynamic Filter Evaluation</span>
                <button
                  onClick={() => handleDeleteSegment(seg._id)}
                  className="text-danger-lux font-semibold hover:underline cursor-pointer"
                >
                  Delete Segment
                </button>
              </div>
            </div>
          ))}
          {segments.length === 0 && (
            <div className="rounded-2xl border border-gray-150/40 bg-white p-12 text-center text-gray-400 font-light sm:col-span-2">
              No segments built yet. Click "+ Create Segment Builder" above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SegmentsTab;
