import { useEffect, useState } from "react";
import api from "../services/api";

const CrmDashboardTab = ({ authHeader, onSelectTab }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/crm/dashboard", authHeader);
      setStats(data);
    } catch (err) {
      setError("Failed to compile dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [authHeader]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-gold-200/10 p-5 animate-pulse space-y-3">
              <div className="h-3 w-16 bg-gray-200 rounded"></div>
              <div className="h-6 w-24 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
        <div className="h-80 bg-white border border-gold-200/10 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  const { metrics, topCampaigns } = stats || {};

  return (
    <div className="space-y-6 animate-page-enter">
      {error && (
        <div className="rounded-2xl bg-danger-lux/10 border border-danger-lux/20 p-4 text-xs text-danger-lux">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gold-200/20 bg-white p-5 hover-float transition-all">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Emails Sent Today</span>
          <p className="text-2xl font-serif font-bold text-gray-900 mt-1">{(metrics?.emailsSent || 0).toLocaleString()}</p>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">✓ 100% Delivery Success</span>
        </div>

        <div className="rounded-2xl border border-gold-200/20 bg-white p-5 hover-float transition-all">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">SMS Dispatched Today</span>
          <p className="text-2xl font-serif font-bold text-gray-900 mt-1">{(metrics?.smsSent || 0).toLocaleString()}</p>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">✓ 100% Carrier Route</span>
        </div>

        <div className="rounded-2xl border border-gold-200/20 bg-white p-5 hover-float transition-all">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">WhatsApp Messages</span>
          <p className="text-2xl font-serif font-bold text-gray-900 mt-1">{(metrics?.whatsappSent || 0).toLocaleString()}</p>
          <span className="text-[10px] text-gold-600 font-semibold mt-1 block">✓ Catalog & Updates Active</span>
        </div>

        <div className="rounded-2xl border border-gold-200/20 bg-white p-5 hover-float transition-all">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Web & Push Alerts</span>
          <p className="text-2xl font-serif font-bold text-gray-900 mt-1">{(metrics?.pushSent + metrics?.inAppSent || 0).toLocaleString()}</p>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">✓ Browser Broadcast</span>
        </div>
      </div>

      {/* Financial and Success Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Campaign conversions card */}
        <div className="rounded-3xl border border-gold-200/20 bg-white p-6 md:col-span-2 space-y-4">
          <h4 className="text-base font-serif font-bold text-luxury-black flex items-center gap-2">
            <span>📈</span> Campaign & Promotion Performance
          </h4>
          
          <div className="grid gap-4 sm:grid-cols-3 text-center">
            <div className="bg-cream border border-gold-200/10 rounded-2xl p-4">
              <span className="block text-[9px] font-bold uppercase text-gray-400">Campaign Revenue</span>
              <p className="text-lg font-serif font-bold text-gray-950 mt-1">₹{(metrics?.campaignRevenue || 0).toLocaleString()}</p>
            </div>
            <div className="bg-cream border border-gold-200/10 rounded-2xl p-4">
              <span className="block text-[9px] font-bold uppercase text-gray-400">Coupon Driven Sales</span>
              <p className="text-lg font-serif font-bold text-gray-950 mt-1">₹{(metrics?.couponRevenue || 0).toLocaleString()}</p>
            </div>
            <div className="bg-cream border border-gold-200/10 rounded-2xl p-4">
              <span className="block text-[9px] font-bold uppercase text-gray-400">Success Dispatch Rate</span>
              <p className="text-lg font-serif font-bold text-emerald-800 mt-1">{metrics?.deliverySuccessRate || 100}%</p>
            </div>
          </div>

          {/* Simple Visual Metric Progress bars */}
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Active Shopper Engagement Ratio</span>
                <span className="text-gold-600">
                  {Math.round((metrics?.activeShoppersCount / (metrics?.activeShoppersCount + metrics?.suspendedShoppersCount || 1)) * 100)}% Active
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gold-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(metrics?.activeShoppersCount / (metrics?.activeShoppersCount + metrics?.suspendedShoppersCount || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Direct Promo Coupons Redeemed</span>
                <span className="text-gold-600">
                  {metrics?.couponsAssigned > 0 ? Math.round((metrics?.couponsRedeemed / metrics?.couponsAssigned) * 100) : 0}% Redemption Rate
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${metrics?.couponsAssigned > 0 ? (metrics?.couponsRedeemed / metrics?.couponsAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Campaigns List */}
        <div className="rounded-3xl border border-gold-200/20 bg-white p-6 space-y-4">
          <h4 className="text-base font-serif font-bold text-luxury-black flex items-center justify-between">
            <span>🏆 Top Marketing Campaigns</span>
          </h4>

          <div className="space-y-3">
            {topCampaigns && topCampaigns.length > 0 ? (
              topCampaigns.map((camp, idx) => (
                <div key={camp._id} className="rounded-xl border border-gray-150/40 p-3 bg-cream/40 flex items-center justify-between text-xs hover-float transition-all">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-gray-900 line-clamp-1">{camp.name}</p>
                    <span className="inline-flex rounded-full bg-gold-500/10 text-gold-600 px-2 py-0.2 text-[8px] font-bold uppercase">
                      {camp.channel}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-luxury-black">₹{camp.metrics?.revenueGenerated?.toLocaleString()}</p>
                    <p className="text-[9px] text-gray-400 font-light">{camp.metrics?.sentCount} Sent</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 font-light py-8 text-center">No completed campaigns found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrmDashboardTab;
