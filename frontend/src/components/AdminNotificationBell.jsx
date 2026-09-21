import { useState, useEffect, useRef } from "react";
import api from "../services/api";

const playChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // AudioContext blocked or not supported
  }
};

const CATEGORY_TABS = [
  { id: "ALL", label: "All" },
  { id: "ORDER", label: "Orders" },
  { id: "PAYMENT", label: "Payments" },
  { id: "CUSTOMER", label: "Customers" },
  { id: "SUPPORT", label: "Support" },
  { id: "RETURN", label: "Returns" },
];

const AdminNotificationBell = ({ authHeader, onNavigateTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("niyora_admin_notif_sound") !== "false";
  });
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Fetch initial notifications and unread count
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications/admin", {
        params: { limit: 40 },
        headers: authHeader?.headers,
      });
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("[NotificationBell] Failed to fetch notifications:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Establish real-time SSE stream
  useEffect(() => {
    let eventSource;
    let reconnectTimeout;

    const connectSSE = () => {
      const token = localStorage.getItem("admin_token") || "";
      const streamUrl = `/api/notifications/admin/stream?token=${encodeURIComponent(token)}`;

      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.addEventListener("connected", () => {
        setIsConnected(true);
      });

      eventSource.addEventListener("notification", (event) => {
        try {
          const newNotif = JSON.parse(event.data);
          setNotifications((prev) => {
            // Avoid duplicate by _id
            if (prev.some((n) => n._id === newNotif._id)) return prev;
            return [newNotif, ...prev];
          });
          setUnreadCount((prev) => prev + 1);

          if (soundEnabled) {
            playChime();
          }
        } catch (e) {
          console.error("SSE parse error:", e);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        // Reconnect after 7 seconds
        reconnectTimeout = setTimeout(connectSSE, 7000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("niyora_admin_notif_sound", String(next));
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/admin/${id}/read`, {}, { headers: authHeader?.headers });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/admin/read-all", {}, { headers: authHeader?.headers });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/notifications/admin/${id}`, { headers: authHeader?.headers });
      setNotifications((prev) => {
        const target = prev.find((n) => n._id === id);
        if (target && !target.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n._id !== id);
      });
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }

    if (!onNavigateTab) return;

    // Smart routing based on notification category & link
    if (notif.category === "ORDER") {
      const searchCode = notif.metadata?.orderCode || "";
      onNavigateTab("orders", searchCode);
    } else if (notif.category === "PAYMENT") {
      const searchCode = notif.metadata?.orderCode || "";
      onNavigateTab("orders", searchCode);
    } else if (notif.category === "RETURN") {
      onNavigateTab("returns-replacements");
    } else if (notif.category === "SUPPORT") {
      onNavigateTab("support");
    } else if (notif.category === "CUSTOMER") {
      onNavigateTab("customers");
    } else if (notif.link) {
      onNavigateTab(notif.link);
    }

    setIsOpen(false);
  };

  const filteredNotifications = notifications.filter((notif) => {
    const matchesCategory =
      activeCategory === "ALL" || notif.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "Urgent":
        return "bg-red-500/15 text-red-500 border border-red-500/30 animate-pulse";
      case "High":
        return "bg-amber-500/15 text-amber-500 border border-amber-500/30";
      case "Low":
        return "bg-gray-500/15 text-gray-400 border border-gray-500/30";
      default:
        return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "ORDER":
        return "📦";
      case "PAYMENT":
        return "💳";
      case "CUSTOMER":
        return "👤";
      case "SUPPORT":
        return "💬";
      case "RETURN":
        return "🔄";
      default:
        return "🔔";
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.floor((now - d) / 1000);

    if (diffSecs < 60) return "Just now";
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Header Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-gold-100/50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-300 transition-all cursor-pointer relative text-base flex items-center justify-center group"
        title="Admin Notifications Center"
        aria-label="Notifications"
      >
        <span className="group-hover:scale-110 transition-transform">🔔</span>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-red-500/30 animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Live SSE pulse status indicator */}
        <span
          className={`absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-white dark:border-[#1C1C1C] ${
            isConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
          }`}
          title={isConnected ? "Real-time Live Sync Connected" : "Connecting..."}
        />
      </button>

      {/* Slide-out / Dropdown Notification Center Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 xs:w-96 sm:w-[440px] max-h-[82vh] bg-white dark:bg-[#1A1A1A] border border-gold-200/50 dark:border-gold-900/30 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in-up backdrop-blur-xl">
          {/* Header Bar */}
          <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-gray-50/50 to-white dark:from-[#222] dark:to-[#1A1A1A]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h3 className="text-sm font-serif font-bold text-luxury-black dark:text-white tracking-wide">
                  Notification Center
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gold-500/20 text-gold-600 dark:text-gold-400 border border-gold-500/30">
                    {unreadCount} Unread
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Audio chime toggle button */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    soundEnabled
                      ? "text-gold-500 hover:bg-gold-500/10"
                      : "text-gray-400 hover:bg-white/10"
                  }`}
                  title={soundEnabled ? "Notification sound: ON" : "Notification sound: MUTED"}
                >
                  {soundEnabled ? "🔊" : "🔇"}
                </button>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-gold-600 dark:text-gold-400 hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative mt-2">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 text-xs">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter notifications..."
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 pl-8 pr-3 py-1.5 text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === tab.id
                      ? "bg-gold-500 text-white font-bold shadow-xs"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List Container */}
          <div className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-gray-100 dark:divide-white/5">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <div className="animate-spin inline-block w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full mb-2" />
                <p>Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  All caught up!
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {searchQuery || activeCategory !== "ALL"
                    ? "No notifications match the active filter."
                    : "No unread alerts or recent events right now."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group hover:bg-gold-50/40 dark:hover:bg-white/5 ${
                    !notif.isRead
                      ? "bg-gold-500/5 dark:bg-gold-500/10"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  {/* Category icon orb */}
                  <div className="h-9 w-9 rounded-full bg-white dark:bg-[#252525] border border-gold-200/40 dark:border-gold-900/30 flex items-center justify-center text-sm shadow-xs shrink-0 mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-luxury-black dark:text-white truncate">
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-gold-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${getPriorityBadge(
                            notif.priority
                          )}`}
                        >
                          {notif.priority || "Medium"}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 uppercase font-semibold">
                          {notif.category}
                        </span>
                      </div>

                      {/* Item Quick Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(notif._id, e)}
                            className="p-1 rounded hover:bg-gold-500/20 text-gold-600 dark:text-gold-400 text-[10px] transition"
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(notif._id, e)}
                          className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-500 text-[10px] transition"
                          title="Delete notification"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#161616] flex items-center justify-between text-[10px] text-gray-400 px-4">
            <span className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
              {isConnected ? "Real-time SSE active" : "Reconnecting stream..."}
            </span>
            <span>Total: {notifications.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationBell;
