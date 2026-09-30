const tz = 'Asia/Kolkata';

/** Money arrives from the API in the smallest currency unit (paise). */
export function formatMoney(minor, currency = 'INR') {
  const n = Number(minor || 0) / 100;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
export const formatNumber = (n) => new Intl.NumberFormat('en-IN').format(Number(n || 0));

export function formatDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).format(date);
}
export function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: tz }).format(date);
}
export function timeAgo(d, now = Date.now()) {
  if (!d) return '';
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`;
  return formatDate(d);
}
export const displayName = (c) => (c ? [c.firstName, c.lastName].filter(Boolean).join(' ') || (c.phone && `+${c.phone}`) || c.email || 'Unknown' : 'Unknown');
export const initials = (name = '?') => name.replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('') || '?';
export const displayPhone = (p) => (p ? `+${p}` : '');
export const titleCase = (s = '') => s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
export const toQuery = (o = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};
export function downloadBlob(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/** Turn the shared range control into explicit ISO bounds for list endpoints (browser-local day boundaries). */
export function rangeBounds({ range = 'last7', from, to } = {}, now = new Date()) {
  const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = sod(now);
  const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  let a; let b;
  if (range === 'today') { a = today; b = add(today, 1); }
  else if (range === 'yesterday') { a = add(today, -1); b = today; }
  else if (range === 'last30') { a = add(today, -29); b = add(today, 1); }
  else if (range === 'custom' && from && to) { a = sod(new Date(`${from}T00:00:00`)); b = add(sod(new Date(`${to}T00:00:00`)), 1); }
  else { a = add(today, -6); b = add(today, 1); }
  return { from: a.toISOString(), to: b.toISOString() };
}
