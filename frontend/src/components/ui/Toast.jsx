import { useEffect, useRef, useState } from "react";

const TOAST_STYLES = {
  success: { accent: "#18794E", icon: "✓" },
  error: { accent: "#B42318", icon: "!" },
  info: { accent: "#462C7D", icon: "i" },
};

export function Toast({ message, type = "info", onClose }) {
  const [visible, setVisible] = useState(true);
  const style = TOAST_STYLES[type] || TOAST_STYLES.info;
  useEffect(() => {
    const timer = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className="w-[min(360px,calc(100vw-32px))] rounded-2xl border border-[#E8E6ED] bg-white p-4 shadow-card-md transition-all duration-300" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-8px)" }} role="status">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: style.accent }}>{style.icon}</span>
        <p className="min-w-0 flex-1 pt-1 text-sm font-medium text-[#17151D]">{message}</p>
        <button type="button" aria-label="Dismiss notification" onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="rounded-md px-1 text-xl leading-none text-[#6F6B78] hover:text-[#17151D]">×</button>
      </div>
    </div>
  );
}

export function useToast() {
  const counter = useRef(0);
  const [toasts, setToasts] = useState([]);
  function showToast(message, type = "info") { counter.current += 1; setToasts((prev) => [...prev, { id: counter.current, message, type }]); }
  function removeToast(id) { setToasts((prev) => prev.filter((toast) => toast.id !== id)); }
  function ToastContainer() {
    return <div className="fixed right-4 top-4 z-[700] flex flex-col gap-2 md:right-6 md:top-6">{toasts.map((toast) => <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />)}</div>;
  }
  return { showToast, ToastContainer };
}
