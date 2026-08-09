import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useCart } from "../../context/CartContext";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { TextInput } from "../../components/ui/FormField";
import { Spinner } from "../../components/ui/Spinner";
import { Swal } from "../../lib/swal";
import hiddenOvenLogo from "../../images/hidden-oven-logo.jpg";

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [checkoutDraft] = useState(() => location.state?.checkoutDraft || JSON.parse(sessionStorage.getItem("checkout_draft") || "null"));
  const [refNumber, setRefNumber] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [paymentModes, setPaymentModes] = useState([]);
  const [modesLoading, setModesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPaymentModes().then((modes) => {
      setPaymentModes(modes);
      if (modes[0]) setPaymentProvider((current) => current || modes[0].provider);
    }).catch(() => setPaymentModes([])).finally(() => setModesLoading(false));
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function readFileAsBase64(selectedFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read image file."));
      reader.readAsDataURL(selectedFile);
    });
  }

  function handleFile(event) {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    if (selectedFile.size > 5 * 1024 * 1024) { setError("Image must be under 5MB."); return; }
    setError(""); setFile(selectedFile);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selectedFile));
  }

  async function handleSubmit() {
    if (!checkoutDraft) { setError("Please return to your cart and proceed to payment again."); return; }
    if (!file) { setError("Please upload your payment screenshot."); return; }
    if (!/^\d{4}$/.test(refNumber.trim())) { setError("Enter the last 4 digits of the reference number."); return; }
    const amount = Number(paymentAmount);
    if (!paymentAmount || Number.isNaN(amount) || amount <= 0) { setError("Payment amount is required."); return; }
    if (checkoutDraft.total && amount < Number(checkoutDraft.total)) { setError("Payment amount must be at least the order total."); return; }
    if (!paymentProvider.trim()) { setError("Please select the bank or service provider used."); return; }
    setSubmitting(true);
    try {
      const result = await api.placeOrderWithPayment({ ...checkoutDraft, imageBase64: await readFileAsBase64(file), mimeType: file.type, refNumber: refNumber.trim(), paymentAmount: amount, paymentProvider: paymentProvider.trim() });
      clearCart(); sessionStorage.removeItem("checkout_draft");
      await Swal.fire({ title: "Sweet!", text: "Thank you for your order!", imageUrl: hiddenOvenLogo, imageWidth: 160, imageHeight: 160, imageAlt: "The Hidden Oven logo", confirmButtonText: "Track my order", confirmButtonColor: "#462C7D" });
      navigate(`/track?orderNo=${encodeURIComponent(result.orderNo)}&direct=true`, { replace: true });
    } catch (requestError) { setError(requestError.message); } finally { setSubmitting(false); }
  }

  const activeMode = paymentModes.find((mode) => mode.provider === paymentProvider) || null;

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-3xl">
        <button className="btn-ghost mb-4 px-2" onClick={() => navigate("/cart")}>← Back to cart</button>
        <div className="surface-card overflow-hidden">
          <header className="border-b border-[#E8E6ED] px-5 py-6 sm:px-8"><h1 className="page-title">Order Payment</h1><p className="page-subtitle">Choose a payment method and attach a clear screenshot of your receipt.</p></header>
          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section>
              <h2 className="text-base font-bold">Payment Method</h2>
              {modesLoading ? <Spinner className="py-12" /> : paymentModes.length === 0 ? <div className="mt-4 rounded-2xl bg-[#FFF1F0] p-4 text-sm text-[#B42318]">No payment modes are available right now.</div> : <><fieldset className="mt-4"><legend className="sr-only">Choose a payment method</legend><div className="flex flex-wrap gap-2">{paymentModes.map((mode) => <label key={mode.modeId} className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${paymentProvider === mode.provider ? "border-[#462C7D] bg-[#F4F1F8] text-[#462C7D]" : "border-[#E8E6ED] bg-white text-[#6F6B78]"}`}><input type="radio" name="payment-method" value={mode.provider} checked={paymentProvider === mode.provider} onChange={(event) => setPaymentProvider(event.target.value)} className="h-4 w-4 accent-[#462C7D]" />{mode.provider}</label>)}</div></fieldset>{activeMode && <article className="mt-5 rounded-2xl border border-[#E8E6ED] p-4">{activeMode.qrImageUrl && <img src={activeMode.qrImageUrl} alt={`${activeMode.provider} QR code`} className="mx-auto mb-4 aspect-square w-full max-w-[260px] rounded-xl bg-[#F7F7FA] object-contain p-2" />}<h3 className="text-sm font-bold">{activeMode.provider}</h3>{activeMode.accountName && <p className="mt-1 text-xs text-[#6F6B78]">{activeMode.accountName}</p>}<p className="mt-1 break-all text-sm font-semibold text-[#462C7D]">{activeMode.accountNumber}</p></article>}</>}
            </section>

            <section>
              <h2 className="mb-4 text-base font-bold">Pickup Summary</h2>
              {checkoutDraft ? <div className="mb-5 rounded-2xl bg-[#F4F1F8] p-4 text-sm"><div className="flex justify-between gap-3"><span className="text-[#6F6B78]">Customer</span><strong>{checkoutDraft.customerName}</strong></div><div className="mt-2 flex justify-between gap-3"><span className="text-[#6F6B78]">Pickup</span><strong className="text-right">{checkoutDraft.pickupDate}, {checkoutDraft.pickupLabel}</strong></div><div className="mt-3 flex justify-between border-t border-[#D9D1E8] pt-3"><span className="font-semibold">Total</span><strong className="text-lg text-[#462C7D]">₱{Number(checkoutDraft.total || 0).toFixed(2)}</strong></div></div> : <div className="mb-5 rounded-2xl bg-[#FFF1F0] p-4 text-sm text-[#B42318]">No checkout details found. Return to your cart and try again.</div>}

              <TextInput label="Amount paid" type="number" min="0" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder={`Required: ₱${Number(checkoutDraft?.total || 0).toFixed(2)}`} />
              <div className="mb-4"><label className="label">Payment screenshot</label><label className="flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#CFC4E2] bg-[#F7F4FB] p-5 text-center transition-colors hover:border-[#462C7D]">{preview ? <img src={preview} alt="Payment screenshot preview" className="max-h-56 rounded-xl object-contain" /> : <><span className="text-3xl">＋</span><span className="mt-2 text-sm font-semibold text-[#462C7D]">Upload payment proof</span><span className="mt-1 text-xs text-[#6F6B78]">JPG or PNG, up to 5MB</span></>}<input type="file" accept="image/*" onChange={handleFile} className="hidden" /></label></div>
              <TextInput label="Last 4 digits of reference number" value={refNumber} onChange={(event) => setRefNumber(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" inputMode="numeric" maxLength={4} />
              {error && <p className="mb-4 rounded-xl bg-[#FFF1F0] p-3 text-xs font-medium text-[#B42318]" role="alert">{error}</p>}
              <button onClick={handleSubmit} disabled={submitting || !checkoutDraft} className="btn-primary w-full">{submitting ? "Submitting…" : "Submit payment"}</button>
            </section>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
