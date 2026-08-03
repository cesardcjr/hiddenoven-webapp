import { useEffect, useState, useRef } from "react";

const TOAST_STYLES = {
  success: {
    background: "rgba(61,189,135,0.12)",
    border: "1px solid rgba(61,189,135,0.3)",
    borderLeft: "4px solid #3DBD87",
    color: "#3DBD87",
  },
  error: {
    background: "rgba(224,82,82,0.12)",
    border: "1px solid rgba(224,82,82,0.3)",
    borderLeft: "4px solid #E05252",
    color: "#E05252",
  },
  info: {
    background: "rgba(201,168,76,0.10)",
    border: "1px solid rgba(201,168,76,0.3)",
    borderLeft: "4px solid #C9A84C",
    color: "#E8C96D",
  },
};

export function Toast({ message, type = "info", onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const style = TOAST_STYLES[type] || TOAST_STYLES.info;

  return (
    <div
      className="max-w-sm rounded-xl px-4 py-3 shadow-card-md transition-opacity duration-300"
      style={{
        ...style,
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className="text-[0.82rem] font-medium"
          style={{ color: style.color }}
        >
          {message}
        </p>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: style.color }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  // Monotonic counter — never produces duplicate IDs even if two toasts
  // are triggered within the same millisecond
  const counter = useRef(0);
  const [toasts, setToasts] = useState([]);

  function showToast(message, type = "info") {
    counter.current += 1;
    const id = counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function ToastContainer() {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    );
  }

  return { showToast, ToastContainer };
}
