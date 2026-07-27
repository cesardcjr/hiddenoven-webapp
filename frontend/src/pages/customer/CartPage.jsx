import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { api } from "../../lib/api";
import { useCart } from "../../context/CartContext";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { TextInput, SelectInput } from "../../components/ui/FormField";
import { useToast } from "../../components/ui/Toast";

export default function CartPage() {
  const { items, total, updateQty, removeItem, clearCart } = useCart();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();

  const [slots, setSlots]       = useState([]);
  const [form, setForm]         = useState({ customerName: "", contactNumber: "", pickupSlotId: "" });
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSlots() {
      const today = new Date().toISOString().slice(0, 10);
      const snap = await getDocs(
        query(collection(db, "pickup_slots"), where("date", ">=", today))
      );
      const available = snap.docs
        .map((d) => ({ slotId: d.id, ...d.data() }))
        .filter((s) => s.slotsUsed < s.capacity);
      setSlots(available);
    }
    loadSlots();
  }, []);

  function validate() {
    const e = {};
    if (!form.customerName.trim()) e.customerName = "Name is required.";
    if (!/^(09|\+639)\d{9}$/.test(form.contactNumber)) e.contactNumber = "Enter a valid PH mobile (09XXXXXXXXX).";
    if (!form.pickupSlotId) e.pickupSlotId = "Please choose a pickup slot.";
    return e;
  }

  async function handleCheckout() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (items.length === 0) { showToast("Your cart is empty.", "error"); return; }

    setSubmitting(true);
    try {
      const payload = {
        customerName: form.customerName.trim(),
        contactNumber: form.contactNumber,
        pickupSlotId: form.pickupSlotId,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      };
      const { orderId, orderNo } = await api.placeOrder(payload);
      clearCart();
      navigate(`/payment/${orderId}?orderNo=${orderNo}`);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const slotOptions = slots.map((s) => ({
    value: s.slotId,
    label: `${s.date} — ${s.timeRange} (${s.capacity - s.slotsUsed} slots left)`,
  }));

  return (
    <CustomerLayout>
      <ToastContainer />
      <h1 className="text-2xl font-display font-bold mb-6">Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <p className="mb-4">Your cart is empty.</p>
          <button onClick={() => navigate("/")} className="btn-primary">Browse Products</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="card flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-neutral-500">₱{item.price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.productId, item.qty - 1)} className="btn-secondary px-2 py-1 text-sm">−</button>
                  <span className="w-8 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, item.qty + 1)} className="btn-secondary px-2 py-1 text-sm">+</button>
                </div>
                <p className="font-bold text-brand-600 w-20 text-right">
                  ₱{(item.price * item.qty).toFixed(2)}
                </p>
                <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
              </div>
            ))}
          </div>

          {/* Checkout form */}
          <div className="card h-fit">
            <h2 className="font-semibold text-lg mb-4">Order Details</h2>
            <TextInput
              label="Your Name"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              error={errors.customerName}
              placeholder="Juan Dela Cruz"
            />
            <TextInput
              label="Mobile Number"
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              error={errors.contactNumber}
              placeholder="09XXXXXXXXX"
            />
            <SelectInput
              label="Pickup Slot"
              value={form.pickupSlotId}
              onChange={(e) => setForm({ ...form, pickupSlotId: e.target.value })}
              error={errors.pickupSlotId}
              options={slotOptions}
            />

            <div className="border-t border-neutral-200 pt-4 mt-4">
              <div className="flex justify-between font-bold text-lg mb-4">
                <span>Total</span>
                <span className="text-brand-600">₱{total.toFixed(2)}</span>
              </div>
              <button onClick={handleCheckout} disabled={submitting} className="btn-primary w-full">
                {submitting ? "Placing Order…" : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
