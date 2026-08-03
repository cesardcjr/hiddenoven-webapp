import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { api } from "../../lib/api";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { TextInput } from "../../components/ui/FormField";
import { Spinner } from "../../components/ui/Spinner";

const STATUS_STEPS = [
  { key: "NEW", label: "Placed" },
  { key: "PAYMENT_REVIEW", label: "Confirmed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY_FOR_PICKUP", label: "Ready" },
  { key: "COMPLETED", label: "Done" },
];

export default function TrackPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    orderNo: params.get("orderNo") || "",
    contactNumber: "",
    customerName: "",
  });
  const [order, setOrder] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch() {
    setError("");
    setLoading(true);
    try {
      const q = form.orderNo
        ? { orderNo: form.orderNo }
        : {
            contactNumber: form.contactNumber,
            customerName: form.customerName,
          };
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

  const stepIndex = order
    ? STATUS_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  const surfaceStyle = {
    background: "#1E1235",
    border: "1px solid rgba(201,168,76,0.18)",
    borderRadius: "12px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
  };

  return (
    <CustomerLayout>
      <div className="max-w-xl mx-auto">
        <h1
          className="font-display text-2xl font-bold mb-6"
          style={{ color: "#E8C96D" }}
        >
          Track Your Order
        </h1>

        {/* ── Search form ── */}
        <div style={surfaceStyle} className="p-5 mb-5">
          <h2
            className="font-semibold text-[0.85rem] mb-4"
            style={{ color: "#F0E8D8" }}
          >
            Find your order
          </h2>
          <TextInput
            label="Order Number"
            value={form.orderNo}
            onChange={(e) => setForm({ ...form, orderNo: e.target.value })}
            placeholder="HO-20240101-0001"
          />

          <div
            className="flex items-center gap-3 my-3"
            style={{ color: "rgba(240,232,220,0.25)" }}
          >
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(201,168,76,0.12)" }}
            />
            <span className="text-[0.72rem] font-medium">
              or search by contact
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(201,168,76,0.12)" }}
            />
          </div>

          <TextInput
            label="Mobile Number"
            value={form.contactNumber}
            onChange={(e) =>
              setForm({ ...form, contactNumber: e.target.value })
            }
            placeholder="09XXXXXXXXX"
          />
          <TextInput
            label="Your Name"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            placeholder="Juan Dela Cruz"
          />

          {/* ── Styled error state ── */}
          {error && (
            <div
              className="rounded-xl px-5 py-4 mb-3 text-[0.83rem]"
              style={{
                background: "rgba(224,82,82,0.08)",
                border: "1px solid rgba(224,82,82,0.2)",
                color: "#E05252",
              }}
            >
              <p className="font-semibold mb-1">Order not found</p>
              <p style={{ color: "rgba(240,232,220,0.45)" }}>
                {error}. Double-check your order number or mobile number and try
                again.
              </p>
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Searching…" : "Track Order"}
          </button>
        </div>

        {/* ── Result ── */}
        {loading && <Spinner className="py-10" />}

        {order && (
          <div style={surfaceStyle} className="p-5">
            {/* Order header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="font-bold text-base" style={{ color: "#C9A84C" }}>
                  {order.orderNo}
                </p>
                <p
                  className="text-[0.75rem] mt-0.5"
                  style={{ color: "rgba(240,232,220,0.45)" }}
                >
                  {order.customerName} · {order.contactNumber}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Progress bar — hidden for rejected / cancelled */}
            {!["PAYMENT_REJECTED", "CANCELLED"].includes(order.status) && (
              <div className="mb-5">
                {/* Bar track */}
                <div className="flex items-center gap-1 mb-1.5">
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step.key} className="flex-1">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          background:
                            i <= stepIndex
                              ? "#C9A84C"
                              : "rgba(201,168,76,0.15)",
                        }}
                      />
                    </div>
                  ))}
                </div>
                {/* Step labels */}
                <div className="flex justify-between">
                  {STATUS_STEPS.map((step, i) => (
                    <span
                      key={step.key}
                      className="text-[0.62rem] font-medium"
                      style={{
                        color:
                          i <= stepIndex ? "#C9A84C" : "rgba(240,232,220,0.25)",
                      }}
                    >
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Order summary */}
            <div
              className="text-[0.82rem] space-y-1.5 pt-4"
              style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
            >
              <div className="flex justify-between">
                <span style={{ color: "rgba(240,232,220,0.45)" }}>Total</span>
                <span className="font-bold" style={{ color: "#C9A84C" }}>
                  ₱{order.total?.toFixed(2)}
                </span>
              </div>
              {(order.pickupLabel || order.pickupSlotId) && (
                <div className="flex justify-between">
                  <span style={{ color: "rgba(240,232,220,0.45)" }}>
                    Pickup
                  </span>
                  <span style={{ color: "#F0E8D8" }}>
                    {order.pickupDate} ·{" "}
                    {order.pickupLabel || order.pickupSlotId}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
