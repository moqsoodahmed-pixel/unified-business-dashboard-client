import { healthService } from '../services/index.js';
import { useApi, useAction } from '../hooks/index.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Async } from '../components/States.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { PROVIDER_LABEL } from '../constants/index.js';
import { timeAgo } from '../utils/format.js';

const uptime = (s) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return `${d ? `${d}d ` : ''}${h}h ${m}m`; };
const LABEL = { healthy: 'Healthy', degraded: 'Degraded', down: 'Down', connected: 'Connected', error: 'Error', not_configured: 'Not configured', disconnected: 'Disconnected', untested: 'Configured, untested' };

export default function HealthPage() {
  const { can } = useAuth();
  const toast = useToast();
  const res = useApi(() => healthService.detailed(), []);
  const [probe, probing] = useAction(async () => {
    try { await healthService.probe(); toast.success('Provider checks finished'); } catch (e) { toast.error(e.message); }
    res.reload({ silent: true });
  });
  return (
    <>
      <PageHeader title="System health" subtitle="Database and provider status" actions={<>
        <button className="btn" onClick={() => res.reload({ silent: true })}>Refresh</button>
        {can('health:read') && <button className="btn primary" disabled={probing} onClick={probe}>{probing ? 'Checking…' : 'Check providers now'}</button>}
      </>} />
      <Async res={res}>{(h) => (
        <div className="stack">
          <div className="stats">
            <StatCard label="Overall" value={LABEL[h.status] || h.status} />
            <StatCard label="Database latency" value={h.database.latencyMs != null ? `${h.database.latencyMs} ms` : '—'} sub={h.database.name} />
            <StatCard label="Failed webhooks (24h)" value={h.webhooks.failedLast24h} />
            <StatCard label="Uptime" value={uptime(h.system.uptimeSeconds)} sub={`Node ${h.system.node}`} />
            <StatCard label="Memory" value={`${h.system.memoryMb} MB`} sub={`Heap ${h.system.heapUsedMb} MB`} />
          </div>
          <div className="card">
            <div className="card-head"><h3>Services</h3></div>
            <div className="card-pad stack">
              <div className="kv"><span>MongoDB</span><StatusBadge status={h.database.ok ? 'healthy' : 'down'} label={h.database.ok ? '✓ Healthy' : '✕ Down'} /></div>
              {h.providers.map((p) => (
                <div key={p.provider}>
                  <div className="kv"><span>{PROVIDER_LABEL[p.provider] || p.label}</span><StatusBadge status={p.status} label={p.status === 'connected' ? '✓ Connected' : LABEL[p.status]} /></div>
                  <div className="small muted">{p.lastSuccessAt ? `Last success ${timeAgo(p.lastSuccessAt)}` : 'No successful call yet'}{p.lastError ? ` · Last error: ${p.lastError}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>)}
      </Async>
    </>
  );
}
