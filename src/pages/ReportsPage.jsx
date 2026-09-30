import { useEffect, useState } from 'react';
import { reportService } from '../services/index.js';
import { useApi } from '../hooks/index.js';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Async, EmptyState, LoadingState, ErrorState } from '../components/States.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { downloadBlob, titleCase } from '../utils/format.js';

const STATUS_OPTIONS = {
  customers: ['lead', 'active', 'inactive', 'blocked'],
  whatsapp: ['queued', 'sent', 'delivered', 'read', 'failed', 'received'],
  email: ['queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'],
  payments: ['created', 'authorized', 'captured', 'failed', 'partially_refunded', 'refunded'],
  revenue: [],
  integrations: ['completed', 'failed', 'ignored', 'rejected'],
};
const PROVIDER_OPTIONS = ['msg91', 'brevo', 'razorpay']; // a type matches all of its accounts

const scalarSummary = (summary = {}) => Object.entries(summary).filter(([, v]) => ['number', 'string'].includes(typeof v));

function ReportView({ reportKey }) {
  const toast = useToast();
  const [filters, setFilters] = useState({ range: 'last30', status: '', provider: '' });
  useEffect(() => { setFilters({ range: 'last30', status: '', provider: '' }); }, [reportKey]);
  const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const res = useApi(() => reportService.run(reportKey, clean), [reportKey, JSON.stringify(clean)]);
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    setBusy(true);
    try {
      const csv = await reportService.csv(reportKey, clean);
      downloadBlob(`${reportKey}-report.csv`, csv);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  const fields = [{ key: 'range', type: 'range' }];
  if (STATUS_OPTIONS[reportKey]?.length) fields.push({ key: 'status', type: 'select', placeholder: 'Any status', options: STATUS_OPTIONS[reportKey] });
  if (reportKey === 'integrations') fields.push({ key: 'provider', type: 'select', placeholder: 'Any provider', options: PROVIDER_OPTIONS });

  return (
    <div className="stack">
      <div className="card">
        <FilterBar filters={filters} onChange={setFilters} fields={fields}>
          <button className="btn" onClick={exportCsv} disabled={busy || !res.data?.rows?.length}>{busy ? 'Exporting…' : 'Export CSV'}</button>
        </FilterBar>
        {res.loading && !res.data ? <LoadingState /> : res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : null}
      </div>
      <Async res={res} isEmpty={(d) => !d.rows.length} empty={<div className="card"><EmptyState title="No data for these filters" /></div>}>{(d) => (
        <>
          <div className="stats">{scalarSummary(d.summary).map(([k, v]) => <StatCard key={k} label={titleCase(k)} value={typeof v === 'number' ? v.toLocaleString('en-IN') : v} />)}</div>
          {d.truncated ? <div className="alert">Showing the first rows only. Narrow the date range for a complete export.</div> : null}
          <div className="card">
            <DataTable rows={d.rows.slice(0, 200)} rowKey={(r) => JSON.stringify(r)} columns={d.columns.map((c) => ({ key: c.key, header: c.label }))} />
            {d.rows.length > 200 ? <p className="small muted" style={{ padding: 12 }}>Preview shows 200 of {d.rows.length} rows. Export CSV for all rows.</p> : null}
          </div>
        </>)}
      </Async>
    </div>
  );
}

export default function ReportsPage() {
  const list = useApi(() => reportService.list(), []);
  const [key, setKey] = useState(null);
  return (
    <>
      <PageHeader title="Reports" subtitle="Filter, review and export as CSV" />
      <Async res={list} isEmpty={(d) => !d.length} empty={<EmptyState title="No reports available for your role" />}>{(d) => {
        const active = key && d.some((r) => r.key === key) ? key : d[0].key;
        return (
          <>
            <Tabs tabs={d.map((r) => ({ value: r.key, label: r.title.replace(/ report$/i, '') }))} value={active} onChange={setKey} />
            <ReportView reportKey={active} />
          </>
        );
      }}</Async>
    </>
  );
}
