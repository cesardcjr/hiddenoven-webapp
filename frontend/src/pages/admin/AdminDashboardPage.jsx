import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Spinner } from "../../components/ui/Spinner";

const KPI_CONFIG = [
  { key: "totalRevenue", label: "Total Revenue", accent: "#462C7D", format: (value) => `₱${Number(value || 0).toFixed(2)}` },
  { key: "totalOrderCount", label: "Total Orders", accent: "#6B9FE8", format: (value) => Number(value || 0) },
  { key: "cancelledOrderCount", label: "Cancelled Orders", accent: "#E05252", format: (value) => Number(value || 0) },
];

const FILTERS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "custom", label: "Custom Date" },
];

function KpiCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-[rgba(70,44,125,0.18)] border-t-[3px] bg-white p-4 shadow-card" style={{ borderTopColor: accent }}>
      <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.5px] text-[#6F6B78]">{label}</p>
      <p className="font-display text-[1.75rem] font-bold" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function toInputDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseInputDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfCurrentWeek(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function getReportRange(filter, customFrom, customTo) {
  const now = new Date();
  if (filter === "weekly") {
    const from = startOfCurrentWeek(now);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from: toInputDate(from), to: toInputDate(to) };
  }
  if (filter === "monthly") {
    return {
      from: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: toInputDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  if (filter === "custom") return { from: customFrom, to: customTo };
  const today = toInputDate(now);
  return { from: today, to: today };
}

function dateFromValue(value) {
  const seconds = value?._seconds ?? value?.seconds;
  if (typeof seconds === "number") return new Date(seconds * 1000);
  if (value?.toDate) return value.toDate();
  return value ? new Date(value) : null;
}

function bucketLabel(from, to) {
  const formatter = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });
  return `${formatter.format(from)}–${formatter.format(to)}`;
}

function buildTrend(transactions, filter, range) {
  let buckets = [];
  if (filter === "daily") {
    buckets = Array.from({ length: 9 }, (_, index) => ({
      key: index + 10,
      label: new Intl.DateTimeFormat("en-PH", { hour: "numeric" }).format(new Date(2024, 0, 1, index + 10)),
      orders: [],
    }));
  } else if (filter === "weekly") {
    buckets = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((label, index) => ({ key: index, label, orders: [] }));
  } else if (filter === "monthly") {
    const end = parseInputDate(range.to);
    const weekCount = Math.ceil(end.getDate() / 7);
    buckets = Array.from({ length: weekCount }, (_, index) => ({ key: index, label: `Week ${index + 1}`, orders: [] }));
  } else {
    const from = parseInputDate(range.from);
    const to = parseInputDate(range.to);
    const dayCount = Math.max(1, Math.floor((to - from) / 86400000) + 1);
    buckets = Array.from({ length: Math.ceil(dayCount / 7) }, (_, index) => {
      const start = new Date(from);
      start.setDate(from.getDate() + index * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      if (end > to) end.setTime(to.getTime());
      return { key: index, label: bucketLabel(start, end), orders: [] };
    });
  }

  transactions.forEach((transaction) => {
    const completedAt = dateFromValue(transaction.completedAt || transaction.pickedUpAt || transaction.orderDate);
    if (!completedAt) return;
    let index = -1;
    if (filter === "daily") index = completedAt.getHours() - 10;
    else if (filter === "weekly") index = (completedAt.getDay() + 6) % 7;
    else if (filter === "monthly") index = Math.floor((completedAt.getDate() - 1) / 7);
    else index = Math.floor((completedAt - parseInputDate(range.from)) / 86400000 / 7);
    if (buckets[index]) buckets[index].orders.push(transaction);
  });

  return buckets.map((bucket) => ({ ...bucket, count: bucket.orders.length }));
}

function tooltipText(point) {
  if (!point.orders.length) return `${point.label}: 0 completed orders`;
  const orders = point.orders.map((order) => `${order.orderNo || "Order"} | ${order.customerName || "Unknown customer"} | ₱${Number(order.total || 0).toFixed(2)}`);
  return [`${point.label}: ${point.count} completed order${point.count === 1 ? "" : "s"}`, ...orders].join("\n");
}

function TrendChart({ data }) {
  const width = Math.max(720, data.length * 110);
  const height = 300;
  const margin = { top: 24, right: 24, bottom: 64, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxCount = Math.max(1, ...data.map((point) => point.count));
  const tickStep = Math.max(1, Math.ceil(maxCount / 4));
  const yMax = tickStep * 4;
  const yTicks = Array.from({ length: 5 }, (_, index) => index * tickStep);
  const positions = data.map((point, index) => ({
    x: margin.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth),
    y: margin.top + plotHeight - (point.count / yMax) * plotHeight,
  }));

  return (
    <div className="overflow-x-auto pb-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px]" style={{ minWidth: `${width}px`, width: "100%" }} role="img" aria-label="Completed order volume chart">
        {yTicks.map((tick) => {
          const y = margin.top + plotHeight - (tick / yMax) * plotHeight;
          return <g key={tick}><line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#E8E2F2" /><text x={margin.left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="#6F6B78">{tick}</text></g>;
        })}
        <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + plotHeight} stroke="#CFC4E2" />
        <line x1={margin.left} x2={width - margin.right} y1={margin.top + plotHeight} y2={margin.top + plotHeight} stroke="#CFC4E2" />
        <text x="16" y={margin.top + plotHeight / 2} transform={`rotate(-90 16 ${margin.top + plotHeight / 2})`} textAnchor="middle" fontSize="11" fontWeight="700" fill="#6F6B78">Total orders</text>
        {data.length > 1 && <polyline points={positions.map(({ x, y }) => `${x},${y}`).join(" ")} fill="none" stroke="#831C91" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {data.map((point, index) => {
          const { x, y } = positions[index];
          return (
            <g key={point.key} className="cursor-help">
              <title>{tooltipText(point)}</title>
              <circle cx={x} cy={y} r="6" fill="#831C91" stroke="#FFFFFF" strokeWidth="2" />
              <text x={x} y={y - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#6A1475">{point.count}</text>
              <text x={x} y={height - 28} textAnchor="middle" fontSize="10" fill="#6F6B78">{point.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AdminDashboardPage() {
  const today = toInputDate(new Date());
  const [filter, setFilter] = useState("weekly");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => getReportRange(filter, customFrom, customTo), [filter, customFrom, customTo]);

  useEffect(() => {
    if (!range.from || !range.to) return;
    setLoading(true);
    setError("");
    api.getReports(range.from, range.to).then(setReport).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [range.from, range.to]);

  const trend = useMemo(() => buildTrend(report?.transactions || [], filter, range), [report, filter, range]);

  return (
    <AdminLayout>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-display text-[1.2rem] font-bold text-[#462C7D]">Dashboard</h2><p className="mt-0.5 text-[0.78rem] text-[#6F6B78]">Completed order volume and revenue overview</p></div>
        <div className="flex flex-wrap gap-2" aria-label="Dashboard date filter">
          {FILTERS.map((option) => <button key={option.key} type="button" onClick={() => setFilter(option.key)} className="rounded-full border px-3 py-1.5 text-[0.72rem] font-bold" style={{ background: filter === option.key ? "#462C7D" : "#FFFFFF", color: filter === option.key ? "#FFFFFF" : "#6F6B78", borderColor: "rgba(70,44,125,0.25)" }}>{option.label}</button>)}
        </div>
      </div>

      {filter === "custom" && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[#E8E6ED] bg-white p-4">
          <label className="text-xs font-bold text-[#6F6B78]">From<input type="date" value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} className="input mt-1 block" /></label>
          <label className="text-xs font-bold text-[#6F6B78]">To<input type="date" value={customTo} min={customFrom} max={today} onChange={(event) => setCustomTo(event.target.value)} className="input mt-1 block" /></label>
        </div>
      )}

      {error && <p className="mb-4 rounded-xl bg-[#FFF1F0] p-3 text-sm text-[#B42318]" role="alert">{error}</p>}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {KPI_CONFIG.map((card) => <KpiCard key={card.key} label={card.label} value={card.format(report?.[card.key])} accent={card.accent} />)}
      </div>

      <section className="mb-6 rounded-xl border border-[rgba(70,44,125,0.18)] bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display font-bold text-[#462C7D]">Completed Order Volume</h3><p className="mt-0.5 text-xs text-[#6F6B78]">Hover over a point to view order number, customer, and total amount.</p></div><span className="rounded-full bg-[#F4F1F8] px-3 py-1 text-xs font-bold text-[#462C7D]">{range.from} to {range.to}</span></div>
        {loading ? <Spinner className="py-12" /> : <TrendChart data={trend} />}
      </section>

      <section className="rounded-xl border border-[rgba(70,44,125,0.18)] bg-white p-5 shadow-card">
        <h3 className="mb-4 font-display font-bold text-[#462C7D]">Top Products</h3>
        {!report?.topProducts?.length ? <p className="text-sm text-[#6F6B78]">No completed product sales for this filter.</p> : <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{report.topProducts.slice(0, 6).map((product, index) => <div key={product.productId} className="rounded-lg border border-[rgba(70,44,125,0.14)] bg-[#F4F1F8] p-3"><p className="text-[0.68rem] font-bold text-[#6F6B78]">#{index + 1}</p><p className="font-bold text-[#17151D]">{product.productName || product.productId}</p><p className="mt-1 text-[0.78rem] text-[#462C7D]">{product.qty} sold · ₱{Number(product.revenue || 0).toFixed(2)}</p></div>)}</div>}
      </section>
    </AdminLayout>
  );
}
