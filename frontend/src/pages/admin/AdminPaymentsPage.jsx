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
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";

export default function AdminPaymentsPage() {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [acting, setActing] = useState(false);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const q = query(
      collection(db, "payment_proofs"),
      where("verifiedStatus", "==", "pending"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snap) => {
      setProofs(snap.docs.map((d) => ({ proofId: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  async function handleAction(action) {
    setActing(true);
    try {
      await api.verifyPayment(selected.proofId, action);
      showToast(
        `Payment ${action}.`,
        action === "verified" ? "success" : "error",
      );
      setSelected(null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActing(false);
    }
  }

  return (
    <AdminLayout>
      <ToastContainer />

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2
            className="font-display font-bold text-[1.2rem]"
            style={{ color: "#E8C96D" }}
          >
            Payments
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#9080A8" }}>
            Review pending payment evidence
          </p>
        </div>
        <span
          className="text-[0.75rem] font-bold px-3 py-1 rounded-full"
          style={{
            background: "rgba(232,169,76,0.12)",
            color: "#E8A94C",
            border: "1px solid rgba(232,169,76,0.3)",
          }}
        >
          {proofs.length} pending
        </span>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : proofs.length === 0 ? (
        <div className="text-center py-20" style={{ color: "#9080A8" }}>
          <div className="text-4xl mb-3 opacity-40">✅</div>
          <p className="text-[0.86rem]">No pending payment proofs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proofs.map((proof) => (
            <div
              key={proof.proofId}
              className="flex flex-col overflow-hidden rounded-xl cursor-pointer transition-all duration-200"
              style={{
                background: "#1E1235",
                border: "1px solid rgba(201,168,76,0.18)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
              }}
              onClick={() => setSelected(proof)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.45)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.35)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* QR-style mock / image */}
              <div
                className="h-36 flex items-center justify-center"
                style={{ background: "#261748" }}
              >
                {proof.imageUrl ? (
                  <img
                    src={proof.imageUrl}
                    alt="Payment proof"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-lg"
                    style={{
                      background:
                        "repeating-conic-gradient(rgba(201,168,76,0.6) 0% 25%, #261748 0% 50%) 0 0/8px 8px",
                      border: "2px solid rgba(201,168,76,0.3)",
                    }}
                  />
                )}
              </div>
              <div className="p-4">
                <p
                  className="font-bold text-[0.87rem] mb-1"
                  style={{ color: "#C9A84C" }}
                >
                  Ref: {proof.refNumber}
                </p>
                <p className="text-[0.73rem]" style={{ color: "#9080A8" }}>
                  Order: {proof.orderId}
                </p>
                <button className="btn-primary w-full mt-3 text-[0.78rem]">
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Review Payment"
      >
        {selected && (
          <div>
            {selected.imageUrl ? (
              <img
                src={selected.imageUrl}
                alt="Payment screenshot"
                className="w-full rounded-xl mb-4 object-contain max-h-72"
                style={{ background: "#261748" }}
              />
            ) : (
              <div
                className="w-full h-40 rounded-xl mb-4 flex items-center justify-center"
                style={{ background: "#261748" }}
              >
                <div
                  className="w-20 h-20 rounded-lg"
                  style={{
                    background:
                      "repeating-conic-gradient(rgba(201,168,76,0.6) 0% 25%, #261748 0% 50%) 0 0/8px 8px",
                    border: "2px solid rgba(201,168,76,0.3)",
                  }}
                />
              </div>
            )}
            <div className="space-y-2 mb-5 text-[0.82rem]">
              {[
                ["Reference No.", selected.refNumber, "#C9A84C"],
                ["Order ID", selected.orderId, "#F0E8D8"],
              ].map(([l, v, c]) => (
                <div key={l} className="flex justify-between">
                  <span style={{ color: "#9080A8" }}>{l}</span>
                  <span className="font-semibold" style={{ color: c }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleAction("verified")}
                disabled={acting}
                className="btn-primary flex-1"
              >
                {acting ? "…" : "✓ Verify"}
              </button>
              <button
                onClick={() => handleAction("rejected")}
                disabled={acting}
                className="btn-danger flex-1"
              >
                {acting ? "…" : "✗ Reject"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
