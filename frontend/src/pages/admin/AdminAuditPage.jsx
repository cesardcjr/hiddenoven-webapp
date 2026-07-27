import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Spinner } from "../../components/ui/Spinner";

export default function AdminAuditPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "audit_log"),
      orderBy("timestamp", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ logId: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const ACTION_LABELS = {
    status_change:    "Status Change",
    product_create:   "Product Created",
    product_update:   "Product Updated",
    product_delete:   "Product Deleted",
    staff_create:     "Staff Created",
    staff_update:     "Staff Updated",
    staff_deactivate: "Staff Deactivated",
    payment_verified: "Payment Verified",
    payment_rejected: "Payment Rejected",
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Audit Log</h1>
        <p className="text-sm text-neutral-500">Last 200 entries · Live</p>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                {["Time", "Action", "Order", "Actor UID", "Transition"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-neutral-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.map((log) => (
                <tr key={log.logId} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">
                    {log.timestamp?.toDate?.()?.toLocaleString("en-PH") ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{ACTION_LABELS[log.action] || log.action}</td>
                  <td className="px-4 py-3 text-neutral-500 font-mono text-xs">{log.orderId || "—"}</td>
                  <td className="px-4 py-3 text-neutral-400 font-mono text-xs truncate max-w-xs">{log.actorUid}</td>
                  <td className="px-4 py-3">
                    {log.fromStatus && log.toStatus ? (
                      <span className="text-xs">
                        <span className="text-neutral-400">{log.fromStatus}</span>
                        <span className="text-neutral-300 mx-1">→</span>
                        <span className="font-medium text-neutral-700">{log.toStatus}</span>
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="text-center py-10 text-neutral-400">No audit entries yet.</p>}
        </div>
      )}
    </AdminLayout>
  );
}
