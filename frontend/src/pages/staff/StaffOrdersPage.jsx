import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { api } from "../../lib/api";
import { StaffLayout } from "../../components/layout/StaffLayout";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { Spinner } from "../../components/ui/Spinner";

// ── Status machine ────────────────────────────────────────────────────────────
const QUEUE_STATUSES = [
  "NEW",
  "PAYMENT_REVIEW",
  "PAYMENT_REJECTED",
  "PREPARING",
  "READY_FOR_PICKUP",
];

const COLUMNS = [
  { status: "NEW", label: "New Orders", color: "#E8A94C", icon: "🆕" },
  {
    status: "PAYMENT_REVIEW",
    label: "Payment Review",
    color: "#6B9FE8",
    icon: "💳",
  },
  {
    status: "PAYMENT_REJECTED",
    label: "Payment Rejected",
    color: "#E05252",
    icon: "❌",
  },
  { status: "PREPARING", label: "Preparing", color: "#A78BFA", icon: "🍞" },
  {
    status: "READY_FOR_PICKUP",
    label: "Ready for Pickup",
    color: "#3DBD87",
    icon: "✅",
  },
];

const TRANSITIONS = {
  NEW: [
    { label: "Accept", to: "PAYMENT_REVIEW", style: "primary" },
    { label: "Cancel", to: "CANCELLED", style: "ghost" },
  ],
  PAYMENT_REVIEW: [
    { label: "Verify Payment", to: "PREPARING", style: "success" },
    { label: "Reject Payment", to: "PAYMENT_REJECTED", style: "danger" },
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function ageStr(createdAt) {
  if (!createdAt?.toDate) return "";
  const m = Math.floor((Date.now() - createdAt.toDate()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
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
  if (variant === "ghost")
    return {
      ...base,
      background: "transparent",
      color: "#9080A8",
      border: "1.5px solid rgba(201,168,76,0.18)",
    };
  return base;
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, rank, colColor, acting, onAction }) {
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
      {/* Card header — rank + order number + age */}
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

      {/* Card body */}
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
            ₱{(order.total || 0).toFixed(2)}
          </span>
        </div>
        <span style={{ color: "#9080A8", fontSize: "0.73rem" }}>
          {order.contactNumber}
        </span>
        <span style={{ color: "#5A4870", fontSize: "0.7rem" }}>
          📅 {order.pickupDate} · {order.pickupLabel || "—"}
        </span>
      </div>

      {/* Action buttons */}
      {transitions.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            paddingTop: "6px",
            borderTop: "1px solid rgba(201,168,76,0.1)",
          }}
        >
          {transitions.map((action) => (
            <button
              key={action.to}
              style={btnStyle(action.style)}
              disabled={acting}
              onClick={() => onAction(order.orderId, action.to)}
              onMouseEnter={(e) => {
                if (action.style === "primary")
                  e.currentTarget.style.background = "#E8C96D";
                if (action.style === "success")
                  e.currentTarget.style.background = "#2DA870";
                if (action.style === "danger")
                  e.currentTarget.style.background = "#C53030";
                if (action.style === "ghost") {
                  e.currentTarget.style.borderColor = "#9080A8";
                  e.currentTarget.style.color = "#F0E8D8";
                }
              }}
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, btnStyle(action.style))
              }
            >
              {acting ? "…" : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Column Panel ──────────────────────────────────────────────────────────────
function ColumnPanel({ col, orders, acting, onAction }) {
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
      {/* Column header */}
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
          {orders.length}
        </span>
      </div>

      {/* Cards grid */}
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
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "32px 16px",
              color: "#5A4870",
              fontSize: "0.78rem",
            }}
          >
            <div
              style={{ fontSize: "1.8rem", marginBottom: "6px", opacity: 0.4 }}
            >
              📭
            </div>
            No orders here
          </div>
        ) : (
          orders.map((order, idx) => (
            <OrderCard
              key={order.orderId}
              order={order}
              rank={idx + 1}
              colColor={col.color}
              acting={acting}
              onAction={onAction}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StaffOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [activeTab, setActiveTab] = useState("NEW");
  const [search, setSearch] = useState("");
  const { showToast, ToastContainer } = useToast();

  // Firestore real-time listener — uses correct uppercase status names
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
      },
    );
    return unsub;
  }, []);

  async function handleAction(orderId, toStatus) {
    setActing(true);
    try {
      await api.updateStatus(orderId, toStatus);
      const label =
        COLUMNS.find((c) => c.status === toStatus)?.label || toStatus;
      showToast(`Order moved to "${label}".`, "success");
    } catch (err) {
      showToast(err.message || "Failed to update order.", "error");
    } finally {
      setActing(false);
    }
  }

  // Filter by search
  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNo?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.contactNumber?.includes(q)
    );
  });

  // Group by status — preserves FIFO (already sorted by createdAt asc)
  const grouped = {};
  QUEUE_STATUSES.forEach((s) => {
    grouped[s] = [];
  });
  filtered.forEach((o) => {
    if (grouped[o.status]) grouped[o.status].push(o);
  });

  const activeCol = COLUMNS.find((c) => c.status === activeTab);
  const activeOrders = grouped[activeTab] || [];
  const totalActive = orders.length;

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
    <StaffLayout orderCount={totalActive}>
      <ToastContainer />

      {/* Responsive grid styles injected once */}
      <style>{`
        @media (max-width: 1023px) { .staff-card-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 639px)  { .staff-card-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>

      {/* ── Page header ── */}
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
            Order Queue
          </h2>
          <p
            style={{ color: "#9080A8", fontSize: "0.74rem", marginTop: "2px" }}
          >
            {totalActive} active order{totalActive !== 1 ? "s" : ""}
          </p>
        </div>
        {/* Search */}
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

      {/* ── Tab bar ── */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "16px",
          padding: "6px",
          background: "#0D0820",
          borderRadius: "12px",
          border: "1px solid rgba(201,168,76,0.1)",
        }}
      >
        {COLUMNS.map((col) => {
          const count = grouped[col.status]?.length || 0;
          const isActive = activeTab === col.status;
          return (
            <button
              key={col.status}
              onClick={() => setActiveTab(col.status)}
              title={col.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: "0.78rem",
                fontWeight: 600,
                transition: "all 0.18s",
                background: isActive ? col.color + "22" : "transparent",
                color: isActive ? col.color : "rgba(240,232,220,0.45)",
                borderBottom: isActive
                  ? `2px solid ${col.color}`
                  : "2px solid transparent",
              }}
            >
              <span style={{ fontSize: "0.9rem" }}>{col.icon}</span>
              <span className="hidden sm:inline">{col.label}</span>
              <span
                style={{
                  background: isActive ? col.color : "rgba(255,255,255,0.08)",
                  color: isActive ? "#1A0F2E" : "#9080A8",
                  borderRadius: "20px",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  padding: "1px 7px",
                  minWidth: "20px",
                  textAlign: "center",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Active column panel ── */}
      {loading ? (
        <Spinner className="py-20" />
      ) : (
        <ColumnPanel
          col={activeCol}
          orders={activeOrders}
          acting={acting}
          onAction={handleAction}
        />
      )}
    </StaffLayout>
  );
}
