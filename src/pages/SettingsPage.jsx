import { useEffect, useState } from 'react';
import { settingsService, authService } from '../services/index.js';
import { useApi } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { Async } from '../components/States.jsx';
import { TextInput, Switch } from '../components/Field.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Badge } from '../components/Badge.jsx';
import { formatDateTime } from '../utils/format.js';

/** section -> editable field descriptors */
const SECTIONS = {
  general: { label: 'General', fields: [
    { key: 'companyName', label: 'Company name' }, { key: 'timezone', label: 'Timezone', hint: 'IANA name, e.g. Asia/Kolkata' }, { key: 'dashboardUrl', label: 'Dashboard URL', hint: 'Used for links in Telegram messages' },
  ] },
  whatsapp: { label: 'WhatsApp', fields: [{ key: 'autoAssignToFirstReplier', label: 'Assign conversation to the first user who replies', type: 'bool' }] },
  email: { label: 'Email', fields: [
    { key: 'defaultSenderName', label: 'Default sender name' }, { key: 'defaultSenderEmail', label: 'Default sender email', type: 'email' }, { key: 'replyToEmail', label: 'Reply-to email', type: 'email' },
  ] },
  payments: { label: 'Payments', fields: [
    { key: 'defaultCurrency', label: 'Default currency', hint: '3-letter code, e.g. INR' }, { key: 'largePaymentThreshold', label: 'Large payment threshold (₹)', type: 'number', hint: 'Payments at or above this trigger a “large payment” alert' },
  ] },
  telegram: { label: 'Telegram', fields: [{ key: 'includeDashboardLinks', label: 'Include dashboard links in messages', type: 'bool' }] },
};

function SectionForm({ section, initial, canEdit, onSaved }) {
  const toast = useToast();
  const def = SECTIONS[section];
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  useEffect(() => setV(initial), [section]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save() {
    setBusy(true); setErrors({});
    try {
      const body = Object.fromEntries(def.fields.map((f) => [f.key, f.type === 'number' ? Number(v[f.key]) : v[f.key]]));
      onSaved(section, await settingsService.update(section, body)); toast.success('Settings saved');
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="card card-pad stack" style={{ maxWidth: 640 }}>
      {def.fields.map((f) => f.type === 'bool' ? (
        <div className="row" key={f.key} style={{ justifyContent: 'space-between' }}><span>{f.label}</span><Switch label={f.label} checked={v[f.key]} disabled={!canEdit} onChange={(x) => setV({ ...v, [f.key]: x })} /></div>
      ) : (
        <TextInput key={f.key} label={f.label} type={f.type || 'text'} value={v[f.key] ?? ''} disabled={!canEdit} hint={f.hint} error={errors[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
      ))}
      {canEdit ? <div><button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button></div> : <p className="muted small">Only a super admin can change these settings.</p>}
    </div>
  );
}

function Security({ policy }) {
  const toast = useToast();
  const sessions = useApi(() => authService.sessions(), []);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  async function change() {
    setBusy(true);
    try { await authService.changePassword(pw.currentPassword, pw.newPassword); toast.success('Password changed. Other sessions were signed out.'); setPw({ currentPassword: '', newPassword: '' }); sessions.reload({ silent: true }); }
    catch (e) { toast.error(e.details?.newPassword || e.message); } finally { setBusy(false); }
  }
  return (
    <div className="stack">
      <div className="card card-pad stack" style={{ maxWidth: 640 }}>
        <b>Security policy</b>
        <p className="small muted">Set through server environment variables and shown here read-only.</p>
        <div className="kv"><span>Failed logins before lock</span><span>{policy.maxLoginAttempts}</span></div>
        <div className="kv"><span>Lock duration (minutes)</span><span>{policy.lockMinutes}</span></div>
        <div className="kv"><span>Access token lifetime</span><span>{policy.accessTokenTtl}</span></div>
        <div className="kv"><span>Refresh token lifetime (days)</span><span>{policy.refreshTokenDays}</span></div>
      </div>
      <div className="card card-pad stack" style={{ maxWidth: 640 }}>
        <b>Change your password</b>
        <TextInput label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
        <TextInput label="New password" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} hint="At least 10 characters with upper-case, lower-case and a number" />
        <div><button className="btn primary" disabled={busy || !pw.currentPassword || !pw.newPassword} onClick={change}>Change password</button></div>
      </div>
      <div className="card">
        <div className="card-head"><h3>Your sessions</h3>
          <button className="btn sm" onClick={async () => { try { await authService.revokeOthers(); toast.success('Other sessions signed out'); sessions.reload({ silent: true }); } catch (e) { toast.error(e.message); } }}>Sign out other sessions</button></div>
        <Async res={sessions}>{(d) => (
          <DataTable rows={d} rowKey={(s) => s.id} columns={[
            { key: 'ip', header: 'IP', render: (s) => s.ip || '—' },
            { key: 'userAgent', header: 'Device', render: (s) => <span className="truncate">{s.userAgent || '—'}</span> },
            { key: 'createdAt', header: 'Signed in', render: (s) => formatDateTime(s.createdAt) },
            { key: 'current', header: '', render: (s) => (s.current ? <Badge tone="green">This session</Badge> : <button className="btn sm danger" onClick={async () => { try { await authService.revokeSession(s.id); sessions.reload({ silent: true }); } catch (e) { toast.error(e.message); } }}>Revoke</button>) },
          ]} />)}
        </Async>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { can } = useAuth();
  const res = useApi(() => settingsService.all(), []);
  const [tab, setTab] = useState('general');
  const tabs = [...Object.entries(SECTIONS).map(([value, s]) => ({ value, label: s.label })), { value: 'security', label: 'Security' }];
  return (
    <>
      <PageHeader title="Settings" subtitle="Provider credentials live on the Integrations page; users on the Users page" />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <Async res={res}>{(all) => (tab === 'security'
        ? <Security policy={all.security} />
        : <SectionForm key={tab} section={tab} initial={all[tab]} canEdit={can('settings:write')} onSaved={(s, next) => res.setData({ ...all, [s]: next })} />)}
      </Async>
    </>
  );
}
