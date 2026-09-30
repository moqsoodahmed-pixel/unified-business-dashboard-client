import { RANGES } from '../constants/index.js';
import { SearchBar } from './SearchBar.jsx';

export function DateRangeFilter({ value, onChange }) {
  const { range = 'last7', from = '', to = '' } = value;
  return (
    <>
      <select className="select" value={range} aria-label="Date range" onChange={(e) => onChange({ ...value, range: e.target.value })}>
        {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      {range === 'custom' ? (
        <>
          <input className="input" type="date" value={from} aria-label="From date" onChange={(e) => onChange({ ...value, from: e.target.value })} />
          <input className="input" type="date" value={to} aria-label="To date" onChange={(e) => onChange({ ...value, to: e.target.value })} />
        </>
      ) : null}
    </>
  );
}

/** filters: object; fields: [{ key, type:'search'|'select'|'range', options?, placeholder? }] */
export function FilterBar({ filters, onChange, fields, children }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  return (
    <div className="filters">
      {fields.map((f) => {
        if (f.type === 'search') return <SearchBar key={f.key} value={filters[f.key] || ''} placeholder={f.placeholder} onChange={(v) => set({ [f.key]: v })} />;
        if (f.type === 'range') return <DateRangeFilter key={f.key} value={filters} onChange={onChange} />;
        return (
          <select key={f.key} className="select" aria-label={f.placeholder || f.key} value={filters[f.key] || ''} onChange={(e) => set({ [f.key]: e.target.value })}>
            <option value="">{f.placeholder || 'All'}</option>
            {f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
          </select>
        );
      })}
      {children}
    </div>
  );
}
