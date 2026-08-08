import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { TextInput } from "../../components/ui/FormField";
import { CometSpinner } from "../../components/ui/CometSpinner";
import { Swal } from "../../lib/swal";

const STATUS_STEPS = [
  { key: "NEW", label: "Placed" }, { key: "PAYMENT_REVIEW", label: "Review" },
  { key: "PREPARING", label: "Baking" }, { key: "READY_FOR_PICKUP", label: "Ready" },
  { key: "COMPLETED", label: "Done" },
];
const STATUS_MESSAGES = {
  NEW: "Order received! Please wait while we confirm.", PAYMENT_REVIEW: "We are reviewing your payment.",
  PAYMENT_REJECTED: "We are reviewing your payment.", PREPARING: "Freshly baking your goodies, please wait patiently.",
  READY_FOR_PICKUP: "Hot and ready! Your order is ready for pickup.", COMPLETED: "Thanks for your order!",
};

function TrackingResult({ order, onBackHome }) {
  const progressStatus = order.status === "PAYMENT_REJECTED" ? "PAYMENT_REVIEW" : order.status;
  const stepIndex = STATUS_STEPS.findIndex((step) => step.key === progressStatus);
  const waiting = ["NEW", "PAYMENT_REVIEW", "PAYMENT_REJECTED", "PREPARING"].includes(order.status);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="surface-card overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-[#E8E6ED] p-5 sm:p-6"><div><p className="text-xs font-semibold text-[#6F6B78]">Order number</p><h1 className="mt-1 text-xl font-bold">{order.orderNo}</h1><p className="mt-2 text-xs text-[#6F6B78]">{order.customerName} · {order.contactNumber}</p></div><StatusBadge status={order.status} /></div>
        <div className="p-5 sm:p-6">
          {order.status === "CANCELLED" ? <div className="rounded-2xl bg-[#FFF1F0] p-4 text-sm text-[#B42318]">This order is currently marked as cancelled.</div> : <>
            <div className="text-center"><div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl ${order.status === "READY_FOR_PICKUP" ? "bg-[#E8F7EF] text-[#18794E]" : "bg-[#F4F1F8] text-[#462C7D]"}`}>{waiting ? <CometSpinner size={38} color="#462C7D" /> : order.status === "READY_FOR_PICKUP" ? "✓" : order.status === "COMPLETED" ? "♡" : "♨"}</div><h2 className="mt-4 text-lg font-bold">{STATUS_MESSAGES[order.status] || STATUS_MESSAGES[progressStatus]}</h2><p className="mt-2 text-sm text-[#6F6B78]">{waiting ? "Waiting for the next update…" : "Status updates refresh automatically while this page is open."}</p></div>
            <div className="mt-8"><div className="flex gap-2">{STATUS_STEPS.map((step, index) => <div key={step.key} className={`h-2 flex-1 rounded-full ${index <= stepIndex ? "bg-[#462C7D]" : "bg-[#E8E6ED]"}`} />)}</div><div className="mt-3 grid grid-cols-5 gap-1">{STATUS_STEPS.map((step, index) => <span key={step.key} className={`text-center text-[0.62rem] font-semibold ${index <= stepIndex ? "text-[#462C7D]" : "text-[#AAA6B0]"}`}>{step.label}</span>)}</div></div>
          </>}
          <dl className="mt-8 space-y-3 border-t border-[#E8E6ED] pt-5 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#6F6B78]">Total</dt><dd className="font-bold text-[#462C7D]">₱{Number(order.total || 0).toFixed(2)}</dd></div>{(order.pickupLabel || order.pickupSlotId) && <div className="flex justify-between gap-4"><dt className="text-[#6F6B78]">Pickup</dt><dd className="text-right font-semibold">{order.pickupDate} · {order.pickupLabel || order.pickupSlotId}</dd></div>}</dl>
        </div>
      </div>
      <button className="btn-primary mt-4 w-full" onClick={onBackHome}>Back to Home</button>
    </div>
  );
}

export default function TrackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ orderNo: params.get("orderNo") || "", contactNumber: params.get("contactNumber") || "", customerName: params.get("customerName") || "" });
  const [order, setOrder] = useState(null);
  const [trackingOrderNo, setTrackingOrderNo] = useState(params.get("orderNo") || "");
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rejectionAlertedOrderNo, setRejectionAlertedOrderNo] = useState("");

  useEffect(() => {
    if (!trackingOrderNo) return undefined;
    const interval = window.setInterval(async () => { try { setOrder(await api.trackOrder({ orderNo: trackingOrderNo })); } catch { window.clearInterval(interval); } }, 30000);
    return () => window.clearInterval(interval);
  }, [trackingOrderNo]);

  useEffect(() => { if (params.get("orderNo") || (params.get("customerName") && params.get("contactNumber"))) handleSearch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (order?.status !== "PAYMENT_REJECTED" || rejectionAlertedOrderNo === order.orderNo) return;
    setRejectionAlertedOrderNo(order.orderNo);
    Swal.fire({ title: "Payment Rejected", text: "Please reach out to our Facebook Page for Order Revalidation. Just provide the Order Number or your Name and Contact number for reference. Thank you!", confirmButtonText: "OK", confirmButtonColor: "#B42318" });
  }, [order, rejectionAlertedOrderNo]);

  async function handleSearch() {
    setError(""); setLoading(true);
    try {
      const query = form.orderNo ? { orderNo: form.orderNo } : { contactNumber: form.contactNumber, customerName: form.customerName };
      const result = await api.trackOrder(query);
      const found = Array.isArray(result) ? result[0] : result;
      setOrder(found); setTrackingOrderNo(found.orderNo || ""); setShowResult(true);
    } catch (requestError) { setError(requestError.message); setOrder(null); setTrackingOrderNo(""); setShowResult(false); } finally { setLoading(false); }
  }

  return (
    <CustomerLayout>
      {showResult && order ? <TrackingResult order={order} onBackHome={() => navigate("/")} /> : (
        <div className="mx-auto max-w-xl">
          <header className="mb-7 text-center"><p className="page-eyebrow">Order updates</p><h1 className="page-title">Track your order</h1><p className="page-subtitle mx-auto">Enter your details to see the latest preparation and pickup status.</p></header>
          <div className="surface-card p-5 sm:p-7">
            <TextInput label="Order number" value={form.orderNo} onChange={(event) => setForm({ ...form, orderNo: event.target.value })} placeholder="HO-20240101-0001" />
            <div className="my-5 flex items-center gap-3 text-xs text-[#817C89]"><span className="h-px flex-1 bg-[#E8E6ED]" /><span>or search by contact</span><span className="h-px flex-1 bg-[#E8E6ED]" /></div>
            <TextInput label="Mobile number" value={form.contactNumber} onChange={(event) => setForm({ ...form, contactNumber: event.target.value })} placeholder="09XXXXXXXXX" />
            <TextInput label="Your name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} placeholder="Juan Dela Cruz" />
            {error && <div className="mb-4 rounded-2xl bg-[#FFF1F0] p-4 text-sm text-[#B42318]" role="alert"><strong>Order not found.</strong> {error}. Double-check your details and try again.</div>}
            <button onClick={handleSearch} disabled={loading} className="btn-primary w-full">{loading ? "Searching…" : "Track order"}</button>
          </div>
          {loading && <div className="flex justify-center py-8"><CometSpinner size={44} color="#462C7D" /></div>}
        </div>
      )}
    </CustomerLayout>
  );
}
