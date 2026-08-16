import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";

const ACTION_LABELS = {
  order_create: "Order Created",
  walk_in_order_create: "Walk-in Order Created",
  status_change: "Status Change",
  product_create: "Product Created",
  product_update: "Product Updated",
  product_delete: "Product Deleted",
  product_reorder: "Products Reordered",
  staff_create: "Staff Created",
  staff_update: "Staff Updated",
  staff_deactivate: "Staff Deactivated",
  payment_verified: "Payment Verified",
  payment_rejected: "Payment Rejected",
  payment_approved: "Payment Approved",
};

const AUDIT_PER_PAGE = 10;

function formatDateTime(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date((value._seconds ?? value.seconds ?? 0) * 1000 || value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH");
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  return Number(value._seconds ?? value.seconds ?? 0) * 1000;
}

function actionLabel(action) {
  return ACTION_LABELS[action] || String(action || "System action").replaceAll("_", " ");
}

function actionDetails(log) {
  if (log.action === "status_change") {
    if (log.toStatus === "CANCELLED") return `Cancelled order. Reason: ${log.details?.cancellationReason || "—"}`;
    if (log.toStatus === "PREPARING") return "Payment was verified and the order moved to preparation.";
    if (log.toStatus === "PAYMENT_REJECTED") return "Payment was rejected.";
    if (log.toStatus === "READY_FOR_PICKUP") return "Order was marked ready for pickup.";
    if (log.toStatus === "COMPLETED") return "Order was marked picked up and completed.";
    return `Order status changed from ${log.fromStatus || "—"} to ${log.toStatus || "—"}.`;
  }
  if (log.action === "walk_in_order_create") return "A walk-in order was recorded by staff.";
  if (log.action?.startsWith("payment_")) return actionLabel(log.action);
  return actionLabel(log.action);
}

function groupLogs(logs) {
  const orderNoToId = {};
  logs.forEach((log) => {
    if (log.orderNo && log.orderId) orderNoToId[log.orderNo] = log.orderId;
  });
  const groups = new Map();
  logs.forEach((log) => {
    const isOrderRelated = Boolean(log.orderId || log.orderNo);
    const orderKey = log.orderId || orderNoToId[log.orderNo] || log.orderNo;
    const key = isOrderRelated ? `order:${orderKey}` : `log:${log.logId}`;
    if (!groups.has(key)) groups.set(key, { key, isOrderRelated, orderId: log.orderId || null, orderNo: log.orderNo || null, entries: [] });
    const group = groups.get(key);
    group.entries.push(log);
    if (!group.orderId && log.orderId) group.orderId = log.orderId;
    if (!group.orderNo && log.orderNo) group.orderNo = log.orderNo;
  });
  return [...groups.values()].map((group) => ({ ...group, latest: group.entries[0] }));
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const auditQuery = query(collection(db, "audit_log"), orderBy("timestamp", "desc"), limit(300));
    return onSnapshot(auditQuery, (snapshot) => {
      setLogs(snapshot.docs.map((doc) => ({ logId: doc.id, ...doc.data() })));
      setLoading(false);
    });
  }, []);

  const groups = useMemo(() => groupLogs(logs), [logs]);
  const filtered = groups.filter((group) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [group.orderNo, group.orderId, ...group.entries.flatMap((entry) => [entry.action, actionLabel(entry.action), entry.actorName, entry.actorUid])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / AUDIT_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visibleGroups = filtered.slice((safePage - 1) * AUDIT_PER_PAGE, safePage * AUDIT_PER_PAGE);

  async function openGroup(group) {
    setSelected(group);
    if (!group.isOrderRelated) return;
    setHistoryLoading(true);
    try {
      const lookups = [];
      if (group.orderId) lookups.push(getDocs(query(collection(db, "audit_log"), where("orderId", "==", group.orderId))));
      if (group.orderNo) lookups.push(getDocs(query(collection(db, "audit_log"), where("orderNo", "==", group.orderNo))));
      const snapshots = await Promise.all(lookups);
      const allEntries = new Map(group.entries.map((entry) => [entry.logId, entry]));
      snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => allEntries.set(doc.id, { logId: doc.id, ...doc.data() })));
      setSelected({ ...group, entries: [...allEntries.values()].sort((a, b) => timestampMillis(b.timestamp) - timestampMillis(a.timestamp)) });
    } catch (error) {
      console.error("Unable to load the complete order audit history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="mb-5"><h2 className="font-display text-[1.2rem] font-bold text-[#462C7D]">Audit Logs</h2><p className="mt-0.5 text-[0.78rem] text-[#6F6B78]">Order activity is grouped into one history per order number.</p></div>
      <label className="relative mb-4 block"><span className="sr-only">Search audit logs</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#AAA6B0]">⌕</span><input className="input pl-9" placeholder="Search by order no., action, or staff name…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>

      {loading ? <Spinner className="py-20" /> : (
        <div className="overflow-x-auto rounded-xl shadow-card">
          <table className="w-full min-w-[680px] border-collapse text-[0.8rem]">
            <thead><tr>{["Latest Activity", "Order No.", "Activity", "Latest Actor", ""].map((heading) => <th key={heading || "view"} className="border-b-2 border-[rgba(70,44,125,0.18)] bg-white px-3 py-2.5 text-left text-[0.64rem] font-bold uppercase tracking-[0.5px] text-[#6F6B78]">{heading}</th>)}</tr></thead>
            <tbody>
              {!visibleGroups.length ? <tr><td colSpan={5} className="bg-white py-10 text-center text-[#6F6B78]">No matching audit entries.</td></tr> : visibleGroups.map((group) => (
                <tr key={group.key} className="border-b border-[rgba(70,44,125,0.09)]">
                  <td className="whitespace-nowrap bg-white px-3 py-3 text-[0.73rem] text-[#6F6B78]">{formatDateTime(group.latest.timestamp)}</td>
                  <td className="bg-white px-3 py-3 font-bold text-[#462C7D]">{group.orderNo || group.orderId || "—"}</td>
                  <td className="bg-white px-3 py-3 font-semibold text-[#17151D]">{group.isOrderRelated ? `${group.entries.length} order action${group.entries.length === 1 ? "" : "s"}` : actionLabel(group.latest.action)}</td>
                  <td className="bg-white px-3 py-3 text-[0.74rem] text-[#6F6B78]">{group.latest.actorName || group.latest.actorUid || "—"}</td>
                  <td className="bg-white px-3 py-3 text-right"><button type="button" onClick={() => openGroup(group)} className="text-[0.75rem] font-semibold text-[#462C7D]">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E6ED] bg-white px-4 py-3">
            <span className="text-[0.76rem] text-[#6F6B78]">Showing {filtered.length ? (safePage - 1) * AUDIT_PER_PAGE + 1 : 0}–{Math.min(safePage * AUDIT_PER_PAGE, filtered.length)} of {filtered.length} grouped entries</span>
            <div className="flex items-center gap-2"><button className="btn-secondary min-h-8 px-3" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>←</button><span className="text-xs font-bold text-[#462C7D]">{safePage} / {totalPages}</span><button className="btn-secondary min-h-8 px-3" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>→</button></div>
          </div>
        </div>
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.isOrderRelated ? `Order ${selected.orderNo || selected.orderId} Activity` : "Audit Details"}>
        {historyLoading ? <Spinner className="py-10" /> : selected && <div className="space-y-3">
          {selected.entries.map((entry, index) => (
            <article key={entry.logId} className="relative rounded-xl border border-[#E8E6ED] bg-[#F7F7FA] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-[#462C7D]">{actionLabel(entry.action)}</p><p className="mt-1 text-xs leading-5 text-[#6F6B78]">{actionDetails(entry)}</p></div><span className="text-[0.68rem] text-[#817C89]">{formatDateTime(entry.timestamp)}</span></div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.72rem] text-[#6F6B78]"><span><strong className="text-[#17151D]">Actor:</strong> {entry.actorName || entry.actorUid || "—"}</span>{entry.fromStatus && <span><strong className="text-[#17151D]">From:</strong> {entry.fromStatus}</span>}{entry.toStatus && <span><strong className="text-[#17151D]">To:</strong> {entry.toStatus}</span>}</div>
              {selected.entries.length > 1 && <span className="absolute -left-2 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-[#462C7D] text-[0.62rem] font-bold text-white">{selected.entries.length - index}</span>}
            </article>
          ))}
        </div>}
      </Modal>
    </AdminLayout>
  );
}
