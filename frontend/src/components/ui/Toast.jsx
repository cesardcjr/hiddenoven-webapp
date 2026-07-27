import { useEffect, useState } from "react";

export function Toast({ message, type = "info", onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: "bg-green-50 border-green-400 text-green-800",
    error:   "bg-red-50 border-red-400 text-red-800",
    info:    "bg-brand-50 border-brand-400 text-brand-800",
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm border-l-4 rounded-lg px-4 py-3 shadow-lg transition-opacity duration-300 ${colors[type]} ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{message}</p>
        <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="text-inherit opacity-60 hover:opacity-100 text-lg leading-none">×</button>
      </div>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  function showToast(message, type = "info") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function ToastContainer() {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    );
  }

  return { showToast, ToastContainer };
}
