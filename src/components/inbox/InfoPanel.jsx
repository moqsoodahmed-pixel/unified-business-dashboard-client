import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApi } from '../../hooks/index.js';
import { customerService, userService, whatsappService } from '../../services/index.js';
import { StatusBadge } from '../Badge.jsx';
import { displayName, formatMoney, formatDateTime, displayPhone } from '../../utils/format.js';

export function InfoPanel({ conv, onChange, toast }) {
  const { user, can } = useAuth();
  const [tag, setTag] = useState('');
  const [note, setNote] = useState('');
  const cid = conv.customerId?._id;
  const profile = useApi(() => (cid && can('customers:read') ? customerService.get(cid) : Promise.resolve(null)), [cid]);
  const users = useApi(() => (can('users:read') ? userService.list() : Promise.resolve(null)), []);
  const act = async (fn, msg) => { try { const c = await fn(); onChange(c); if (msg) toast.success(msg); } catch (e) { toast.error(e.message); } };
  const p = profile.data;

  return (
    <div className="info" style={{ overflowY: 'auto' }}>
      <div className="card-pad stack">
        <div>
          <h3>{displayName(conv.customerId) === 'Unknown' ? displayPhone(conv.phone) : displayName(conv.customerId)}</h3>
          <div className="muted">{displayPhone(conv.phone)}</div>
          {conv.customerId?.email ? <div className="muted">{conv.customerId.email}</div> : null}
          {cid ? <Link to={`/contacts/${cid}`} className="small">Open full profile</Link> : null}
        </div>
        <div className="grid2">
          <div className="field"><label>Status</label>
            <select className="select" value={conv.status} onChange={(e) => act(() => whatsappService.patch(conv._id, { status: e.target.value }), 'Status updated')}>
              {['open', 'pending', 'resolved', 'archived'].map((s) => <option key={s}>{s}</option>)}
            </select></div>
          <div className="field"><label>Priority</label>
            <select className="select" value={conv.priority} onChange={(e) => act(() => whatsappService.patch(conv._id, { priority: e.target.value }), 'Priority updated')}>
              {['low', 'normal', 'high', 'urgent'].map((s) => <option key={s}>{s}</option>)}
            </select></div>
        </div>
        <div className="field"><label>Assigned to</label>
          <select className="select" value={conv.assignedTo?._id || ''} onChange={(e) => act(() => whatsappService.assign(conv._id, e.target.value || null), 'Assignment updated')}>
            <option value="">Unassigned</option>
            {users.data ? users.data.filter((u) => u.isActive).map((u) => <option key={u.id} value={u.id}>{u.name}</option>) : <option value={user.id}>{user.name} (me)</option>}
          </select></div>
        <div className="row wrap">
          <button className="btn sm" onClick={() => act(() => (conv.unreadCount || conv.markedUnread ? whatsappService.read(conv._id) : whatsappService.unread(conv._id)))}>{conv.unreadCount || conv.markedUnread ? 'Mark read' : 'Mark unread'}</button>
          <button className="btn sm" onClick={() => act(() => (conv.status === 'archived' ? whatsappService.unarchive(conv._id) : whatsappService.archive(conv._id)), conv.status === 'archived' ? 'Restored' : 'Archived')}>{conv.status === 'archived' ? 'Unarchive' : 'Archive'}</button>
        </div>

        <div>
          <b>Tags</b>
          <div style={{ marginTop: 6 }}>{(conv.tags || []).map((t) => <span key={t} className="chip">{t} <a href="#remove" onClick={(e) => { e.preventDefault(); act(() => whatsappService.removeTag(conv._id, t)); }} aria-label={`Remove ${t}`}>×</a></span>)}</div>
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (tag.trim()) { act(() => whatsappService.addTag(conv._id, tag.trim())); setTag(''); } }}>
            <input className="input" placeholder="Add tag" value={tag} onChange={(e) => setTag(e.target.value)} maxLength={40} aria-label="New tag" /><button className="btn sm">Add</button>
          </form>
        </div>

        <div>
          <b>Internal notes</b>
          {(conv.notes || []).map((n) => <div key={n._id} className="bubble note small" style={{ margin: '6px 0' }}>{n.text}<div className="meta">{n.authorName} · {formatDateTime(n.createdAt)}</div></div>)}
          <form className="stack" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); if (note.trim()) { act(() => whatsappService.addNote(conv._id, note.trim()), 'Note added'); setNote(''); } }}>
            <textarea className="textarea" style={{ minHeight: 60 }} placeholder="Visible to your team only" value={note} onChange={(e) => setNote(e.target.value)} aria-label="New internal note" />
            <button className="btn sm" style={{ alignSelf: 'flex-end' }}>Save note</button>
          </form>
        </div>

        {p ? (
          <div className="stack" style={{ gap: 8 }}>
            <b>Customer history</b>
            <dl className="kv small">
              <dt>Messages</dt><dd>{p.stats.whatsappMessages}</dd>
              <dt>Emails</dt><dd>{p.stats.emails}</dd>
              {p.payments ? <><dt>Lifetime paid</dt><dd>{formatMoney(p.payments.lifetimeAmount, p.payments.currency)}</dd></> : null}
              <dt>Last interaction</dt><dd>{formatDateTime(p.customer.lastInteractionAt)}</dd>
            </dl>
            {p.payments?.items.slice(0, 3).map((x) => <div key={x._id} className="row between small"><span>{formatMoney(x.amount, x.currency)}</span><StatusBadge status={x.status} /></div>)}
            {p.email.recent.slice(0, 3).map((x) => <div key={x._id} className="row between small"><span className="truncate">{x.subject}</span><StatusBadge status={x.status} /></div>)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
