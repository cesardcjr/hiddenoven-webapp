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
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";

const QUEUE_STATUSES = ["pending", "accepted", "payment_verified", "ready"];

const TRANSITIONS = {
  pending: [
    { label: "Accept Order →", to: "accepted", style: "primary" },
    { label: "Cancel", to: "cancelled", style: "ghost" },
  ],
  accepted: [
    { label: "Verify Payment ✓", to: "payment_verified", style: "success" },
    { label: "Reject Payment", to: "rejected", style: "outline" },
    { label: "Cancel", to: "cancelled", style: "ghost" },
  ],
  payment_verified: [
    { label: "Mark as Ready 🎁", to: "ready", style: "success" },
    { label: "Cancel", to: "cancelled", style: "ghost" },
  ],
  ready: [{ label: "Complete Pickup ✓", to: "completed", style: "success" }],
};

const STATUS_LABEL = {
  pending: "New Order",
  accepted: "Payment Review",
  payment_verified: "Preparing",
  ready: "Ready for Pickup",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// Urgency dot colour by FIFO position
function urgencyColor(index) {
  if (index === 0) return "#E05252"; // high — red
  if (index <= 2) return "#E8A94C"; // med  — amber
  return "#3DBD87"; // low  — green
}

function ageStr(createdAt) {
  if (!createdAt?.toDate) return "";
  const m = Math.floor((Date.now() - createdAt.toDate()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("fifo");
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", QUEUE_STATUSES),
      orderBy("createdAt", "asc"),
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
      showToast(
        `Order updated to "${STATUS_LABEL[toStatus] || toStatus}".`,
        "success",
      );
      setSelected(null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActing(false);
    }
  }

  // Filter + sort
  let displayed = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNo?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.contactNumber?.includes(q)
    );
  });

  if (sort === "amount") {
    displayed = [...displayed].sort((a, b) => (b.total || 0) - (a.total || 0));
  }
  // default is already FIFO (createdAt asc from Firestore)

  // Styles
  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(201,168,76,0.25)",
    borderRadius: "8px",
    color: "#F0E8D8",
    fontSize: "0.84rem",
    fontFamily: "Inter, sans-serif",
    outline: "none",
    transition: "border 0.2s",
  };

  function btnStyle(variant) {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "5px 12px",
      borderRadius: "6px",
      fontSize: "0.75rem",
      fontWeight: 600,
      cursor: "pointer",
      border: "none",
      transition: "all 0.18s",
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
        background: "transparent",
        color: "#F0E8D8",
        border: "1.5px solid rgba(201,168,76,0.3)",
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

  return (
    <StaffLayout orderCount={orders.length}>
      <ToastContainer />

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2
            className="font-display font-bold text-[1.15rem]"
            style={{ color: "#E8C96D" }}
          >
            Order Queue
          </h2>
          <p className="text-[0.75rem] mt-0.5" style={{ color: "#9080A8" }}>
            {orders.length} active order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search + sort */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.85rem] pointer-events-none"
              style={{ color: "#5A4870" }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search order or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                ...inputStyle,
                padding: "8px 12px 8px 32px",
                width: "220px",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(201,168,76,0.25)")
              }
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              ...inputStyle,
              padding: "8px 12px",
              cursor: "pointer",
              appearance: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(201,168,76,0.25)")
            }
          >
            <option value="fifo" style={{ background: "#261748" }}>
              Sort: FIFO
            </option>
            <option value="amount" style={{ background: "#261748" }}>
              Sort: Amount ↓
            </option>
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <Spinner className="py-20" />
      ) : displayed.length === 0 ? (
        <div className="text-center py-20" style={{ color: "#9080A8" }}>
          <div className="text-4xl mb-3 opacity-50">📭</div>
          <p className="text-[0.86rem]">No orders in queue.</p>
          <p className="text-[0.75rem] mt-1" style={{ color: "#5A4870" }}>
            New orders will appear here automatically.
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
        >
          <table
            className="w-full border-collapse"
            style={{ fontSize: "0.82rem" }}
          >
            <thead>
              <tr>
                {[
                  "Order No.",
                  "Customer",
                  "Items",
                  "Total",
                  "Pickup",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2.5 whitespace-nowrap"
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#9080A8",
                      borderBottom: "2px solid rgba(201,168,76,0.18)",
                      background: "#1E1235",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((order, idx) => {
                const itemSummary = (order.items || [])
                  .map((i) => `${i.name || i.productId} ×${i.qty}`)
                  .join(", ");
                const itemCount = (order.items || []).reduce(
                  (s, i) => s + i.qty,
                  0,
                );

                return (
                  <tr
                    key={order.orderId}
                    onClick={() => setSelected(order)}
                    className="cursor-pointer transition-colors duration-150"
                    style={{ borderBottom: "1px solid rgba(201,168,76,0.09)" }}
                    onMouseEnter={(e) => {
                      Array.from(e.currentTarget.cells).forEach(
                        (td) => (td.style.background = "rgba(201,168,76,0.05)"),
                      );
                    }}
                    onMouseLeave={(e) => {
                      Array.from(e.currentTarget.cells).forEach(
                        (td) => (td.style.background = "#1E1235"),
                      );
                    }}
                  >
                    {/* Order No. + urgency */}
                    <td
                      className="px-3 py-3"
                      style={{ background: "#1E1235", verticalAlign: "middle" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: urgencyColor(idx) }}
                        />
                        <span
                          className="font-bold"
                          style={{ color: "#C9A84C" }}
                        >
                          {order.orderNo}
                        </span>
                      </div>
                      <div
                        className="text-[0.71rem] mt-0.5 ml-3.5"
                        style={{ color: "#9080A8" }}
                      >
                        {ageStr(order.createdAt)}
                      </div>
                    </td>

                    {/* Customer */}
                    <td
                      className="px-3 py-3"
                      style={{ background: "#1E1235", verticalAlign: "middle" }}
                    >
                      <div
                        className="font-semibold"
                        style={{ color: "#F0E8D8" }}
                      >
                        {order.customerName}
                      </div>
                      <div
                        className="text-[0.71rem] mt-0.5"
                        style={{ color: "#9080A8" }}
                      >
                        {order.contactNumber}
                      </div>
                    </td>

                    {/* Items */}
                    <td
                      className="px-3 py-3"
                      style={{
                        background: "#1E1235",
                        verticalAlign: "middle",
                        maxWidth: "180px",
                      }}
                    >
                      <div
                        className="text-[0.8rem]"
                        style={{
                          color: "#F0E8D8",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {itemSummary || "—"}
                      </div>
                      <div
                        className="text-[0.71rem] mt-0.5"
                        style={{ color: "#9080A8" }}
                      >
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </div>
                    </td>

                    {/* Total */}
                    <td
                      className="px-3 py-3 font-bold"
                      style={{
                        background: "#1E1235",
                        verticalAlign: "middle",
                        color: "#E8C96D",
                      }}
                    >
                      ₱{order.total?.toFixed(2)}
                    </td>

                    {/* Pickup slot */}
                    <td
                      className="px-3 py-3"
                      style={{ background: "#1E1235", verticalAlign: "middle" }}
                    >
                      <div
                        className="text-[0.78rem] font-semibold"
                        style={{ color: "#F0E8D8" }}
                      >
                        {order.pickupSlotId || "—"}
                      </div>
                    </td>

                    {/* Status */}
                    <td
                      className="px-3 py-3"
                      style={{ background: "#1E1235", verticalAlign: "middle" }}
                    >
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Actions */}
                    <td
                      className="px-3 py-3"
                      style={{ background: "#1E1235", verticalAlign: "middle" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(TRANSITIONS[order.status] || []).map((action) => (
                          <button
                            key={action.to}
                            style={btnStyle(action.style)}
                            onClick={() =>
                              handleTransition(order.orderId, action.to)
                            }
                            disabled={acting}
                            onMouseEnter={(e) => {
                              if (action.style === "primary")
                                e.currentTarget.style.background = "#E8C96D";
                              if (action.style === "success")
                                e.currentTarget.style.background = "#2DA870";
                              if (action.style === "danger")
                                e.currentTarget.style.background = "#C53030";
                              if (action.style === "outline") {
                                e.currentTarget.style.borderColor = "#C9A84C";
                                e.currentTarget.style.color = "#C9A84C";
                              }
                              if (action.style === "ghost") {
                                e.currentTarget.style.borderColor = "#9080A8";
                                e.currentTarget.style.color = "#F0E8D8";
                              }
                            }}
                            onMouseLeave={(e) => {
                              Object.assign(
                                e.currentTarget.style,
                                btnStyle(action.style),
                              );
                            }}
                          >
                            {acting ? "…" : action.label}
                          </button>
                        ))}
                        <button
                          style={btnStyle("ghost")}
                          onClick={() => setSelected(order)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#9080A8";
                            e.currentTarget.style.color = "#F0E8D8";
                          }}
                          onMouseLeave={(e) =>
                            Object.assign(
                              e.currentTarget.style,
                              btnStyle("ghost"),
                            )
                          }
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Order detail modal ── */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.orderNo}
      >
        {selected && (
          <div>
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-5 text-[0.82rem]">
              {[
                ["Customer", selected.customerName],
                ["Contact", selected.contactNumber],
                ["Total", `₱${selected.total?.toFixed(2)}`],
                ["Pickup Slot", selected.pickupSlotId || "—"],
              ].map(([label, val]) => (
                <div key={label}>
                  <p
                    className="text-[0.65rem] font-bold uppercase tracking-[0.5px] mb-1"
                    style={{ color: "#9080A8" }}
                  >
                    {label}
                  </p>
                  <p
                    className="font-semibold"
                    style={{ color: label === "Total" ? "#C9A84C" : "#F0E8D8" }}
                  >
                    {val}
                  </p>
                </div>
              ))}
              <div>
                <p
                  className="text-[0.65rem] font-bold uppercase tracking-[0.5px] mb-1"
                  style={{ color: "#9080A8" }}
                >
                  Status
                </p>
                <StatusBadge status={selected.status} />
              </div>
            </div>

            {/* Action buttons */}
            <div
              className="pt-4"
              style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
            >
              <p
                className="text-[0.65rem] font-bold uppercase tracking-[0.6px] mb-3"
                style={{ color: "#9080A8" }}
              >
                Available Actions
              </p>
              <div className="flex gap-2.5 flex-wrap">
                {(TRANSITIONS[selected.status] || []).map((action) => (
                  <button
                    key={action.to}
                    style={{
                      ...btnStyle(action.style),
                      padding: "8px 16px",
                      fontSize: "0.8rem",
                    }}
                    disabled={acting}
                    onClick={() =>
                      handleTransition(selected.orderId, action.to)
                    }
                    onMouseEnter={(e) => {
                      if (action.style === "primary")
                        e.currentTarget.style.background = "#E8C96D";
                      if (action.style === "success")
                        e.currentTarget.style.background = "#2DA870";
                      if (action.style === "danger")
                        e.currentTarget.style.background = "#C53030";
                      if (action.style === "outline") {
                        e.currentTarget.style.borderColor = "#C9A84C";
                        e.currentTarget.style.color = "#C9A84C";
                      }
                      if (action.style === "ghost") {
                        e.currentTarget.style.borderColor = "#9080A8";
                        e.currentTarget.style.color = "#F0E8D8";
                      }
                    }}
                    onMouseLeave={(e) =>
                      Object.assign(e.currentTarget.style, {
                        ...btnStyle(action.style),
                        padding: "8px 16px",
                        fontSize: "0.8rem",
                      })
                    }
                  >
                    {acting ? "…" : action.label}
                  </button>
                ))}
                {!(TRANSITIONS[selected.status] || []).length && (
                  <p className="text-[0.79rem]" style={{ color: "#9080A8" }}>
                    No further actions available.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </StaffLayout>
  );
}
