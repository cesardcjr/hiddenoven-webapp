const STATUS_STYLES = {
  pending: {
    background: "rgba(232,169,76,0.15)",
    color: "#E8A94C",
    border: "1px solid rgba(232,169,76,0.3)",
  },
  accepted: {
    background: "rgba(107,159,232,0.15)",
    color: "#6B9FE8",
    border: "1px solid rgba(107,159,232,0.3)",
  },
  payment_verified: {
    background: "rgba(139,92,246,0.15)",
    color: "#A78BFA",
    border: "1px solid rgba(139,92,246,0.3)",
  },
  ready: {
    background: "rgba(61,189,135,0.15)",
    color: "#3DBD87",
    border: "1px solid rgba(61,189,135,0.3)",
  },
  completed: {
    background: "rgba(61,189,135,0.10)",
    color: "#5DD4A8",
    border: "1px solid rgba(61,189,135,0.2)",
  },
  rejected: {
    background: "rgba(224,82,82,0.12)",
    color: "#E05252",
    border: "1px solid rgba(224,82,82,0.3)",
  },
  cancelled: {
    background: "rgba(255,255,255,0.05)",
    color: "#9080A8",
    border: "1px solid rgba(201,168,76,0.09)",
  },
};

const STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  payment_verified: "Payment Verified",
  ready: "Ready for Pickup",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || {
    background: "rgba(255,255,255,0.05)",
    color: "#9080A8",
    border: "1px solid rgba(201,168,76,0.09)",
  };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold"
      style={style}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
