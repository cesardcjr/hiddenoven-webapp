import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Spinner } from "../../components/ui/Spinner";

function StatCard({ label, value, accent }) {
  return (
    <div className="card">
      <p className="text-sm text-neutral-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent || "text-neutral-900"}`}>{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.getDashboard()
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><Spinner className="py-20" /></AdminLayout>;
  if (error)   return <AdminLayout><p className="text-red-500">{error}</p></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-display font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Orders"    value={summary.total}      />
        <StatCard label="Pending"         value={summary.pending}    accent="text-yellow-600" />
        <StatCard label="Ready for Pickup" value={summary.ready}     accent="text-green-600" />
        <StatCard label="Total Revenue"   value={`₱${summary.totalRevenue.toFixed(2)}`} accent="text-brand-600" />
      </div>

      <h2 className="text-lg font-semibold mb-4">Order Breakdown</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Accepted"         value={summary.accepted}         />
        <StatCard label="Payment Verified" value={summary.payment_verified} />
        <StatCard label="Completed"        value={summary.completed}        />
        <StatCard label="Rejected"         value={summary.rejected}         accent="text-red-500" />
        <StatCard label="Cancelled"        value={summary.cancelled}        accent="text-neutral-400" />
      </div>
    </AdminLayout>
  );
}
