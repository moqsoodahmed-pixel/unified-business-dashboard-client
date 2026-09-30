import { useState } from 'react';
import { webhookService } from '../services/index.js';
import { useApi, usePagedList } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Async, EmptyState } from '../components/States.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { Drawer } from '../components/Modal.jsx';
import { providerLabel, PROVIDER_TYPE_OPTIONS } from '../constants/index.js';
import { formatDateTime } from '../utils/format.js';

function Detail({ id, onClose, onRetried }) {
  const { can } = useAuth();
  const toast = useToast();
  const res = useApi(() => webhookService.get(id), [id]);
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true);
    try { await webhookService.retry(id); toast.success('Retry completed'); onRetried(); res.reload({ silent: true }); }
    catch (e) { toast.error(e.message); res.reload({ silent: true }); } finally { setBusy(false); }
  }
  return (
    <Drawer title="Webhook event" onClose={onClose}>
      <Async res={res}>{(e) => (
        <div className="stack">
          <div className="kv"><span>Provider</span><b>{providerLabel(e.provider)}</b></div>
          <div className="kv"><span>Event</span><span>{e.eventType || '—'}</span></div>
          <div className="kv"><span>Event ID</span><code className="truncate">{e.eventId}</code></div>
          <div className="kv"><span>Status</span><StatusBadge status={e.status} /></div>
          <div className="kv"><span>Signature</span><span>{e.signatureValid === false ? 'Invalid' : 'Valid'}</span></div>
          <div className="kv"><span>Attempts</span><span>{e.attempts}</span></div>
          <div className="kv"><span>Received</span><span>{formatDateTime(e.receivedAt)}</span></div>
          <div className="kv"><span>Processing time</span><span>{e.processingMs != null ? `${e.processingMs} ms` : '—'}</span></div>
          {e.result ? <div className="kv"><span>Result</span><span>{e.result}</span></div> : null}
          {e.error ? <div className="alert error">{e.error}</div> : null}
          {can('webhooks:retry') && e.status === 'failed' ? <div><button className="btn primary" disabled={busy} onClick={retry}>{busy ? 'Retrying…' : 'Retry processing'}</button><p className="small muted">Safe to retry: processing is idempotent, so records are never duplicated.</p></div> : null}
          <h4>Payload (redacted)</h4>
          <pre className="pre">{JSON.stringify(e.payload ?? {}, null, 2)}</pre>
        </div>)}
      </Async>
    </Drawer>
  );
}

export default function WebhooksPage() {
  const [filters, setFilters] = useState({ provider: '', status: '', range: 'last7' });
  const [open, setOpen] = useState(null);
  const endpoints = useApi(() => webhookService.endpoints(), []);
  const list = usePagedList(webhookService.list, filters);
  return (
    <>
      <PageHeader title="Webhook center" subtitle="Inbound provider events, with retry for failures" />
      <Async res={endpoints}>{(d) => (
        <div className="card card-pad stack" style={{ marginBottom: 16 }}>
          <b>Endpoints to configure at each provider</b>
          {d.map((e) => <div className="kv" key={e.provider}><span>{e.label}</span><code>{e.url}</code></div>)}
        </div>)}
      </Async>
      <div className="card">
        <FilterBar filters={filters} onChange={setFilters} fields={[
          { key: 'provider', type: 'select', placeholder: 'Any provider', options: PROVIDER_TYPE_OPTIONS },
          { key: 'status', type: 'select', placeholder: 'Any status', options: ['completed', 'failed', 'ignored', 'rejected', 'processing'] },
          { key: 'range', type: 'range' },
        ]} />
        <Async res={list} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No webhook events in this range" hint="Events appear after a provider calls one of the endpoints above." />}>{(d) => (
          <>
            <DataTable rows={d.items} onRowClick={(e) => setOpen(e._id)} columns={[
              { key: 'provider', header: 'Provider', render: (e) => <b>{providerLabel(e.provider)}</b> },
              { key: 'endpoint', header: 'Endpoint', render: (e) => <code>{e.endpoint || '—'}</code> },
              { key: 'eventType', header: 'Event', render: (e) => e.eventType || '—' },
              { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
              { key: 'receivedAt', header: 'Received', render: (e) => <span className="muted">{formatDateTime(e.receivedAt)}</span> },
              { key: 'processingMs', header: 'Processing', render: (e) => (e.processingMs != null ? `${e.processingMs} ms` : '—') },
              { key: 'result', header: 'Result', render: (e) => <span className="truncate">{e.error || e.result || '—'}</span> },
            ]} />
            <Pagination page={list.page} pages={d.pages} total={d.total} onPage={list.setPage} />
          </>)}
        </Async>
      </div>
      {open && <Detail id={open} onClose={() => setOpen(null)} onRetried={() => list.reload({ silent: true })} />}
    </>
  );
}
