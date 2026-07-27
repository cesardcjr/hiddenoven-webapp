export function FormField({ label, error, children }) {
  return (
    <div className="mb-4">
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextInput({ label, error, ...props }) {
  return (
    <FormField label={label} error={error}>
      <input className="input" {...props} />
    </FormField>
  );
}

export function SelectInput({ label, error, options = [], ...props }) {
  return (
    <FormField label={label} error={error}>
      <select className="input" {...props}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FormField>
  );
}
