import { useEffect } from "react";

export function Modal({ open, onClose, title, children }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[440px] max-h-[90vh] overflow-y-auto"
        style={{
          background: "#1E1235",
          border: "1px solid rgba(201,168,76,0.18)",
          borderRadius: "16px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.65)",
          animation: "modalIn 0.18s ease",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}
        >
          <h2
            className="font-display font-bold text-[1.05rem]"
            style={{ color: "#E8C96D" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none transition-colors duration-150"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(240,232,220,0.35)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#C9A84C")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(240,232,220,0.35)")
            }
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-5">{children}</div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
