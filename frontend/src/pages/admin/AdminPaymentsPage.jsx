import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";

export default function AdminPaymentsPage() {
  const [proofs, setProofs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [acting, setActing]     = useState(false);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const q = query(
      collection(db, "payment_proofs"),
      where("verifiedStatus", "==", "pending"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setProofs(snap.docs.map((d) => ({ proofId: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleAction(action) {
    setActing(true);
    try {
      await api.verifyPayment(selected.proofId, action);
      showToast(`Payment ${action}.`, "success");
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Payments</h1>
        <span className="badge bg-yellow-100 text-yellow-800">{proofs.length} pending</span>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : proofs.length === 0 ? (
        <p className="text-center py-20 text-neutral-400">No pending payment proofs.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proofs.map((proof) => (
            <div key={proof.proofId} className="card cursor-pointer hover:border-brand-300 border border-neutral-200" onClick={() => setSelected(proof)}>
              {proof.imageUrl && (
                <img src={proof.imageUrl} alt="Payment proof" className="w-full h-40 object-cover rounded-lg mb-3 bg-neutral-100" />
              )}
              <p className="text-sm font-semibold text-neutral-800">Ref: {proof.refNumber}</p>
              <p className="text-xs text-neutral-500 mt-1">Order: {proof.orderId}</p>
              <button className="mt-3 btn-primary w-full text-sm">Review</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Review Payment">
        {selected && (
          <div>
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt="Payment screenshot" className="w-full rounded-lg mb-4 max-h-80 object-contain bg-neutral-50" />
            )}
            <div className="text-sm space-y-2 mb-6">
              <p><span className="text-neutral-500">Reference No.:</span> <span className="font-semibold">{selected.refNumber}</span></p>
              <p><span className="text-neutral-500">Order ID:</span> <span className="font-semibold">{selected.orderId}</span></p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleAction("verified")} disabled={acting} className="btn-primary flex-1">
                {acting ? "…" : "✓ Verify"}
              </button>
              <button onClick={() => handleAction("rejected")} disabled={acting} className="btn-danger flex-1">
                {acting ? "…" : "✗ Reject"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
