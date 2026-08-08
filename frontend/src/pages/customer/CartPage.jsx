import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useCart } from "../../context/CartContext";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { TextInput } from "../../components/ui/FormField";
import { Spinner } from "../../components/ui/Spinner";
import { getDailyStockRemaining } from "../../lib/date";

export default function CartPage() {
  const { items, total, updateQty, removeItem, clearCart } = useCart();
  const navigate = useNavigate();
  const [clearConfirm, setClearConfirm] = useState(false);
  const [dateRange, setDateRange] = useState({ earliestDate: "", latestDate: "", sameDayCutoffReached: false });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [form, setForm] = useState({ customerName: "", contactNumber: "", pickupDate: "", pickupConfigId: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    const refreshDateRange = () => {
      api.getAvailableDates().then(({ earliestDate, latestDate, sameDayCutoffReached }) => {
        if (!active) return;
        setDateRange({ earliestDate, latestDate, sameDayCutoffReached: Boolean(sameDayCutoffReached) });
        setForm((current) => ({
          ...current,
          pickupDate: current.pickupDate && current.pickupDate >= earliestDate
            ? current.pickupDate
            : earliestDate,
        }));
      }).catch(() => {});
    };
    refreshDateRange();
    const interval = window.setInterval(refreshDateRange, 60000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!form.pickupDate) return;
    let active = true;
    setSlotsLoading(true);
    setForm((current) => ({ ...current, pickupConfigId: "" }));
    const refreshSlots = () => {
      api.getAvailableSlots(form.pickupDate).then((availableSlots) => {
        if (!active) return;
        setSlots(availableSlots);
        setForm((current) => ({
          ...current,
          pickupConfigId: availableSlots.some((slot) => slot.configId === current.pickupConfigId)
            ? current.pickupConfigId
            : "",
        }));
      }).catch(() => {
        if (active) setSlots([]);
      }).finally(() => {
        if (active) setSlotsLoading(false);
      });
    };
    refreshSlots();
    const interval = window.setInterval(refreshSlots, 60000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [form.pickupDate]);

  function validate() {
    const nextErrors = {};
    if (!form.customerName.trim()) nextErrors.customerName = "Name is required.";
    if (!/^(09|\+639)\d{9}$/.test(form.contactNumber)) nextErrors.contactNumber = "Enter a valid PH mobile (09XXXXXXXXX).";
    if (!form.pickupDate) nextErrors.pickupDate = "Please select a pickup date.";
    if (!form.pickupConfigId) nextErrors.pickupConfigId = "Please select a pickup time.";
    for (const item of items) {
      const remaining = getDailyStockRemaining(item);
      if (remaining !== null && item.qty > remaining) { nextErrors.form = `${item.name} only has ${remaining} left in stock today.`; break; }
    }
    return nextErrors;
  }

  function handleCheckout() {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    if (!items.length) { setErrors({ form: "Your cart is empty." }); return; }
    const chosen = slots.find((slot) => slot.configId === form.pickupConfigId);
    const payload = {
      customerName: form.customerName.trim(), contactNumber: form.contactNumber,
      pickupDate: form.pickupDate, pickupConfigId: form.pickupConfigId,
      pickupLabel: chosen?.label || "", total,
      items: items.map((item) => ({ productId: item.productId, qty: item.qty })),
      displayItems: items.map((item) => ({ productId: item.productId, name: item.name, qty: item.qty, price: item.price })),
    };
    sessionStorage.setItem("checkout_draft", JSON.stringify(payload));
    navigate("/payment", { state: { checkoutDraft: payload } });
  }

  function handleQtyChange(item, nextQty) {
    const remaining = getDailyStockRemaining(item);
    if (remaining !== null && nextQty > remaining) { setErrors({ form: `${item.name} only has ${remaining} left in stock today.` }); return; }
    setErrors((current) => ({ ...current, form: "" }));
    updateQty(item.productId, nextQty);
  }

  function formatDateLabel(value) {
    if (!value) return "";
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
  }

  const selectedSlot = slots.find((slot) => slot.configId === form.pickupConfigId);

  return (
    <CustomerLayout>
      <button onClick={() => navigate("/catalog")} className="btn-ghost mb-4 px-2">← Back to Menu</button>
      <header className="mb-7 flex items-start justify-between gap-4">
        <div><p className="page-eyebrow">Checkout</p><h1 className="page-title">Review Your Order</h1><p className="page-subtitle">Confirm your items and pickup information.</p></div>
        {items.length > 0 && (clearConfirm ? <div className="flex items-center gap-2 text-xs"><button className="font-bold text-[#B42318]" onClick={() => { clearCart(); setClearConfirm(false); }}>Clear all</button><button className="text-[#6F6B78]" onClick={() => setClearConfirm(false)}>Cancel</button></div> : <button className="btn-ghost min-h-9 px-3 py-1 text-xs" onClick={() => setClearConfirm(true)}>Clear cart</button>)}
      </header>

      {!items.length ? (
        <section className="surface-card py-20 text-center"><div className="mb-4 text-5xl">🛒</div><h2 className="text-xl font-bold">Your cart is empty</h2><p className="mx-auto mt-2 max-w-sm text-sm text-[#6F6B78]">Find something delicious in today’s menu and add it here.</p><button onClick={() => navigate("/catalog")} className="btn-primary mt-6">Browse the menu</button></section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="order-2 space-y-3 lg:order-1" aria-label="Order summary">
            <h2 className="mb-4 text-lg font-bold">Order Summary</h2>
            {items.map((item) => {
              const remaining = getDailyStockRemaining(item);
              const atLimit = remaining !== null && item.qty >= remaining;
              return (
                <article key={item.productId} className="surface-card flex items-center gap-4 p-3 sm:p-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F4F1F8] sm:h-24 sm:w-24">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full" style={{ objectFit: item.imageFit || "cover", objectPosition: item.imagePosition || "center" }} /> : <span className="flex h-full items-center justify-center text-3xl">🥐</span>}</div>
                  <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold sm:text-base">{item.name}</h2><p className="mt-1 text-xs text-[#6F6B78]">₱{Number(item.price).toFixed(2)} each</p><button onClick={() => removeItem(item.productId)} className="mt-3 text-xs font-semibold text-[#B42318]">Remove</button></div>
                  <div className="flex shrink-0 flex-col items-end gap-3"><p className="text-sm font-bold text-[#462C7D]">₱{(item.price * item.qty).toFixed(2)}</p><div className="flex items-center rounded-full border border-[#E8E6ED] bg-white p-1"><button aria-label={`Decrease ${item.name} quantity`} onClick={() => handleQtyChange(item, item.qty - 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#462C7D] hover:bg-[#F4F1F8]">−</button><span className="w-7 text-center text-sm font-bold">{item.qty}</span><button aria-label={`Increase ${item.name} quantity`} onClick={() => handleQtyChange(item, item.qty + 1)} disabled={atLimit} className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#462C7D] hover:bg-[#F4F1F8] disabled:text-[#AAA6B0]">+</button></div></div>
                </article>
              );
            })}
            <div className="surface-card mt-4 p-5">
              <div className="flex items-center justify-between"><span className="text-sm font-semibold">Total</span><span className="text-xl font-bold text-[#462C7D]">₱{total.toFixed(2)}</span></div>
              {errors.form && <p className="mt-4 rounded-xl bg-[#FFF1F0] p-3 text-xs font-medium text-[#B42318]">{errors.form}</p>}
              <button onClick={handleCheckout} className="btn-primary mt-5 w-full">Proceed to Payment</button>
            </div>
          </section>

          <aside className="surface-card order-1 h-fit p-5 sm:p-6 lg:order-2">
            <h2 className="mb-5 text-lg font-bold">Order Form</h2>
            <TextInput label="Full Name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} error={errors.customerName} placeholder="Juan Dela Cruz" />
            <TextInput label="Mobile number" value={form.contactNumber} onChange={(event) => setForm({ ...form, contactNumber: event.target.value })} error={errors.contactNumber} placeholder="09XXXXXXXXX" />
            <div className="mb-4"><label className="label" htmlFor="pickup-date">Pickup date</label>{dateRange.sameDayCutoffReached && <p className="mb-2 rounded-xl bg-[#F4F1F8] p-3 text-xs font-semibold text-[#462C7D]" role="status">Cutoff already reached for same-day pickup. Please choose tomorrow onwards.</p>}<input id="pickup-date" className="input" type="date" value={form.pickupDate} min={dateRange.earliestDate} max={dateRange.latestDate} onChange={(event) => setForm({ ...form, pickupDate: event.target.value })} />{errors.pickupDate && <p className="mt-1.5 text-xs font-medium text-[#B42318]">{errors.pickupDate}</p>}</div>
            <div className="mb-4"><label className="label" htmlFor="pickup-time">Pickup time</label><p className="mb-2 text-xs text-[#6F6B78]">Cutoff time for same-day pickup is 4 PM.</p>{slotsLoading ? <div className="flex min-h-12 items-center gap-2 rounded-xl border border-[#E8E6ED] px-4"><Spinner /><span className="text-sm text-[#6F6B78]">Loading times…</span></div> : !form.pickupDate ? <div className="rounded-xl bg-[#F7F7FA] p-3 text-sm text-[#6F6B78]">Select a date first.</div> : slots.filter((slot) => slot.remaining > 0).length ? <select id="pickup-time" className="input" value={form.pickupConfigId} onChange={(event) => setForm({ ...form, pickupConfigId: event.target.value })}><option value="">Select pickup time</option>{slots.filter((slot) => slot.remaining > 0).map((slot) => <option key={slot.configId} value={slot.configId}>{slot.label}</option>)}</select> : <div className="rounded-xl border border-[#FFD6D2] bg-[#FFF1F0] p-3 text-sm text-[#B42318]">No slots available. Choose another date.</div>}{errors.pickupConfigId && <p className="mt-1.5 text-xs font-medium text-[#B42318]">{errors.pickupConfigId}</p>}</div>
            {selectedSlot && <div className="mb-5 rounded-2xl bg-[#F4F1F8] p-4"><p className="text-xs font-semibold text-[#6F6B78]">Selected pickup</p><p className="mt-1 text-sm font-bold text-[#462C7D]">{formatDateLabel(form.pickupDate)}, {selectedSlot.label}</p></div>}
          </aside>
        </div>
      )}
    </CustomerLayout>
  );
}
