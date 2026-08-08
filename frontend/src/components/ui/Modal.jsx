import { useEffect, useId } from "react";

export function Modal({ open, onClose, title, children }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-5"
      style={{ background: "rgba(23,21,29,0.42)", backdropFilter: "blur(5px)" }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal-surface w-full max-w-[460px] max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ animation: "modalIn 0.18s ease" }}
      >
        <div className="modal-header flex items-center justify-between px-5 py-4 sm:px-6">
          <h2 id={titleId} className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-full p-1.5 text-xl leading-none transition-colors hover:bg-[#F4F1F8]">×</button>
        </div>
        <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">{children}</div>
      </div>
      <style>{`@keyframes modalIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </div>
  );
}
