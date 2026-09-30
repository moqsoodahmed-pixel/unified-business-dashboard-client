import { useState } from 'react';
import { integrationService } from '../services/index.js';
import { useApi } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Async } from '../components/States.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { Modal, ConfirmDialog } from '../components/Modal.jsx';
import { TextInput, Switch } from '../components/Field.jsx';
import { timeAgo } from '../utils/format.js';

/** Display order of the provider sections. */
const TYPE_ORDER = ['brevo', 'razorpay', 'msg91', 'telegram'];
/** What "default" means for each type (Brevo balances across all accounts, so it has no default). */
const DEFAULT_HINT = {
  razorpay: 'New payment orders use this account unless another is chosen.',
  msg91: 'New conversations use this number; replies always go out from the number the customer wrote to.',
  telegram: 'Notification routes without a chosen bot use this bot.',
};
const TYPE_HELP = {
  brevo: 'Emails are spread across every connected Brevo account ("Auto" in the composer), with automatic failover if one account is rejected.',
  razorpay: 'Each order remembers the account that created it, so checkout verification, refunds and webhooks use the same account.',
  msg91: 'Each WhatsApp number receives messages on its own webhook URL.',
  telegram: 'Each notification route can send through its own bot.',
};
const EXAMPLE_NAME = { brevo: 'Brevo — Marketing', razorpay: 'Razorpay — Store 2', msg91: 'Support number', telegram: 'Alerts bot' };

function CopyButton({ text }) {
  const toast = useToast();
  return (
    <button className="btn sm" type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(text); toast.success('Copied'); } catch { toast.error('Copy failed. Select the text and copy it manually.'); }
    }}>Copy</button>
  );
}

/** Field inputs shared by "Configure" and "Add account". */
function CredentialFields({ fields, values, setValues, errors, item }) {
  return fields.map((f) => {
    const saved = item?.secretsConfigured?.[f.key];
    const current = item?.config?.[f.key];
    return (
      <TextInput key={f.key} label={`${f.label}${f.required ? ' *' : ''}`} type={f.secret ? 'password' : 'text'} autoComplete="off"
        value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} error={errors[f.key]}
        placeholder={f.secret && saved ? item.secretPlaceholder : (current || '')}
        hint={f.secret ? (saved ? 'Saved. Leave blank to keep the current value.' : 'Stored encrypted; never shown again.') : (current ? `Current: ${current}` : undefined)} />
    );
  });
}

const trimmed = (values) => Object.fromEntries(Object.entries(values).filter(([, v]) => String(v ?? '').trim() !== '').map(([k, v]) => [k, String(v).trim()]));
const cleanInitial = (v) => (v && !String(v).includes('•') && !String(v).includes('*') ? v : '');

function ConfigureModal({ item, onClose, onSaved }) {
  const toast = useToast();
  // Secret inputs always start empty: a saved secret is never sent back to the browser.
  const [values, setValues] = useState(() => Object.fromEntries(item.fields.map((f) => [f.key, f.secret ? '' : cleanInitial(item.config[f.key])])));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  async function save() {
    setBusy(true); setErrors({});
    try {
      const result = await integrationService.save(item.provider, trimmed(values));
      toast.success('Saved');
      onSaved(result);
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Configure ${item.label}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Testing & saving…' : 'Save'}</button></>}>
      <div className="stack">
        <CredentialFields fields={item.fields} values={values} setValues={setValues} errors={errors} item={item} />
        {item.sources && Object.values(item.sources).includes('env') ? <p className="small muted">Some values come from server environment variables. Values saved here take precedence.</p> : null}
        <p className="small muted">The credentials are tested with the provider before they are saved.</p>
      </div>
    </Modal>
  );
}

function AddAccountModal({ type, onClose, onSaved }) {
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [values, setValues] = useState({});
  const [skipTest, setSkipTest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  async function save() {
    setBusy(true); setErrors({});
    try {
      const result = await integrationService.addAccount({ type: type.type, label: label.trim() || undefined, values: trimmed(values), force: skipTest || undefined });
      toast.success(type.webhook ? 'Account added. Copy its webhook URL into the provider.' : 'Account added');
      onSaved(result);
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Add ${type.label} account`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>{busy ? (skipTest ? 'Saving…' : 'Testing & saving…') : 'Add account'}</button></>}>
      <div className="stack">
        <TextInput label="Account name" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80}
          placeholder={`e.g. ${EXAMPLE_NAME[type.type] || 'Account 2'}`} hint="Shown in the dashboard so you can tell accounts apart." />
        <CredentialFields fields={type.fields} values={values} setValues={setValues} errors={errors} />
        {type.webhook ? <p className="small muted">After saving, the account card shows its own webhook URL. Paste it, with the webhook secret above, into the provider's webhook settings.</p> : null}
        <div className="row"><Switch checked={skipTest} onChange={setSkipTest} label="Save without testing the connection" /><span className="small">Save without testing the connection</span></div>
      </div>
    </Modal>
  );
}

function RenameModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [label, setLabel] = useState(item.label);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await integrationService.updateAccount(item.provider, { label }); toast.success('Renamed'); onSaved(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title="Rename account" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy} onClick={save}>Save</button></>}>
      <TextInput label="Account name" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} hint="Leave empty to go back to the default name." />
    </Modal>
  );
}

function Card({ item, canWrite, reload, isEffectiveDefault }) {
  const toast = useToast();
  const [modal, setModal] = useState('');
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
  const close = () => setModal('');
  const done = () => { setModal(''); reload(); };

  return (
    <div className="card int-card">
      <div className="card-head">
        <h3>{item.label}</h3>
        <div className="row" style={{ gap: 6 }}>
          {isProvider && DEFAULT_HINT[item.type] && isEffectiveDefault ? <span className="badge blue plain" title={DEFAULT_HINT[item.type]}>Default</span> : null}
          {isProvider ? <span className="badge plain" title={item.builtin ? 'Can also be configured with server environment variables' : 'Added from the dashboard'}>{item.builtin ? 'Built-in' : 'Added'}</span> : null}
          <StatusBadge status={item.status} label={statusLabel} />
        </div>
      </div>
      <div className="card-pad stack">
        {!isProvider ? <p className="muted">{item.description}</p> : null}
        {item.status === 'not_configured' ? <div className="alert">{item.label} is not configured.</div> : null}
        {item.keyId ? <div className="kv"><span>Key ID</span><code>{item.keyId}</code></div> : null}
        {isProvider ? item.fields.filter((f) => !f.secret && f.key !== 'keyId' && item.config?.[f.key]).map((f) => (
          <div className="kv" key={f.key}><span>{f.label}</span><span>{String(item.config[f.key])}</span></div>
        )) : null}
        {isProvider ? item.fields.filter((f) => f.secret).map((f) => (
          <div className="kv" key={f.key}><span>{f.label}</span><span>{item.secretsConfigured[f.key] ? item.secretPlaceholder : 'Not set'}</span></div>
        )) : null}
        {item.webhookUrl ? (
          <div className="kv"><span>Webhook URL</span>
            <span className="row" style={{ gap: 6, minWidth: 0 }}><code className="truncate grow" title={item.webhookUrl}>{item.webhookUrl}</code><CopyButton text={item.webhookUrl} /></span>
          </div>
        ) : null}
        <div className="kv"><span>Last success</span><span>{item.lastSuccessAt ? timeAgo(item.lastSuccessAt) : 'Never'}</span></div>
        {item.lastError ? <div className="alert err small">Last error {timeAgo(item.lastErrorAt)}: {item.lastError}</div> : null}
        {!isProvider ? Object.entries(item.config || {}).map(([k, v]) => <div className="kv" key={k}><span>{k}</span><span>{String(v)}</span></div>) : null}
        {canWrite && isProvider ? (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {item.status === 'disconnected' ? <button className="btn primary sm" disabled={!!busy} onClick={() => run('connect', () => integrationService.connect(item.provider), () => 'Reconnected')}>Connect</button> : null}
            <button className="btn sm" onClick={() => setModal('configure')}>{item.configured ? 'Configure' : 'Connect'}</button>
            <button className="btn sm" disabled={!!busy || !item.configured} onClick={test}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button>
            <button className="btn sm" onClick={() => setModal('rename')}>Rename</button>
            {DEFAULT_HINT[item.type] && !isEffectiveDefault && item.configured ? (
              <button className="btn sm" disabled={!!busy} title={DEFAULT_HINT[item.type]} onClick={() => run('default', () => integrationService.updateAccount(item.provider, { isDefault: true }), () => `${item.label} is now the default`)}>Make default</button>
            ) : null}
            {item.status !== 'disconnected' ? <button className="btn sm danger" disabled={!!busy || !item.configured} onClick={() => setModal('disconnect')}>Disconnect</button> : null}
            {!item.builtin ? <button className="btn sm danger" disabled={!!busy} onClick={() => setModal('delete')}>Remove</button> : null}
          </div>
        ) : null}
      </div>
      {modal === 'configure' && <ConfigureModal item={item} onClose={close} onSaved={done} />}
      {modal === 'rename' && <RenameModal item={item} onClose={close} onSaved={done} />}
      {modal === 'disconnect' && <ConfirmDialog danger title={`Disconnect ${item.label}?`} message="Sending and syncing through this account stop until you reconnect it." confirmLabel="Disconnect" onClose={close}
        onConfirm={async () => { close(); await run('disc', () => integrationService.disconnect(item.provider), () => 'Disconnected'); }} />}
      {modal === 'delete' && <ConfirmDialog danger title={`Remove ${item.label}?`} message="The account and its saved credentials are deleted and its webhook URL stops working. History already recorded is kept." confirmLabel="Remove" onClose={close}
        onConfirm={async () => { close(); await run('del', () => integrationService.deleteAccount(item.provider), () => 'Account removed'); }} />}
    </div>
  );
}

function TypeSection({ type, accounts, canWrite, reload }) {
  const [adding, setAdding] = useState(false);
  // Same rule as the server: marked default → built-in → first configured account.
  const ready = accounts.filter((a) => a.configured);
  const effective = (ready.find((a) => a.isDefault) || ready.find((a) => a.builtin) || ready[0])?.provider;
  return (
    <section className="stack" style={{ marginBottom: 24 }}>
      <div className="row between wrap">
        <div>
          <h2 style={{ fontSize: 16, margin: 0 }}>{type.label} <span className="muted small">· {accounts.length} account{accounts.length === 1 ? '' : 's'}, {ready.length} connected</span></h2>
          <p className="small muted" style={{ margin: '4px 0 0' }}>{TYPE_HELP[type.type] || type.description}</p>
        </div>
        {canWrite ? <button className="btn primary sm" onClick={() => setAdding(true)}>+ Add {type.label} account</button> : null}
      </div>
      <div className="int-grid">
        {accounts.map((i) => <Card key={i.provider} item={i} canWrite={canWrite} reload={reload} isEffectiveDefault={i.provider === effective} />)}
      </div>
      {adding && <AddAccountModal type={type} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
    </section>
  );
}

export default function IntegrationsPage() {
  const { can } = useAuth();
  const canWrite = can('integrations:write');
  const res = useApi(async () => {
    const [items, types] = await Promise.all([integrationService.list(), integrationService.types()]);
    return { items, types };
  }, []);
  const reload = () => res.reload({ silent: true });
  return (
    <>
      <PageHeader title="Integrations" subtitle="Connect as many accounts as you need. Credentials are encrypted at rest and never shown after saving." />
      <Async res={res}>{({ items, types }) => {
        const byType = Object.fromEntries(types.map((t) => [t.type, t]));
        const system = items.filter((i) => !i.type);
        return (
          <>
            {TYPE_ORDER.filter((t) => byType[t]).map((t) => (
              <TypeSection key={t} type={byType[t]} accounts={items.filter((i) => i.type === t)} canWrite={canWrite} reload={reload} />
            ))}
            <section className="stack">
              <h2 style={{ fontSize: 16, margin: 0 }}>System</h2>
              <div className="int-grid">{system.map((i) => <Card key={i.provider} item={i} canWrite={false} reload={reload} />)}</div>
            </section>
          </>
        );
      }}</Async>
    </>
  );
}
