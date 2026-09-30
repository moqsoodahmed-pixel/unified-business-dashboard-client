import { EmptyState } from './States.jsx';

/** columns: [{ key, header, render?(row), className? }] */
export function DataTable({ columns, rows, onRowClick, empty, rowKey = (r) => r._id || r.id }) {
  if (!rows?.length) return empty || <EmptyState />;
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className={onRowClick ? 'click' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}
              tabIndex={onRowClick ? 0 : undefined} onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r); } : undefined}>
              {columns.map((c) => <td key={c.key} className={c.className}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
