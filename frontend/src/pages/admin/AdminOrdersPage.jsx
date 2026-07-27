import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";

const ALL_TRANSITIONS = {
  pending:          ["accepted", "rejected", "cancelled"],
  accepted:         ["payment_verified", "rejected", "cancelled"],
  payment_verified: ["ready", "cancelled"],
  ready:            ["completed"],
};

export default function AdminOrdersPage() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [acting, setActing]     = useState(false);
  const [search, setSearch]     = useState("");
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ orderId: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleTransition(orderId, toStatus) {
    setActing(true);
    try {
      await api.updateStatus(orderId, toStatus);
      showToast(`Status updated to "${toStatus}".`, "success");
      setSelected(null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActing(false);
    }
  }

  const filtered = orders.filter((o) =>
    o.orderNo?.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Orders</h1>
        <input
          className="input w-64"
          placeholder="Search by order no. or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                {["Order No.", "Customer", "Contact", "Total", "Status", "Date", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-neutral-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((o) => (
                <tr key={o.orderId} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-semibold">{o.orderNo}</td>
                  <td className="px-4 py-3">{o.customerName}</td>
                  <td className="px-4 py-3 text-neutral-500">{o.contactNumber}</td>
                  <td className="px-4 py-3 text-brand-600 font-semibold">₱{o.total?.toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-neutral-400 text-xs">
                    {o.createdAt?.toDate?.()?.toLocaleDateString("en-PH") ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(o)} className="text-brand-500 hover:underline text-xs font-medium">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-10 text-neutral-400">No orders found.</p>
          )}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.orderNo}`}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-neutral-500">Customer</p><p className="font-semibold">{selected.customerName}</p></div>
              <div><p className="text-neutral-500">Contact</p><p className="font-semibold">{selected.contactNumber}</p></div>
              <div><p className="text-neutral-500">Status</p><StatusBadge status={selected.status} /></div>
              <div><p className="text-neutral-500">Total</p><p className="font-bold text-brand-600">₱{selected.total?.toFixed(2)}</p></div>
            </div>
            {ALL_TRANSITIONS[selected.status] && (
              <div className="border-t pt-4">
                <p className="font-medium mb-3">Change Status</p>
                <div className="flex gap-2 flex-wrap">
                  {ALL_TRANSITIONS[selected.status].map((s) => (
                    <button key={s} disabled={acting} onClick={() => handleTransition(selected.orderId, s)}
                      className={s === "rejected" || s === "cancelled" ? "btn-danger text-sm" : "btn-primary text-sm"}>
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
