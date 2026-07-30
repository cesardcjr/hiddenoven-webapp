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

  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    customerName: "",
    contactNumber: "",
    pickupSlotId: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSlots() {
      const today = new Date().toISOString().slice(0, 10);
      const snap = await getDocs(
        query(collection(db, "pickup_slots"), where("date", ">=", today)),
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
    if (!/^(09|\+639)\d{9}$/.test(form.contactNumber))
      e.contactNumber = "Enter a valid PH mobile (09XXXXXXXXX).";
    if (!form.pickupSlotId) e.pickupSlotId = "Please choose a pickup slot.";
    return e;
  }

  async function handleCheckout() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    if (items.length === 0) {
      showToast("Your cart is empty.", "error");
      return;
    }

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

  const surfaceStyle = {
    background: "#1E1235",
    border: "1px solid rgba(201,168,76,0.18)",
    borderRadius: "12px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
  };

  return (
    <CustomerLayout>
      <ToastContainer />

      <h1
        className="font-display text-2xl font-bold mb-6"
        style={{ color: "#E8C96D" }}
      >
        Your Cart
      </h1>

      {items.length === 0 ? (
        <div
          className="text-center py-20"
          style={{ color: "rgba(240,232,220,0.45)" }}
        >
          <div className="text-5xl mb-4 opacity-40">🛒</div>
          <p className="mb-5 text-sm">Your cart is empty.</p>
          <button onClick={() => navigate("/")} className="btn-primary">
            Browse Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Cart items ── */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 px-5 py-4 rounded-card"
                style={surfaceStyle}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-[0.9rem] truncate"
                    style={{ color: "#F0E8D8" }}
                  >
                    {item.name}
                  </p>
                  <p
                    className="text-[0.75rem] mt-0.5"
                    style={{ color: "rgba(240,232,220,0.45)" }}
                  >
                    ₱{item.price.toFixed(2)} each
                  </p>
                </div>

                {/* Qty stepper */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.productId, item.qty - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-150"
                    style={{
                      background: "rgba(201,168,76,0.12)",
                      color: "#C9A84C",
                      border: "1px solid rgba(201,168,76,0.2)",
                    }}
                  >
                    −
                  </button>
                  <span
                    className="w-8 text-center text-[0.85rem] font-semibold"
                    style={{ color: "#F0E8D8" }}
                  >
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.productId, item.qty + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-150"
                    style={{
                      background: "rgba(201,168,76,0.12)",
                      color: "#C9A84C",
                      border: "1px solid rgba(201,168,76,0.2)",
                    }}
                  >
                    +
                  </button>
                </div>

                <p
                  className="font-bold w-20 text-right text-[0.9rem]"
                  style={{ color: "#C9A84C" }}
                >
                  ₱{(item.price * item.qty).toFixed(2)}
                </p>

                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-[0.75rem] font-medium transition-colors duration-150"
                  style={{ color: "rgba(224,82,82,0.7)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#E05252")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(224,82,82,0.7)")
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* ── Order details / checkout ── */}
          <div className="h-fit" style={surfaceStyle}>
            <div className="p-5">
              <h2
                className="font-display font-bold text-[1rem] mb-4"
                style={{ color: "#E8C96D" }}
              >
                Order Details
              </h2>
              <TextInput
                label="Your Name"
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
                error={errors.customerName}
                placeholder="Juan Dela Cruz"
              />
              <TextInput
                label="Mobile Number"
                value={form.contactNumber}
                onChange={(e) =>
                  setForm({ ...form, contactNumber: e.target.value })
                }
                error={errors.contactNumber}
                placeholder="09XXXXXXXXX"
              />
              <SelectInput
                label="Pickup Slot"
                value={form.pickupSlotId}
                onChange={(e) =>
                  setForm({ ...form, pickupSlotId: e.target.value })
                }
                error={errors.pickupSlotId}
                options={slotOptions}
              />

              {/* Total */}
              <div
                className="flex justify-between items-center py-4 mt-2"
                style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
              >
                <span
                  className="font-semibold text-sm"
                  style={{ color: "#F0E8D8" }}
                >
                  Total
                </span>
                <span
                  className="font-bold text-lg"
                  style={{ color: "#C9A84C" }}
                >
                  ₱{total.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? "Placing Order…" : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
