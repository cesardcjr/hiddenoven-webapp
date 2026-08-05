import { useEffect, useState } from "react";
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

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
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

  if (loading)
    return (
      <AdminLayout>
        <Spinner className="py-20" />
      </AdminLayout>
    );
  if (error)
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
      {/* Page header */}
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

      {/* KPI grid */}
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

      {/* Order breakdown */}
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
          Order Breakdown
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "New", value: summary.NEW, color: "#6B9FE8" },
            {
              label: "Payment Review",
              value: summary.PAYMENT_REVIEW,
              color: "#A78BFA",
            },
            {
              label: "Preparing",
              value: summary.PREPARING,
              color: "#3DBD87",
            },
            {
              label: "Ready for Pickup",
              value: summary.READY_FOR_PICKUP,
              color: "#3DBD87",
            },
            {
              label: "Payment Rejected",
              value: summary.PAYMENT_REJECTED,
              color: "#E05252",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="text-center p-3 rounded-lg"
              style={{ background: "#261748" }}
            >
              <div
                className="font-display text-2xl font-bold mb-1"
                style={{ color }}
              >
                {value ?? 0}
              </div>
              <div className="text-[0.72rem]" style={{ color: "#9080A8" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
