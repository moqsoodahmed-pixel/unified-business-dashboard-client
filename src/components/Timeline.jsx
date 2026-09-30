import { CHANNEL_LABEL } from '../constants/index.js';
import { formatDateTime } from '../utils/format.js';

/** Channel-coded activity rail: the dot colour tells you where the event came from. */
export function Timeline({ items }) {
  if (!items?.length) return <div className="empty">No activity recorded yet</div>;
  return (
    <div className="timeline">
      {items.map((a) => (
        <div className="tl-item" key={a._id}>
          <span className={`dot ${a.source}`} title={CHANNEL_LABEL[a.source] || a.source} />
          <div>{a.description}</div>
          <div className="small faint">{CHANNEL_LABEL[a.source] || a.source} · {formatDateTime(a.createdAt)}</div>
        </div>
      ))}
    </div>
  );
}
