import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { TextInput } from "../../components/ui/FormField";
import { useToast } from "../../components/ui/Toast";

export default function PaymentPage() {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const orderNo = params.get("orderNo");
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();

  const [refNumber, setRefNumber] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file) {
      setError("Please upload your payment screenshot.");
      return;
    }
    if (!refNumber.trim()) {
      setError("Reference number is required.");
      return;
    }

    setSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageBase64 = reader.result.split(",")[1];
        await api.uploadProof(orderId, {
          imageBase64,
          mimeType: file.type,
          refNumber: refNumber.trim(),
        });
        showToast("Payment submitted! We'll verify it shortly.", "success");
        setTimeout(() => navigate(`/track?orderNo=${orderNo}`), 2000);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showToast(err.message, "error");
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
      <ToastContainer />
      <div className="max-w-lg mx-auto">
        <div style={surfaceStyle} className="p-6">
          {/* Header */}
          <div className="mb-6">
            <p
              className="text-[0.7rem] font-bold uppercase tracking-[1px] mb-1"
              style={{ color: "#C9A84C" }}
            >
              Order Placed ✓
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
              Order No:{" "}
              <span className="font-semibold" style={{ color: "#F0E8D8" }}>
                {orderNo}
              </span>
            </p>
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
            <strong>How to pay:</strong> Send your GCash or Maya payment to our
            account, then upload the screenshot below.
          </div>

          {/* File upload */}
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
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? "Submitting…" : "Submit Payment"}
          </button>

          <button
            onClick={() => navigate(`/track?orderNo=${orderNo}`)}
            className="w-full text-center text-[0.78rem] mt-3 transition-colors duration-150"
            style={{ color: "rgba(240,232,220,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#C9A84C")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(240,232,220,0.4)")
            }
          >
            Skip for now — Track my order
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
}
