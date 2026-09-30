import { useState } from 'react';
import { integrationService } from '../services/index.js';
import { useApi } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Async } from '../components/States.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { Modal, ConfirmDialog } from '../components/Modal.jsx';
import { TextInput } from '../components/Field.jsx';
import { timeAgo } from '../utils/format.js';

const NOT_CONFIGURED_TEXT = { msg91: 'MSG91 is not configured.', brevo: 'Brevo Account 1 is not configured.', brevo2: 'Brevo Account 2 is not configured.', razorpay: 'Razorpay is not configured.', telegram: 'Telegram is not configured.' };

function ConfigureModal({ item, onClose, onSaved }) {
  const toast = useToast();
  // Secret inputs always start empty: a saved secret is never sent back to the browser.
  const [values, setValues] = useState(() => Object.fromEntries(item.fields.map((f) => [f.key, f.secret ? '' : (item.config[f.key] && !String(item.config[f.key]).includes('•') && !String(item.config[f.key]).includes('*') ? item.config[f.key] : '')])));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  async function save() {
    setBusy(true); setErrors({});
    try {
      const send = Object.fromEntries(Object.entries(values).filter(([, v]) => String(v).trim() !== '').map(([k, v]) => [k, String(v).trim()]));
      const result = await integrationService.save(item.provider, send);
      toast.success('Saved');
      onSaved(result);
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Configure ${item.label}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="stack">
        {item.fields.map((f) => (
          <TextInput key={f.key} label={`${f.label}${f.required ? ' *' : ''}`} type={f.secret ? 'password' : 'text'} autoComplete="off"
            value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} error={errors[f.key]}
            placeholder={f.secret && item.secretsConfigured[f.key] ? item.secretPlaceholder : (item.config[f.key] || '')}
            hint={f.secret ? (item.secretsConfigured[f.key] ? 'Saved. Leave blank to keep the current value.' : 'Stored encrypted; never shown again.') : (item.config[f.key] ? `Current: ${item.config[f.key]}` : undefined)} />
        ))}
        {item.sources && Object.values(item.sources).includes('env') ? <p className="small muted">Some values come from server environment variables. Values saved here take precedence.</p> : null}
      </div>
    </Modal>
  );
}

function Card({ item, canWrite, reload }) {
  const toast = useToast();
  const [configuring, setConfiguring] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState('');
  const isProvider = Boolean(item.fields?.length);
  const statusLabel = item.status === 'not_configured' ? 'Not configured' : undefined;

  async function run(kind, fn, okMsg) {
    setBusy(kind);
    try { const r = await fn(); toast[r?.ok === false ? 'error' : 'success'](okMsg(r)); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(''); reload(); }
  }
  const test = () => run('test', () => integrationService.test(item.provider), (r) => (r?.ok === false ? `✕ ${r.message}` : '✓ Connected successfully'));

  return (
    <div className="card int-card">
      <div className="card-head"><h3>{item.label}</h3><StatusBadge status={item.status} label={statusLabel} /></div>
      <div className="card-pad stack">
        <p className="muted">{item.description}</p>
        {item.status === 'not_configured' && NOT_CONFIGURED_TEXT[item.provider] ? <div className="alert">{NOT_CONFIGURED_TEXT[item.provider]}</div> : null}
        {item.keyId ? <div className="kv"><span>Key ID</span><code>{item.keyId}</code></div> : null}
        {isProvider ? item.fields.filter((f) => f.secret).map((f) => (
          <div className="kv" key={f.key}><span>{f.label}</span><span>{item.secretsConfigured[f.key] ? item.secretPlaceholder : 'Not set'}</span></div>
        )) : null}
        {item.webhookUrl ? <div className="kv"><span>Webhook URL</span><code className="truncate" title={item.webhookUrl}>{item.webhookUrl}</code></div> : null}
        <div className="kv"><span>Last success</span><span>{item.lastSuccessAt ? timeAgo(item.lastSuccessAt) : 'Never'}</span></div>
        {item.lastError ? <div className="alert error small">Last error {timeAgo(item.lastErrorAt)}: {item.lastError}</div> : null}
        {!isProvider ? Object.entries(item.config || {}).map(([k, v]) => <div className="kv" key={k}><span>{k}</span><span>{String(v)}</span></div>) : null}
        {canWrite && isProvider ? (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {item.status === 'disconnected' ? <button className="btn primary sm" disabled={!!busy} onClick={() => run('connect', () => integrationService.connect(item.provider), () => 'Reconnected')}>Connect</button> : null}
            <button className="btn sm" onClick={() => setConfiguring(true)}>{item.configured ? 'Configure' : 'Connect'}</button>
            <button className="btn sm" disabled={!!busy || !item.configured} onClick={test}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button>
            {item.status !== 'disconnected' ? <button className="btn sm danger" disabled={!!busy || !item.configured} onClick={() => setConfirm(true)}>Disconnect</button> : null}
          </div>
        ) : null}
      </div>
      {configuring && <ConfigureModal item={item} onClose={() => setConfiguring(false)} onSaved={() => { setConfiguring(false); reload(); }} />}
      {confirm && <ConfirmDialog danger title={`Disconnect ${item.label}?`} message="Sending and syncing stop until you reconnect. Saved credentials are kept." confirmLabel="Disconnect" onClose={() => setConfirm(false)}
        onConfirm={async () => { setConfirm(false); await run('disc', () => integrationService.disconnect(item.provider), () => 'Disconnected'); }} />}
    </div>
  );
}

export default function IntegrationsPage() {
  const { can } = useAuth();
  const res = useApi(() => integrationService.list(), []);
  return (
    <>
      <PageHeader title="Integrations" subtitle="Provider credentials are encrypted at rest and never shown after saving" />
      <Async res={res}>{(d) => (
        <div className="grid2">{d.map((i) => <Card key={i.provider} item={i} canWrite={can('integrations:write')} reload={() => res.reload({ silent: true })} />)}</div>
      )}</Async>
    </>
  );
}
