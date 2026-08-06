import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { api } from "../../lib/api";
import { StaffLayout } from "../../components/layout/StaffLayout";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";
import { ReceiptPreview } from "../../components/ui/ReceiptPreview";
import { Swal } from "../../lib/swal";

const QUEUE_STATUSES = [
  "NEW",
  "PAYMENT_REVIEW",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "PAYMENT_REJECTED",
];

const COLUMNS = [
  { status: "NEW", label: "New Orders", color: "#E8A94C", icon: "🆕" },
  {
    status: "ADVANCE",
    label: "Advance Orders",
    color: "#4FC3C7",
    icon: "Cal",
  },
  {
    status: "PAYMENT_REVIEW",
    label: "Payment Review",
    color: "#6B9FE8",
    icon: "💳",
  },
  { status: "PREPARING", label: "Preparing", color: "#A78BFA", icon: "🍞" },
  {
    status: "READY_FOR_PICKUP",
    label: "Ready for Pickup",
    color: "#3DBD87",
    icon: "✅",
  },
  {
    status: "COMPLETED",
    label: "Completed Order",
    color: "#C9A84C",
    icon: "✓",
  },
  {
    status: "CANCELLED",
    label: "Cancelled Order",
    color: "#9080A8",
    icon: "⊘",
  },
  {
    status: "PAYMENT_REJECTED",
    label: "Payment Rejected",
    color: "#E05252",
    icon: "✕",
  },
];

const TRANSITIONS = {
  NEW: [
    { label: "Accept", to: "PAYMENT_REVIEW", style: "primary" },
    { label: "Cancel", to: "CANCELLED", style: "ghost" },
  ],
  PAYMENT_REVIEW: [
    { label: "Cancel", to: "CANCELLED", style: "ghost" },
  ],
  PAYMENT_REJECTED: [
    { label: "Re-open Payment", to: "PAYMENT_REVIEW", style: "primary" },
    { label: "Cancel", to: "CANCELLED", style: "ghost" },
  ],
  PREPARING: [
    { label: "Mark Ready", to: "READY_FOR_PICKUP", style: "success" },
    { label: "Cancel", to: "CANCELLED", style: "ghost" },
  ],
  READY_FOR_PICKUP: [
    { label: "Complete Pickup", to: "COMPLETED", style: "success" },
  ],
};

function ageStr(createdAt) {
  if (!createdAt?.toDate) return "";
  const m = Math.floor((Date.now() - createdAt.toDate()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function peso(value) {
  return `₱${(Number(value) || 0).toFixed(2)}`;
}

const ADVANCE_FILTERS = [
  { key: "all", label: "All" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "custom", label: "Custom Date" },
];

function getPHTDateString(offsetDays = 0) {
  const pht = new Date(Date.now() + 8 * 60 * 60 * 1000);
  pht.setUTCDate(pht.getUTCDate() + offsetDays);
  return `${pht.getUTCFullYear()}-${String(pht.getUTCMonth() + 1).padStart(2, "0")}-${String(pht.getUTCDate()).padStart(2, "0")}`;
}

function parsePickupMinutes(label) {
  const match = String(label).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 9999;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function pickupSortValue(order) {
  const date = order.pickupDate || "9999-12-31";
  const minutes =
    typeof order.pickupStartMinutes === "number"
      ? order.pickupStartMinutes
      : typeof order.startMinutes === "number"
        ? order.startMinutes
        : parsePickupMinutes(order.pickupLabel || "");
  return `${date}-${String(minutes).padStart(4, "0")}`;
}

function btnStyle(variant) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 11px",
    borderRadius: "6px",
    fontSize: "0.72rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    fontFamily: "Inter, sans-serif",
  };
  if (variant === "primary")
    return { ...base, background: "#C9A84C", color: "#1A0F2E" };
  if (variant === "success")
    return { ...base, background: "#3DBD87", color: "#fff" };
  if (variant === "danger")
    return { ...base, background: "#E05252", color: "#fff" };
  if (variant === "outline")
    return {
      ...base,
      background: "rgba(201,168,76,0.08)",
      color: "#E8C96D",
      border: "1.5px solid rgba(201,168,76,0.35)",
    };
  if (variant === "ghost")
    return {
      ...base,
      background: "transparent",
      color: "#9080A8",
      border: "1.5px solid rgba(201,168,76,0.18)",
    };
  return base;
}

function OrderCard({ order, rank, colColor, acting, onAction, onView }) {
  const transitions = TRANSITIONS[order.status] || [];

  return (
    <div
      style={{
        background: "#1E1235",
        border: "1px solid rgba(201,168,76,0.14)",
        borderTop: `3px solid ${colColor}`,
        borderRadius: "12px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span
            style={{
              background: colColor,
              color: "#1A0F2E",
              borderRadius: "5px",
              fontSize: "0.6rem",
              fontWeight: 800,
              padding: "2px 6px",
              flexShrink: 0,
            }}
          >
            #{rank}
          </span>
          <span
            style={{
              color: "#C9A84C",
              fontWeight: 700,
              fontSize: "0.85rem",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {order.orderNo}
          </span>
        </div>
        <span
          style={{
            color: "#5A4870",
            fontSize: "0.68rem",
            whiteSpace: "nowrap",
          }}
        >
          {ageStr(order.createdAt)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "#F0E8D8",
              fontWeight: 600,
              fontSize: "0.82rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "65%",
            }}
          >
            {order.customerName}
          </span>
          <span
            style={{
              color: "#E8C96D",
              fontWeight: 700,
              fontSize: "0.85rem",
              flexShrink: 0,
            }}
          >
            {peso(order.total)}
          </span>
        </div>
        <span style={{ color: "#9080A8", fontSize: "0.73rem" }}>
          {order.contactNumber}
        </span>
        <div>
          <StatusBadge status={order.status} />
        </div>
        <span style={{ color: "#5A4870", fontSize: "0.7rem" }}>
          📅 {order.pickupDate} · {order.pickupLabel || "—"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          paddingTop: "6px",
          borderTop: "1px solid rgba(201,168,76,0.1)",
        }}
      >
        <button type="button" style={btnStyle("outline")} onClick={() => onView(order)}>
          View
        </button>
        {transitions.map((action) => (
          <button
            key={action.to}
            type="button"
            style={btnStyle(action.style)}
            disabled={acting}
            onClick={() => onAction(order.orderId, action.to)}
          >
            {acting ? "…" : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        textAlign: "center",
        padding: "32px 16px",
        color: "#5A4870",
        fontSize: "0.78rem",
      }}
    >
      <div style={{ fontSize: "1.8rem", marginBottom: "6px", opacity: 0.4 }}>
        📭
      </div>
      No orders here
    </div>
  );
}

function ColumnPanel({ col, orders, acting, onAction, onView }) {
  return (
    <div
      style={{
        background: "#120B22",
        border: "1px solid rgba(201,168,76,0.1)",
        borderRadius: "14px",
        display: "flex",
        flexDirection: "column",
        minHeight: "200px",
        overflow: "hidden",
      }}
    >
      <PanelHeader col={col} count={orders.length} />

      <div
        style={{
          padding: "14px",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "12px",
          alignContent: "start",
          flex: 1,
        }}
        className="staff-card-grid"
      >
        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          orders.map((order, idx) => (
            <OrderCard
              key={order.orderId}
              order={order}
              rank={idx + 1}
              colColor={col.color}
              acting={acting}
              onAction={onAction}
              onView={onView}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AdvanceOrdersPanel({
  col,
  orders,
  filter,
  onFilterChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  minDate,
  acting,
  onAction,
  onView,
}) {
  return (
    <div
      style={{
        background: "#120B22",
        border: "1px solid rgba(201,168,76,0.1)",
        borderRadius: "14px",
        display: "flex",
        flexDirection: "column",
        minHeight: "200px",
        overflow: "hidden",
      }}
    >
      <PanelHeader col={col} count={orders.length} />

      <div
        style={{
          padding: "14px",
          borderBottom: "1px solid rgba(201,168,76,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {ADVANCE_FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onFilterChange(option.key)}
              style={{
                ...btnStyle(filter === option.key ? "primary" : "ghost"),
                borderColor:
                  filter === option.key ? "transparent" : "rgba(201,168,76,0.25)",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filter === "custom" && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="date"
              value={customFrom}
              min={minDate}
              max={customTo}
              onChange={(e) => onCustomFromChange(e.target.value)}
              style={advanceDateInputStyle}
            />
            <input
              type="date"
              value={customTo}
              min={customFrom || minDate}
              onChange={(e) => onCustomToChange(e.target.value)}
              style={advanceDateInputStyle}
            />
          </div>
        )}
      </div>

      <div
        style={{
          padding: "14px",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "12px",
          alignContent: "start",
          flex: 1,
        }}
        className="staff-card-grid"
      >
        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          orders.map((order, idx) => (
            <OrderCard
              key={order.orderId}
              order={order}
              rank={idx + 1}
              colColor={col.color}
              acting={acting}
              onAction={onAction}
              onView={onView}
            />
          ))
        )}
      </div>
    </div>
  );
}

const advanceDateInputStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1.5px solid rgba(201,168,76,0.25)",
  borderRadius: "8px",
  color: "#F0E8D8",
  fontSize: "0.78rem",
  fontFamily: "Inter, sans-serif",
  padding: "6px 9px",
  outline: "none",
  colorScheme: "dark",
};

function PanelHeader({ col, count }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: "2px solid rgba(201,168,76,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0D0820",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "1rem" }}>{col.icon}</span>
        <span
          style={{
            color: col.color,
            fontWeight: 700,
            fontSize: "0.82rem",
            letterSpacing: "0.2px",
          }}
        >
          {col.label}
        </span>
      </div>
      <span
        style={{
          background: col.color,
          color: "#1A0F2E",
          borderRadius: "20px",
          fontSize: "0.65rem",
          fontWeight: 800,
          padding: "2px 8px",
          minWidth: "22px",
          textAlign: "center",
        }}
      >
        {count}
      </span>
    </div>
  );
}

function OrderTablePanel({ col, orders, onView }) {
  return (
    <div
      style={{
        background: "#120B22",
        border: "1px solid rgba(201,168,76,0.1)",
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <PanelHeader col={col} count={orders.length} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[0.78rem]">
          <thead style={{ background: "#0D0820", color: "#9080A8" }}>
            <tr>
              {["Order", "Customer", "Contact", "Pickup", "Total", "Status", ""].map(
                (heading) => (
                  <th key={heading} className="px-4 py-3 font-semibold">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center" colSpan={7} style={{ color: "#5A4870" }}>
                  No orders here
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.orderId}
                  style={{ borderTop: "1px solid rgba(201,168,76,0.08)" }}
                >
                  <td className="px-4 py-3 font-semibold" style={{ color: "#E8C96D" }}>
                    {order.orderNo}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#F0E8D8" }}>
                    {order.customerName}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#9080A8" }}>
                    {order.contactNumber}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#9080A8" }}>
                    {order.pickupDate} · {order.pickupLabel || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#E8C96D" }}>
                    {peso(order.total)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" style={btnStyle("outline")} onClick={() => onView(order)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        padding: "8px 0",
        borderBottom: "1px solid rgba(201,168,76,0.08)",
      }}
    >
      <span style={{ color: "#9080A8", fontSize: "0.75rem" }}>{label}</span>
      <span
        style={{
          color: "#F0E8D8",
          fontWeight: 600,
          fontSize: "0.78rem",
          textAlign: "right",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function OrderDetailsModal({
  order,
  items,
  paymentProof,
  loading,
  acting,
  onAction,
  onClose,
}) {
  return (
    <Modal
      open={Boolean(order)}
      onClose={onClose}
      title={order ? `Order ${order.orderNo}` : "Order Details"}
    >
      {order && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <StatusBadge status={order.status} />
            <span style={{ color: "#E8C96D", fontWeight: 800 }}>{peso(order.total)}</span>
          </div>

          <div>
            <DetailRow label="Customer" value={order.customerName} />
            <DetailRow label="Contact" value={order.contactNumber} />
            <DetailRow label="Pickup Date" value={order.pickupDate} />
            <DetailRow label="Pickup Time" value={order.pickupLabel} />
            <DetailRow label="Order Placed By" value={formatDateTime(order.createdAt)} />
            <DetailRow
              label="Bank / Provider"
              value={paymentProof?.paymentProvider || order.paymentProvider}
            />
            <DetailRow
              label="Amount Paid"
              value={peso(paymentProof?.amount || order.paymentAmount)}
            />
            <DetailRow
              label="Reference Number"
              value={paymentProof?.refNumber || order.paymentRefNumber}
            />
            <DetailRow
              label="Payment Timestamp"
              value={formatDateTime(paymentProof?.createdAt || order.paidAt)}
            />
            {order.status === "COMPLETED" && (
              <DetailRow label="Picked Up" value={formatDateTime(order.pickedUpAt)} />
            )}
            {order.status === "CANCELLED" && (
              <DetailRow
                label="Reason for Cancellation"
                value={order.cancellationReason}
              />
            )}
          </div>

          <ReceiptPreview proofId={paymentProof?.proofId} />

          <div>
            <h3
              style={{
                color: "#E8C96D",
                fontWeight: 700,
                fontSize: "0.86rem",
                marginBottom: "8px",
              }}
            >
              Items
            </h3>
            {loading ? (
              <Spinner />
            ) : items.length === 0 ? (
              <p style={{ color: "#9080A8", fontSize: "0.78rem" }}>
                No item details were found for this order.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(201,168,76,0.1)",
                      borderRadius: "10px",
                      padding: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        color: "#F0E8D8",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                      }}
                    >
                      <span>{item.name || item.productName || "Product"}</span>
                      <span>{peso(item.lineTotal || item.subtotal || item.price * item.qty)}</span>
                    </div>
                    <div style={{ color: "#9080A8", fontSize: "0.72rem", marginTop: "4px" }}>
                      Qty: {item.qty || item.quantity || 1}
                      {item.price ? ` · ${peso(item.price)} each` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {order.status === "PAYMENT_REVIEW" && (
            <div
              style={{
                borderTop: "1px solid rgba(201,168,76,0.12)",
                paddingTop: "14px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={acting}
                style={btnStyle("success")}
                onClick={() => onAction(order.orderId, "PREPARING")}
              >
                Verify Payment
              </button>
              <button
                type="button"
                disabled={acting}
                style={btnStyle("danger")}
                onClick={() => onAction(order.orderId, "PAYMENT_REJECTED")}
              >
                Reject Payment
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [activeTab, setActiveTab] = useState("NEW");
  const [search, setSearch] = useState("");
  const tomorrow = getPHTDateString(1);
  const [advanceFilter, setAdvanceFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState(tomorrow);
  const [customTo, setCustomTo] = useState(tomorrow);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedProof, setSelectedProof] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", QUEUE_STATUSES),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ orderId: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Order queue listener error:", err);
        setLoading(false);
        showToast("Unable to load staff order queue.", "error");
      },
    );
    return unsub;
  }, []);

  function confirmationText(toStatus) {
    if (toStatus === "PREPARING") return "Are you sure Payment is Fully Verified?";
    if (toStatus === "PAYMENT_REJECTED") return "Are you sure to Reject this Payment?";
    if (toStatus === "READY_FOR_PICKUP")
      return "Are you sure to Mark the Order Ready for Pickup?";
    if (toStatus === "COMPLETED") return "Are you sure this order was Picked Up?";
    if (toStatus === "PAYMENT_REVIEW") return "Are you sure to Re-open Payment Review?";
    if (toStatus === "CANCELLED") return "Are you to cancel this order?";
    return "Are you sure you want to update this order?";
  }

  async function confirmAction(toStatus) {
    if (toStatus === "CANCELLED") {
      const result = await Swal.fire({
        title: "Cancel Order",
        text: "Are you to cancel this order?",
        input: "textarea",
        inputPlaceholder: "Enter staff reason for cancellation...",
        showCancelButton: true,
        confirmButtonText: "Cancel Order",
        cancelButtonText: "Go Back",
        confirmButtonColor: "#E05252",
        inputValidator: (value) =>
          value ? null : "Cancellation reason is required.",
      });
      return result.isConfirmed
        ? { confirmed: true, cancellationReason: result.value }
        : { confirmed: false };
    }

    const result = await Swal.fire({
      title: "Confirm Action",
      text: confirmationText(toStatus),
      showCancelButton: true,
      confirmButtonText: "Yes, continue",
      cancelButtonText: "No",
    });
    return { confirmed: result.isConfirmed };
  }

  async function handleAction(orderId, toStatus) {
    const confirmation = await confirmAction(toStatus);
    if (!confirmation.confirmed) return;
    setActing(true);
    try {
      await api.updateStatus(orderId, toStatus, {
        cancellationReason: confirmation.cancellationReason,
      });
      setSelectedOrder(null);
    } catch (err) {
      await Swal.fire({
        title: "Action Failed",
        text: err.message || "Failed to update order.",
        confirmButtonText: "OK",
        confirmButtonColor: "#E05252",
      });
    } finally {
      setActing(false);
    }
  }

  async function openDetails(order) {
    setSelectedOrder(order);
    setSelectedItems([]);
    setSelectedProof(null);
    setDetailsLoading(true);
    try {
      const itemsQuery = query(
        collection(db, "order_items"),
        where("orderId", "==", order.orderId),
      );
      const proofsQuery = query(
        collection(db, "payment_proofs"),
        where("orderId", "==", order.orderId),
        orderBy("createdAt", "desc"),
      );
      const [itemsSnap, proofsSnap] = await Promise.all([
        getDocs(itemsQuery),
        getDocs(proofsQuery),
      ]);
      setSelectedItems(itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSelectedProof(
        proofsSnap.docs[0]
          ? { proofId: proofsSnap.docs[0].id, ...proofsSnap.docs[0].data() }
          : null,
      );
    } catch (err) {
      console.error("Order details error:", err);
      showToast("Unable to load order item details.", "error");
    } finally {
      setDetailsLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter(
      (o) =>
        o.orderNo?.toLowerCase().includes(term) ||
        o.customerName?.toLowerCase().includes(term) ||
        o.contactNumber?.includes(term),
    );
  }, [orders, search]);

  const grouped = useMemo(() => {
    const byStatus = Object.fromEntries(QUEUE_STATUSES.map((s) => [s, []]));
    const today = getPHTDateString();
    filtered.forEach((order) => {
      if (order.pickupDate > today) return;
      if (byStatus[order.status]) byStatus[order.status].push(order);
    });
    return byStatus;
  }, [filtered]);

  const advanceOrders = useMemo(() => {
    const today = getPHTDateString();
    const nextDay = getPHTDateString(1);
    return filtered
      .filter((order) => order.pickupDate > today)
      .filter((order) => {
        if (advanceFilter === "tomorrow") return order.pickupDate === nextDay;
        if (advanceFilter === "custom") {
          return (
            order.pickupDate >= customFrom &&
            order.pickupDate <= customTo
          );
        }
        return true;
      })
      .sort((a, b) => pickupSortValue(a).localeCompare(pickupSortValue(b)));
  }, [filtered, advanceFilter, customFrom, customTo]);

  const allAdvanceOrders = useMemo(() => {
    const today = getPHTDateString();
    return filtered
      .filter((order) => order.pickupDate > today)
      .sort((a, b) => pickupSortValue(a).localeCompare(pickupSortValue(b)));
  }, [filtered]);

  const activeCol = COLUMNS.find((c) => c.status === activeTab) || COLUMNS[0];
  const activeOrders =
    activeCol.status === "ADVANCE"
      ? advanceOrders
      : grouped[activeCol.status] || [];
  const sidebarItems = COLUMNS.map((col) => ({
    ...col,
    count:
      col.status === "ADVANCE"
        ? allAdvanceOrders.length
        : grouped[col.status]?.length || 0,
  }));
  const isTableView = ["COMPLETED", "CANCELLED"].includes(activeCol.status);

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(201,168,76,0.25)",
    borderRadius: "8px",
    color: "#F0E8D8",
    fontSize: "0.83rem",
    fontFamily: "Inter, sans-serif",
    padding: "7px 12px 7px 32px",
    outline: "none",
    width: "210px",
    transition: "border 0.2s",
  };

  return (
    <StaffLayout
      orderCount={orders.length}
      statusItems={sidebarItems}
      activeStatus={activeCol.status}
      onStatusSelect={setActiveTab}
    >
      <ToastContainer />

      <style>{`
        @media (max-width: 1023px) { .staff-card-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 639px)  { .staff-card-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h2
            style={{
              color: "#E8C96D",
              fontWeight: 700,
              fontSize: "1.15rem",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {activeCol.label}
          </h2>
          <p style={{ color: "#9080A8", fontSize: "0.74rem", marginTop: "2px" }}>
            Use the left status panel to move between order queues.
          </p>
        </div>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#5A4870",
              fontSize: "0.85rem",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search order or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(201,168,76,0.25)")
            }
          />
        </div>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : activeCol.status === "ADVANCE" ? (
        <AdvanceOrdersPanel
          col={activeCol}
          orders={activeOrders}
          filter={advanceFilter}
          onFilterChange={setAdvanceFilter}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={(value) => {
            const next = value || tomorrow;
            setCustomFrom(next);
            if (customTo < next) setCustomTo(next);
          }}
          onCustomToChange={(value) => setCustomTo(value || customFrom)}
          minDate={tomorrow}
          acting={acting}
          onAction={handleAction}
          onView={openDetails}
        />
      ) : isTableView ? (
        <OrderTablePanel col={activeCol} orders={activeOrders} onView={openDetails} />
      ) : (
        <ColumnPanel
          col={activeCol}
          orders={activeOrders}
          acting={acting}
          onAction={handleAction}
          onView={openDetails}
        />
      )}

      <OrderDetailsModal
        order={selectedOrder}
        items={selectedItems}
        paymentProof={selectedProof}
        loading={detailsLoading}
        acting={acting}
        onAction={handleAction}
        onClose={() => setSelectedOrder(null)}
      />
    </StaffLayout>
  );
}
