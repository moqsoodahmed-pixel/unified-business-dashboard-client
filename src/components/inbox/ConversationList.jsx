import { useState } from 'react';
import { SearchBar } from '../SearchBar.jsx';
import { displayName, initials, timeAgo } from '../../utils/format.js';

const VIEWS = [['all', 'All'], ['unread', 'Unread'], ['mine', 'Mine'], ['recent', 'Recent'], ['priority', 'Priority'], ['archived', 'Archived']];

export function ConversationList({ data, loading, selectedId, onSelect, view, onView, q, onQ }) {
  return (
    <div className="listcol">
      <div style={{ padding: 10 }} className="stack">
        <SearchBar value={q} onChange={onQ} placeholder="Search name, number or message" />
        <div className="row wrap" style={{ gap: 4 }}>
          {VIEWS.map(([v, label]) => (
            <button key={v} className={`btn sm ${view === v ? 'primary' : ''}`} onClick={() => onView(v)} aria-pressed={view === v}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, borderTop: '1px solid var(--line)' }}>
        {loading && !data ? <div className="empty small">Loading…</div> : null}
        {data && !data.items.length ? <div className="empty small">{q ? 'No conversations match your search.' : 'No conversations in this view.'}</div> : null}
        {data?.items.map((c) => {
          const name = displayName(c.customerId) === 'Unknown' ? `+${c.phone}` : displayName(c.customerId);
          const unread = c.unreadCount > 0 || c.markedUnread;
          return (
            <div key={c._id} className={`conv ${selectedId === c._id ? 'sel' : ''}`} onClick={() => onSelect(c._id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelect(c._id)}>
              <div className="avatar">{initials(name)}</div>
              <div className="grow">
                <div className="row between"><b className="truncate" style={{ fontWeight: unread ? 700 : 600 }}>{name}</b><span className="small faint">{timeAgo(c.lastMessageAt)}</span></div>
                <div className="row between"><span className="small muted truncate">{c.lastMessageDirection === 'out' ? 'You: ' : ''}{c.lastMessagePreview}</span>{unread ? <span className="unread">{c.unreadCount || '•'}</span> : null}</div>
                {c.priority === 'high' || c.priority === 'urgent' ? <span className="badge red plain small">{c.priority}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
