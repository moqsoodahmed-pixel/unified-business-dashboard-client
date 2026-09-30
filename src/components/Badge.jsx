import { STATUS_TONE } from '../constants/index.js';
import { titleCase } from '../utils/format.js';

export function Badge({ tone = '', plain = false, children }) {
  return <span className={`badge ${tone} ${plain ? 'plain' : ''}`}>{children}</span>;
}
export function StatusBadge({ status, label }) {
  if (!status) return <Badge plain>—</Badge>;
  return <Badge tone={STATUS_TONE[status] ?? ''}>{label || titleCase(status)}</Badge>;
}
