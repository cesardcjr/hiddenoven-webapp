const STATUS_STYLES = {
  pending:          "bg-yellow-100 text-yellow-800",
  accepted:         "bg-blue-100 text-blue-800",
  payment_verified: "bg-purple-100 text-purple-800",
  ready:            "bg-green-100 text-green-800",
  completed:        "bg-neutral-100 text-neutral-700",
  rejected:         "bg-red-100 text-red-800",
  cancelled:        "bg-neutral-100 text-neutral-500",
};

const STATUS_LABELS = {
  pending:          "Pending",
  accepted:         "Accepted",
  payment_verified: "Payment Verified",
  ready:            "Ready for Pickup",
  completed:        "Completed",
  rejected:         "Rejected",
  cancelled:        "Cancelled",
};

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] || "bg-neutral-100 text-neutral-600"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
