import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Modal } from "./Modal";

export function ReceiptPreview({ proofId, label = "Payment Receipt" }) {
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(proofId));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl = "";

    setImageUrl("");
    setError("");
    setLoading(Boolean(proofId));

    if (!proofId) {
      setLoading(false);
      return undefined;
    }

    api
      .getPaymentProofImageUrl(proofId)
      .then((url) => {
        objectUrl = url;
        if (alive) setImageUrl(url);
      })
      .catch((err) => {
        if (alive) setError(err.message || "Receipt image unavailable.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [proofId]);

  const frameStyle = {
    width: "96px",
    height: "96px",
    borderRadius: "8px",
    background: "#F4F1F8",
    border: "1.5px solid rgba(70,44,125,0.22)",
    color: "#6F6B78",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    fontSize: "0.68rem",
    textAlign: "center",
  };

  return (
    <div>
      <div
        className="rounded-lg p-3"
        style={{
          background: "rgba(255,255,255,0.035)",
          border: "1px solid rgba(70,44,125,0.12)",
        }}
      >
        <div
          className="text-[0.65rem] font-bold uppercase tracking-[0.5px] mb-2"
          style={{ color: "#6F6B78" }}
        >
          {label}
        </div>

        {loading ? (
          <div style={frameStyle}>Loading...</div>
        ) : imageUrl ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              ...frameStyle,
              cursor: "zoom-in",
              padding: 0,
            }}
            aria-label="Open payment receipt image"
          >
            <img
              src={imageUrl}
              alt="Payment receipt thumbnail"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </button>
        ) : (
          <div style={frameStyle}>{error || "No receipt image"}</div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Payment Receipt"
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Payment receipt full preview"
            style={{
              width: "100%",
              maxHeight: "75vh",
              objectFit: "contain",
              borderRadius: "8px",
              background: "#F4F1F8",
            }}
          />
        )}
      </Modal>
    </div>
  );
}
