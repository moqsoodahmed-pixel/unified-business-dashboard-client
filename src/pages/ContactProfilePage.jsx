import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customerService } from '../services/index.js';
import { useApi } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Async } from '../components/States.jsx';
import { StatusBadge, Badge } from '../components/Badge.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { Timeline } from '../components/Timeline.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { displayName, displayPhone, formatDateTime, formatMoney, formatNumber } from '../utils/format.js';

export default function ContactProfilePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const res = useApi(() => customerService.get(id), [id]);
  const [tab, setTab] = useState('timeline');
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  const canWrite = can('customers:write');
  const run = async (fn, msg) => { try { await fn(); if (msg) toast.success(msg); res.reload({ silent: true }); } catch (e) { toast.error(e.message); } };

  return (
    <Async res={res}>{(p) => {
      const c = p.customer;
      return (
        <>
          <PageHeader title={displayName(c)} subtitle={[displayPhone(c.phone), c.email, c.company].filter(Boolean).join(' · ') || 'No contact details yet'}
            actions={<>{can('whatsapp:read') && c.phone ? <button className="btn" onClick={() => nav('/inbox', { state: { conversationId: p.whatsapp.conversation?._id } })} disabled={!p.whatsapp.conversation}>Open chat</button> : null}<Link className="btn" to="/contacts">Back to contacts</Link></>} />
          {c.possibleDuplicates?.length ? <div className="alert" style={{ marginBottom: 14 }}>Possible duplicate{c.possibleDuplicates.length > 1 ? 's' : ''}: {c.possibleDuplicates.map((d) => <Link key={d._id} to={`/contacts/${d._id}`} style={{ marginRight: 8 }}>{displayName(d)}</Link>)} They share a detail with this customer but have not been merged.</div> : null}
          <div className="stats" style={{ marginBottom: 16 }}>
            <StatCard channel="wa" label="WhatsApp messages" value={formatNumber(p.stats.whatsappMessages)} />
            <StatCard channel="mail" label="Emails" value={formatNumber(p.stats.emails)} />
            {p.payments ? <StatCard channel="pay" label="Lifetime payments" value={formatMoney(p.payments.lifetimeAmount, p.payments.currency)} sub={`${p.payments.count} transaction${p.payments.count === 1 ? '' : 's'}`} /> : null}
            <StatCard channel="cust" label="Last interaction" value={<span style={{ fontSize: 16 }}>{formatDateTime(c.lastInteractionAt)}</span>} />
          </div>
          <div className="grid2" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', alignItems: 'start' }}>
            <div>
              <Tabs value={tab} onChange={setTab} tabs={[{ value: 'timeline', label: 'Timeline' }, { value: 'email', label: `Emails (${p.email.count})` }, ...(p.payments ? [{ value: 'payments', label: `Payments (${p.payments.count})` }] : [])]} />
              <div className="card">
                {tab === 'timeline' && <div className="card-pad"><Timeline items={p.timeline} /></div>}
                {tab === 'email' && <DataTable rows={p.email.recent} empty={<div className="empty">No emails yet</div>} columns={[{ key: 'subject', header: 'Subject' }, { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> }, { key: 'createdAt', header: 'Sent', render: (e) => formatDateTime(e.createdAt) }]} />}
                {tab === 'payments' && p.payments && <DataTable rows={p.payments.items} empty={<div className="empty">No payments yet</div>} columns={[{ key: 'paymentId', header: 'Payment' }, { key: 'amount', header: 'Amount', render: (x) => <b className="num">{formatMoney(x.amount, x.currency)}</b> }, { key: 'status', header: 'Status', render: (x) => <StatusBadge status={x.status} /> }, { key: 'method', header: 'Method' }, { key: 'razorpayCreatedAt', header: 'Date', render: (x) => formatDateTime(x.razorpayCreatedAt || x.createdAt) }]} />}
              </div>
            </div>
            <div className="stack">
              <div className="card card-pad stack">
                <h3>Details</h3>
                <dl className="kv small"><dt>Source</dt><dd><Badge plain>{c.source}</Badge></dd><dt>Status</dt><dd><StatusBadge status={c.status} /></dd><dt>Assigned to</dt><dd>{c.assignedTo?.name || '—'}</dd><dt>Created</dt><dd>{formatDateTime(c.createdAt)}</dd></dl>
                {canWrite ? (
                  <select className="select" value={c.status} aria-label="Customer status" onChange={(e) => run(() => customerService.update(id, { status: e.target.value }), 'Status updated')}>{['lead', 'active', 'inactive', 'blocked'].map((s) => <option key={s}>{s}</option>)}</select>) : null}
              </div>
              <div className="card card-pad stack">
                <h3>Tags</h3>
                <div>{(c.tags || []).length ? c.tags.map((t) => <span key={t} className="chip">{t}{canWrite ? <> <a href="#x" aria-label={`Remove ${t}`} onClick={(e) => { e.preventDefault(); run(() => customerService.removeTag(id, t)); }}>×</a></> : null}</span>) : <span className="muted small">No tags</span>}</div>
                {canWrite ? <form className="row" onSubmit={(e) => { e.preventDefault(); if (tag.trim()) { run(() => customerService.addTags(id, [tag.trim()])); setTag(''); } }}><input className="input" placeholder="Add tag" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="New tag" /><button className="btn sm">Add</button></form> : null}
              </div>
              <div className="card card-pad stack">
                <h3>Notes</h3>
                {(c.notes || []).length ? c.notes.map((n) => (
                  <div key={n._id} className="bubble note small">{n.text}<div className="meta">{n.authorName} · {formatDateTime(n.createdAt)}{canWrite ? <a href="#x" onClick={(e) => { e.preventDefault(); run(() => customerService.deleteNote(id, n._id)); }}>delete</a> : null}</div></div>)) : <span className="muted small">No notes</span>}
                {canWrite ? <form className="stack" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); if (note.trim()) { run(() => customerService.addNote(id, note.trim()), 'Note added'); setNote(''); } }}><textarea className="textarea" style={{ minHeight: 60 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" aria-label="New note" /><button className="btn sm" style={{ alignSelf: 'flex-end' }}>Save note</button></form> : null}
              </div>
            </div>
          </div>
        </>
      );
    }}</Async>
  );
}
