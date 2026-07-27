import { useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Spinner } from "../../components/ui/Spinner";

export default function AdminReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom]       = useState(today);
  const [to, setTo]           = useState(today);
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleGenerate() {
    if (!from || !to) { setError("Please select both dates."); return; }
    setError("");
    setLoading(true);
    try {
      const data = await api.getReports(from, to);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-display font-bold mb-6">Reports</h1>

      {/* Date range picker */}
      <div className="card mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">From</label>
          <input type="date" className="input w-44" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input w-44" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={handleGenerate} disabled={loading} className="btn-primary">
          {loading ? "Generating…" : "Generate Report"}
        </button>
        {error && <p className="text-sm text-red-600 self-center">{error}</p>}
      </div>

      {loading && <Spinner className="py-10" />}

      {report && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="card">
              <p className="text-sm text-neutral-500">Orders Completed</p>
              <p className="text-3xl font-bold text-neutral-900">{report.orderCount}</p>
            </div>
            <div className="card">
              <p className="text-sm text-neutral-500">Total Revenue</p>
              <p className="text-3xl font-bold text-brand-600">₱{report.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-neutral-500">Avg. Order Value</p>
              <p className="text-3xl font-bold text-neutral-900">
                ₱{report.orderCount > 0 ? (report.totalRevenue / report.orderCount).toFixed(2) : "0.00"}
              </p>
            </div>
          </div>

          {/* Top products */}
          {report.topProducts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Top Products</h2>
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      {["Rank", "Product ID", "Units Sold", "Revenue"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-neutral-600 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {report.topProducts.map((p, i) => (
                      <tr key={p.productId} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-bold text-neutral-400">#{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{p.productId}</td>
                        <td className="px-4 py-3">{p.qty}</td>
                        <td className="px-4 py-3 text-brand-600 font-semibold">₱{p.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
