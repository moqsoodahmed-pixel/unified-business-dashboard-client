import { useState } from 'react';
import { telegramService } from '../services/index.js';
import { useApi, usePagedList } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Async, EmptyState } from '../components/States.jsx';
import { StatusBadge, Badge } from '../components/Badge.jsx';
import { Modal, ConfirmDialog } from '../components/Modal.jsx';
import { TextInput, Switch } from '../components/Field.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { formatDateTime } from '../utils/format.js';

/** Route presets. Patterns: exact event type, PREFIX_*, or * (see server matchesPattern). */
const PRESETS = [
  { label: 'Payments', name: 'Payments', eventTypes: ['PAYMENT_*'] },
  { label: 'WhatsApp', name: 'WhatsApp', eventTypes: ['WHATSAPP_*'] },
  { label: 'Email', name: 'Email', eventTypes: ['EMAIL_*'] },
  { label: 'System', name: 'System', eventTypes: ['SYSTEM_ERROR', 'DATABASE_ERROR', 'API_FAILURE', 'INTEGRATION_DISCONNECTED', 'HIGH_ERROR_RATE', 'WEBHOOK_FAILED'] },
  { label: 'Admin (everything)', name: 'Admin', eventTypes: ['*'] },
];

function RouteModal({ route, onClose, onSaved }) {
  const toast = useToast();
  const discover = useApi(() => telegramService.discover(), [], { auto: false });
  const [f, setF] = useState({ name: route?.name || '', chatId: route?.chatId || '', events: (route?.eventTypes || []).join(', '), description: route?.description || '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const preset = (p) => setF({ ...f, name: f.name || p.name, events: p.eventTypes.join(', ') });

  async function save() {
    setBusy(true);
    try {
      const body = { name: f.name.trim(), chatId: f.chatId.trim(), eventTypes: f.events.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean), description: f.description.trim() || undefined };
      if (route) await telegramService.updateRoute(route._id, body); else await telegramService.createRoute(body);
      toast.success('Route saved'); onSaved();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  const chats = discover.data?.chats || (Array.isArray(discover.data) ? discover.data : []);
  return (
    <Modal wide title={route ? 'Edit route' : 'New Telegram route'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy || !f.name.trim() || !f.chatId.trim() || !f.events.trim()} onClick={save}>Save route</button></>}>
      <div className="stack">
        <div className="row" style={{ flexWrap: 'wrap' }}>{PRESETS.map((p) => <button key={p.label} type="button" className="chip" onClick={() => preset(p)}>{p.label}</button>)}</div>
        <TextInput label="Name" value={f.name} onChange={set('name')} />
        <TextInput label="Chat ID" value={f.chatId} onChange={set('chatId')} hint="Numeric chat ID (groups are negative). Message your bot first, then use “Find chats”." />
        <div><button type="button" className="btn sm" onClick={() => discover.reload()} disabled={discover.loading}>{discover.loading ? 'Looking…' : 'Find chats that messaged the bot'}</button></div>
        {discover.error ? <div className="alert error">{discover.error.message}</div> : null}
        {chats.length ? <div className="row" style={{ flexWrap: 'wrap' }}>{chats.map((c) => <button key={c.chatId} type="button" className="chip" onClick={() => setF({ ...f, chatId: c.chatId })}>{c.title || c.chatId} · {c.chatId}</button>)}</div> : null}
        <TextInput label="Event types" value={f.events} onChange={set('events')} hint="Comma separated. Exact types (PAYMENT_SUCCESS), prefixes (PAYMENT_*) or * for all." />
        <TextInput label="Description" value={f.description} onChange={set('description')} />
      </div>
    </Modal>
  );
}

function Routes() {
  const { can } = useAuth();
  const toast = useToast();
  const res = useApi(() => telegramService.routes(), []);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const write = can('telegram:write');
  async function test(r) {
    try { await telegramService.testRoute(r._id); toast.success(`Test message sent to ${r.name}`); } catch (e) { toast.error(e.message); }
  }
  async function toggle(r, enabled) {
    try { await telegramService.updateRoute(r._id, { enabled }); res.reload({ silent: true }); } catch (e) { toast.error(e.message); }
  }
  return (
    <div className="card">
      <div className="card-head"><h3>Notification routes</h3>{write && <button className="btn primary sm" onClick={() => setEdit({})}>New route</button>}</div>
      <Async res={res} isEmpty={(d) => !d.length} empty={<EmptyState title="No routes yet" hint="A route sends selected event types to one Telegram chat. Create one per team, e.g. Finance for payments." />}>{(d) => (
        <DataTable rows={d} columns={[
          { key: 'name', header: 'Name', render: (r) => <b>{r.name}</b> },
          { key: 'chatId', header: 'Chat ID', render: (r) => <code>{r.chatId}</code> },
          { key: 'eventTypes', header: 'Events', render: (r) => (r.eventTypes || []).slice(0, 4).map((t) => <span key={t} className="chip">{t}</span>).concat((r.eventTypes || []).length > 4 ? [<Badge key="more" plain>+{r.eventTypes.length - 4}</Badge>] : []) },
          { key: 'enabled', header: 'Enabled', render: (r) => <Switch label={`Enable ${r.name}`} checked={r.enabled} disabled={!write} onChange={(v) => toggle(r, v)} /> },
          { key: 'a', header: '', render: (r) => write ? <span className="row"><button className="btn sm" onClick={() => test(r)}>Send test</button><button className="btn sm" onClick={() => setEdit(r)}>Edit</button><button className="btn sm danger" onClick={() => setDel(r)}>Delete</button></span> : null },
        ]} />)}
      </Async>
      {edit && <RouteModal route={edit._id ? edit : null} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); res.reload(); }} />}
      {del && <ConfirmDialog danger title="Delete route?" message={`Notifications to “${del.name}” will stop.`} confirmLabel="Delete" onClose={() => setDel(null)}
        onConfirm={async () => { try { await telegramService.deleteRoute(del._id); toast.success('Route deleted'); setDel(null); res.reload(); } catch (e) { toast.error(e.message); } }} />}
    </div>
  );
}

function Log() {
  const [filters, setFilters] = useState({ status: '', range: 'last7' });
  const list = usePagedList(telegramService.notifications, filters);
  return (
    <div className="card">
      <FilterBar filters={filters} onChange={setFilters} fields={[{ key: 'status', type: 'select', placeholder: 'Any status', options: ['sent', 'failed'] }, { key: 'range', type: 'range' }]} />
      <Async res={list} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No notifications in this range" />}>{(d) => (
        <>
          <DataTable rows={d.items} columns={[
            { key: 'eventType', header: 'Event', render: (n) => <b>{n.eventType}</b> },
            { key: 'routeName', header: 'Route' },
            { key: 'status', header: 'Status', render: (n) => <StatusBadge status={n.status} /> },
            { key: 'error', header: 'Error', render: (n) => n.error || '—' },
            { key: 'createdAt', header: 'Sent', render: (n) => <span className="muted">{formatDateTime(n.createdAt)}</span> },
          ]} />
          <Pagination page={list.page} pages={d.pages} total={d.total} onPage={list.setPage} />
        </>)}
      </Async>
    </div>
  );
}

export default function TelegramPage() {
  const [tab, setTab] = useState('routes');
  const bot = useApi(() => telegramService.bot(), []);
  return (
    <>
      <PageHeader title="Telegram" subtitle={bot.data?.username ? `Bot @${bot.data.username}` : 'Route events to Telegram chats'} />
      <Tabs tabs={[{ value: 'routes', label: 'Routes' }, { value: 'log', label: 'Delivery log' }]} value={tab} onChange={setTab} />
      {tab === 'routes' ? <Routes /> : <Log />}
    </>
  );
}
