import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Spinner } from "../../components/ui/Spinner";

const KPI_CONFIG = [
  {
    key: "totalRevenue",
    label: "💰 Total Revenue",
    format: (v) => `₱${v.toFixed(2)}`,
    accent: "#C9A84C",
    topColor: "#C9A84C",
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
        style={{ color: accent }}
      >
        {value}
      </div>
    </div>
  );
}

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function getReportRange(filter, customFrom, customTo) {
  const now = new Date();
  if (filter === "weekly") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { from: toInputDate(from), to: toInputDate(now) };
  }
  if (filter === "monthly") {
    const from = new Date(now.getFullYear(), 0, 1);
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

function buildTrend(transactions, filter) {
  const now = new Date();
  if (filter === "daily") {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, "0")}:00`,
      qty: 0,
    }));
    transactions.forEach((tx) => {
      const date = dateFromValue(tx.orderDate);
      if (!date) return;
      buckets[date.getHours()].qty += tx.totalQty || 0;
    });
    return buckets;
  }
  if (filter === "monthly") {
    const months = Array.from({ length: now.getMonth() + 1 }, (_, month) => ({
      label: new Date(now.getFullYear(), month, 1).toLocaleString("en-PH", {
        month: "short",
      }),
      qty: 0,
    })).slice(-12);
    transactions.forEach((tx) => {
      const date = dateFromValue(tx.orderDate);
      if (!date || date.getFullYear() !== now.getFullYear()) return;
      if (months[date.getMonth()]) months[date.getMonth()].qty += tx.totalQty || 0;
    });
    return months;
  }

  const byDay = {};
  transactions.forEach((tx) => {
    const date = dateFromValue(tx.orderDate);
    if (!date) return;
    const key = date.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + (tx.totalQty || 0);
  });
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, qty]) => ({
      label: new Date(`${key}T00:00:00`).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      }),
      qty,
    }));
}

function TrendChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.qty));
  const points = data.map((d, idx) => {
    const x = data.length <= 1 ? 50 : (idx / (data.length - 1)) * 100;
    const y = 94 - (d.qty / max) * 82;
    return `${x},${y}`;
  });

  return (
    <div>
      <div className="h-64">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polyline
            points={`0,96 ${points.join(" ")} 100,96`}
            fill="url(#trendFill)"
            stroke="none"
          />
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="#E8C96D"
            strokeWidth="1.8"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {data.map((d, idx) => {
            const x = data.length <= 1 ? 50 : (idx / (data.length - 1)) * 100;
            const y = 94 - (d.qty / max) * 82;
            return (
              <circle
                key={`${d.label}-${idx}`}
                cx={x}
                cy={y}
                r="1.6"
                fill="#C9A84C"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
      <div className="grid gap-1 mt-3" style={{ gridTemplateColumns: `repeat(${Math.min(data.length || 1, 12)}, minmax(0, 1fr))` }}>
        {data
          .filter((_, idx) => data.length <= 12 || idx % Math.ceil(data.length / 12) === 0)
          .map((d) => (
            <div key={d.label} className="text-center text-[0.65rem]" style={{ color: "#9080A8" }}>
              <div className="font-bold" style={{ color: "#E8C96D" }}>{d.qty}</div>
              {d.label}
            </div>
          ))}
      </div>
    </div>
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
    () => buildTrend(report?.transactions || [], filter),
    [report, filter],
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
            style={{ color: "#E8C96D" }}
          >
            Dashboard
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#9080A8" }}>
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

      <div
        className="rounded-xl p-5 mb-6"
        style={{
          background: "#1E1235",
          border: "1px solid rgba(201,168,76,0.18)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <div
              className="font-display font-bold text-[1rem]"
              style={{ color: "#E8C96D" }}
            >
              Order Quantity Trend
            </div>
            <p className="text-[0.74rem]" style={{ color: "#9080A8" }}>
              Total ordered quantity based on completed transactions
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
                  background: filter === mode ? "#C9A84C" : "transparent",
                  color: filter === mode ? "#1A0F2E" : "#9080A8",
                  border: "1.5px solid rgba(201,168,76,0.25)",
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
          background: "#1E1235",
          border: "1px solid rgba(201,168,76,0.18)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
        }}
      >
        <div
          className="font-display font-bold text-[1rem] mb-4"
          style={{ color: "#E8C96D" }}
        >
          Top Products
        </div>
        {(report?.topProducts || []).length === 0 ? (
          <p className="text-[0.82rem]" style={{ color: "#9080A8" }}>
            No completed product sales for this filter.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.topProducts.slice(0, 6).map((product, idx) => (
              <div
                key={product.productId}
                className="rounded-lg p-3"
                style={{
                  background: "#261748",
                  border: "1px solid rgba(201,168,76,0.14)",
                }}
              >
                <div className="text-[0.68rem] font-bold" style={{ color: "#9080A8" }}>
                  #{idx + 1}
                </div>
                <div className="font-bold" style={{ color: "#F0E8D8" }}>
                  {product.productName || product.productId}
                </div>
                <div className="text-[0.78rem] mt-1" style={{ color: "#E8C96D" }}>
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
