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
import { CalendarClockIcon, PackageStackIcon } from "../../components/ui/Icons";
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
    icon: <CalendarClockIcon className="h-5 w-5" />,
  },
  {
    status: "BULK",
    label: "Bulk Orders",
    color: "#462C7D",
    icon: <PackageStackIcon className="h-5 w-5" />,
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
    color: "#462C7D",
    icon: "✓",
  },
  {
    status: "CANCELLED",
    label: "Cancelled Order",
    color: "#6F6B78",
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

function getQueueKey(order, today = getPHTDateString()) {
  if (order.status === "NEW") return "NEW";
  if (order.status === "PAYMENT_REVIEW") {
    if (order.pickupDate > today) return "ADVANCE";
    if ((Number(order.totalQty) || 0) > 20) return "BULK";
  }
  return order.status;
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
    fontFamily: "Google Sans, Arial, sans-serif",
  };
  if (variant === "primary")
    return { ...base, background: "#462C7D", color: "#FFFFFF" };
  if (variant === "success")
    return { ...base, background: "#3DBD87", color: "#fff" };
  if (variant === "danger")
    return { ...base, background: "#E05252", color: "#fff" };
  if (variant === "outline")
    return {
      ...base,
      background: "rgba(70,44,125,0.08)",
      color: "#462C7D",
      border: "1.5px solid rgba(70,44,125,0.35)",
    };
  if (variant === "ghost")
    return {
      ...base,
      background: "transparent",
      color: "#6F6B78",
      border: "1.5px solid rgba(70,44,125,0.18)",
    };
  return base;
}

function OrderCard({ order, rank, colColor, acting, onAction, onView }) {
  const transitions = TRANSITIONS[order.status] || [];
  const isBulk = (Number(order.totalQty) || 0) > 20;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(70,44,125,0.14)",
        borderTop: `3px solid ${colColor}`,
        borderRadius: "12px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        boxShadow: "0 2px 10px rgba(23,21,29,0.08)",
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
          {order.orderType === "WALK_IN" && (
            <span style={{ borderRadius: "999px", background: "#462C7D", color: "#FFFFFF", fontSize: "0.58rem", fontWeight: 800, padding: "3px 7px", textTransform: "uppercase" }}>
              Walk-in
            </span>
          )}
          <span
            style={{
              background: colColor,
              color: "#FFFFFF",
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
              color: "#462C7D",
              fontWeight: 700,
              fontSize: "0.85rem",
              fontFamily: "Google Sans, Arial, sans-serif",
            }}
          >
            {order.orderNo}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          {isBulk && (
            <span
              style={{
                borderRadius: "999px",
                background: "rgba(70,44,125,0.1)",
                color: "#462C7D",
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.04em",
                padding: "3px 8px",
                textTransform: "uppercase",
              }}
            >
              Bulk
            </span>
          )}
          <span style={{ color: "#AAA6B0", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
            {ageStr(order.createdAt)}
          </span>
          <button
            type="button"
            onClick={() => onView(order)}
            style={{ border: 0, background: "transparent", color: "#462C7D", cursor: "pointer", fontFamily: "inherit", fontSize: "0.68rem", fontWeight: 700, padding: 0 }}
          >
            View details
          </button>
        </div>
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
              color: "#17151D",
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
              color: "#462C7D",
              fontWeight: 700,
              fontSize: "0.85rem",
              flexShrink: 0,
            }}
          >
            {peso(order.total)}
          </span>
        </div>
        <span style={{ color: "#6F6B78", fontSize: "0.73rem" }}>
          {order.contactNumber}
        </span>
        <span style={{ color: "#6F6B78", fontSize: "0.73rem", fontWeight: 600 }}>
          Total quantity: {order.totalQty || 0}
        </span>
        <div>
          <StatusBadge status={order.status} />
        </div>
        <span style={{ color: "#AAA6B0", fontSize: "0.7rem" }}>
          📅 {order.pickupDate} · {order.pickupLabel || "—"}
        </span>
      </div>

      <div
        style={{
          display: transitions.length > 0 ? "grid" : "none",
          gridTemplateColumns: `repeat(${Math.min(transitions.length, 2)}, minmax(0, 1fr))`,
          gap: "7px",
          paddingTop: "8px",
          borderTop: "1px solid rgba(70,44,125,0.1)",
        }}
      >
        {transitions.map((action) => (
          <button
            key={action.to}
            type="button"
            style={{ ...btnStyle(action.style), width: "100%", minHeight: "34px" }}
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
        color: "#AAA6B0",
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
        background: "#F7F7FA",
        border: "1px solid rgba(70,44,125,0.1)",
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
        background: "#F7F7FA",
        border: "1px solid rgba(70,44,125,0.1)",
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
          borderBottom: "1px solid rgba(70,44,125,0.1)",
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
                  filter === option.key ? "transparent" : "rgba(70,44,125,0.25)",
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
  background: "#FFFFFF",
  border: "1.5px solid rgba(70,44,125,0.25)",
  borderRadius: "8px",
  color: "#17151D",
  fontSize: "0.78rem",
  fontFamily: "Google Sans, Arial, sans-serif",
  padding: "6px 9px",
  outline: "none",
  colorScheme: "light",
};

function PanelHeader({ col, count }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: "2px solid rgba(70,44,125,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#462C7D",
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
          color: "#FFFFFF",
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
        background: "#F7F7FA",
        border: "1px solid rgba(70,44,125,0.1)",
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <PanelHeader col={col} count={orders.length} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[0.78rem]">
          <thead style={{ background: "#462C7D", color: "#6F6B78" }}>
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
                <td className="px-4 py-8 text-center" colSpan={7} style={{ color: "#AAA6B0" }}>
                  No orders here
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.orderId}
                  style={{ borderTop: "1px solid rgba(70,44,125,0.08)" }}
                >
                  <td className="px-4 py-3 font-semibold" style={{ color: "#462C7D" }}>
                    {order.orderNo}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#17151D" }}>
                    {order.customerName}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#6F6B78" }}>
                    {order.contactNumber}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#6F6B78" }}>
                    {order.pickupDate} · {order.pickupLabel || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#462C7D" }}>
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
        borderBottom: "1px solid rgba(70,44,125,0.08)",
      }}
    >
      <span style={{ color: "#6F6B78", fontSize: "0.75rem" }}>{label}</span>
      <span
        style={{
          color: "#17151D",
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
            <span style={{ color: "#462C7D", fontWeight: 800 }}>{peso(order.total)}</span>
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
                color: "#462C7D",
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
              <p style={{ color: "#6F6B78", fontSize: "0.78rem" }}>
                No item details were found for this order.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(70,44,125,0.1)",
                      borderRadius: "10px",
                      padding: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        color: "#17151D",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                      }}
                    >
                      <span>{item.name || item.productName || "Product"}</span>
                      <span>{peso(item.lineTotal || item.subtotal || item.price * item.qty)}</span>
                    </div>
                    <div style={{ color: "#6F6B78", fontSize: "0.72rem", marginTop: "4px" }}>
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
                borderTop: "1px solid rgba(70,44,125,0.12)",
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
      async (snap) => {
        try {
          const rawOrders = snap.docs.map((d) => ({ orderId: d.id, ...d.data() }));
          const hydratedOrders = await Promise.all(rawOrders.map(async (order) => {
            if (typeof order.totalQty === "number") return order;
            const itemsSnapshot = await getDocs(query(collection(db, "order_items"), where("orderId", "==", order.orderId)));
            const totalQty = itemsSnapshot.docs.reduce((sum, itemDoc) => sum + (Number(itemDoc.data().qty) || 0), 0);
            return { ...order, totalQty };
          }));
          setOrders(hydratedOrders);
        } catch (error) {
          console.error("Order quantity hydration error:", error);
          setOrders(snap.docs.map((d) => ({ orderId: d.id, ...d.data(), totalQty: d.data().totalQty || 0 })));
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Order queue listener error:", err);
        setLoading(false);
        showToast("Unable to load staff order queue.", "error");
      },
    );
    return unsub;
  }, []);

  function confirmationText(toStatus, fromStatus) {
    if (toStatus === "PREPARING") return "Are you sure Payment is Fully Verified?";
    if (toStatus === "PAYMENT_REJECTED") return "Are you sure to Reject this Payment?";
    if (toStatus === "READY_FOR_PICKUP")
      return "Are you sure to Mark the Order Ready for Pickup?";
    if (toStatus === "COMPLETED") return "Are you sure this order was Picked Up?";
    if (toStatus === "PAYMENT_REVIEW" && fromStatus === "NEW") return "Accept this order?";
    if (toStatus === "PAYMENT_REVIEW") return "Re-open this order for payment review?";
    if (toStatus === "CANCELLED") return "Are you to cancel this order?";
    return "Are you sure you want to update this order?";
  }

  async function confirmAction(toStatus, fromStatus) {
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
      text: confirmationText(toStatus, fromStatus),
      showCancelButton: true,
      confirmButtonText: "Yes, continue",
      cancelButtonText: "No",
    });
    return { confirmed: result.isConfirmed };
  }

  async function handleAction(orderId, toStatus) {
    const currentOrder = orders.find((order) => order.orderId === orderId);
    const confirmation = await confirmAction(toStatus, currentOrder?.status);
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
    const byStatus = Object.fromEntries(COLUMNS.map((column) => [column.status, []]));
    const today = getPHTDateString();
    filtered.forEach((order) => {
      const queueKey = getQueueKey(order, today);
      if (byStatus[queueKey]) byStatus[queueKey].push(order);
    });
    return byStatus;
  }, [filtered]);

  const advanceOrders = useMemo(() => {
    const nextDay = getPHTDateString(1);
    return (grouped.ADVANCE || [])
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
  }, [grouped, advanceFilter, customFrom, customTo]);

  const allAdvanceOrders = useMemo(() => {
    return (grouped.ADVANCE || [])
      .sort((a, b) => pickupSortValue(a).localeCompare(pickupSortValue(b)));
  }, [grouped]);

  const activeCol = COLUMNS.find((c) => c.status === activeTab) || COLUMNS[0];
  const activeOrders = activeCol.status === "ADVANCE" ? advanceOrders : grouped[activeCol.status] || [];
  const sidebarItems = COLUMNS.map((col) => ({
    ...col,
    count:
      col.status === "ADVANCE" ? allAdvanceOrders.length : grouped[col.status]?.length || 0,
  }));
  const isTableView = ["COMPLETED", "CANCELLED"].includes(activeCol.status);

  const inputStyle = {
    background: "#FFFFFF",
    border: "1.5px solid rgba(70,44,125,0.25)",
    borderRadius: "8px",
    color: "#17151D",
    fontSize: "0.83rem",
    fontFamily: "Google Sans, Arial, sans-serif",
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
              color: "#462C7D",
              fontWeight: 700,
              fontSize: "1.15rem",
              fontFamily: "Google Sans, Arial, sans-serif",
            }}
          >
            {activeCol.label}
          </h2>
          <p style={{ color: "#6F6B78", fontSize: "0.74rem", marginTop: "2px" }}>
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
              color: "#AAA6B0",
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
            onFocus={(e) => (e.target.style.borderColor = "#462C7D")}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(70,44,125,0.25)")
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
