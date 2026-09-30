import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { whatsappService, dashboardService, integrationService } from '../services/index.js';
import { useApi } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Async, EmptyState } from '../components/States.jsx';
import { Modal, ConfirmDialog } from '../components/Modal.jsx';
import { Badge, StatusBadge } from '../components/Badge.jsx';
import { TextInput, Select, Field } from '../components/Field.jsx';
import { formatNumber } from '../utils/format.js';

function TemplateForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(initial || { name: '', language: 'en', category: 'UTILITY', bodyText: '', variableCount: 0, namespace: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  async function save() {
    setBusy(true);
    try {
      const body = { name: f.name.trim(), language: f.language.trim() || 'en', category: f.category, bodyText: f.bodyText, variableCount: Number(f.variableCount) || 0, ...(f.namespace ? { namespace: f.namespace } : {}) };
      if (initial?._id) await whatsappService.updateTemplate(initial._id, body); else await whatsappService.createTemplate(body);
      toast.success('Template saved'); onSaved();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={initial ? 'Edit template' : 'Register a template'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy || !f.name.trim()} onClick={save}>{busy ? 'Saving…' : 'Save template'}</button></>}>
      <div className="stack">
        <p className="muted small" style={{ margin: 0 }}>Register templates exactly as approved in MSG91 / Meta. The name and language must match, or sending will be rejected.</p>
        <div className="grid2"><TextInput label="Template name" value={f.name} onChange={set('name')} /><TextInput label="Language code" value={f.language} onChange={set('language')} hint="e.g. en, en_US, hi" /></div>
        <div className="grid2"><Select label="Category" value={f.category} onChange={set('category')} options={['UTILITY', 'MARKETING', 'AUTHENTICATION', 'OTHER'].map((v) => ({ value: v, label: v }))} /><TextInput label="Variables in the body" type="number" min="0" max="30" value={f.variableCount} onChange={set('variableCount')} /></div>
        <Field label="Body text (use {{1}}, {{2}} for variables)">{(id) => <textarea id={id} className="textarea" value={f.bodyText} onChange={set('bodyText')} />}</Field>
        <TextInput label="Namespace (optional)" value={f.namespace || ''} onChange={set('namespace')} />
      </div>
    </Modal>
  );
}

export default function WhatsAppPage() {
  const { can } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const dash = useApi(() => dashboardService.get({ range: 'last7' }), []);
  const templates = useApi(() => whatsappService.templates(), []);
  const integrations = useApi(() => (can('integrations:read') ? integrationService.list() : Promise.resolve(null)), []);
  const msg91 = integrations.data?.find((i) => i.provider === 'msg91');
  const canWrite = can('whatsapp:write');

  return (
    <>
      <PageHeader title="WhatsApp" subtitle="Messaging through MSG91" actions={<button className="btn primary" onClick={() => nav('/inbox')}>Open inbox</button>} />
      {msg91 && !msg91.configured ? <div className="alert" style={{ marginBottom: 14 }}>MSG91 is not configured. {can('integrations:write') ? <a href="/integrations">Add your credentials</a> : 'Ask a super admin to add the credentials.'} Messages cannot be sent or received until then.</div> : null}
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'overview', label: 'Overview' }, { value: 'templates', label: 'Templates' }]} />
      {tab === 'overview' && (
        <Async res={dash}>{(d) => (
          <div className="stack gap-lg">
            <div className="stats">
              <StatCard channel="wa" label="Messages today" value={formatNumber(d.whatsapp?.messagesToday)} />
              <StatCard channel="wa" label="Unread conversations" value={formatNumber(d.whatsapp?.unreadConversations)} sub={`${formatNumber(d.whatsapp?.unreadMessages)} unread messages`} />
              <StatCard channel="wa" label="Messages in last 7 days" value={formatNumber(d.whatsapp?.inRange)} />
              <StatCard channel="wa" label="Connection" value={<StatusBadge status={msg91?.status || 'untested'} />} sub={msg91?.lastError || (msg91?.lastSuccessAt ? 'Last call succeeded' : 'No calls yet')} />
            </div>
            <div className="card card-pad"><h3>How replies work</h3><p className="muted" style={{ marginBottom: 0 }}>Customers can be answered with free-form text for 24 hours after their last message. After that, WhatsApp only allows an approved template message. The inbox tells you when the window has closed.</p></div>
          </div>)}
        </Async>
      )}
      {tab === 'templates' && (
        <div className="card">
          <div className="card-head"><h3>Registered templates</h3>{canWrite ? <button className="btn primary sm" onClick={() => setEditing({})}>Register template</button> : null}</div>
          <Async res={templates} isEmpty={(t) => !t.length} empty={<EmptyState title="No templates registered" hint="Add the templates approved in your MSG91 account so operators can start conversations." />}>{(rows) => (
            <DataTable rows={rows} columns={[
              { key: 'name', header: 'Name', render: (t) => <b>{t.name}</b> }, { key: 'language', header: 'Language' },
              { key: 'category', header: 'Category', render: (t) => <Badge plain>{t.category}</Badge> },
              { key: 'variableCount', header: 'Variables' }, { key: 'bodyText', header: 'Body', render: (t) => <span className="muted truncate" style={{ display: 'block', maxWidth: 320 }}>{t.bodyText || '—'}</span> },
              { key: 'enabled', header: 'Status', render: (t) => <StatusBadge status={t.enabled ? 'active' : 'inactive'} /> },
              { key: 'a', header: '', render: (t) => canWrite ? <span className="row"><button className="btn sm" onClick={() => setEditing(t)}>Edit</button><button className="btn sm danger" onClick={() => setRemoving(t)}>Delete</button></span> : null },
            ]} />)}
          </Async>
        </div>
      )}
      {editing && <TemplateForm initial={editing._id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); templates.reload(); }} />}
      {removing && <ConfirmDialog danger title="Delete template" message={`Delete “${removing.name}”? Messages already sent are not affected.`} confirmLabel="Delete" onClose={() => setRemoving(null)}
        onConfirm={async () => { try { await whatsappService.deleteTemplate(removing._id); toast.success('Template deleted'); setRemoving(null); templates.reload(); } catch (e) { toast.error(e.message); } }} />}
    </>
  );
}
