import { useState } from 'react';
import { emailService } from '../services/index.js';
import { useApi, usePagedList } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSocketEvent } from '../context/SocketContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Async, EmptyState } from '../components/States.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { Drawer, Modal, ConfirmDialog } from '../components/Modal.jsx';
import { TextInput, Select, Switch } from '../components/Field.jsx';
import { formatDateTime, formatNumber, displayName } from '../utils/format.js';
import { useAccounts } from '../components/AccountSelect.jsx';

const FALLBACK_LABEL = { brevo: 'Brevo — Account 1', brevo2: 'Brevo — Account 2' };
/** Name of a Brevo account key; falls back when the viewer cannot list accounts. */
const brevoLabel = (rows, key) => (key ? rows.find((r) => r.key === key)?.label || FALLBACK_LABEL[key] || key : '—');
const splitAddresses = (s) => s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
const addrText = (list) => (list || []).map((a) => a.name ? `${a.name} <${a.email}>` : a.email).join(', ');

const readFileBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve({ name: file.name, contentBase64: String(r.result).split(',')[1] });
  r.onerror = () => reject(new Error(`Could not read ${file.name}`));
  r.readAsDataURL(file);
});

function EmailDetail({ id, onClose }) {
  const res = useApi(() => emailService.get(id), [id]);
  const brevoAccounts = useAccounts('brevo');
  return (
    <Drawer title="Email details" onClose={onClose}>
      <Async res={res}>{(e) => (
        <div className="stack">
          <div className="kv"><span>Status</span><StatusBadge status={e.status} /></div>
          <div className="kv"><span>To</span><span>{addrText(e.to)}</span></div>
          {e.cc?.length ? <div className="kv"><span>CC</span><span>{addrText(e.cc)}</span></div> : null}
          <div className="kv"><span>Subject</span><b>{e.subject}</b></div>
          {e.brevoAccount ? <div className="kv"><span>Sent via</span><span>{brevoLabel(brevoAccounts, e.brevoAccount)}{e.from?.email ? ` (${e.from.email})` : ''}</span></div> : null}
          <div className="kv"><span>Sent</span><span>{formatDateTime(e.createdAt)}</span></div>
          <div className="kv"><span>Opens / clicks</span><span>{e.openCount || 0} / {e.clickCount || 0}</span></div>
          {e.error?.message ? <div className="alert error">{e.error.message}</div> : null}
          <h4>Content</h4>
          {/* sandboxed: stored HTML can never run scripts in the dashboard origin */}
          {e.htmlContent ? <iframe title="Email preview" sandbox="" srcDoc={e.htmlContent} style={{ width: '100%', minHeight: 320, border: '1px solid var(--line)', borderRadius: 8, background: '#fff' }} /> : <pre className="pre">{e.textContent || '(no content stored)'}</pre>}
          <h4>Delivery events</h4>
          {(e.events || []).length ? (e.events).map((ev) => <div key={ev._id} className="small"><StatusBadge status={ev.status || ev.event} /> {formatDateTime(ev.occurredAt || ev.createdAt)}</div>) : <div className="muted small">No provider events received yet.</div>}
        </div>)}
      </Async>
    </Drawer>
  );
}

function History() {
  const [filters, setFilters] = useState({ q: '', status: '', range: 'last30' });
  const [openId, setOpenId] = useState(null);
  const stats = useApi(() => emailService.stats(filters), [JSON.stringify(filters)]);
  const brevoAccounts = useAccounts('brevo');
  const list = usePagedList(emailService.list, filters);
  useSocketEvent('email:update', () => { list.reload({ silent: true }); stats.reload({ silent: true }); });
  const s = stats.data;
  return (
    <>
      <div className="stats">
        <StatCard channel="email" label="Total sent" value={formatNumber(s?.total)} sub={s?.byAccount && Object.keys(s.byAccount).length ? Object.entries(s.byAccount).map(([k, n]) => `${brevoLabel(brevoAccounts, k).replace(/^Brevo — /, '')}: ${formatNumber(n)}`).join(' · ') : undefined} />
        <StatCard channel="email" label="Delivered" value={formatNumber(s?.delivered)} />
        <StatCard channel="email" label="Failed" value={formatNumber(s?.failed)} />
        <StatCard channel="email" label="Bounced" value={formatNumber(s?.bounced)} />
        <StatCard channel="email" label="Opened" value={formatNumber(s?.opened)} sub="Where the provider reports it" />
        <StatCard channel="email" label="Clicked" value={formatNumber(s?.clicked)} />
      </div>
      <div className="card">
        <FilterBar filters={filters} onChange={setFilters} fields={[
          { key: 'q', type: 'search', placeholder: 'Search subject or recipient' },
          { key: 'status', type: 'select', placeholder: 'Any status', options: ['queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'spam'] },
          { key: 'range', type: 'range' },
        ]} />
        <Async res={list} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No emails in this range" hint="Emails you send from the composer appear here with their delivery status." />}>{(d) => (
          <>
            <DataTable rows={d.items} onRowClick={(e) => setOpenId(e._id)} columns={[
              { key: 'subject', header: 'Subject', render: (e) => <b>{e.subject || '(no subject)'}</b> },
              { key: 'to', header: 'To', render: (e) => <span className="truncate">{addrText(e.to)}</span> },
              { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
              { key: 'brevoAccount', header: 'Account', render: (e) => <span className="muted">{brevoLabel(brevoAccounts, e.brevoAccount)}</span> },
              { key: 'createdAt', header: 'Sent', render: (e) => <span className="muted">{formatDateTime(e.createdAt)}</span> },
            ]} />
            <Pagination page={list.page} pages={d.pages} total={d.total} onPage={list.setPage} />
          </>)}
        </Async>
      </div>
      {openId && <EmailDetail id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Compose({ onSent }) {
  const toast = useToast();
  const templates = useApi(() => emailService.templates(), []);
  const accounts = useApi(() => emailService.accounts(), []);
  const [f, setF] = useState({ to: '', cc: '', bcc: '', subject: '', htmlContent: '', templateId: '', account: 'auto' });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function send() {
    setBusy(true); setErrors({});
    try {
      const body = { to: splitAddresses(f.to) };
      if (f.cc.trim()) body.cc = splitAddresses(f.cc);
      if (f.bcc.trim()) body.bcc = splitAddresses(f.bcc);
      if (f.templateId) body.templateId = f.templateId;
      if (f.account && f.account !== 'auto') body.account = f.account;
      if (f.subject.trim()) body.subject = f.subject.trim();
      if (f.htmlContent.trim()) body.htmlContent = f.htmlContent;
      if (files.length) body.attachments = await Promise.all(files.map(readFileBase64));
      await emailService.send(body);
      toast.success('Email accepted by Brevo');
      setF({ to: '', cc: '', bcc: '', subject: '', htmlContent: '', templateId: '', account: f.account }); setFiles([]);
      onSent();
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); } finally { setBusy(false); }
  }
  const acct = accounts.data || [];
  const ready = acct.filter((a) => a.configured);
  const accountOptions = [
    { value: 'auto', label: ready.length > 1 ? `Auto (balance across ${ready.length} accounts)` : 'Auto' },
    ...acct.map((a) => ({ value: a.account, label: `${a.label}${a.configured ? (a.senderEmail ? ` — ${a.senderEmail}` : '') : ' (not configured)'}`, disabled: !a.configured })),
  ];
  const tplOptions = [{ value: '', label: 'No template' }, ...((templates.data || []).filter((t) => t.enabled !== false).map((t) => ({ value: t._id, label: t.name })))];
  return (
    <div className="card card-pad stack" style={{ maxWidth: 820 }}>
      <Select label="Send with" value={f.account} onChange={set('account')} options={accountOptions}
        hint={f.account === 'auto' ? 'Uses the account with the fewest emails in the last 24h and switches to another account if Brevo rejects the send.' : 'Sends only through this account.'} />
      <TextInput label="To" value={f.to} onChange={set('to')} hint="Separate several addresses with commas" error={errors.to} />
      <div className="grid2"><TextInput label="CC" value={f.cc} onChange={set('cc')} /><TextInput label="BCC" value={f.bcc} onChange={set('bcc')} /></div>
      <Select label="Template" value={f.templateId} onChange={set('templateId')} options={tplOptions} />
      <TextInput label="Subject" value={f.subject} onChange={set('subject')} error={errors.subject} hint={f.templateId ? 'Optional: the template subject is used when empty' : undefined} />
      <label className="field"><span>HTML content</span>
        <textarea className="textarea" rows={10} value={f.htmlContent} onChange={set('htmlContent')} placeholder="<p>Hello…</p>" />
        {errors.htmlContent ? <span className="err">{errors.htmlContent}</span> : null}
      </label>
      <label className="field"><span>Attachments (max 5)</span>
        <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 5))} />
        {files.length ? <span className="small muted">{files.map((x) => `${x.name} (${Math.ceil(x.size / 1024)} KB)`).join(', ')}</span> : null}
      </label>
      <div><button className="btn primary" disabled={busy || !f.to.trim()} onClick={send}>{busy ? 'Sending…' : 'Send email'}</button></div>
    </div>
  );
}

function TemplateModal({ tpl, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: tpl?.name || '', subject: tpl?.subject || '', htmlContent: tpl?.htmlContent || '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    setBusy(true);
    try {
      if (tpl) await emailService.updateTemplate(tpl._id, f); else await emailService.createTemplate(f);
      toast.success('Template saved'); onSaved();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal wide title={tpl ? 'Edit template' : 'New template'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy || !f.name || !f.subject} onClick={save}>Save</button></>}>
      <div className="stack">
        <TextInput label="Name" value={f.name} onChange={set('name')} />
        <TextInput label="Subject" value={f.subject} onChange={set('subject')} hint="Use {{name}} style placeholders; variables are supplied when sending" />
        <label className="field"><span>HTML content</span><textarea className="textarea" rows={12} value={f.htmlContent} onChange={set('htmlContent')} /></label>
      </div>
    </Modal>
  );
}

function Templates() {
  const { can } = useAuth();
  const toast = useToast();
  const res = useApi(() => emailService.templates(), []);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const manage = can('email:manage');
  return (
    <div className="card">
      <div className="card-head"><h3>Templates</h3>{manage && <button className="btn primary sm" onClick={() => setEdit({})}>New template</button>}</div>
      <Async res={res} isEmpty={(d) => !d.length} empty={<EmptyState title="No templates yet" />}>{(d) => (
        <DataTable rows={d} columns={[
          { key: 'name', header: 'Name', render: (t) => <b>{t.name}</b> },
          { key: 'subject', header: 'Subject' },
          { key: 'updatedAt', header: 'Updated', render: (t) => <span className="muted">{formatDateTime(t.updatedAt)}</span> },
          { key: 'a', header: '', render: (t) => manage ? <span className="row"><button className="btn sm" onClick={() => setEdit(t)}>Edit</button><button className="btn sm danger" onClick={() => setDel(t)}>Delete</button></span> : null },
        ]} />)}
      </Async>
      {edit && <TemplateModal tpl={edit._id ? edit : null} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); res.reload(); }} />}
      {del && <ConfirmDialog danger title="Delete template?" message={`“${del.name}” will be removed.`} confirmLabel="Delete" onClose={() => setDel(null)}
        onConfirm={async () => { try { await emailService.deleteTemplate(del._id); toast.success('Template deleted'); setDel(null); res.reload(); } catch (e) { toast.error(e.message); } }} />}
    </div>
  );
}

function Recipients() {
  const { can } = useAuth();
  const toast = useToast();
  const [filters, setFilters] = useState({ q: '' });
  const list = usePagedList(emailService.contacts, filters);
  const manage = can('email:manage');
  async function patch(c, body) {
    try { await emailService.updateContact(c._id, body); list.reload({ silent: true }); } catch (e) { toast.error(e.message); }
  }
  return (
    <div className="card">
      <FilterBar filters={filters} onChange={setFilters} fields={[{ key: 'q', type: 'search', placeholder: 'Search recipients' }]} />
      <Async res={list} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No recipients yet" hint="Recipients are recorded automatically when you send email." />}>{(d) => (
        <>
          <DataTable rows={d.items} columns={[
            { key: 'email', header: 'Email', render: (c) => <b>{c.email}</b> },
            { key: 'name', header: 'Name', render: (c) => c.name || (c.customerId && typeof c.customerId === 'object' ? displayName(c.customerId) : '—') },
            { key: 'sent', header: 'Sent', render: (c) => c.sentCount ?? 0 },
            { key: 'status', header: 'State', render: (c) => c.blocked ? <StatusBadge status="blocked" /> : <StatusBadge status={c.subscribed === false ? 'inactive' : 'active'} label={c.subscribed === false ? 'Unsubscribed' : 'Active'} /> },
            { key: 'sub', header: 'Subscribed', render: (c) => <Switch label="Subscribed" checked={c.subscribed !== false} disabled={!manage} onChange={(v) => patch(c, { subscribed: v })} /> },
          ]} />
          <Pagination page={list.page} pages={d.pages} total={d.total} onPage={list.setPage} />
        </>)}
      </Async>
    </div>
  );
}

export default function EmailPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState('history');
  const [nonce, setNonce] = useState(0);
  const tabs = [{ value: 'history', label: 'History' }, ...(can('email:send') ? [{ value: 'compose', label: 'Compose' }] : []), { value: 'templates', label: 'Templates' }, { value: 'recipients', label: 'Recipients' }];
  return (
    <>
      <PageHeader title="Email" subtitle="Send through your Brevo accounts and track delivery" />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'history' && <History key={nonce} />}
      {tab === 'compose' && <Compose onSent={() => { setNonce(nonce + 1); setTab('history'); }} />}
      {tab === 'templates' && <Templates />}
      {tab === 'recipients' && <Recipients />}
    </>
  );
}
