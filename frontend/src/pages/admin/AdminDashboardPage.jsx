import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Spinner } from "../../components/ui/Spinner";

const KPI_CONFIG = [
  {
    key: "totalRevenue",
    label: "💰 Total Revenue",
    format: (v) => `₱${v.toFixed(2)}`,
    accent: "#462C7D",
    topColor: "#462C7D",
  },
  {
    key: "total",
    label: "📦 Total Orders",
    format: (v) => v,
    accent: "#6B9FE8",
    topColor: "#6B9FE8",
  },
  {
    key: "pending",
    label: "⏳ Pending Action",
    format: (v) => v,
    accent: "#E8A94C",
    topColor: "#E8A94C",
  },
  {
    key: "completed",
    label: "✅ Completed",
    format: (v) => v,
    accent: "#3DBD87",
    topColor: "#3DBD87",
  },
  {
    key: "cancelled",
    label: "✕ Cancelled",
    format: (v) => v,
    accent: "#E05252",
    topColor: "#E05252",
  },
];

function KpiCard({ label, value, accent, topColor }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(70,44,125,0.18)",
        borderTop: `3px solid ${topColor}`,
        boxShadow: "0 2px 12px rgba(23,21,29,0.08)",
      }}
    >
      <div
        className="text-[0.68rem] font-bold uppercase tracking-[0.5px] mb-2"
        style={{ color: "#6F6B78" }}
      >
        {label}
      </div>
      <div
        className="font-display text-[1.75rem] font-bold"
        style={{ color: accent }}
      >
        {value}
      </div>
    </div>
  );
}

function toInputDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getReportRange(filter, customFrom, customTo) {
  const now = new Date();
  if (filter === "weekly") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { from: toInputDate(from), to: toInputDate(now) };
  }
  if (filter === "monthly") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toInputDate(from), to: toInputDate(now) };
  }
  if (filter === "custom") return { from: customFrom, to: customTo };
  return { from: toInputDate(now), to: toInputDate(now) };
}

function dateFromValue(value) {
  const seconds = value?._seconds ?? value?.seconds;
  if (typeof seconds === "number") return new Date(seconds * 1000);
  if (value?.toDate) return value.toDate();
  return value ? new Date(value) : null;
}

function buildTrend(transactions) {
  return transactions
    .map((transaction) => ({
      orderNo: transaction.orderNo || "Order",
      orderDate: dateFromValue(transaction.orderDate),
      qty: Number(transaction.totalQty) || 0,
    }))
    .filter((transaction) => transaction.orderDate)
    .sort((a, b) => a.orderDate - b.orderDate);
}

function TrendChart({ data }) {
  if (!data.length) {
    return <p className="py-12 text-center text-sm text-[#6F6B78]">No completed orders found for this period.</p>;
  }

  const width = Math.max(720, data.length * 72);
  const height = 280;
  const margin = { top: 18, right: 24, bottom: 54, left: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxQty = Math.max(1, ...data.map((point) => point.qty));
  const tickStep = Math.max(1, Math.ceil(maxQty / 4));
  const yMax = tickStep * 4;
  const yTicks = Array.from({ length: 5 }, (_, index) => index * tickStep);
  const pointPosition = (point, index) => ({
    x: margin.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth),
    y: margin.top + plotHeight - (point.qty / yMax) * plotHeight,
  });
  const positions = data.map(pointPosition);
  const labelEvery = Math.max(1, Math.ceil(data.length / 10));

  return (
    <div className="overflow-x-auto pb-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[280px]"
        style={{ minWidth: `${width}px`, width: "100%" }}
        role="img"
        aria-label="Line chart showing item quantity for each completed order"
      >
        {yTicks.map((tick) => {
          const y = margin.top + plotHeight - (tick / yMax) * plotHeight;
          return (
            <g key={tick}>
              <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#E8E2F2" strokeWidth="1" />
              <text x={margin.left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="#6F6B78">{tick}</text>
            </g>
          );
        })}
        <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + plotHeight} stroke="#CFC4E2" />
        <line x1={margin.left} x2={width - margin.right} y1={margin.top + plotHeight} y2={margin.top + plotHeight} stroke="#CFC4E2" />
        <text
          x="15"
          y={margin.top + plotHeight / 2}
          transform={`rotate(-90 15 ${margin.top + plotHeight / 2})`}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#6F6B78"
        >
          Item quantity
        </text>
        {data.length > 1 && (
          <polyline
            points={positions.map(({ x, y }) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="#A78BFA"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {data.map((point, index) => {
          const { x, y } = positions[index];
          const showLabel = index % labelEvery === 0 || index === data.length - 1;
          return (
            <g key={`${point.orderNo}-${index}`}>
              <circle
                cx={x}
                cy={y}
                r="5"
                fill="#A78BFA"
                stroke="#FFFFFF"
                strokeWidth="2"
              >
                <title>{`${point.orderNo}: ${point.qty} item${point.qty === 1 ? "" : "s"}`}</title>
              </circle>
              <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#7452A8">{point.qty}</text>
              {showLabel && (
                <text x={x} y={height - 24} textAnchor="middle" fontSize="10" fill="#6F6B78">
                  {point.orderNo.replace(/^HO-\d{8}-/, "#")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function OrderSourceCard({ online, walkIn, loading, filter }) {
  return (
    <section className="mb-6 rounded-xl border border-[rgba(70,44,125,0.18)] bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-display font-bold text-[#462C7D]">Order Sources</h3><p className="mt-0.5 text-xs capitalize text-[#6F6B78]">{filter} order totals</p></div>
        <span className="rounded-full bg-[#F4F1F8] px-3 py-1 text-xs font-bold text-[#462C7D]">Online vs walk-in</span>
      </div>
      {loading ? <Spinner className="py-5" /> : <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#F7F7FA] p-4"><p className="text-xs font-semibold text-[#6F6B78]">Total online orders</p><p className="mt-1 text-2xl font-bold text-[#462C7D]">{online}</p></div><div className="rounded-xl bg-[#F4F1F8] p-4"><p className="text-xs font-semibold text-[#6F6B78]">Total walk-in orders</p><p className="mt-1 text-2xl font-bold text-[#462C7D]">{walkIn}</p></div></div>}
    </section>
  );
}

export default function AdminDashboardPage() {
  const today = toInputDate(new Date());
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [filter, setFilter] = useState("daily");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");

  function loadDashboard() {
    setLoading(true);
    setError("");
    api
      .getDashboard()
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const { from, to } = getReportRange(filter, customFrom, customTo);
    if (!from || !to) return;
    setReportLoading(true);
    api
      .getReports(from, to)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setReportLoading(false));
  }, [filter, customFrom, customTo]);

  const trend = useMemo(
    () => buildTrend(report?.transactions || []),
    [report],
  );

  if (loading)
    return (
      <AdminLayout>
        <Spinner className="py-20" />
      </AdminLayout>
    );
  if (error && !summary)
    return (
      <AdminLayout>
        <div className="py-10 text-center">
          <p className="text-sm mb-3" style={{ color: "#E05252" }}>
            {error}
          </p>
          <button type="button" className="btn-secondary" onClick={loadDashboard}>
            Try again
          </button>
        </div>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
        <div>
          <h2
            className="font-display font-bold text-[1.2rem]"
            style={{ color: "#462C7D" }}
          >
            Dashboard
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#6F6B78" }}>
            Live order and revenue overview
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {KPI_CONFIG.map(({ key, label, format, accent, topColor }) => (
          <KpiCard
            key={key}
            label={label}
            value={format(summary[key] ?? 0)}
            accent={accent}
            topColor={topColor}
          />
        ))}
      </div>

      <OrderSourceCard
        online={report?.onlineOrderCount || 0}
        walkIn={report?.walkInOrderCount || 0}
        loading={reportLoading}
        filter={filter}
      />

      <div
        className="rounded-xl p-5 mb-6"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(70,44,125,0.18)",
          boxShadow: "0 2px 12px rgba(23,21,29,0.08)",
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <div
              className="font-display font-bold text-[1rem]"
              style={{ color: "#462C7D" }}
            >
              Order Quantity by Order
            </div>
            <p className="text-[0.74rem]" style={{ color: "#6F6B78" }}>
              Each point shows the total item quantity for one completed order
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["daily", "weekly", "monthly", "custom"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className="rounded-full px-3 py-1.5 text-[0.72rem] font-bold capitalize"
                style={{
                  background: filter === mode ? "#462C7D" : "transparent",
                  color: filter === mode ? "#FFFFFF" : "#6F6B78",
                  border: "1.5px solid rgba(70,44,125,0.25)",
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {filter === "custom" && (
          <div className="flex gap-3 flex-wrap mb-4">
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="input"
            />
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={today}
              onChange={(e) => setCustomTo(e.target.value)}
              className="input"
            />
          </div>
        )}

        {reportLoading ? <Spinner className="py-12" /> : <TrendChart data={trend} />}
      </div>

      <div
        className="rounded-xl p-5"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(70,44,125,0.18)",
          boxShadow: "0 2px 12px rgba(23,21,29,0.08)",
        }}
      >
        <div
          className="font-display font-bold text-[1rem] mb-4"
          style={{ color: "#462C7D" }}
        >
          Top Products
        </div>
        {(report?.topProducts || []).length === 0 ? (
          <p className="text-[0.82rem]" style={{ color: "#6F6B78" }}>
            No completed product sales for this filter.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.topProducts.slice(0, 6).map((product, idx) => (
              <div
                key={product.productId}
                className="rounded-lg p-3"
                style={{
                  background: "#F4F1F8",
                  border: "1px solid rgba(70,44,125,0.14)",
                }}
              >
                <div className="text-[0.68rem] font-bold" style={{ color: "#6F6B78" }}>
                  #{idx + 1}
                </div>
                <div className="font-bold" style={{ color: "#17151D" }}>
                  {product.productName || product.productId}
                </div>
                <div className="text-[0.78rem] mt-1" style={{ color: "#462C7D" }}>
                  {product.qty} sold · ₱{Number(product.revenue || 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
