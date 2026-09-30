import { StatusBadge } from '../Badge.jsx';
import { formatDateTime } from '../../utils/format.js';

const TICK = { queued: '…', sent: '✓', delivered: '✓✓', read: '✓✓', failed: '!' };

export function MessageBubble({ m }) {
  const out = m.direction === 'out';
  return (
    <div className={`bubble ${out ? 'out' : ''}`}>
      {m.type !== 'text' && m.type !== 'template' ? <div className="small muted">[{m.type}]{m.media?.url ? <> <a href={m.media.url} target="_blank" rel="noreferrer noopener">open</a></> : null}</div> : null}
      {m.type === 'template' ? <div className="small muted">Template · {m.template?.name}</div> : null}
      {m.text}
      <div className="meta">
        {out && m.sentBy?.name ? <span>{m.sentBy.name}</span> : null}
        <span>{formatDateTime(m.createdAt)}</span>
        {out ? <span title={m.status} style={{ color: m.status === 'read' ? '#1f9d55' : m.status === 'failed' ? '#c0392b' : undefined }}>{TICK[m.status] || ''}</span> : null}
      </div>
      {m.status === 'failed' ? <div className="small" style={{ color: 'var(--red)' }}>Not delivered: {m.error?.message || 'unknown error'}</div> : null}
    </div>
  );
}
export { StatusBadge };
