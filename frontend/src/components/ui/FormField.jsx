import { useState } from "react";

export function FormField({ label, error, hint, children }) {
  return (
    <div className="mb-4">
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && (
        <p className="mt-1 text-[0.7rem]" style={{ color: "#9080A8" }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1 text-[0.72rem]" style={{ color: "#E05252" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({ label, error, hint, ...props }) {
  return (
    <FormField label={label} error={error} hint={hint}>
      <input className="input" {...props} />
    </FormField>
  );
}

export function PasswordInput({ label, error, hint, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          className="input pr-10"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150"
          style={{ color: "rgba(240,232,220,0.35)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#C9A84C")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(240,232,220,0.35)")
          }
        >
          {visible ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </FormField>
  );
}

export function SelectInput({ label, error, hint, options = [], ...props }) {
  return (
    <FormField label={label} error={error} hint={hint}>
      <select className="input" style={{ background: "#1E1235" }} {...props}>
        <option value="" style={{ background: "#261748" }}>
          Select…
        </option>
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            style={{ background: "#261748" }}
          >
            {o.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
