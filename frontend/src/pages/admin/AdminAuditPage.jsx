import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";

const ACTION_LABELS = {
  status_change: "Status Change",
  product_create: "Product Created",
  product_update: "Product Updated",
  product_delete: "Product Deleted",
  staff_create: "Staff Created",
  staff_update: "Staff Updated",
  staff_deactivate: "Staff Deactivated",
  payment_verified: "Payment Verified",
  payment_rejected: "Payment Rejected",
};

const AUDIT_PER_PAGE = 10;

function formatDateTime(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH");
}

function actionDetails(log) {
  if (log.action === "status_change") {
    if (log.toStatus === "CANCELLED") {
      return `Cancelled order. Reason: ${log.details?.cancellationReason || "—"}`;
    }
    if (log.toStatus === "PREPARING") return "Payment was verified and order moved to preparation.";
    if (log.toStatus === "PAYMENT_REJECTED") return "Payment was rejected.";
    if (log.toStatus === "READY_FOR_PICKUP") return "Order was marked ready for pickup.";
    if (log.toStatus === "COMPLETED") return "Order was marked picked up/completed.";
    return `Order status changed from ${log.fromStatus || "—"} to ${log.toStatus || "—"}.`;
  }
  return ACTION_LABELS[log.action] || log.action || "System action";
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "audit_log"), orderBy("timestamp", "desc"), limit(200));
    return onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ logId: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.orderNo || l.orderId || "").toLowerCase().includes(q) ||
      (l.action || "").toLowerCase().includes(q) ||
      (ACTION_LABELS[l.action] || "").toLowerCase().includes(q) ||
      (l.actorName || l.actorUid || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / AUDIT_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice(
    (safePage - 1) * AUDIT_PER_PAGE,
    safePage * AUDIT_PER_PAGE,
  );

  const pgBtnStyle = (active) => ({
    padding: "5px 10px",
    borderRadius: "6px",
    fontSize: "0.74rem",
    fontWeight: 600,
    cursor: active ? "default" : "pointer",
    fontFamily: "Inter,sans-serif",
    transition: "all 0.2s",
    background: active ? "#C9A84C" : "transparent",
    color: active ? "#1A0F2E" : "#9080A8",
    border: active
      ? "1.5px solid #C9A84C"
      : "1.5px solid rgba(201,168,76,0.18)",
  });

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(201,168,76,0.25)",
    borderRadius: "8px",
    color: "#F0E8D8",
    fontSize: "0.84rem",
    fontFamily: "Inter,sans-serif",
    outline: "none",
    padding: "8px 12px 8px 34px",
    width: "100%",
    transition: "border 0.2s",
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
        <div>
          <h2
            className="font-display font-bold text-[1.2rem]"
            style={{ color: "#E8C96D" }}
          >
            Audit Logs
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#9080A8" }}>
            Staff actions and transaction details
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <span
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[0.85rem]"
          style={{ color: "#5A4870" }}
        >
          🔍
        </span>
        <input
          style={inputStyle}
          placeholder="Search by order no., action, or staff name…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : (
        <div
          className="overflow-x-auto rounded-xl"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
        >
          <table className="w-full border-collapse" style={{ fontSize: "0.8rem", minWidth: "620px" }}>
            <thead>
              <tr>
                {["Date & Time", "Action", "Order No.", "Actor", ""].map((h) => (
                  <th
                    key={h || "view"}
                    className="text-left px-3 py-2.5 whitespace-nowrap"
                    style={{
                      fontSize: "0.64rem",
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
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10" style={{ background: "#1E1235", color: "#9080A8" }}>
                    No matching log entries.
                  </td>
                </tr>
              ) : (
                slice.map((log) => (
                  <tr key={log.logId} style={{ borderBottom: "1px solid rgba(201,168,76,0.09)" }}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[0.73rem]" style={{ background: "#1E1235", color: "#9080A8" }}>
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold" style={{ background: "#1E1235", color: "#F0E8D8" }}>
                      {ACTION_LABELS[log.action] || log.action}
                    </td>
                    <td className="px-3 py-2.5 font-bold" style={{ background: "#1E1235", color: "#C9A84C" }}>
                      {log.orderNo || log.orderId || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[0.74rem]" style={{ background: "#1E1235", color: "#9080A8" }}>
                      {log.actorName || log.actorUid || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{ background: "#1E1235" }}>
                      <button
                        type="button"
                        onClick={() => setSelected(log)}
                        className="text-[0.75rem] font-semibold"
                        style={{ background: "none", border: "none", color: "#C9A84C", cursor: "pointer" }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div
            className="flex items-center justify-between px-4 py-3 flex-wrap gap-3"
            style={{
              borderTop: "1px solid rgba(201,168,76,0.12)",
              background: "#1E1235",
            }}
          >
            <span className="text-[0.76rem]" style={{ color: "#9080A8" }}>
              Showing {Math.min((safePage - 1) * AUDIT_PER_PAGE + 1, filtered.length)}–
              {Math.min(safePage * AUDIT_PER_PAGE, filtered.length)} of{" "}
              {filtered.length} entries
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ ...pgBtnStyle(false), opacity: safePage <= 1 ? 0.35 : 1 }}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)} style={pgBtnStyle(n === safePage)}>
                  {n}
                </button>
              ))}
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ ...pgBtnStyle(false), opacity: safePage >= totalPages ? 0.35 : 1 }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Audit Details"
      >
        {selected && (
          <div className="space-y-3 text-[0.82rem]">
            {[
              ["Date & Time", formatDateTime(selected.timestamp)],
              ["Order Number", selected.orderNo || selected.orderId],
              ["Actor", selected.actorName || selected.actorUid],
              ["Action", ACTION_LABELS[selected.action] || selected.action],
              ["Actual Action Done", actionDetails(selected)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.5px]" style={{ color: "#9080A8" }}>
                  {label}
                </p>
                <p className="font-semibold" style={{ color: "#F0E8D8" }}>
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
