export function CometSpinner({ size = 40, color = "#462C7D", className = "" }) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
    >
      <svg
        className="h-full w-full animate-spin"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        style={{ animationDuration: "0.9s" }}
      >
        <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="4" opacity="0.16" />
        <path
          d="M24 6a18 18 0 0 1 17.1 12.4"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="41.1" cy="18.4" r="3.2" fill={color} />
      </svg>
      <span className="sr-only">Loading</span>
    </span>
  );
}
