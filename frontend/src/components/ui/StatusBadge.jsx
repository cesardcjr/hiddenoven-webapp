const STATUS_STYLES = {
  NEW: {
    background: "rgba(232,169,76,0.15)",
    color: "#E8A94C",
    border: "1px solid rgba(232,169,76,0.3)",
  },
  PAYMENT_REVIEW: {
    background: "rgba(107,159,232,0.15)",
    color: "#6B9FE8",
    border: "1px solid rgba(107,159,232,0.3)",
  },
  PAYMENT_REJECTED: {
    background: "rgba(224,82,82,0.15)",
    color: "#E05252",
    border: "1px solid rgba(224,82,82,0.3)",
  },
  PREPARING: {
    background: "rgba(139,92,246,0.15)",
    color: "#A78BFA",
    border: "1px solid rgba(139,92,246,0.3)",
  },
  READY_FOR_PICKUP: {
    background: "rgba(61,189,135,0.15)",
    color: "#3DBD87",
    border: "1px solid rgba(61,189,135,0.3)",
  },
  COMPLETED: {
    background: "rgba(61,189,135,0.10)",
    color: "#5DD4A8",
    border: "1px solid rgba(61,189,135,0.2)",
  },
  CANCELLED: {
    background: "#FFFFFF",
    color: "#6F6B78",
    border: "1px solid rgba(70,44,125,0.09)",
  },
};

const STATUS_LABELS = {
  NEW: "New Order",
  PAYMENT_REVIEW: "Payment Review",
  PAYMENT_REJECTED: "Payment Rejected",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for Pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || {
    background: "#FFFFFF",
    color: "#6F6B78",
    border: "1px solid rgba(70,44,125,0.09)",
  };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold uppercase tracking-wide"
      style={style}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
