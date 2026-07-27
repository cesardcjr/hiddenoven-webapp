import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { TextInput } from "../../components/ui/FormField";
import { useToast } from "../../components/ui/Toast";

export default function PaymentPage() {
  const { orderId }      = useParams();
  const [params]         = useSearchParams();
  const orderNo          = params.get("orderNo");
  const navigate         = useNavigate();
  const { showToast, ToastContainer } = useToast();

  const [refNumber, setRefNumber] = useState("");
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    if (f.size > 5 * 1024 * 1024) { setError("Image must be under 5MB."); return; }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file) { setError("Please upload your payment screenshot."); return; }
    if (!refNumber.trim()) { setError("Reference number is required."); return; }

    setSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageBase64 = reader.result.split(",")[1];
        await api.uploadProof(orderId, { imageBase64, mimeType: file.type, refNumber: refNumber.trim() });
        showToast("Payment submitted! We'll verify it shortly.", "success");
        setTimeout(() => navigate(`/track?orderNo=${orderNo}`), 2000);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showToast(err.message, "error");
      setSubmitting(false);
    }
  }

  return (
    <CustomerLayout>
      <ToastContainer />
      <div className="max-w-lg mx-auto">
        <div className="card">
          <div className="mb-6">
            <p className="text-sm text-brand-500 font-semibold uppercase tracking-wide mb-1">Order Placed</p>
            <h1 className="text-2xl font-display font-bold text-neutral-900">Submit Payment</h1>
            <p className="text-neutral-500 mt-1">Order No: <span className="font-semibold text-neutral-800">{orderNo}</span></p>
          </div>

          <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-6 text-sm text-brand-800">
            <strong>How to pay:</strong> Send your GCash or bank transfer to our account, then upload the screenshot here.
          </div>

          {/* File upload */}
          <div className="mb-4">
            <label className="label">Payment Screenshot</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg p-6 cursor-pointer hover:border-brand-400 transition-colors">
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-48 rounded-lg object-contain" />
              ) : (
                <div className="text-center">
                  <p className="text-sm text-neutral-500">Click to upload (JPG, PNG — max 5MB)</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
          </div>

          <TextInput
            label="GCash / Bank Reference Number"
            value={refNumber}
            onChange={(e) => setRefNumber(e.target.value)}
            placeholder="e.g. 123456789012"
          />

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
            {submitting ? "Submitting…" : "Submit Payment"}
          </button>

          <button onClick={() => navigate(`/track?orderNo=${orderNo}`)} className="w-full text-center text-sm text-neutral-500 mt-3 hover:text-brand-600">
            Skip for now — Track my order
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
}
