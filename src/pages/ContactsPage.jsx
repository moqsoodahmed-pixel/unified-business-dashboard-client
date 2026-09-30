import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services/index.js';
import { usePagedList } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Async, EmptyState } from '../components/States.jsx';
import { StatusBadge, Badge } from '../components/Badge.jsx';
import { Modal } from '../components/Modal.jsx';
import { TextInput } from '../components/Field.jsx';
import { displayName, displayPhone, timeAgo } from '../utils/format.js';

function NewCustomer({ onClose, onCreated }) {
  const toast = useToast();
  const [f, setF] = useState({ firstName: '', lastName: '', phone: '', email: '', company: '' });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    setBusy(true); setErrors({});
    try {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
      const c = await customerService.create(body);
      toast.success('Customer created'); onCreated(c);
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title="New customer" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy || !(f.firstName || f.phone || f.email)} onClick={save}>{busy ? 'Saving…' : 'Create customer'}</button></>}>
      <div className="stack">
        <div className="grid2"><TextInput label="First name" value={f.firstName} onChange={set('firstName')} error={errors.firstName} /><TextInput label="Last name" value={f.lastName} onChange={set('lastName')} /></div>
        <div className="grid2"><TextInput label="Phone" value={f.phone} onChange={set('phone')} hint="With country code, e.g. +91 98xxxxxxxx" error={errors.phone} /><TextInput label="Email" type="email" value={f.email} onChange={set('email')} error={errors.email} /></div>
        <TextInput label="Company" value={f.company} onChange={set('company')} />
      </div>
    </Modal>
  );
}

export default function ContactsPage() {
  const nav = useNavigate();
  const { can } = useAuth();
  const [filters, setFilters] = useState({ q: '', status: '', source: '' });
  const [creating, setCreating] = useState(false);
  const list = usePagedList(customerService.list, filters);

  return (
    <>
      <PageHeader title="Contacts" subtitle="One record per customer across WhatsApp, email and payments" actions={can('customers:write') ? <button className="btn primary" onClick={() => setCreating(true)}>New customer</button> : null} />
      <div className="card">
        <FilterBar filters={filters} onChange={setFilters} fields={[
          { key: 'q', type: 'search', placeholder: 'Search name, phone, email, company' },
          { key: 'status', type: 'select', placeholder: 'Any status', options: ['lead', 'active', 'inactive', 'blocked'] },
          { key: 'source', type: 'select', placeholder: 'Any source', options: ['WhatsApp', 'Email', 'Payment', 'Manual', 'API'] },
        ]} />
        <Async res={list} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No customers found" hint="Customers are created automatically from WhatsApp messages, emails and payments, or add one manually." />}>{(d) => (
          <>
            <DataTable rows={d.items} onRowClick={(c) => nav(`/contacts/${c._id}`)} columns={[
              { key: 'name', header: 'Name', render: (c) => <b>{displayName(c)}</b> },
              { key: 'phone', header: 'Phone', render: (c) => displayPhone(c.phone) || '—' },
              { key: 'email', header: 'Email', render: (c) => c.email || '—' },
              { key: 'source', header: 'Source', render: (c) => <Badge plain>{c.source}</Badge> },
              { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
              { key: 'tags', header: 'Tags', render: (c) => (c.tags || []).slice(0, 3).map((t) => <span className="chip" key={t}>{t}</span>) },
              { key: 'lastInteractionAt', header: 'Last interaction', render: (c) => <span className="muted">{timeAgo(c.lastInteractionAt)}</span> },
            ]} />
            <Pagination page={list.page} pages={d.pages} total={d.total} onPage={list.setPage} />
          </>)}
        </Async>
      </div>
      {creating && <NewCustomer onClose={() => setCreating(false)} onCreated={(c) => { setCreating(false); nav(`/contacts/${c._id}`); }} />}
    </>
  );
}
