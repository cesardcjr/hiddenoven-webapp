import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useCart } from "../../context/CartContext";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { TextInput } from "../../components/ui/FormField";
import { Swal } from "../../lib/swal";
import hiddenOvenLogo from "../../images/hidden-oven-logo.jpg";

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [checkoutDraft] = useState(() => {
    if (location.state?.checkoutDraft) return location.state.checkoutDraft;
    const stored = sessionStorage.getItem("checkout_draft");
    return stored ? JSON.parse(stored) : null;
  });

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
    api
      .getPaymentModes()
      .then(setPaymentModes)
      .catch(() => setPaymentModes([]))
      .finally(() => setModesLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function readFileAsBase64(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read image file."));
      reader.readAsDataURL(f);
    });
  }

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setError("");
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!checkoutDraft) {
      setError("Please return to your cart and proceed to payment again.");
      return;
    }
    if (!file) {
      setError("Please upload your payment screenshot.");
      return;
    }
    if (!refNumber.trim()) {
      setError("Reference number is required.");
      return;
    }
    const amount = Number(paymentAmount);
    if (!paymentAmount || Number.isNaN(amount) || amount <= 0) {
      setError("Payment amount is required.");
      return;
    }
    if (checkoutDraft?.total && amount < Number(checkoutDraft.total)) {
      setError("Payment amount must be at least the order total.");
      return;
    }
    if (!paymentProvider.trim()) {
      setError("Please select the bank or service provider used.");
      return;
    }

    setSubmitting(true);
    try {
      const imageBase64 = await readFileAsBase64(file);
      const result = await api.placeOrderWithPayment({
        ...checkoutDraft,
        imageBase64,
        mimeType: file.type,
        refNumber: refNumber.trim(),
        paymentAmount: amount,
        paymentProvider: paymentProvider.trim(),
      });
      clearCart();
      sessionStorage.removeItem("checkout_draft");
      await Swal.fire({
        title: "Sweet!",
        text: "Thank you for your order!",
        imageUrl: hiddenOvenLogo,
        imageWidth: 180,
        imageHeight: 180,
        imageAlt: "The Hidden Oven logo",
        confirmButtonText: "Track My Order",
      });
      navigate(`/track?orderNo=${encodeURIComponent(result.orderNo)}&direct=true`, {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const surfaceStyle = {
    background: "#1E1235",
    border: "1px solid rgba(201,168,76,0.18)",
    borderRadius: "12px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
  };

  return (
    <CustomerLayout>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <button className="btn-secondary" onClick={() => navigate("/cart")}>
            Back to Cart
          </button>
          <button className="btn-secondary" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
        <div style={surfaceStyle} className="p-6">
          {/* Header */}
          <div className="mb-6">
            <p
              className="text-[0.7rem] font-bold uppercase tracking-[1px] mb-1"
              style={{ color: "#C9A84C" }}
            >
              Payment Required
            </p>
            <h1
              className="font-display text-2xl font-bold"
              style={{ color: "#E8C96D" }}
            >
              Submit Payment
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "rgba(240,232,220,0.55)" }}
            >
              Your order will be created after payment proof is submitted.
            </p>
          </div>

          {!checkoutDraft ? (
            <div
              className="rounded-lg p-4 mb-6 text-[0.82rem]"
              style={{
                background: "rgba(224,82,82,0.08)",
                border: "1px solid rgba(224,82,82,0.2)",
                color: "#E05252",
              }}
            >
              No checkout details found. Please return to your cart and proceed
              to payment again.
            </div>
          ) : (
            <div
              className="rounded-lg p-4 mb-6 text-[0.8rem]"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(201,168,76,0.18)",
              }}
            >
              <div className="flex justify-between mb-1 gap-3">
                <span style={{ color: "#9080A8" }}>Customer</span>
                <span style={{ color: "#F0E8D8" }}>
                  {checkoutDraft.customerName}
                </span>
              </div>
              <div className="flex justify-between mb-1 gap-3">
                <span style={{ color: "#9080A8" }}>Pickup</span>
                <span className="text-right" style={{ color: "#F0E8D8" }}>
                  {checkoutDraft.pickupDate}, {checkoutDraft.pickupLabel}
                </span>
              </div>
              <div className="flex justify-between font-bold gap-3">
                <span style={{ color: "#9080A8" }}>Total</span>
                <span style={{ color: "#C9A84C" }}>
                  ₱{Number(checkoutDraft.total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Payment modes */}
          <div className="mb-6">
            <label className="label">Payment Modes</label>
            {modesLoading ? (
              <div
                className="rounded-lg p-4 text-[0.8rem]"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(201,168,76,0.15)",
                  color: "#9080A8",
                }}
              >
                Loading payment options...
              </div>
            ) : paymentModes.length === 0 ? (
              <div
                className="rounded-lg p-4 text-[0.8rem]"
                style={{
                  background: "rgba(224,82,82,0.08)",
                  border: "1px solid rgba(224,82,82,0.2)",
                  color: "#E05252",
                }}
              >
                No payment modes are available right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentModes.map((mode) => (
                  <div
                    key={mode.modeId}
                    className="rounded-lg p-3"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(201,168,76,0.18)",
                    }}
                  >
                    {mode.qrImageUrl && (
                      <img
                        src={mode.qrImageUrl}
                        alt={`${mode.provider} QR code`}
                        className="w-full aspect-square object-contain rounded-lg mb-3"
                        style={{ background: "#261748" }}
                      />
                    )}
                    <div
                      className="font-bold text-[0.86rem]"
                      style={{ color: "#E8C96D" }}
                    >
                      {mode.provider}
                    </div>
                    {mode.accountName && (
                      <div
                        className="text-[0.74rem] mt-0.5"
                        style={{ color: "rgba(240,232,220,0.55)" }}
                      >
                        {mode.accountName}
                      </div>
                    )}
                    <div
                      className="text-[0.78rem] font-semibold break-all mt-1"
                      style={{ color: "#F0E8D8" }}
                    >
                      {mode.accountNumber}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions banner */}
          <div
            className="rounded-lg p-4 mb-6 text-[0.8rem]"
            style={{
              background: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.25)",
              color: "#E8C96D",
            }}
          >
            <strong>How to pay:</strong> Send your payment using one of the
            modes above, then upload the screenshot below.
          </div>

          {/* File upload */}
          <div className="mb-4">
            <label className="label">Bank / Service Provider Used</label>
            <select
              value={paymentProvider}
              onChange={(e) => setPaymentProvider(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(201,168,76,0.25)",
                borderRadius: "8px",
                color: "#F0E8D8",
                fontSize: "0.84rem",
                fontFamily: "Inter,sans-serif",
                outline: "none",
                padding: "9px 12px",
                width: "100%",
                colorScheme: "dark",
              }}
            >
              <option value="">Select payment mode</option>
              {paymentModes.map((mode) => (
                <option key={mode.modeId} value={mode.provider}>
                  {mode.provider}
                </option>
              ))}
            </select>
          </div>

          <TextInput
            label="Amount Paid"
            type="number"
            min="0"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder={`Required amount: ₱${Number(checkoutDraft?.total || 0).toFixed(2)}`}
          />

          <div className="mb-4">
            <label className="label">Payment Screenshot</label>
            <label
              className="flex flex-col items-center justify-center rounded-lg p-6 cursor-pointer transition-all duration-150"
              style={{
                border: "2px dashed rgba(201,168,76,0.25)",
                background: "rgba(255,255,255,0.02)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "#C9A84C")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)")
              }
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 rounded-lg object-contain"
                />
              ) : (
                <div className="text-center">
                  <div className="text-3xl mb-2 opacity-40">📎</div>
                  <p
                    className="text-[0.78rem]"
                    style={{ color: "rgba(240,232,220,0.4)" }}
                  >
                    Click to upload (JPG, PNG — max 5MB)
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>

          <TextInput
            label="GCash / Maya Reference Number"
            value={refNumber}
            onChange={(e) => setRefNumber(e.target.value)}
            placeholder="e.g. 123456789012"
          />

          {error && (
            <p className="text-[0.78rem] mb-4" style={{ color: "#E05252" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !checkoutDraft}
            className="btn-primary w-full"
          >
            {submitting ? "Submitting…" : "Submit Payment"}
          </button>

        </div>
      </div>
    </CustomerLayout>
  );
}
