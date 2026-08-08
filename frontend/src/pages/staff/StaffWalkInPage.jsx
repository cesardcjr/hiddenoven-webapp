import { useEffect, useMemo, useState } from "react";
import { StaffLayout } from "../../components/layout/StaffLayout";
import { Spinner } from "../../components/ui/Spinner";
import { TextInput } from "../../components/ui/FormField";
import { ShoppingCartIcon } from "../../components/ui/Icons";
import { api } from "../../lib/api";
import { getDailyStockRemaining } from "../../lib/date";
import { Swal } from "../../lib/swal";

function peso(value) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

export default function StaffWalkInPage() {
  const [products, setProducts] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentProvider, setPaymentProvider] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.getProducts(), api.getPaymentModes()])
      .then(([productData, modeData]) => {
        setProducts(productData.filter((product) => product.isAvailable));
        setPaymentModes(modeData);
      })
      .catch((error) => Swal.fire({ title: "Unable to Load POS", text: error.message }))
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart],
  );
  const paid = Number(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  function stockRemaining(product) {
    return getDailyStockRemaining(product);
  }

  function addProduct(product) {
    const remaining = stockRemaining(product);
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.productId);
      const nextQty = (existing?.qty || 0) + 1;
      if (remaining !== null && nextQty > remaining) return current;
      if (existing) {
        return current.map((item) =>
          item.productId === product.productId ? { ...item, qty: nextQty } : item,
        );
      }
      return [...current, { ...product, qty: 1 }];
    });
  }

  function updateQuantity(productId, nextQty) {
    if (nextQty < 1) {
      setCart((current) => current.filter((item) => item.productId !== productId));
      return;
    }
    const product = products.find((item) => item.productId === productId);
    const remaining = product ? stockRemaining(product) : null;
    if (remaining !== null && nextQty > remaining) return;
    setCart((current) =>
      current.map((item) => item.productId === productId ? { ...item, qty: nextQty } : item),
    );
  }

  async function submitOrder() {
    if (customerName.trim().length < 2) {
      await Swal.fire({ title: "Customer Name Required", text: "Enter the walk-in customer's full name." });
      return;
    }
    if (!/^(09|\+639)\d{9}$/.test(contactNumber)) {
      await Swal.fire({ title: "Valid Mobile Required", text: "Enter a valid Philippine mobile number." });
      return;
    }
    if (!cart.length) {
      await Swal.fire({ title: "Empty Order", text: "Add at least one product to continue." });
      return;
    }
    if (paymentMethod === "CASHLESS" && !paymentProvider) {
      await Swal.fire({ title: "Payment Provider Required", text: "Choose the customer's cashless payment provider." });
      return;
    }
    if (paid < total) {
      await Swal.fire({ title: "Insufficient Payment", text: `Amount paid must be at least ${peso(total)}.` });
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createWalkInOrder({
        customerName: customerName.trim(),
        contactNumber,
        items: cart.map((item) => ({ productId: item.productId, qty: item.qty })),
        paymentMethod,
        paymentProvider,
        amountPaid: paid,
      });
      await Swal.fire({
        title: "Walk-in Order Created",
        icon: "success",
        text: `${result.orderNo} is now in Preparing. Change: ${peso(result.changeAmount)}`,
        confirmButtonText: "Okay",
      });
      setCart([]);
      setCustomerName("");
      setContactNumber("");
      setPaymentMethod("CASH");
      setPaymentProvider("");
      setAmountPaid("");
      api.getProducts().then((productData) => {
        setProducts(productData.filter((product) => product.isAvailable));
      }).catch(() => {});
    } catch (error) {
      await Swal.fire({ title: "Order Not Created", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StaffLayout pageTitle="Walk-in Orders">
      <header className="mb-5">
        <p className="page-eyebrow">Manual POS</p>
        <h2 className="page-title">Create a walk-in order</h2>
        <p className="page-subtitle">Record customer details, select products, and collect payment.</p>
      </header>

      <section className="surface-card mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Customer information">
        <TextInput label="Full Name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Juan Dela Cruz" />
        <TextInput label="Mobile Number" value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} placeholder="09XXXXXXXXX" />
        <div>
          <span className="label">Payment Method</span>
          <div className="flex min-h-12 gap-2">
            {[{ key: "CASH", label: "Cash" }, { key: "CASHLESS", label: "Cashless" }].map((method) => (
              <label key={method.key} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold ${paymentMethod === method.key ? "border-[#462C7D] bg-[#F4F1F8] text-[#462C7D]" : "border-[#E8E6ED] bg-white"}`}>
                <input type="radio" name="pos-payment" className="accent-[#462C7D]" checked={paymentMethod === method.key} onChange={() => setPaymentMethod(method.key)} />
                {method.label}
              </label>
            ))}
          </div>
        </div>
        {paymentMethod === "CASHLESS" ? (
          <div><label className="label" htmlFor="pos-provider">Provider</label>{paymentModes.length ? <select id="pos-provider" className="input" value={paymentProvider} onChange={(event) => setPaymentProvider(event.target.value)}><option value="">Select provider</option>{paymentModes.map((mode) => <option key={mode.modeId} value={mode.provider}>{mode.provider}</option>)}</select> : <input id="pos-provider" className="input" value={paymentProvider} onChange={(event) => setPaymentProvider(event.target.value)} placeholder="Enter provider" />}</div>
        ) : <div className="hidden lg:block" />}
      </section>

      {loading ? <Spinner className="py-20" /> : (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <section>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-[#462C7D]">Menu Products</h3><span className="text-xs font-semibold text-[#6F6B78]">{products.length} available</span></div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4">
              {products.map((product) => {
                const remaining = stockRemaining(product);
                const currentQty = cart.find((item) => item.productId === product.productId)?.qty || 0;
                const soldOut = remaining !== null && remaining <= currentQty;
                return <article key={product.productId} className="flex flex-col overflow-hidden rounded-2xl border border-[#E8E6ED] bg-white shadow-card"><div className="aspect-square bg-[#F4F1F8]">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full" style={{ objectFit: product.imageFit || "cover", objectPosition: product.imagePosition || "center" }} /> : <div className="flex h-full items-center justify-center text-4xl">◇</div>}</div><div className="flex flex-1 flex-col p-3"><h4 className="line-clamp-2 text-sm font-bold">{product.name}</h4><p className="mt-1 text-sm font-bold text-[#462C7D]">{peso(product.price)}</p><button type="button" disabled={soldOut} onClick={() => addProduct(product)} className="mt-3 flex min-h-9 items-center justify-center gap-2 rounded-full bg-[#462C7D] px-3 text-xs font-bold text-white disabled:bg-[#D2CFD8] disabled:text-[#6F6B78]"><ShoppingCartIcon className="h-4 w-4" />{soldOut ? "Sold Out" : "Add"}</button></div></article>;
              })}
            </div>
          </section>

          <aside className="surface-card h-fit p-5 md:sticky md:top-0" aria-label="Walk-in order summary">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Order Summary</h3><span className="rounded-full bg-[#F4F1F8] px-2.5 py-1 text-xs font-bold text-[#462C7D]">{cart.reduce((sum, item) => sum + item.qty, 0)} items</span></div>
            <div className="my-4 space-y-3">
              {!cart.length ? <p className="rounded-xl bg-[#F7F7FA] p-4 text-center text-sm text-[#6F6B78]">No products added yet.</p> : cart.map((item) => <div key={item.productId} className="flex items-center gap-3 border-b border-[#E8E6ED] pb-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="text-xs text-[#6F6B78]">{peso(item.price * item.qty)}</p></div><div className="flex items-center rounded-full border border-[#E8E6ED] p-1"><button type="button" className="h-7 w-7 rounded-full text-[#462C7D]" onClick={() => updateQuantity(item.productId, item.qty - 1)}>−</button><span className="w-6 text-center text-xs font-bold">{item.qty}</span><button type="button" className="h-7 w-7 rounded-full text-[#462C7D]" onClick={() => updateQuantity(item.productId, item.qty + 1)}>+</button></div></div>)}
            </div>
            <div className="flex justify-between border-t border-[#E8E6ED] pt-4"><span className="font-semibold">Total</span><strong className="text-xl text-[#462C7D]">{peso(total)}</strong></div>
            <div className="mt-4"><label className="label" htmlFor="amount-paid">Amount Paid</label><input id="amount-paid" className="input" type="number" min={0} step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} placeholder="0.00" /></div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F4F1F8] p-3"><span className="text-sm font-semibold">Change</span><strong className="text-lg text-[#462C7D]">{peso(change)}</strong></div>
            <button type="button" onClick={submitOrder} disabled={submitting || !cart.length} className="btn-primary mt-5 w-full">{submitting ? "Creating Order…" : "Submit Walk-in Order"}</button>
          </aside>
        </div>
      )}
    </StaffLayout>
  );
}
