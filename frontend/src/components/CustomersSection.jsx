import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { TableSkeleton, AnalyticsSkeleton } from "./SkeletonLoaders";

const CustomersSection = ({ authHeader, adminAuth, globalSearchQuery }) => {
  // Lists and Pagination
  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search & Advanced Filters
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (globalSearchQuery !== undefined) {
      setSearch(globalSearchQuery);
      setPage(1);
    }
  }, [globalSearchQuery]);
  const [statusFilter, setStatusFilter] = useState("");
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState("");
  const [phoneVerifiedFilter, setPhoneVerifiedFilter] = useState("");
  const [newsletterFilter, setNewsletterFilter] = useState("");
  const [isGuestFilter, setIsGuestFilter] = useState("");
  const [hasCartFilter, setHasCartFilter] = useState("");
  const [hasWishlistFilter, setHasWishlistFilter] = useState("");
  const [abandonedCartFilter, setAbandonedCartFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [regDateStart, setRegDateStart] = useState("");
  const [regDateEnd, setRegDateEnd] = useState("");
  const [minOrders, setMinOrders] = useState("");
  const [maxOrders, setMaxOrders] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [maxSpend, setMaxSpend] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Selection & Bulk actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkPayload, setBulkPayload] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Active Customer Profile Drawer
  const [profileId, setProfileId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState("info");

  // Notifications Modal
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifTarget, setNotifTarget] = useState(null); // 'bulk' or customer object
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("Information");

  // Notes state
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Suspension Modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState(null); // customer object or 'bulk'
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendNotes, setSuspendNotes] = useState("");

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportColumns, setExportColumns] = useState([
    "Name", "Email", "Phone", "Status", "Registration Date", "Orders", "Total Spend"
  ]);
  const [exportRelations, setExportRelations] = useState(["Customer Information"]);
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [exporting, setExporting] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const isMasterAdmin = adminAuth?.isMasterAdmin === true;
  const hasDeletePermission = isMasterAdmin || adminAuth?.permissions?.includes("CUSTOMERS_DELETE");
  const hasPurgePermission = isMasterAdmin || adminAuth?.permissions?.includes("CUSTOMERS_PURGE");

  // Available Columns for Export
  const availableColumns = [
    "Name", "Email", "Phone", "Status", "Registration Date",
    "Orders", "Total Spend", "Addresses", "Wishlist Count",
    "Cart Count", "Last Login", "Newsletter Status", "Login Method"
  ];

  // Available Relations for Export
  const availableRelations = [
    "Customer Information", "Orders", "Addresses", "Wishlist",
    "Cart", "Reviews", "Notifications", "Coupons", "Login History", "Activity Logs"
  ];

  // Fetch paginated customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = {
        page,
        limit,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        emailVerified: emailVerifiedFilter || undefined,
        phoneVerified: phoneVerifiedFilter || undefined,
        newsletter: newsletterFilter || undefined,
        isGuest: isGuestFilter || undefined,
        hasCart: hasCartFilter || undefined,
        hasWishlist: hasWishlistFilter || undefined,
        abandonedCart: abandonedCartFilter || undefined,
        city: cityFilter.trim() || undefined,
        state: stateFilter.trim() || undefined,
        country: countryFilter.trim() || undefined,
        pincode: pincodeFilter.trim() || undefined,
        registrationDateStart: regDateStart || undefined,
        registrationDateEnd: regDateEnd || undefined,
        minOrders: minOrders !== "" ? minOrders : undefined,
        maxOrders: maxOrders !== "" ? maxOrders : undefined,
        minSpend: minSpend !== "" ? minSpend : undefined,
        maxSpend: maxSpend !== "" ? maxSpend : undefined,
        sortField,
        sortOrder,
      };

      const { data } = await api.get("/admin/customers", { params, headers: authHeader.headers });
      setCustomers(data.customers || []);
      setTotalCount(data.totalCustomers || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load customers list");
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics metrics
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const { data } = await api.get("/admin/customers/analytics", authHeader);
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load customer analytics", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch single customer profile
  const fetchCustomerProfile = async (id) => {
    try {
      setProfileLoading(true);
      setProfileData(null);
      const { data } = await api.get(`/admin/customers/${id}`, authHeader);
      setProfileData(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load customer profile details");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (adminAuth) {
      fetchCustomers();
      fetchAnalytics();
    }
  }, [page, limit, sortField, sortOrder, statusFilter, emailVerifiedFilter, phoneVerifiedFilter, isGuestFilter, newsletterFilter, hasCartFilter, hasWishlistFilter, abandonedCartFilter, search, adminAuth]);

  // Handle manual trigger filters
  const handleApplyAdvancedFilters = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setEmailVerifiedFilter("");
    setPhoneVerifiedFilter("");
    setNewsletterFilter("");
    setIsGuestFilter("");
    setHasCartFilter("");
    setHasWishlistFilter("");
    setAbandonedCartFilter("");
    setCityFilter("");
    setStateFilter("");
    setCountryFilter("");
    setPincodeFilter("");
    setRegDateStart("");
    setRegDateEnd("");
    setMinOrders("");
    setMaxOrders("");
    setMinSpend("");
    setMaxSpend("");
    setPage(1);
  };

  // Column headers sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Select / deselect logic
  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = customers.map((c) => c._id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Single Actions
  const handleOpenProfile = (customer) => {
    setProfileId(customer._id);
    setProfileTab("info");
    fetchCustomerProfile(customer._id);
  };

  // Note Saver
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      setSavingNote(true);
      const { data } = await api.post(`/admin/customers/${profileId}/notes`, { text: noteText }, authHeader);
      setProfileData((prev) => ({
        ...prev,
        profile: { ...prev.profile, notes: data.notes }
      }));
      setNoteText("");
      setSuccess("Private internal note added successfully");
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  // Customer Status change
  const handleOpenSuspend = (target) => {
    setSuspendTarget(target);
    setSuspendReason("");
    setSuspendNotes("");
    setShowSuspendModal(true);
  };

  const handleConfirmSuspend = async () => {
    try {
      const isBulk = suspendTarget === "bulk";
      const targetIds = isBulk ? selectedIds : [suspendTarget._id];

      if (isBulk) {
        await api.post("/admin/customers/bulk", {
          customerIds: targetIds,
          action: "Suspend",
          payload: { reason: suspendReason, notes: suspendNotes }
        }, authHeader);
      } else {
        await api.put(`/admin/customers/${suspendTarget._id}/status`, {
          status: "Suspended",
          reason: suspendReason,
          notes: suspendNotes
        }, authHeader);
      }

      setSuccess(`Account(s) suspended successfully.`);
      setTimeout(() => setSuccess(""), 4000);
      setShowSuspendModal(false);
      fetchCustomers();
      fetchAnalytics();
      if (profileId && targetIds.includes(profileId)) {
        fetchCustomerProfile(profileId);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to suspend account");
    }
  };

  const handleUnsuspend = async (customer) => {
    try {
      await api.put(`/admin/customers/${customer._id}/status`, { status: "Active" }, authHeader);
      setSuccess(`Account unsuspended successfully.`);
      setTimeout(() => setSuccess(""), 4000);
      fetchCustomers();
      fetchAnalytics();
      if (profileId === customer._id) {
        fetchCustomerProfile(customer._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to unsuspend account");
    }
  };

  // Soft delete / Restore (Master Admin only)
  const handleSoftDelete = async (customer) => {
    if (!window.confirm(`Are you sure you want to deactivate (soft-delete) ${customer.name}? They will be hidden from default lists but their records and history will be preserved.`)) return;
    try {
      await api.delete(`/admin/customers/${customer._id}`, authHeader);
      setSuccess(`Customer soft-deleted successfully.`);
      setTimeout(() => setSuccess(""), 4000);
      fetchCustomers();
      fetchAnalytics();
      setProfileId(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to soft-delete customer record");
    }
  };

  const handlePermanentDelete = async (customer) => {
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE ${customer.name} (${customer.email})?\nThis action cannot be undone. All their orders, addresses, login logs, and account records will be permanently erased from the database.`)) return;
    try {
      await api.delete(`/admin/customers/${customer._id}/permanent`, authHeader);
      setSuccess(`Customer account permanently deleted.`);
      setTimeout(() => setSuccess(""), 4000);
      fetchCustomers();
      fetchAnalytics();
      setProfileId(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to permanently delete customer");
    }
  };

  const handleRestore = async (customer) => {
    try {
      await api.post(`/admin/customers/${customer._id}/restore`, {}, authHeader);
      setSuccess(`Customer restored successfully to Active status.`);
      setTimeout(() => setSuccess(""), 4000);
      fetchCustomers();
      fetchAnalytics();
      if (profileId === customer._id) {
        fetchCustomerProfile(customer._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to restore customer record");
    }
  };

  // Notifications Dispatch
  const handleOpenNotify = (target) => {
    setNotifTarget(target);
    setNotifTitle("");
    setNotifMessage("");
    setNotifType("Information");
    setShowNotificationModal(true);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      const recipientIds = notifTarget === "bulk" ? selectedIds : [notifTarget._id];
      await api.post("/admin/customers/notifications", {
        recipientIds,
        title: notifTitle,
        message: notifMessage,
        type: notifType
      }, authHeader);

      setSuccess(`Notification dispatched successfully to ${recipientIds.length} recipient(s).`);
      setTimeout(() => setSuccess(""), 4000);
      setShowNotificationModal(false);
      if (profileId && recipientIds.includes(profileId)) {
        fetchCustomerProfile(profileId);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to dispatch notifications");
    }
  };

  // Bulk operations handler
  const handleBulkActionSubmit = async (e) => {
    e.preventDefault();
    if (!bulkAction) return;

    if (bulkAction === "Suspend") {
      handleOpenSuspend("bulk");
      return;
    }

    if (bulkAction === "Send Notification") {
      handleOpenNotify("bulk");
      return;
    }

    if (bulkAction === "Soft Delete" && !hasDeletePermission) {
      setError("Deactivate/Soft Delete permissions required to bulk soft delete records.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    if (bulkAction === "Restore" && !hasDeletePermission) {
      setError("Deactivate/Soft Delete permissions required to bulk restore records.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    if (bulkAction === "Permanent Delete") {
      if (!hasPurgePermission) {
        setError("Permanently Purge permissions required to bulk permanently delete records.");
        setTimeout(() => setError(""), 4000);
        return;
      }
      if (!window.confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE the ${selectedIds.length} selected customer accounts?\nThis action cannot be undone. All their orders, addresses, activity logs, and account records will be permanently erased.`)) {
        return;
      }
    }

    try {
      const payload = {};
      if (bulkAction === "Assign Tag") {
        payload.tag = bulkPayload;
      }

      await api.post("/admin/customers/bulk", {
        customerIds: selectedIds,
        action: bulkAction,
        payload
      }, authHeader);

      setSuccess(`Bulk action "${bulkAction}" completed on ${selectedIds.length} customer(s).`);
      setTimeout(() => setSuccess(""), 4000);
      setSelectedIds([]);
      setBulkAction("");
      setBulkPayload("");
      fetchCustomers();
      fetchAnalytics();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to execute bulk action");
    }
  };

  // Advanced Export compiler
  const handleExportData = async (e) => {
    e.preventDefault();
    try {
      setExporting(true);
      setError("");

      const isBulkSelection = selectedIds.length > 0;
      const payload = {
        customerIds: isBulkSelection ? selectedIds : null,
        columns: exportColumns,
        relations: exportRelations,
      };

      const { data } = await api.post("/admin/customers/export-data", payload, authHeader);
      
      if (exportFormat === "xlsx") {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
        XLSX.writeFile(workbook, `Customers_Export_${Date.now()}.xlsx`);
      } else if (exportFormat === "csv") {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Customers_Export_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportFormat === "pdf") {
        const doc = new jsPDF("l", "pt", "a4");
        doc.setFontSize(14);
        doc.text("Niyora Gifts | Customer Records Dataset", 40, 45);
        doc.setFontSize(8);
        doc.text(`Exported on: ${new Date().toLocaleString()}`, 40, 60);

        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          const rows = data.map((item) => headers.map((h) => String(item[h] || "")));
          
          autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 75,
            theme: "grid",
            styles: { fontSize: 7, cellPadding: 4, overflow: "linebreak" },
            headStyles: { fillColor: [197, 160, 89], textColor: [255, 255, 255] },
          });
        } else {
          doc.text("No customer data available.", 40, 80);
        }

        doc.save(`Customers_Export_${Date.now()}.pdf`);
      }

      setSuccess("Export downloaded successfully!");
      setTimeout(() => setSuccess(""), 3500);
      setShowExportModal(false);
    } catch (err) {
      setError(err.response?.data?.message || "Export compilation failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Overview Analytics at Top */}
      {analyticsLoading ? (
        <AnalyticsSkeleton />
      ) : analytics ? (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-gold-200/20 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Customers</span>
            <p className="mt-1 text-2xl font-bold font-serif text-luxury-black">{analytics.metrics.totalCustomers}</p>
            <div className="mt-2 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span>+{analytics.metrics.newCustomersToday} today</span>
            </div>
          </div>
          <div className="rounded-2xl border border-gold-200/20 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">New This Month</span>
            <p className="mt-1 text-2xl font-bold font-serif text-luxury-black">{analytics.metrics.newCustomersThisMonth}</p>
            <span className="mt-2 block text-[10px] text-gray-400 font-medium">Registrations</span>
          </div>
          <div className="rounded-2xl border border-gold-200/20 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Accounts</span>
            <p className="mt-1 text-2xl font-bold font-serif text-emerald-800">{analytics.metrics.activeCustomers}</p>
            <span className="mt-2 block text-[10px] text-gray-400 font-medium">Verified shoppers</span>
          </div>
          <div className="rounded-2xl border border-gold-200/20 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Suspended / Soft Deleted</span>
            <p className="mt-1 text-2xl font-bold font-serif text-amber-800">
              {analytics.metrics.suspendedCustomers} <span className="text-sm font-sans text-gray-400">/</span> {analytics.metrics.deletedCustomers}
            </p>
            <span className="mt-2 block text-[10px] text-gray-400 font-medium">Restricted shoppers</span>
          </div>
          <div className="rounded-2xl border border-gold-200/20 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Abandoned Carts</span>
            <p className="mt-1 text-2xl font-bold font-serif text-gold-600">{analytics.metrics.abandonedCartUsers}</p>
            <span className="mt-2 block text-[10px] text-gray-400 font-medium">Cart status active</span>
          </div>
          <div className="rounded-2xl border border-gold-200/20 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Avg customer spend</span>
            <p className="mt-1 text-2xl font-bold font-serif text-luxury-black">₹{analytics.metrics.averageCustomerSpend.toLocaleString()}</p>
            <div className="mt-2 text-[10px] text-gold-600 font-semibold">
              <span>{analytics.metrics.returningCustomers} returning</span>
            </div>
          </div>
        </section>
      ) : null}

      {/* Main Customers List Card */}
      <div className="rounded-3xl border border-gold-200/20 bg-white p-6 shadow-sm relative">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gold-200/10 pb-4">
          <div>
            <h3 className="text-xl font-serif font-light text-luxury-black flex items-center gap-2">
              Customer Management Database
            </h3>
            <p className="mt-1 text-xs text-gray-400 font-light">
              Admin control console to monitor customer data, statuses, private notes, timelines, and communications.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-full border px-4.5 py-1.8 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                showFilters 
                  ? "bg-gold-500 text-white border-gold-500" 
                  : "bg-cream text-gold-700 border-gold-200/10 hover:bg-gold-500/10"
              }`}
            >
              Filters {showFilters ? "▲" : "▼"}
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="rounded-full bg-gold-600 hover:bg-gold-700 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-300 cursor-pointer"
            >
              Export Records
            </button>
          </div>
        </header>

        {/* Simple Search & Quick Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#FAF8F5] dark:bg-white/3 p-4 rounded-2xl my-4 border border-gold-200/10">
          {/* Main Search Input */}
          <div className="relative w-full md:w-80 flex items-center">
            <span className="absolute left-3.5 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, or mobile..."
              className="w-full pl-10 pr-8 py-2 bg-white dark:bg-black/25 border border-gold-200/50 dark:border-gold-900/30 rounded-full text-xs text-luxury-black dark:text-white outline-none focus:border-gold-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 text-gray-450 hover:text-gray-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filters Options */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto text-xs">
            <span className="text-[10px] uppercase font-bold text-gray-450 mr-1.5 tracking-wider font-sans">Quick Filters:</span>
            {[
              { label: "All Customers", action: () => { setStatusFilter(""); setIsGuestFilter(""); setAbandonedCartFilter(""); } },
              { label: "Active", action: () => { setStatusFilter("Active"); setIsGuestFilter(""); setAbandonedCartFilter(""); } },
              { label: "Suspended", action: () => { setStatusFilter("Suspended"); setIsGuestFilter(""); setAbandonedCartFilter(""); } },
              { label: "Guests", action: () => { setStatusFilter(""); setIsGuestFilter("true"); setAbandonedCartFilter(""); } },
              { label: "Abandoned Carts", action: () => { setStatusFilter(""); setIsGuestFilter(""); setAbandonedCartFilter("true"); } },
            ].map((f) => {
              // Determine active state
              let isActive = false;
              if (f.label === "All Customers") {
                isActive = !statusFilter && !isGuestFilter && !abandonedCartFilter;
              } else if (f.label === "Active") {
                isActive = statusFilter === "Active";
              } else if (f.label === "Suspended") {
                isActive = statusFilter === "Suspended";
              } else if (f.label === "Guests") {
                isActive = isGuestFilter === "true";
              } else if (f.label === "Abandoned Carts") {
                isActive = abandonedCartFilter === "true";
              }

              return (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    f.action();
                  }}
                  className={`px-3 py-1.5 rounded-full font-bold uppercase tracking-wider text-[9px] transition-all cursor-pointer ${
                    isActive
                      ? "bg-gold-600 text-white border border-gold-600 shadow-2xs"
                      : "bg-white border border-gold-200/20 text-gray-lux hover:border-gold-500"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Local Feedback Alerts */}
        {success && (
          <div className="my-3 rounded-xl bg-success-lux/10 border border-success-lux/20 p-3.5 text-xs text-success-lux flex items-center gap-2 transition animate-fade-in shadow-2xs font-medium">
            ✔ {success}
          </div>
        )}
        {error && (
          <div className="my-3 rounded-xl bg-danger-lux/10 border border-danger-lux/20 p-3.5 text-xs text-danger-lux flex items-center gap-2 transition animate-fade-in shadow-2xs font-medium">
            ⚠ {error}
          </div>
        )}

        {/* Advanced Filters Panel */}
        {showFilters && (
          <form onSubmit={handleApplyAdvancedFilters} className="mt-4 rounded-2xl bg-cream/40 border border-gold-200/10 p-5 space-y-4 animate-fade-in">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-2">Advanced Queries & Flags</h4>
            
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Search text</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, mobile"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-light text-luxury-black outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Account status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                >
                  <option value="">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Deleted">Deleted (Soft Delete)</option>
                  <option value="Pending Verification">Pending Verification</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Email Verification</label>
                <select
                  value={emailVerifiedFilter}
                  onChange={(e) => setEmailVerifiedFilter(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                >
                  <option value="">Any</option>
                  <option value="true">Verified</option>
                  <option value="false">Pending</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Is Guest Checkout?</label>
                <select
                  value={isGuestFilter}
                  onChange={(e) => setIsGuestFilter(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                >
                  <option value="">Any</option>
                  <option value="true">Guest</option>
                  <option value="false">Registered</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Newsletter sub</label>
                <select
                  value={newsletterFilter}
                  onChange={(e) => setNewsletterFilter(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                >
                  <option value="">Any</option>
                  <option value="true">Subscribed</option>
                  <option value="false">Unsubscribed</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Active cart users</label>
                <select
                  value={hasCartFilter}
                  onChange={(e) => setHasCartFilter(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                >
                  <option value="">Any</option>
                  <option value="true">Has active items</option>
                  <option value="false">No items</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Wishlist users</label>
                <select
                  value={hasWishlistFilter}
                  onChange={(e) => setHasWishlistFilter(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                >
                  <option value="">Any</option>
                  <option value="true">Has items saved</option>
                  <option value="false">Empty wishlist</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Abandoned cart users</label>
                <select
                  value={abandonedCartFilter}
                  onChange={(e) => setAbandonedCartFilter(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                >
                  <option value="">Any</option>
                  <option value="true">Abandoned Cart</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">City</label>
                <input
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">State</label>
                <input
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Pincode</label>
                <input
                  value={pincodeFilter}
                  onChange={(e) => setPincodeFilter(e.target.value)}
                  placeholder="e.g. 400001"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Reg date from</label>
                <input
                  type="date"
                  value={regDateStart}
                  onChange={(e) => setRegDateStart(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Reg date to</label>
                <input
                  type="date"
                  value={regDateEnd}
                  onChange={(e) => setRegDateEnd(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Min Orders count</label>
                <input
                  type="number"
                  min="0"
                  value={minOrders}
                  onChange={(e) => setMinOrders(e.target.value)}
                  placeholder="0"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Max Orders count</label>
                <input
                  type="number"
                  min="0"
                  value={maxOrders}
                  onChange={(e) => setMaxOrders(e.target.value)}
                  placeholder="100"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Min Spend (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={minSpend}
                  onChange={(e) => setMinSpend(e.target.value)}
                  placeholder="e.g. 500"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Max Spend (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={maxSpend}
                  onChange={(e) => setMaxSpend(e.target.value)}
                  placeholder="e.g. 10000"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gold-200/10">
              <button
                type="submit"
                className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-6 py-2 text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-6 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          </form>
        )}

        {/* Bulk Actions Header Bar */}
        {selectedIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gold-200/30 bg-gold-50/30 p-4 animate-slide-in">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-700">
              {selectedIds.length} Customer Record(s) Selected
            </span>
            
            <form onSubmit={handleBulkActionSubmit} className="flex flex-wrap items-center gap-2">
              <select
                value={bulkAction}
                onChange={(e) => {
                  setBulkAction(e.target.value);
                  setBulkPayload("");
                }}
                className="rounded-full border border-gold-200/50 bg-white px-3 py-1.5 text-xs outline-none focus:border-gold-500"
                required
              >
                <option value="">Select Bulk Action</option>
                <option value="Suspend">Suspend Shoppers</option>
                <option value="Unsuspend">Unsuspend Shoppers</option>
                <option value="Soft Delete">Soft Delete Records</option>
                <option value="Restore">Restore Records</option>
                {isMasterAdmin && <option value="Permanent Delete">Permanent Delete (Purge)</option>}
                <option value="Send Notification">Dispatch Notification</option>
                <option value="Assign Tag">Assign Tag</option>
              </select>

              {bulkAction === "Assign Tag" && (
                <input
                  value={bulkPayload}
                  onChange={(e) => setBulkPayload(e.target.value)}
                  placeholder="e.g. VIP"
                  required
                  className="rounded-full border border-gold-200/50 bg-white px-4 py-1 text-xs outline-none focus:border-gold-500"
                />
              )}

              <button
                type="submit"
                className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-xs transition"
              >
                Execute Bulk Action
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition"
              >
                Clear Selection
              </button>
            </form>
          </div>
        )}

        {/* Customers Data Table */}
        {loading ? (
          <TableSkeleton rows={8} cols={10} />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1550px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gold-200/10 text-gray-400 uppercase tracking-wider font-semibold text-[9px] bg-cream/40">
                  <th className="py-3 px-3 font-sans w-[40px]">
                    <input
                      type="checkbox"
                      checked={customers.length > 0 && customers.every((c) => selectedIds.includes(c._id))}
                      onChange={handleSelectAllVisible}
                      aria-label="Select all visible customers"
                    />
                  </th>
                  <th className="py-3 px-2 font-sans w-[200px]">Customer Name</th>
                  <th className="py-3 px-2 font-sans w-[180px]">Email ID</th>
                  <th className="py-3 px-2 font-sans w-[130px]">Mobile</th>
                  <th className="py-3 px-2 font-sans w-[110px] cursor-pointer hover:text-gold-500" onClick={() => handleSort("createdAt")}>
                    Reg Date {sortField === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="py-3 px-2 font-sans w-[90px]">Login Mode</th>
                  <th className="py-3 px-2 font-sans w-[120px]">Verification</th>
                  <th className="py-3 px-2 font-sans w-[100px]">Status</th>
                  <th className="py-3 px-2 font-sans w-[80px] cursor-pointer hover:text-gold-500" onClick={() => handleSort("totalOrders")}>
                    Orders {sortField === "totalOrders" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="py-3 px-2 font-sans w-[90px] cursor-pointer hover:text-gold-500" onClick={() => handleSort("totalSpent")}>
                    Spend {sortField === "totalSpent" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="py-3 px-2 font-sans w-[110px]">Last Order</th>
                  <th className="py-3 px-3 font-sans text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-200/10 text-luxury-black font-light">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-gold-500/5 transition-colors duration-200">
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c._id)}
                        onChange={() => handleSelectRow(c._id)}
                        aria-label={`Select customer ${c.name}`}
                      />
                    </td>
                    <td className="py-3 px-2 font-medium">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{c.name}</span>
                        {c.isGuest && (
                          <span className="inline-block mt-0.5 rounded-full bg-gray-50 border border-gray-150 px-2 py-0.2 text-[8px] font-bold uppercase tracking-wider text-gray-500 w-max">
                            Guest
                          </span>
                        )}
                        {c.tags && c.tags.map((t) => (
                          <span key={t} className="inline-block mt-0.5 mr-1 rounded-full bg-gold-500/10 border border-gold-500/20 px-2 py-0.2 text-[8px] font-bold uppercase text-gold-600 w-max">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 font-mono text-[11px] text-gray-600 break-all">{c.email}</td>
                    <td className="py-3 px-2 font-mono text-[11px] text-gray-600">{c.mobileNumber || "—"}</td>
                    <td className="py-3 px-2 text-[11px] text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-2 text-[11px] text-gray-500 uppercase">{c.loginMethod || "OTP"}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
                        c.verificationStatus === "Verified"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                          : "bg-amber-50 border-amber-100 text-amber-800"
                      }`}>
                        {c.verificationStatus || "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
                        c.status === "Active"
                          ? "bg-success-lux/10 border-success-lux/20 text-success-lux"
                          : c.status === "Suspended"
                          ? "bg-warning-lux/10 border-warning-lux/20 text-warning-lux"
                          : c.status === "Deleted"
                          ? "bg-danger-lux/10 border-danger-lux/20 text-danger-lux"
                          : "bg-gray-100 border-gray-250 text-gray-500"
                      }`}>
                        {c.status || "Active"}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-semibold text-gray-900">{c.totalOrders || 0}</td>
                    <td className="py-3 px-2 font-semibold text-gray-900">₹{(c.totalSpent || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-[11px] text-gray-500">
                      {c.lastOrderDate
                        ? new Date(c.lastOrderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-3 font-semibold text-xs">
                        <button
                          onClick={() => handleOpenProfile(c)}
                          className="text-gold-600 hover:text-gold-700 hover:underline transition-all cursor-pointer"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => handleOpenNotify(c)}
                          className="text-sky-600 hover:text-sky-700 hover:underline transition-all cursor-pointer"
                        >
                          Notify
                        </button>
                        {c.status === "Suspended" ? (
                          <button
                            onClick={() => handleUnsuspend(c)}
                            className="text-emerald-700 hover:text-emerald-800 hover:underline transition-all cursor-pointer"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenSuspend(c)}
                            className="text-warning-lux hover:text-amber-800 hover:underline transition-all cursor-pointer"
                          >
                            Suspend
                          </button>
                        )}
                        {c.status === "Deleted" ? (
                          <>
                            <button
                              onClick={() => handleRestore(c)}
                              disabled={!hasDeletePermission}
                              className="text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(c)}
                              disabled={!hasPurgePermission}
                              className="text-danger-lux hover:text-red-700 hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold"
                            >
                              Purge
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleSoftDelete(c)}
                              disabled={!hasDeletePermission}
                              className="text-danger-lux hover:text-red-700 hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Delete
                            </button>
                            {hasPurgePermission && (
                              <button
                                onClick={() => handlePermanentDelete(c)}
                                className="text-danger-lux hover:text-red-700 hover:underline cursor-pointer font-semibold animate-pulse-subtle"
                              >
                                Purge
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 ? (
                  <tr>
                    <td className="py-12 text-center text-gray-400 font-light" colSpan={12}>
                      No customer records match the active queries and filter conditions.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <footer className="mt-6 flex items-center justify-between border-t border-gold-200/10 pt-4 text-xs font-medium">
            <span className="text-gray-400">
              Showing page {page} of {totalPages} ({totalCount} total shoppers)
            </span>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full bg-white border border-gray-200 px-3.5 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-full h-8 w-8 text-xs font-bold uppercase transition flex items-center justify-center cursor-pointer ${
                    page === p 
                      ? "bg-gold-500 text-white shadow-xs" 
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-full bg-white border border-gray-200 px-3.5 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </footer>
        )}
      </div>

      {/* Customer Profile Drawer */}
      {profileId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-fade-in-backdrop cursor-pointer"
            onClick={() => setProfileId(null)}
          />
          <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden relative z-10" style={{ backgroundColor: "#FAF7F2" }}>
            <header className="bg-white border-b border-gold-200/10 p-5 shrink-0 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">Customer Profile Dossier</span>
                <h3 className="text-xl font-serif text-luxury-black font-semibold mt-0.5">
                  {profileLoading ? "Loading shopper record..." : profileData?.profile?.name || "Customer Details"}
                </h3>
              </div>
              <button
                onClick={() => setProfileId(null)}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 cursor-pointer transition flex items-center justify-center h-8 w-8"
              >
                ✕
              </button>
            </header>

            {profileLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
              </div>
            ) : profileData ? (
              <div className="flex-1 overflow-y-auto flex flex-col md:flex-row min-h-0">
                {/* Left Side: Summary Panel */}
                <div className="w-full md:w-80 bg-white border-r border-gold-200/10 p-5 space-y-5 shrink-0">
                  <div className="text-center space-y-2">
                    <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-2xl font-serif text-white font-bold flex items-center justify-center">
                      {profileData.profile.name.charAt(0)}
                    </div>
                    <h4 className="text-base font-serif font-bold text-gray-900 mt-2">{profileData.profile.name}</h4>
                    <span className="inline-block rounded-full border border-gold-200 bg-gold-50/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-600">
                      {profileData.profile.status}
                    </span>
                  </div>

                  <hr className="border-gold-200/10" />

                  <div className="space-y-3.5 text-xs text-luxury-black">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</span>
                      <span className="font-mono text-gray-700 break-all">{profileData.profile.email}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Mobile Phone</span>
                      <span className="font-mono text-gray-700">{profileData.profile.mobileNumber || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Registration Date</span>
                      <span className="text-gray-700">{new Date(profileData.profile.createdAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Login Method</span>
                      <span className="text-gray-700 uppercase">{profileData.profile.loginMethod || "OTP"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Verification</span>
                      <span className="text-gray-700">{profileData.profile.verificationStatus || "Verified"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Newsletter Campaign</span>
                      <span className="text-gray-700">{profileData.profile.isNewsletterSubscribed ? "Subscribed" : "Unsubscribed"}</span>
                    </div>
                  </div>

                  <hr className="border-gold-200/10" />

                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-gold-700">Financial Summary</h5>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-cream border border-gold-200/10 rounded-xl p-2.5">
                        <span className="block text-[9px] font-bold uppercase text-gray-400">Spent Total</span>
                        <p className="text-sm font-bold font-serif text-gray-900 mt-0.5">₹{profileData.orderInfo.totalSpent.toLocaleString()}</p>
                      </div>
                      <div className="bg-cream border border-gold-200/10 rounded-xl p-2.5">
                        <span className="block text-[9px] font-bold uppercase text-gray-400">AOV</span>
                        <p className="text-sm font-bold font-serif text-gray-900 mt-0.5">₹{profileData.orderInfo.averageOrderValue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Tabbed Details */}
                <div className="flex-1 p-5 min-h-0 flex flex-col">
                  {/* Tabs Navbar */}
                  <div className="flex border-b border-gold-200/10 pb-1.5 overflow-x-auto gap-1 whitespace-nowrap scrollbar-none text-xs font-semibold uppercase tracking-wider shrink-0">
                    {[
                      { id: "info", label: "Overview & Addresses" },
                      { id: "orders", label: `Orders (${profileData.orderInfo.totalOrders})` },
                      { id: "wishlist", label: `Wishlist (${profileData.wishlist.length})` },
                      { id: "cart", label: `Cart (${profileData.cart.length})` },
                      { id: "timeline", label: "Timeline" },
                      { id: "notes", label: `Private Notes (${profileData.profile.notes?.length || 0})` },
                      { id: "notifications", label: "Notifications" },
                      { id: "security", label: "Login & Session Logs" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setProfileTab(tab.id)}
                        className={`rounded-full px-4 py-1.5 cursor-pointer transition ${
                          profileTab === tab.id
                            ? "bg-gold-500 text-white shadow-xs"
                            : "text-gray-500 hover:bg-gold-500/10 hover:text-gold-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
                    {/* Tab: Overview & Addresses */}
                    {profileTab === "info" && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-1.5">Addresses (Saved)</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {profileData.addresses.savedAddresses.length > 0 ? (
                              profileData.addresses.savedAddresses.map((addr) => (
                                <div key={addr._id} className={`rounded-xl border p-3 text-xs space-y-1.5 ${
                                  addr.isDefault ? "bg-gold-500/5 border-gold-500/30" : "bg-white border-gray-150"
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-900 uppercase tracking-wide">{addr.label} Address</span>
                                    {addr.isDefault && (
                                      <span className="rounded-full bg-gold-500 px-2 py-0.2 text-[8px] font-bold text-white uppercase">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-gray-600 leading-normal">
                                    <p className="font-semibold text-gray-900">{addr.fullName}</p>
                                    <p>{addr.line1}</p>
                                    <p>{addr.city}, {addr.state} - {addr.postalCode}</p>
                                    <p>{addr.country}</p>
                                    <p className="mt-1.5 font-mono text-[11px] text-gray-900">Phone: {addr.phone}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-400 font-light col-span-2 py-2">No addresses saved yet by this user.</p>
                            )}
                          </div>
                        </div>

                        {/* Recent Browsing History */}
                        <div className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-1.5">Recently Viewed Products</h4>
                          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                            {profileData.recentlyViewed && profileData.recentlyViewed.length > 0 ? (
                              profileData.recentlyViewed.map((item, idx) => (
                                <div key={idx} className="rounded-xl border border-gray-150 p-2 space-y-1 text-center bg-[#FAF7F2]">
                                  <img
                                    src={item.product?.image || "https://via.placeholder.com/200x200?text=Gift"}
                                    alt="Product"
                                    className="h-16 w-16 mx-auto rounded object-cover border border-gray-200"
                                  />
                                  <p className="text-[11px] font-semibold text-gray-900 line-clamp-1">{item.product?.name || "—"}</p>
                                  <span className="block text-[8px] text-gray-400 font-light">
                                    {new Date(item.viewedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-400 font-light col-span-4 py-2 text-center">No browsing history tracked.</p>
                            )}
                          </div>
                        </div>

                        {/* Reviews */}
                        <div className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-1.5">Submitted Reviews ({profileData.reviews?.length || 0})</h4>
                          <div className="space-y-3">
                            {profileData.reviews && profileData.reviews.length > 0 ? (
                              profileData.reviews.map((rev, idx) => (
                                <div key={idx} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0 text-xs space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex text-gold-500 font-bold">
                                      {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                                    </div>
                                    <span className="font-semibold text-gray-950 font-serif">{rev.productName}</span>
                                    {rev.verifiedPurchase && (
                                      <span className="rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 px-2 py-0.2 text-[8px] font-bold uppercase">
                                        Verified Buyer
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-lux font-light italic">"{rev.comment}"</p>
                                  <span className="block text-[9px] text-gray-400 font-light">Reviewed on: {new Date(rev.createdAt).toLocaleString()}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-400 font-light py-2">No product reviews submitted.</p>
                            )}
                          </div>
                        </div>

                        {/* Coupons Used */}
                        <div className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-1.5">Coupon Usage History</h4>
                          {profileData.coupons && profileData.coupons.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-gray-150 text-gray-400 font-bold uppercase text-[9px]">
                                    <th className="py-2">Order ID</th>
                                    <th className="py-2">Coupon Code</th>
                                    <th className="py-2">Discount Amount</th>
                                    <th className="py-2">Date Applied</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {profileData.coupons.map((c, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                                      <td className="py-2 font-medium">{c.orderCode}</td>
                                      <td className="py-2 font-mono text-gold-600 font-semibold">{c.couponCode}</td>
                                      <td className="py-2 font-semibold">₹{c.discountAmount}</td>
                                      <td className="py-2 text-gray-400">{new Date(c.date).toLocaleDateString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 font-light py-2">No promotional coupon codes used yet.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab: Orders */}
                    {profileTab === "orders" && (
                      <div className="space-y-4">
                        {profileData.orderInfo.orderHistory.length > 0 ? (
                          profileData.orderInfo.orderHistory.map((order) => (
                            <div key={order._id} className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3 shadow-xs">
                              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <span className="font-serif font-bold text-sm text-gray-950">{order.orderCode}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
                                    order.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-amber-50 text-amber-800 border border-amber-100"
                                  }`}>
                                    {order.paymentStatus}
                                  </span>
                                  <span className="rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider">
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs grid gap-3 sm:grid-cols-3">
                                <div>
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Fulfillment Date</span>
                                  <p className="text-gray-700">{new Date(order.createdAt).toLocaleString()}</p>
                                </div>
                                <div>
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Total Charged</span>
                                  <p className="text-gray-950 font-semibold">₹{(order.totalPrice || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Payment Channel</span>
                                  <p className="text-gray-700 uppercase">{order.paymentMethod || "Online"}</p>
                                </div>
                              </div>
                              
                              <div className="mt-2.5 rounded-xl bg-[#FAF7F2] p-3 border border-gold-200/10 space-y-2">
                                <span className="block text-[9px] font-bold uppercase text-gold-600">Order Items</span>
                                {order.products?.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs border-b border-gold-200/10 last:border-0 pb-2 last:pb-0 pt-2 first:pt-0">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={item.image || "https://via.placeholder.com/200x200?text=Gift"}
                                        alt={item.name}
                                        className="h-10 w-10 rounded object-cover border border-gold-200/20"
                                      />
                                      <div>
                                        <p className="font-semibold text-gray-900">{item.name}</p>
                                        {item.customization?.text && (
                                          <p className="text-[10px] text-gray-500">Text: <span className="text-gold-600">"{item.customization.text}"</span></p>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-gray-500">₹{item.price} x {item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-gray-150 bg-white p-8 text-center text-gray-400 font-light">
                            No orders placed yet by this customer account.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab: Wishlist */}
                    {profileTab === "wishlist" && (
                      <div className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-1.5">Saved Items ({profileData.wishlist.length})</h4>
                        {profileData.wishlist.length > 0 ? (
                          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                            {profileData.wishlist.map((item) => (
                              <div key={item._id} className="rounded-xl border border-gray-150 bg-[#FAF7F2] p-3 text-center space-y-2">
                                <img
                                  src={item.image || "https://via.placeholder.com/200x200?text=Gift"}
                                  alt={item.name}
                                  className="h-20 w-20 mx-auto rounded object-cover border border-gray-200"
                                />
                                <p className="text-xs font-semibold text-gray-950 line-clamp-1">{item.name}</p>
                                <p className="text-xs font-bold text-gold-600">₹{(item.price || 0).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 font-light py-4 text-center">Wishlist is currently empty.</p>
                        )}
                      </div>
                    )}

                    {/* Tab: Cart */}
                    {profileTab === "cart" && (
                      <div className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-1.5">Active Cart Items ({profileData.cart.length})</h4>
                        {profileData.cart.length > 0 ? (
                          <div className="space-y-3">
                            {profileData.cart.map((item) => (
                              <div key={item._id} className="flex items-center justify-between text-xs border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.product?.image || "https://via.placeholder.com/200x200?text=Gift"}
                                    alt={item.product?.name || "Product"}
                                    className="h-12 w-12 rounded object-cover border border-gray-200"
                                  />
                                  <div>
                                    <p className="font-semibold text-gray-900">{item.product?.name || "—"}</p>
                                    {item.customization && (
                                      <p className="text-[10px] text-gray-500 font-light italic">
                                        Customization added
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="font-semibold text-gray-900">₹{(item.product?.price || 0).toLocaleString()} x {item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 font-light py-4 text-center">Shopping cart is empty.</p>
                        )}
                      </div>
                    )}

                    {/* Tab: Timeline */}
                    {profileTab === "timeline" && (
                      <div className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-1.5">Activity Timeline Dossier</h4>
                        
                        {isMasterAdmin ? (
                          <div className="relative border-l border-gold-200 ml-3 pl-5 space-y-5 py-2">
                            {profileData.activityTimeline && profileData.activityTimeline.length > 0 ? (
                              profileData.activityTimeline.map((item) => (
                                <div key={item._id} className="relative text-xs">
                                  <span className="absolute -left-[26px] top-1.5 h-3 w-3 rounded-full bg-gold-500 border border-white"></span>
                                  <div className="flex items-center justify-between gap-2 border-b border-gray-50 pb-1">
                                    <span className="font-bold text-gray-900 uppercase tracking-wide text-[10px]">{item.action}</span>
                                    <span className="text-[9px] text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                                  </div>
                                  <p className="text-gray-600 mt-1">{item.details}</p>
                                  <div className="mt-1 text-[9px] text-gray-400 space-x-2">
                                    <span>IP: {item.ipAddress}</span>
                                    <span>•</span>
                                    <span>Device: {item.device}</span>
                                    <span>•</span>
                                    <span>Browser: {item.userAgent ? item.userAgent.split(" ")[0] : "Unknown"}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-400 font-light py-2">No activity timeline events recorded.</p>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-800 font-medium">
                            ⚠ Master Admin permissions are required to access full Activity Log details and timelines.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab: Private Notes */}
                    {profileTab === "notes" && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-1.5">Private Internal Notes</h4>
                          
                          <div className="space-y-3.5 max-h-[300px] overflow-y-auto">
                            {profileData.profile.notes && profileData.profile.notes.length > 0 ? (
                              profileData.profile.notes.map((note, idx) => (
                                <div key={idx} className="rounded-xl border border-gray-150 p-3 text-xs bg-[#FAF7F2] space-y-1.5">
                                  <div className="flex items-center justify-between text-[9px] text-gray-400 border-b border-gold-200/10 pb-1">
                                    <span className="font-bold text-gold-600 uppercase">Author: {note.adminName}</span>
                                    <span>{new Date(note.date).toLocaleString()}</span>
                                  </div>
                                  <p className="text-luxury-black font-light leading-relaxed">{note.text}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-400 font-light py-2">No internal notes written yet.</p>
                            )}
                          </div>
                        </div>

                        {/* Add Note Form */}
                        <form onSubmit={handleSaveNote} className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-1.5">Write Private Internal Note</h4>
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add administrative details, user preferences, warnings, or special support logs..."
                            required
                            rows={3}
                            className="w-full rounded-2xl border border-gray-200 p-4 text-xs font-light outline-none focus:border-gold-500"
                          />
                          <button
                            type="submit"
                            disabled={savingNote}
                            className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer shadow-xs"
                          >
                            {savingNote ? "Saving Note..." : "Save Internal Note"}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Tab: Notifications */}
                    {profileTab === "notifications" && (
                      <div className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-gold-200/10 pb-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700">Sent Notification Logs ({profileData.notifications?.length || 0})</h4>
                          <button
                            onClick={() => handleOpenNotify(profileData.profile)}
                            className="rounded-full border border-gold-200 text-gold-600 bg-white hover:bg-gold-500/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                          >
                            Send Alert
                          </button>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                          {profileData.notifications && profileData.notifications.length > 0 ? (
                            profileData.notifications.map((n) => (
                              <div key={n._id} className="rounded-xl border border-gray-150 p-3.5 text-xs bg-white space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-gray-50 pb-1">
                                  <span className="font-semibold text-gray-900">{n.title}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="rounded-full bg-gold-500/10 text-gold-600 px-2 py-0.2 text-[8px] font-bold uppercase">
                                      {n.type}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.2 text-[8px] font-bold uppercase ${
                                      n.status === "Read" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                                    }`}>
                                      {n.status}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-gray-600 font-light leading-normal">{n.message}</p>
                                <span className="block text-[8px] text-gray-400 font-light">Dispatched at: {new Date(n.createdAt).toLocaleString()}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 font-light py-2">No notifications dispatched to this user.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab: Security & Login Logs */}
                    {profileTab === "security" && (
                      <div className="rounded-2xl border border-gold-200/10 bg-white p-4 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gold-700 border-b border-gold-200/10 pb-1.5">Login Session Logs (Latest 50)</h4>
                        
                        {isMasterAdmin ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-gray-150 text-gray-400 font-bold uppercase text-[9px]">
                                  <th className="py-2">Login Time</th>
                                  <th className="py-2">IP Address</th>
                                  <th className="py-2">Device</th>
                                  <th className="py-2">Browser</th>
                                  <th className="py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {profileData.loginHistory && profileData.loginHistory.length > 0 ? (
                                  profileData.loginHistory.map((log) => (
                                    <tr key={log._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                                      <td className="py-2 font-mono text-gray-600">{new Date(log.loginTime).toLocaleString()}</td>
                                      <td className="py-2 font-mono">{log.ipAddress}</td>
                                      <td className="py-2 uppercase">{log.device || "Unknown"}</td>
                                      <td className="py-2">{log.browser || "Unknown"}</td>
                                      <td className="py-2">
                                        <span className={`rounded-full px-2 py-0.2 text-[8px] font-bold uppercase ${
                                          log.status === "Success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                                        }`}>
                                          {log.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td className="py-4 text-center text-gray-400 font-light" colSpan={5}>
                                      No session login logs compiled.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-800 font-medium">
                            ⚠ Master Admin permissions are required to access full security login activity logs.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Suspend / Unsuspend Dialog Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-fade-in-backdrop cursor-pointer"
            onClick={() => setShowSuspendModal(false)}
          />
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-gold-200/20 relative z-10">
            <header className="flex items-center justify-between border-b border-gold-200/10 pb-2">
              <h3 className="text-base font-serif font-bold text-warning-lux uppercase tracking-wide">
                Confirm Shopper Suspension
              </h3>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 cursor-pointer h-7 w-7 flex items-center justify-center"
              >
                ✕
              </button>
            </header>

            <div className="text-xs text-gray-Lux leading-relaxed space-y-2">
              <p className="font-semibold text-gray-900">
                Warning: This action blocks the shopper from logging in, terminates all active sessions, and prevents placing new orders.
              </p>
              <p>Existing orders, wishlist items, and shopping cart details will remain fully intact.</p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Suspension Reason</label>
                <select
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 outline-none focus:border-gold-500"
                  required
                >
                  <option value="">Select Reason</option>
                  <option value="Policy Violation">Policy Violation</option>
                  <option value="Payment Fraud Detected">Payment Fraud Detected</option>
                  <option value="Spam / Abuse of Support Channels">Spam / Abuse of Support Channels</option>
                  <option value="Duplicate Accounts">Duplicate Accounts</option>
                  <option value="Other / Admin Discretion">Other / Admin Discretion</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Private Internal Notes (Optional)</label>
                <textarea
                  value={suspendNotes}
                  onChange={(e) => setSuspendNotes(e.target.value)}
                  placeholder="Add details only visible to administrators..."
                  rows={3}
                  className="rounded-2xl border border-gray-200 p-3 font-light outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gold-200/10">
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={!suspendReason}
                className="rounded-full bg-warning-lux hover:bg-amber-800 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-xs transition"
              >
                Suspend Account(s)
              </button>
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                className="rounded-full bg-white border border-gray-200 text-gray-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-fade-in-backdrop cursor-pointer"
            onClick={() => setShowNotificationModal(false)}
          />
          <form onSubmit={handleSendNotification} className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-gold-200/20 relative z-10">
            <header className="flex items-center justify-between border-b border-gold-200/10 pb-2">
              <h3 className="text-base font-serif font-bold text-gold-600 uppercase tracking-wide">
                Dispatch Alert Notification
              </h3>
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 cursor-pointer h-7 w-7 flex items-center justify-center"
              >
                ✕
              </button>
            </header>

            <p className="text-xs text-gray-400 font-light">
              This message will be dispatched directly and logged on the customer profile.
              Target: <span className="font-semibold text-gray-900">{notifTarget === "bulk" ? `Bulk Selection (${selectedIds.length} shoppers)` : notifTarget.name}</span>
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Alert Title</label>
                  <input
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="e.g. Special Holiday Event discount!"
                    required
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 font-light outline-none focus:border-gold-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Notification Category</label>
                  <select
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-2 outline-none focus:border-gold-500"
                    required
                  >
                    <option value="Information">Information</option>
                    <option value="Promotion">Promotion</option>
                    <option value="Warning">Warning</option>
                    <option value="Order Update">Order Update</option>
                    <option value="System Message">System Message</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Message Content</label>
                <textarea
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Write clear notification text..."
                  required
                  rows={4}
                  className="rounded-2xl border border-gray-200 p-3 font-light outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gold-200/10">
              <button
                type="submit"
                className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer transition"
              >
                Send Notification
              </button>
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="rounded-full bg-white border border-gray-200 text-gray-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Export Columns & Options Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-fade-in-backdrop cursor-pointer"
            onClick={() => setShowExportModal(false)}
          />
          <form onSubmit={handleExportData} className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-gold-200/20 relative z-10">
            <header className="flex items-center justify-between border-b border-gold-200/10 pb-2">
              <h3 className="text-base font-serif font-bold text-gold-600 uppercase tracking-wide">
                Advanced Export Control Panel
              </h3>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 cursor-pointer h-7 w-7 flex items-center justify-center"
              >
                ✕
              </button>
            </header>

            <p className="text-xs text-gray-400 font-light">
              Export format: <span className="font-semibold text-gray-900 uppercase">{exportFormat}</span>.
              Target: <span className="font-semibold text-gray-900">{selectedIds.length > 0 ? `Selected Customers (${selectedIds.length})` : "Full database list (Requires Master Admin)"}</span>
            </p>

            <div className="space-y-4 text-xs">
              {/* Select columns */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Select Export Columns</span>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                  {availableColumns.map((col) => (
                    <label key={col} className="flex items-center gap-2 cursor-pointer font-light select-none text-gray-700">
                      <input
                        type="checkbox"
                        checked={exportColumns.includes(col)}
                        onChange={(e) => {
                          setExportColumns((prev) =>
                            e.target.checked ? [...prev, col] : prev.filter((c) => c !== col)
                          );
                        }}
                        className="rounded text-gold-500 focus:ring-gold-500"
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Related data checkboxes */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Select Related Datasets (Appended)</span>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                  {availableRelations.map((rel) => {
                    const isSecured = ["Login History", "Activity Logs"].includes(rel);
                    if (isSecured && !isMasterAdmin) return null; // hide from normal admin
                    
                    return (
                      <label key={rel} className="flex items-center gap-2 cursor-pointer font-light select-none text-gray-700">
                        <input
                          type="checkbox"
                          checked={exportRelations.includes(rel)}
                          onChange={(e) => {
                            setExportRelations((prev) =>
                              e.target.checked ? [...prev, rel] : prev.filter((r) => r !== rel)
                            );
                          }}
                          className="rounded text-gold-500 focus:ring-gold-500"
                        />
                        <span>{rel}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Format selection */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Choose Export Format</span>
                <div className="flex gap-4">
                  {["xlsx", "csv", "pdf"].map((format) => (
                    <label key={format} className="flex items-center gap-2 cursor-pointer font-bold select-none text-gray-800 uppercase">
                      <input
                        type="radio"
                        name="exportFormat"
                        value={format}
                        checked={exportFormat === format}
                        onChange={() => setExportFormat(format)}
                        className="text-gold-500 focus:ring-gold-500"
                      />
                      <span>{format}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gold-200/10">
              <button
                type="submit"
                disabled={exporting}
                className="rounded-full bg-gold-500 hover:bg-gold-hover text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer transition disabled:opacity-50"
              >
                {exporting ? "Compiling Export..." : "Download Export"}
              </button>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
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

export default CustomersSection;
