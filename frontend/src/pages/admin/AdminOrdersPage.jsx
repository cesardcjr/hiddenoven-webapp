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
  NEW: [
    { label: "Accept", to: "PAYMENT_REVIEW", style: "primary" },
    { label: "Cancel", to: "CANCELLED", style: "ghost" },
  ],
  PAYMENT_REVIEW: [
    { label: "Confirm Payment", to: "PREPARING", style: "success" },
    { label: "Reject Payment", to: "PAYMENT_REJECTED", style: "danger" },
    { label: "Cancel", to: "CANCELLED", style: "ghost" },
  ],
  PAYMENT_REJECTED: [
    { label: "Re-open for Payment", to: "PAYMENT_REVIEW", style: "primary" },
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

function btnStyle(variant) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 14px",
    borderRadius: "6px",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    transition: "all 0.18s",
    whiteSpace: "nowrap",
    fontFamily: "Inter,sans-serif",
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState("");
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ orderId: d.id, ...d.data() })));
      setLoading(false);
    });
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

  const filtered = orders.filter(
    (o) =>
      o.orderNo?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()),
  );

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(201,168,76,0.25)",
    borderRadius: "8px",
    color: "#F0E8D8",
    fontSize: "0.84rem",
    fontFamily: "Inter,sans-serif",
    outline: "none",
    padding: "8px 12px 8px 34px",
    width: "220px",
    transition: "border 0.2s",
  };

  return (
    <AdminLayout>
      <ToastContainer />

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2
            className="font-display font-bold text-[1.2rem]"
            style={{ color: "#E8C96D" }}
          >
            Orders
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#9080A8" }}>
            {orders.length} total orders
          </p>
        </div>
        <div className="relative">
          <span
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[0.85rem]"
            style={{ color: "#5A4870" }}
          >
            🔍
          </span>
          <input
            style={inputStyle}
            placeholder="Search order no. or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(201,168,76,0.25)")
            }
          />
        </div>
      </div>

      {loading ? (
        <Spinner className="py-20" />
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
                  { label: "Order No.", mobile: true },
                  { label: "Customer", mobile: true },
                  { label: "Contact", mobile: false },
                  { label: "Total", mobile: true },
                  { label: "Status", mobile: true },
                  { label: "Date", mobile: false },
                  { label: "", mobile: false },
                ].map((h) => (
                  <th
                    key={h.label || "actions"}
                    className={`text-left px-3 py-2.5 whitespace-nowrap ${
                      h.mobile ? "" : "hidden sm:table-cell"
                    }`}
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
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.orderId}
                  style={{
                    borderBottom: "1px solid rgba(201,168,76,0.09)",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelected(o)}
                  onMouseEnter={(e) =>
                    Array.from(e.currentTarget.cells).forEach(
                      (td) => (td.style.background = "rgba(201,168,76,0.05)"),
                    )
                  }
                  onMouseLeave={(e) =>
                    Array.from(e.currentTarget.cells).forEach(
                      (td) => (td.style.background = "#1E1235"),
                    )
                  }
                >
                  <td
                    className="px-3 py-3 font-bold"
                    style={{
                      background: "#1E1235",
                      color: "#C9A84C",
                      verticalAlign: "middle",
                    }}
                  >
                    {o.orderNo}
                  </td>
                  <td
                    className="px-3 py-3 font-semibold"
                    style={{
                      background: "#1E1235",
                      color: "#F0E8D8",
                      verticalAlign: "middle",
                    }}
                  >
                    {o.customerName}
                  </td>
                  <td
                    className="hidden sm:table-cell px-3 py-3"
                    style={{
                      background: "#1E1235",
                      color: "#9080A8",
                      verticalAlign: "middle",
                    }}
                  >
                    {o.contactNumber}
                  </td>
                  <td
                    className="px-3 py-3 font-bold"
                    style={{
                      background: "#1E1235",
                      color: "#E8C96D",
                      verticalAlign: "middle",
                    }}
                  >
                    ₱{o.total?.toFixed(2)}
                  </td>
                  <td
                    className="px-3 py-3"
                    style={{ background: "#1E1235", verticalAlign: "middle" }}
                  >
                    <StatusBadge status={o.status} />
                  </td>
                  <td
                    className="hidden sm:table-cell px-3 py-3 text-[0.73rem] whitespace-nowrap"
                    style={{
                      background: "#1E1235",
                      color: "#9080A8",
                      verticalAlign: "middle",
                    }}
                  >
                    {o.createdAt?.toDate?.()?.toLocaleDateString("en-PH") ??
                      "—"}
                  </td>
                  <td
                    className="hidden sm:table-cell px-3 py-3"
                    style={{ background: "#1E1235", verticalAlign: "middle" }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(o);
                      }}
                      className="text-[0.75rem] font-semibold transition-colors"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#C9A84C",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#E8C96D")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#C9A84C")
                      }
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div
              className="text-center py-12"
              style={{ color: "#9080A8", fontSize: "0.86rem" }}
            >
              No orders found.
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Order ${selected?.orderNo}`}
      >
        {selected && (
          <div>
            <div className="grid grid-cols-2 gap-3 mb-5 text-[0.82rem]">
              {[
                ["Customer", selected.customerName],
                ["Contact", selected.contactNumber],
                ["Total", `₱${selected.total?.toFixed(2)}`],
                ["Pickup Slot", selected.pickupSlotId || "—"],
              ].map(([l, v]) => (
                <div key={l}>
                  <p
                    className="text-[0.65rem] font-bold uppercase tracking-[0.5px] mb-1"
                    style={{ color: "#9080A8" }}
                  >
                    {l}
                  </p>
                  <p
                    className="font-semibold"
                    style={{ color: l === "Total" ? "#C9A84C" : "#F0E8D8" }}
                  >
                    {v}
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
            {ALL_TRANSITIONS[selected.status] && (
              <div
                className="pt-4"
                style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
              >
                <p
                  className="text-[0.65rem] font-bold uppercase tracking-[0.6px] mb-3"
                  style={{ color: "#9080A8" }}
                >
                  Change Status
                </p>
                <div className="flex gap-2 flex-wrap">
                  {ALL_TRANSITIONS[selected.status].map(
                    ({ label, to, style }) => (
                      <button
                        key={to}
                        disabled={acting}
                        onClick={() => handleTransition(selected.orderId, to)}
                        style={btnStyle(style)}
                        onMouseEnter={(e) => {
                          if (style === "primary")
                            e.currentTarget.style.background = "#E8C96D";
                          if (style === "success")
                            e.currentTarget.style.background = "#2DA870";
                          if (style === "danger")
                            e.currentTarget.style.background = "#C53030";
                        }}
                        onMouseLeave={(e) =>
                          Object.assign(e.currentTarget.style, btnStyle(style))
                        }
                      >
                        {acting ? "…" : label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
