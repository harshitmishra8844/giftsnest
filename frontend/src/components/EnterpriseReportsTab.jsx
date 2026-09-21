import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../services/api";
import { getAdminAuth } from "../services/adminAuth";

const REPORT_TYPES = [
  { id: "sales-inquiry", name: "Sales Inquiry Report", icon: "💼", description: "Inbound leads, product inquiries, and sales conversions" },
  { id: "callback", name: "Callback Report", icon: "📞", description: "Call center performance, call outcomes, and follow-up ratios" },
  { id: "employee-performance", name: "Employee Performance Report", icon: "👥", description: "Executive resolution rates, ticket volume, and workload metrics" },
  { id: "ticket-resolution", name: "Ticket Resolution & SLA Report", icon: "⏱️", description: "SLA compliance, first response times, and turnaround speed" },
  { id: "return", name: "Return & Replacement Report", icon: "🔄", description: "Return reason distribution, approval rates, and replacement volume" },
  { id: "refund", name: "Refund Report", icon: "💰", description: "Refund values, payment gateway modes, and disbursement status" },
  { id: "customer-satisfaction", name: "Customer Satisfaction (CSAT)", icon: "⭐", description: "Complaint resolution indices and customer sentiment health" },
];

const EnterpriseReportsTab = ({ authHeader, adminAuth }) => {
  const [selectedReport, setSelectedReport] = useState("sales-inquiry");
  const [datePreset, setDatePreset] = useState("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({});
  const [tableSearch, setTableSearch] = useState("");

  const getEffectiveAuthHeader = () => {
    if (authHeader && authHeader.headers) return authHeader;
    const admin = adminAuth || getAdminAuth();
    if (admin?.token) {
      return { headers: { Authorization: `Bearer ${admin.token}` } };
    }
    return {};
  };

  // Adjust dates based on preset
  useEffect(() => {
    const now = new Date();
    if (datePreset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (datePreset === "today") {
      const today = now.toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(today);
    } else if (datePreset === "7days") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(past7);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (datePreset === "30days") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(past30);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (datePreset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(now.toISOString().split("T")[0]);
    }
  }, [datePreset]);

  // Fetch Report Data from Backend
  const fetchReport = async () => {
    setLoading(true);
    try {
      const header = getEffectiveAuthHeader();
      const params = { reportType: selectedReport };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get("/reports/analytics", { ...header, params });
      setReportData(res.data.rows || res.data.data || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error("Failed to load report data:", err);
      alert(err.response?.data?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport, startDate, endDate]);

  // Search filtered rows
  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return reportData;
    const q = tableSearch.toLowerCase();
    return reportData.filter((row) =>
      Object.values(row).some((val) => String(val || "").toLowerCase().includes(q))
    );
  }, [reportData, tableSearch]);

  // EXPORT EXCEL (.xlsx)
  const exportExcel = () => {
    if (reportData.length === 0) {
      alert("No data available to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const fileName = `Niyora_${selectedReport}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // EXPORT CSV (.csv)
  const exportCSV = () => {
    if (reportData.length === 0) {
      alert("No data available to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(reportData);
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Niyora_${selectedReport}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT PDF (.pdf)
  const exportPDF = () => {
    if (reportData.length === 0) {
      alert("No data available to export");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    const activeMeta = REPORT_TYPES.find((r) => r.id === selectedReport);

    // Brand Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(180, 140, 40); // Luxury Gold tone
    doc.text("NIYORA GIFTS - ENTERPRISE OPERATIONS REPORT", 14, 15);

    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(activeMeta?.name || "Operations Intelligence Report", 14, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const dateRangeStr =
      startDate && endDate ? `Date Range: ${startDate} to ${endDate}` : "Date Range: Full Lifetime Data";
    doc.text(`${dateRangeStr} | Generated on: ${new Date().toLocaleString()}`, 14, 28);

    // Table Data
    const columns = Object.keys(reportData[0] || {}).map((col) => ({
      header: col.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
      dataKey: col,
    }));

    autoTable(doc, {
      startY: 34,
      columns,
      body: reportData,
      theme: "grid",
      headStyles: {
        fillColor: [30, 30, 30],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [250, 247, 242],
      },
    });

    doc.save(`Niyora_${selectedReport}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const activeMeta = REPORT_TYPES.find((r) => r.id === selectedReport);

  return (
    <div className="space-y-6 animate-fade-in text-luxury-black dark:text-white">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-gold-200/40 dark:border-gold-900/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeMeta?.icon || "📊"}</span>
            <h1 className="text-xl font-serif font-bold text-gray-900 dark:text-white tracking-wide">
              {activeMeta?.name}
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {activeMeta?.description}
          </p>
        </div>

        {/* Export Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>📗</span> Export Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>📄</span> Export CSV
          </button>
          <button
            type="button"
            onClick={exportPDF}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>📕</span> Export PDF
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {REPORT_TYPES.map((rep) => (
          <button
            key={rep.id}
            type="button"
            onClick={() => setSelectedReport(rep.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer border ${
              selectedReport === rep.id
                ? "bg-gold-500 text-white border-gold-500 shadow-md shadow-gold-500/20 ring-2 ring-gold-400/30"
                : "bg-white dark:bg-[#1E1E1E] border-gold-200/30 dark:border-gold-900/30 text-gray-600 dark:text-gray-300 hover:border-gold-500/50"
            }`}
          >
            <span>{rep.icon}</span>
            <span>{rep.name}</span>
          </button>
        ))}
      </div>

      {/* Date Range & Controls Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
            Date Range:
          </span>
          {["today", "7days", "30days", "thisMonth", "all"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDatePreset(preset)}
              className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition cursor-pointer ${
                datePreset === preset
                  ? "bg-gold-500 text-white"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
              }`}
            >
              {preset === "7days"
                ? "Last 7 Days"
                : preset === "30days"
                ? "Last 30 Days"
                : preset === "thisMonth"
                ? "This Month"
                : preset}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setDatePreset("custom");
              setStartDate(e.target.value);
            }}
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#252525] px-2.5 py-1 text-xs outline-none"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setDatePreset("custom");
              setEndDate(e.target.value);
            }}
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#252525] px-2.5 py-1 text-xs outline-none"
          />
          <button
            type="button"
            onClick={fetchReport}
            className="px-3.5 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {Object.entries(summary).map(([key, value], idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gold-200/30 dark:border-gold-900/30 shadow-xs"
          >
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block truncate">
              {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
            </span>
            <span className="text-xl font-serif font-bold text-gold-600 dark:text-gold-400 mt-1 block">
              {String(value)}
            </span>
          </div>
        ))}
      </div>

      {/* Report Data Table Container */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            Showing <strong>{filteredRows.length}</strong> records
          </div>

          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search report table..."
            className="w-full sm:w-64 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#252525] px-3 py-1.5 text-xs outline-none focus:border-gold-500"
          />
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Compiling report analytics...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No matching records found for the selected time range.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-white/5">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase font-bold text-gray-400">
                <tr>
                  {Object.keys(filteredRows[0] || {}).map((col) => (
                    <th key={col} className="p-3 whitespace-nowrap">
                      {col.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gold-50/20 dark:hover:bg-white/5">
                    {Object.values(row).map((val, cellIdx) => (
                      <td key={cellIdx} className="p-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {String(val || "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseReportsTab;
