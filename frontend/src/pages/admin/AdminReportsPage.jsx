import { useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Spinner } from "../../components/ui/Spinner";

function formatMoney(value) {
  return `₱${(Number(value) || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const seconds = value._seconds ?? value.seconds;
  const date =
    typeof seconds === "number"
      ? new Date(seconds * 1000)
      : value.toDate
        ? value.toDate()
        : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH");
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function AdminReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!from || !to) {
      setError("Please select both dates.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      setReport(await api.getReports(from, to));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!report?.transactions?.length) return;
    const headers = [
      "Order Number",
      "Customer Name",
      "CP Num",
      "Order Date",
      "Total Amount",
    ];
    const rows = report.transactions.map((tx) => [
      tx.orderNo,
      tx.customerName,
      tx.contactNumber,
      formatDate(tx.orderDate),
      Number(tx.total || 0).toFixed(2),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hidden-oven-completed-orders-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(201,168,76,0.25)",
    borderRadius: "8px",
    color: "#F0E8D8",
    fontSize: "0.84rem",
    fontFamily: "Inter,sans-serif",
    outline: "none",
    padding: "9px 12px",
    colorScheme: "dark",
    transition: "border 0.2s",
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
        <div>
          <h2
            className="font-display font-bold text-[1.2rem]"
            style={{ color: "#E8C96D" }}
          >
            Sales Reports
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#9080A8" }}>
            Completed order transactions and CSV export
          </p>
        </div>
      </div>

      <div
        className="flex flex-wrap items-end gap-4 p-5 rounded-xl mb-6"
        style={{
          background: "#1E1235",
          border: "1px solid rgba(201,168,76,0.18)",
        }}
      >
        <div>
          <label className="label">From</label>
          <input
            type="date"
            style={inputStyle}
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">To</label>
          <input
            type="date"
            style={inputStyle}
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Generating…" : "Generate Report"}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!report?.transactions?.length}
          className="btn-secondary"
        >
          Export CSV
        </button>
        {error && (
          <p
            className="text-[0.78rem] self-center"
            style={{ color: "#E05252" }}
          >
            {error}
          </p>
        )}
      </div>

      {loading && <Spinner className="py-10" />}

      {report && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Orders Completed",
                value: report.orderCount,
                topColor: "#6B9FE8",
                textColor: "#6B9FE8",
              },
              {
                label: "Total Revenue",
                value: formatMoney(report.totalRevenue),
                topColor: "#C9A84C",
                textColor: "#C9A84C",
              },
              {
                label: "Avg. Order Value",
                value: formatMoney(
                  report.orderCount > 0
                    ? report.totalRevenue / report.orderCount
                    : 0,
                ),
                topColor: "#3DBD87",
                textColor: "#3DBD87",
              },
            ].map(({ label, value, topColor, textColor }) => (
              <div
                key={label}
                className="rounded-xl p-4"
                style={{
                  background: "#1E1235",
                  border: "1px solid rgba(201,168,76,0.18)",
                  borderTop: `3px solid ${topColor}`,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
                }}
              >
                <div
                  className="text-[0.68rem] font-bold uppercase tracking-[0.5px] mb-2"
                  style={{ color: "#9080A8" }}
                >
                  {label}
                </div>
                <div
                  className="font-display text-[1.75rem] font-bold"
                  style={{ color: textColor }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div
            className="overflow-x-auto rounded-xl"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
          >
            <table className="w-full border-collapse" style={{ fontSize: "0.82rem" }}>
              <thead>
                <tr>
                  {[
                    "Order Number",
                    "Customer Name",
                    "CP Num",
                    "Order Date",
                    "Total Amount",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2.5 whitespace-nowrap"
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#9080A8",
                        borderBottom: "2px solid rgba(201,168,76,0.18)",
                        background: "#1E1235",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(report.transactions || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10"
                      style={{ background: "#1E1235", color: "#9080A8" }}
                    >
                      No completed transactions found.
                    </td>
                  </tr>
                ) : (
                  report.transactions.map((tx) => (
                    <tr
                      key={tx.orderId}
                      style={{ borderBottom: "1px solid rgba(201,168,76,0.09)" }}
                    >
                      <td className="px-3 py-3 font-bold" style={{ background: "#1E1235", color: "#C9A84C" }}>
                        {tx.orderNo}
                      </td>
                      <td className="px-3 py-3 font-semibold" style={{ background: "#1E1235", color: "#F0E8D8" }}>
                        {tx.customerName}
                      </td>
                      <td className="px-3 py-3" style={{ background: "#1E1235", color: "#9080A8" }}>
                        {tx.contactNumber}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ background: "#1E1235", color: "#9080A8" }}>
                        {formatDate(tx.orderDate)}
                      </td>
                      <td className="px-3 py-3 font-bold" style={{ background: "#1E1235", color: "#E8C96D" }}>
                        {formatMoney(tx.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
