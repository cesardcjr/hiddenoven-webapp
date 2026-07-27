import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { api } from "../../lib/api";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { TextInput } from "../../components/ui/FormField";
import { Spinner } from "../../components/ui/Spinner";

const STATUS_STEPS = ["pending", "accepted", "payment_verified", "ready", "completed"];

export default function TrackPage() {
  const [params] = useSearchParams();
  const [form, setForm]         = useState({ orderNo: params.get("orderNo") || "", contactNumber: "", customerName: "" });
  const [order, setOrder]       = useState(null);
  const [orderId, setOrderId]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Live listener once we have the orderId
  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) setOrder({ orderId: snap.id, ...snap.data() });
    });
    return unsub;
  }, [orderId]);

  // Auto-search if orderNo in URL
  useEffect(() => {
    if (params.get("orderNo")) handleSearch();
  }, []);

  async function handleSearch() {
    setError("");
    setLoading(true);
    try {
      const q = form.orderNo
        ? { orderNo: form.orderNo }
        : { contactNumber: form.contactNumber, customerName: form.customerName };
      const result = await api.trackOrder(q);
      const found = Array.isArray(result) ? result[0] : result;
      setOrder(found);
      setOrderId(found.orderId);
    } catch (err) {
      setError(err.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;

  return (
    <CustomerLayout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-display font-bold mb-6">Track Your Order</h1>

        {/* Search form */}
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Find your order</h2>
          <TextInput
            label="Order Number"
            value={form.orderNo}
            onChange={(e) => setForm({ ...form, orderNo: e.target.value })}
            placeholder="HO-20240101-0001"
          />
          <p className="text-center text-sm text-neutral-400 my-3">— or search by contact —</p>
          <TextInput
            label="Mobile Number"
            value={form.contactNumber}
            onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
            placeholder="09XXXXXXXXX"
          />
          <TextInput
            label="Your Name"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            placeholder="Juan Dela Cruz"
          />
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <button onClick={handleSearch} disabled={loading} className="btn-primary w-full">
            {loading ? "Searching…" : "Track Order"}
          </button>
        </div>

        {/* Result */}
        {loading && <Spinner className="py-10" />}
        {order && (
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-lg">{order.orderNo}</p>
                <p className="text-sm text-neutral-500">{order.customerName} · {order.contactNumber}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Progress bar */}
            {!["rejected", "cancelled"].includes(order.status) && (
              <div className="mb-6">
                <div className="flex items-center gap-1">
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step} className="flex-1 flex items-center">
                      <div className={`h-2 flex-1 rounded-full ${i <= stepIndex ? "bg-brand-500" : "bg-neutral-200"}`} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-neutral-400 mt-1">
                  <span>Placed</span>
                  <span>Accepted</span>
                  <span>Paid</span>
                  <span>Ready</span>
                  <span>Done</span>
                </div>
              </div>
            )}

            <div className="text-sm space-y-1 text-neutral-600">
              <p>Total: <span className="font-semibold text-neutral-900">₱{order.total?.toFixed(2)}</span></p>
              {order.pickupSlotId && <p>Pickup Slot ID: {order.pickupSlotId}</p>}
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
