import { useId } from 'react';

export function Field({ label, error, hint, children }) {
  const id = useId();
  return (
    <div className="field">
      {label ? <label htmlFor={id}>{label}</label> : null}
      {typeof children === 'function' ? children(id) : children}
      {error ? <span className="err" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
export function TextInput({ label, error, hint, ...p }) {
  return <Field label={label} error={error} hint={hint}>{(id) => <input id={id} className="input" {...p} />}</Field>;
}
export function Select({ label, error, hint, options, ...p }) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(id) => <select id={id} className="select" {...p}>{options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select>}
    </Field>
  );
}
export function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className="switch" title={label}>
      <input type="checkbox" checked={Boolean(checked)} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}
