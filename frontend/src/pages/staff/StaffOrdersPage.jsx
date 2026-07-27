import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { api } from "../../lib/api";
import { StaffLayout } from "../../components/layout/StaffLayout";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";

const QUEUE_STATUSES = ["pending", "accepted", "payment_verified", "ready"];

const TRANSITIONS = {
  pending:          [{ label: "Accept",  to: "accepted",  style: "btn-primary" }, { label: "Reject", to: "rejected", style: "btn-danger" }],
  accepted:         [{ label: "Verify Payment", to: "payment_verified", style: "btn-primary" }, { label: "Cancel", to: "cancelled", style: "btn-danger" }],
  payment_verified: [{ label: "Mark Ready", to: "ready", style: "btn-primary" }, { label: "Cancel", to: "cancelled", style: "btn-danger" }],
  ready:            [{ label: "Complete", to: "completed", style: "btn-primary" }],
};

export default function StaffOrdersPage() {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [acting, setActing]       = useState(false);
  const [filter, setFilter]       = useState("all");
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", QUEUE_STATUSES),
      orderBy("createdAt", "asc")
    );
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
      showToast(`Order updated to "${toStatus}".`, "success");
      setSelected(null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActing(false);
    }
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <StaffLayout>
      <ToastContainer />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">Order Queue</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{orders.length} active orders</p>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {["all", ...QUEUE_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === s
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-neutral-600 border-neutral-300 hover:border-brand-400"
              }`}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <p className="text-lg">No orders in queue.</p>
          <p className="text-sm mt-1">New orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.orderId}
              className="bg-white rounded-xl border border-neutral-200 px-6 py-4 flex items-center gap-4 hover:border-brand-300 transition-colors cursor-pointer"
              onClick={() => setSelected(order)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-semibold text-neutral-900">{order.orderNo}</p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-neutral-600 truncate">
                  {order.customerName} · {order.contactNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-brand-600">₱{order.total?.toFixed(2)}</p>
                <p className="text-xs text-neutral-400">
                  {order.createdAt?.toDate?.()?.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) ?? ""}
                </p>
              </div>
              <span className="text-neutral-300 text-xl">›</span>
            </div>
          ))}
        </div>
      )}

      {/* Order detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.orderNo}`}>
        {selected && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p className="text-neutral-500">Customer</p>
                <p className="font-semibold">{selected.customerName}</p>
              </div>
              <div>
                <p className="text-neutral-500">Contact</p>
                <p className="font-semibold">{selected.contactNumber}</p>
              </div>
              <div>
                <p className="text-neutral-500">Status</p>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <p className="text-neutral-500">Total</p>
                <p className="font-bold text-brand-600">₱{selected.total?.toFixed(2)}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="border-t border-neutral-100 pt-4">
              <p className="text-sm font-medium text-neutral-700 mb-3">Actions</p>
              <div className="flex gap-3 flex-wrap">
                {(TRANSITIONS[selected.status] || []).map((action) => (
                  <button
                    key={action.to}
                    onClick={() => handleTransition(selected.orderId, action.to)}
                    disabled={acting}
                    className={action.style}
                  >
                    {acting ? "…" : action.label}
                  </button>
                ))}
                {!TRANSITIONS[selected.status]?.length && (
                  <p className="text-sm text-neutral-400">No further actions available.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </StaffLayout>
  );
}
