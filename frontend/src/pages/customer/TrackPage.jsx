import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { TextInput } from "../../components/ui/FormField";
import { Spinner } from "../../components/ui/Spinner";
import { Swal } from "../../lib/swal";

const STATUS_STEPS = [
  { key: "NEW", label: "Placed" },
  { key: "PAYMENT_REVIEW", label: "Payment Review" },
  { key: "PREPARING", label: "Baking" },
  { key: "READY_FOR_PICKUP", label: "Ready" },
  { key: "COMPLETED", label: "Done" },
];

const STATUS_MESSAGES = {
  NEW: "Order received! Please wait while we confirm..",
  PAYMENT_REVIEW: "We are reviewing your payment",
  PAYMENT_REJECTED: "We are reviewing your payment",
  PREPARING: "Freshly baking your goodies, please wait patiently..",
  READY_FOR_PICKUP: "Hot and Ready! Your order is now ready for pickup!",
  COMPLETED: "Thanks for your order!",
};

function BakingLoader() {
  return (
    <div className="flex items-center justify-center gap-3 mt-5">
      <span
        className="text-3xl"
        style={{ animation: "breadBounce 1.1s ease-in-out infinite" }}
      >
        🍞
      </span>
      <span className="text-[0.8rem]" style={{ color: "#9080A8" }}>
        Baking in progress...
      </span>
    </div>
  );
}

function ReadyLoader() {
  return (
    <div className="flex items-center justify-center gap-3 mt-5">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
        style={{
          background: "rgba(61,189,135,0.16)",
          border: "1px solid rgba(61,189,135,0.35)",
          color: "#3DBD87",
          animation: "statusGlow 1.3s ease-in-out infinite",
        }}
      >
        ✓
      </span>
      <span className="text-[0.82rem] font-semibold" style={{ color: "#3DBD87" }}>
        Ready for pickup
      </span>
    </div>
  );
}

function TrackingResult({ order, onBackHome, onSearchAgain }) {
  const progressStatus =
    order.status === "PAYMENT_REJECTED" ? "PAYMENT_REVIEW" : order.status;
  const stepIndex = STATUS_STEPS.findIndex((s) => s.key === progressStatus);
  const waitingForPickup = ["NEW", "PAYMENT_REVIEW", "PREPARING"].includes(order.status);

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="rounded-xl p-5 md:p-6"
        style={{
          background: "#1E1235",
          border: "1px solid rgba(201,168,76,0.18)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
        }}
      >
        <style>{`
          @keyframes breadBounce {
            0%, 100% { transform: translateY(0) rotate(-4deg); }
            50% { transform: translateY(-8px) rotate(4deg); }
          }
          @keyframes statusGlow {
            0%, 100% { box-shadow: 0 0 0 rgba(201,168,76,0); }
            50% { box-shadow: 0 0 24px rgba(201,168,76,0.55); }
          }
        `}</style>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="font-bold text-lg" style={{ color: "#C9A84C" }}>
              {order.orderNo}
            </p>
            <p className="text-[0.78rem] mt-1" style={{ color: "#9080A8" }}>
              {order.customerName} · {order.contactNumber}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.status === "CANCELLED" ? (
          <div
            className="rounded-lg p-4 mb-6"
            style={{
              background: "rgba(224,82,82,0.1)",
              border: "1px solid rgba(224,82,82,0.25)",
              color: "#F0E8D8",
            }}
          >
            This order is currently marked as cancelled.
          </div>
        ) : (
          <div className="mb-6">
            <p
              className="text-center text-[0.92rem] font-semibold mb-4"
              style={{
                color:
                  order.status === "READY_FOR_PICKUP"
                    ? "#3DBD87"
                    : order.status === "PAYMENT_REJECTED"
                      ? "#E05252"
                      : "#E8C96D",
              }}
            >
              {STATUS_MESSAGES[order.status] || STATUS_MESSAGES[progressStatus]}
            </p>
            <div className="flex items-center gap-2 mb-3">
              {STATUS_STEPS.map((step, i) => {
                const active = i === stepIndex;
                const done = i <= stepIndex;
                return (
                  <div key={step.key} className="flex-1">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        background: done ? "#C9A84C" : "rgba(201,168,76,0.15)",
                        animation: active ? "statusGlow 1.3s ease-in-out infinite" : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {STATUS_STEPS.map((step, i) => {
                const active = i === stepIndex;
                return (
                  <div
                    key={step.key}
                    className="text-center rounded-lg px-1 py-2"
                    style={{
                      color: active ? "#1A0F2E" : i <= stepIndex ? "#C9A84C" : "rgba(240,232,220,0.28)",
                      background: active ? "#C9A84C" : "transparent",
                      animation: active ? "statusGlow 1.3s ease-in-out infinite" : "none",
                    }}
                  >
                    <div className="text-[0.62rem] font-bold">{step.label}</div>
                  </div>
                );
              })}
            </div>
            {waitingForPickup && <BakingLoader />}
            {order.status === "READY_FOR_PICKUP" && <ReadyLoader />}
          </div>
        )}

        <div
          className="text-[0.84rem] space-y-2 pt-4"
          style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
        >
          <div className="flex justify-between gap-3">
            <span style={{ color: "#9080A8" }}>Total</span>
            <span className="font-bold" style={{ color: "#C9A84C" }}>
              ₱{order.total?.toFixed(2)}
            </span>
          </div>
          {(order.pickupLabel || order.pickupSlotId) && (
            <div className="flex justify-between gap-3">
              <span style={{ color: "#9080A8" }}>Pickup</span>
              <span className="text-right" style={{ color: "#F0E8D8" }}>
                {order.pickupDate} · {order.pickupLabel || order.pickupSlotId}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button className="btn-secondary flex-1" onClick={onSearchAgain}>
          Search Another Order
        </button>
        <button className="btn-secondary flex-1" onClick={onBackHome}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default function TrackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    orderNo: params.get("orderNo") || "",
    contactNumber: params.get("contactNumber") || "",
    customerName: params.get("customerName") || "",
  });
  const [order, setOrder] = useState(null);
  const [trackingOrderNo, setTrackingOrderNo] = useState(params.get("orderNo") || "");
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rejectionAlertedOrderNo, setRejectionAlertedOrderNo] = useState("");

  useEffect(() => {
    if (!trackingOrderNo) return undefined;
    const intervalId = window.setInterval(async () => {
      try {
        setOrder(await api.trackOrder({ orderNo: trackingOrderNo }));
      } catch {
        window.clearInterval(intervalId);
      }
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [trackingOrderNo]);

  useEffect(() => {
    if (params.get("orderNo") || (params.get("customerName") && params.get("contactNumber"))) {
      handleSearch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (
      order?.status !== "PAYMENT_REJECTED" ||
      rejectionAlertedOrderNo === order.orderNo
    )
      return;
    setRejectionAlertedOrderNo(order.orderNo);
    Swal.fire({
      title: "Payment Rejected",
      text: "Please reach out to our Facebook Page for Order Revalidation. Just provide the Order Number or your Name and Contact number for reference. Thank you!",
      confirmButtonText: "OK",
      confirmButtonColor: "#E05252",
    });
  }, [order, rejectionAlertedOrderNo]);

  async function handleSearch() {
    setError("");
    setLoading(true);
    try {
      const query = form.orderNo
        ? { orderNo: form.orderNo }
        : {
            contactNumber: form.contactNumber,
            customerName: form.customerName,
          };
      const result = await api.trackOrder(query);
      const found = Array.isArray(result) ? result[0] : result;
      setOrder(found);
      setTrackingOrderNo(found.orderNo || "");
      setShowResult(true);
    } catch (err) {
      setError(err.message);
      setOrder(null);
      setTrackingOrderNo("");
      setShowResult(false);
    } finally {
      setLoading(false);
    }
  }

  const surfaceStyle = {
    background: "#1E1235",
    border: "1px solid rgba(201,168,76,0.18)",
    borderRadius: "12px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
  };

  return (
    <CustomerLayout>
      {showResult && order ? (
        <TrackingResult
          order={order}
          onBackHome={() => navigate("/")}
          onSearchAgain={() => {
            setShowResult(false);
            setOrder(null);
          }}
        />
      ) : (
        <div className="max-w-xl mx-auto">
          <h1
            className="font-display text-2xl font-bold mb-6"
            style={{ color: "#E8C96D" }}
          >
            Track Your Order
          </h1>
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
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.12)" }} />
              <span className="text-[0.72rem] font-medium" style={{ color: "rgba(240,232,220,0.25)" }}>
                or search by contact
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.12)" }} />
            </div>
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
            {error && (
              <div
                className="rounded-xl px-5 py-4 mb-3 text-[0.83rem]"
                style={{
                  background: "#E05252",
                  border: "1px solid #E05252",
                  color: "#fff",
                }}
              >
                <p className="font-semibold mb-1">Order not found</p>
                <p>{error}. Double-check your details and try again.</p>
              </div>
            )}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Searching..." : "Track Order"}
            </button>
          </div>
          {loading && <Spinner className="py-10" />}
        </div>
      )}
    </CustomerLayout>
  );
}
