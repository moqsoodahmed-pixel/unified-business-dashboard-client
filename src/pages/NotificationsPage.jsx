import { useState } from 'react';
import { settingsService } from '../services/index.js';
import { useApi } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Async } from '../components/States.jsx';
import { Switch } from '../components/Field.jsx';
import { CHANNEL_LABEL } from '../constants/index.js';

export default function NotificationsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const res = useApi(() => settingsService.notifications(), []);
  const [busy, setBusy] = useState('');
  const write = can('notifications:write');

  async function toggle(type, enabled) {
    setBusy(type);
    try {
      const toggles = await settingsService.updateNotifications({ [type]: enabled });
      res.setData({ ...res.data, toggles, catalog: res.data.catalog.map((c) => ({ ...c, enabled: toggles[c.type] })) });
    } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  }

  return (
    <>
      <PageHeader title="Notifications" subtitle="Choose which events are sent to Telegram. Routes decide where they go." />
      <Async res={res}>{(d) => {
        const groups = d.catalog.reduce((m, c) => { (m[c.category] ||= []).push(c); return m; }, {});
        return (
          <div className="stack">
            {Object.entries(groups).map(([cat, items]) => (
              <div className="card" key={cat}>
                <div className="card-head"><h3>{CHANNEL_LABEL[cat] || cat}</h3></div>
                {items.map((c) => (
                  <div className="row" key={c.type} style={{ justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
                    <div><b>{c.label}</b><div className="small muted">{c.type}</div></div>
                    <Switch label={c.label} checked={c.enabled} disabled={!write || busy === c.type} onChange={(v) => toggle(c.type, v)} />
                  </div>
                ))}
              </div>
            ))}
            {!write && <p className="muted small">You have read-only access to notification preferences.</p>}
          </div>
        );
      }}</Async>
    </>
  );
}
