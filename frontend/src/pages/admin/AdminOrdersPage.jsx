import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { ReceiptPreview } from "../../components/ui/ReceiptPreview";

function formatDateTime(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH");
}

function money(value) {
  return `₱${(Number(value) || 0).toFixed(2)}`;
}

function DetailTile({ label, value, highlight = false }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "#261748",
        border: "1px solid rgba(201,168,76,0.14)",
      }}
    >
      <p
        className="text-[0.65rem] font-bold uppercase tracking-[0.5px] mb-1"
        style={{ color: "#9080A8" }}
      >
        {label}
      </p>
      <p
        className="font-semibold"
        style={{ color: highlight ? "#C9A84C" : "#F0E8D8" }}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedProof, setSelectedProof] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ orderId: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const filtered = orders.filter((o) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      o.orderNo?.toLowerCase().includes(term) ||
      o.customerName?.toLowerCase().includes(term) ||
      o.contactNumber?.includes(term)
    );
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
    width: "220px",
    transition: "border 0.2s",
  };

  async function openDetails(order) {
    setSelected(order);
    setSelectedProof(null);
    setProofLoading(true);

    try {
      const proofsQuery = query(
        collection(db, "payment_proofs"),
        where("orderId", "==", order.orderId),
        orderBy("createdAt", "desc"),
      );
      const proofsSnap = await getDocs(proofsQuery);
      setSelectedProof(
        proofsSnap.docs[0]
          ? { proofId: proofsSnap.docs[0].id, ...proofsSnap.docs[0].data() }
          : null,
      );
    } catch (err) {
      console.error("Payment proof lookup failed:", err);
    } finally {
      setProofLoading(false);
    }
  }

  return (
    <AdminLayout>
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
          <table className="w-full border-collapse" style={{ fontSize: "0.82rem" }}>
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
                  onClick={() => openDetails(o)}
                >
                  <td className="px-3 py-3 font-bold" style={{ background: "#1E1235", color: "#C9A84C" }}>
                    {o.orderNo}
                  </td>
                  <td className="px-3 py-3 font-semibold" style={{ background: "#1E1235", color: "#F0E8D8" }}>
                    {o.customerName}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3" style={{ background: "#1E1235", color: "#9080A8" }}>
                    {o.contactNumber}
                  </td>
                  <td className="px-3 py-3 font-bold" style={{ background: "#1E1235", color: "#E8C96D" }}>
                    {money(o.total)}
                  </td>
                  <td className="px-3 py-3" style={{ background: "#1E1235" }}>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 text-[0.73rem] whitespace-nowrap" style={{ background: "#1E1235", color: "#9080A8" }}>
                    {formatDateTime(o.createdAt)}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3" style={{ background: "#1E1235" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetails(o);
                      }}
                      className="text-[0.75rem] font-semibold"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#C9A84C",
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12" style={{ color: "#9080A8" }}>
              No orders found.
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setSelectedProof(null);
        }}
        title={`Order ${selected?.orderNo}`}
      >
        {selected && (
          <div>
            <div className="mb-4">
              <p className="text-[0.72rem] mb-2" style={{ color: "#9080A8" }}>
                Order Details Summary
              </p>
              <div
                className="flex items-center justify-between gap-3 rounded-lg p-3"
                style={{ background: "#261748" }}
              >
                <StatusBadge status={selected.status} />
                <span className="font-bold" style={{ color: "#C9A84C" }}>
                  {money(selected.total)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[0.82rem]">
              <DetailTile label="Customer" value={selected.customerName} />
              <DetailTile label="Contact" value={selected.contactNumber} />
              <DetailTile
                label="Pickup"
                value={`${selected.pickupDate || "—"}, ${selected.pickupLabel || "—"}`}
              />
              <DetailTile
                label="Order Placement"
                value={formatDateTime(selected.createdAt)}
              />
              <DetailTile label="Paid Date" value={formatDateTime(selected.paidAt)} />
              <DetailTile
                label="Picked Up Time"
                value={formatDateTime(selected.pickedUpAt)}
              />
              <DetailTile label="Bank / Provider" value={selected.paymentProvider} />
              <DetailTile
                label="Reference Number"
                value={selected.paymentRefNumber}
              />
              <DetailTile
                label="Paid Amount"
                value={money(selected.paymentAmount)}
                highlight
              />
            </div>

            <div className="mt-3">
              {proofLoading ? (
                <div
                  className="rounded-lg p-3 text-[0.78rem]"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(201,168,76,0.12)",
                    color: "#9080A8",
                  }}
                >
                  Loading receipt...
                </div>
              ) : (
                <ReceiptPreview proofId={selectedProof?.proofId} />
              )}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
