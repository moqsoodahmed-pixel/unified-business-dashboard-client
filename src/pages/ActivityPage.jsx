import { useState } from 'react';
import { activityService } from '../services/index.js';
import { usePagedList } from '../hooks/index.js';
import { useSocketEvent } from '../context/SocketContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Async, EmptyState } from '../components/States.jsx';
import { Badge } from '../components/Badge.jsx';
import { Drawer } from '../components/Modal.jsx';
import { CHANNEL_LABEL } from '../constants/index.js';
import { formatDateTime, displayName } from '../utils/format.js';

const SEVERITY_TONE = { info: 'blue', success: 'green', warning: 'amber', error: 'red' };

export default function ActivityPage() {
  const [filters, setFilters] = useState({ q: '', source: '', severity: '', range: 'last7' });
  const [open, setOpen] = useState(null);
  const list = usePagedList(activityService.list, filters);
  useSocketEvent('activity:new', () => { if (list.page === 1) list.reload({ silent: true }); });
  return (
    <>
      <PageHeader title="Activity logs" subtitle="Every event across channels, with secrets redacted" />
      <div className="card">
        <FilterBar filters={filters} onChange={setFilters} fields={[
          { key: 'q', type: 'search', placeholder: 'Search descriptions' },
          { key: 'source', type: 'select', placeholder: 'Any source', options: Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label })) },
          { key: 'severity', type: 'select', placeholder: 'Any severity', options: ['info', 'success', 'warning', 'error'] },
          { key: 'range', type: 'range' },
        ]} />
        <Async res={list} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No activity in this range" />}>{(d) => (
          <>
            <DataTable rows={d.items} onRowClick={setOpen} columns={[
              { key: 'createdAt', header: 'Time', render: (a) => <span className="muted">{formatDateTime(a.createdAt)}</span> },
              { key: 'eventType', header: 'Event', render: (a) => <Badge tone={SEVERITY_TONE[a.severity] || ''}>{a.eventType}</Badge> },
              { key: 'description', header: 'Description' },
              { key: 'source', header: 'Source', render: (a) => CHANNEL_LABEL[a.source] || a.source },
              { key: 'actor', header: 'Actor', render: (a) => a.actor?.name || a.actorType },
              { key: 'customer', header: 'Customer', render: (a) => (a.customerId && typeof a.customerId === 'object' ? displayName(a.customerId) : '—') },
            ]} />
            <Pagination page={list.page} pages={d.pages} total={d.total} onPage={list.setPage} />
          </>)}
        </Async>
      </div>
      {open && (
        <Drawer title="Event details" onClose={() => setOpen(null)}>
          <div className="stack">
            <div className="kv"><span>Event</span><b>{open.eventType}</b></div>
            <div className="kv"><span>Time</span><span>{formatDateTime(open.createdAt)}</span></div>
            <div className="kv"><span>Actor</span><span>{open.actor?.name || open.actorType}{open.actor?.role ? ` (${open.actor.role})` : ''}</span></div>
            {open.ipAddress ? <div className="kv"><span>IP address</span><code>{open.ipAddress}</code></div> : null}
            <p>{open.description}</p>
            <h4>Metadata</h4>
            <pre className="pre">{JSON.stringify(open.metadata || {}, null, 2)}</pre>
          </div>
        </Drawer>
      )}
    </>
  );
}
