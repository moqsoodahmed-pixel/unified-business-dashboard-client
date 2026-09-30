import { useState } from 'react';
import { paymentService } from '../services/index.js';
import { useApi, usePagedList } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSocketEvent } from '../context/SocketContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Async, EmptyState } from '../components/States.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { Modal, Drawer } from '../components/Modal.jsx';
import { TextInput } from '../components/Field.jsx';
import { formatMoney, formatNumber, formatDateTime, displayName, titleCase } from '../utils/format.js';
import { AccountSelect } from '../components/AccountSelect.jsx';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC; s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Razorpay Checkout. Check your network or content-security settings.'));
    document.body.appendChild(s);
  });
}

const custName = (c) => (c && typeof c === 'object' ? displayName(c) : '—');

function PaymentDetail({ id, onClose, onRefund }) {
  const { can } = useAuth();
  const res = useApi(() => paymentService.get(id), [id]);
  return (
    <Drawer title="Payment details" onClose={onClose}>
      <Async res={res}>{(d) => {
        const p = d.payment || d;
        const refundable = ['captured', 'partially_refunded'].includes(p.status) && p.amount - (p.amountRefunded || 0) > 0;
        return (
          <div className="stack">
            <div className="kv"><span>Status</span><StatusBadge status={p.status} /></div>
            <div className="kv"><span>Payment ID</span><code>{p.paymentId}</code></div>
            <div className="kv"><span>Order ID</span><code>{p.orderId || '—'}</code></div>
            <div className="kv"><span>Customer</span><span>{custName(d.customer)}</span></div>
            <div className="kv"><span>Amount</span><b>{formatMoney(p.amount, p.currency)}</b></div>
            <div className="kv"><span>Refunded</span><span>{formatMoney(p.amountRefunded || 0, p.currency)}</span></div>
            <div className="kv"><span>Method</span><span>{p.method ? titleCase(p.method) : '—'}</span></div>
            <div className="kv"><span>Created</span><span>{formatDateTime(p.createdAt)}</span></div>
            <div className="kv"><span>Updated</span><span>{formatDateTime(p.updatedAt)}</span></div>
            {p.errorDescription ? <div className="alert error">{p.errorDescription}</div> : null}
            {can('payments:refund') && refundable ? <div><button className="btn" onClick={() => onRefund(p)}>Refund…</button></div> : null}
            {(d.refunds || []).length ? <><h4>Refunds</h4>{d.refunds.map((r) => <div key={r._id} className="kv"><span><code>{r.refundId}</code></span><span>{formatMoney(r.amount, r.currency)} <StatusBadge status={r.status} /></span></div>)}</> : null}
            {(d.events || []).length ? <><h4>Provider events</h4>{d.events.map((ev) => <div key={ev._id} className="small">{ev.eventType} · {formatDateTime(ev.createdAt)}</div>)}</> : null}
          </div>
        );
      }}</Async>
    </Drawer>
  );
}

function RefundModal({ payment, onClose, onDone }) {
  const toast = useToast();
  const remaining = payment.amount - (payment.amountRefunded || 0);
  const [amount, setAmount] = useState((remaining / 100).toFixed(2));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      const body = { amount: Number(amount) };
      if (reason.trim()) body.reason = reason.trim();
      await paymentService.refund(payment._id, body);
      toast.success('Refund requested'); onDone();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  const valid = Number(amount) >= 1 && Math.round(Number(amount) * 100) <= remaining;
  return (
    <Modal title="Refund payment" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn danger" disabled={busy || !valid} onClick={submit}>{busy ? 'Refunding…' : 'Refund'}</button></>}>
      <div className="stack">
        <p className="muted">Payment <code>{payment.paymentId}</code> · refundable {formatMoney(remaining, payment.currency)}</p>
        <TextInput label="Amount" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} hint="Lower the amount for a partial refund" />
        <TextInput label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  );
}

function NewOrder({ onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ amount: '', description: '', name: '', phone: '', email: '', account: '' });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function checkout() {
    setBusy(true); setErrors({});
    try {
      const body = { amount: Number(f.amount) };
      if (f.account) body.account = f.account;
      if (f.description.trim()) body.description = f.description.trim();
      const customer = Object.fromEntries([['name', f.name], ['phone', f.phone], ['email', f.email]].filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
      if (Object.keys(customer).length) body.customer = customer;
      const { checkout: c } = await paymentService.createOrder(body);
      await loadCheckout();
      await new Promise((resolve) => {
        const rzp = new window.Razorpay({
          key: c.keyId, order_id: c.orderId, amount: c.amount, currency: c.currency, name: c.name, description: c.description, prefill: c.prefill,
          handler: async (r) => {
            // The browser result is never trusted: the server verifies the signature and fetches the payment from Razorpay.
            try {
              await paymentService.verify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
              toast.success('Payment verified');
            } catch (e) { toast.error(e.message); }
            resolve();
          },
          modal: { ondismiss: () => resolve() },
        });
        rzp.on('payment.failed', (resp) => toast.error(resp?.error?.description || 'Payment failed'));
        rzp.open();
      });
      onDone();
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title="Create payment order" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy || !(Number(f.amount) >= 1)} onClick={checkout}>{busy ? 'Working…' : 'Create order & open checkout'}</button></>}>
      <div className="stack">
        <AccountSelect type="razorpay" label="Razorpay account" value={f.account} onChange={(v) => setF({ ...f, account: v })} hint="Checkout, verification, refunds and webhooks for this order use the chosen account." />
        <TextInput label="Amount (INR)" type="number" min="1" step="0.01" value={f.amount} onChange={set('amount')} error={errors.amount} />
        <TextInput label="Description" value={f.description} onChange={set('description')} />
        <div className="grid2"><TextInput label="Customer name" value={f.name} onChange={set('name')} /><TextInput label="Phone" value={f.phone} onChange={set('phone')} /></div>
        <TextInput label="Email" type="email" value={f.email} onChange={set('email')} />
        <p className="small muted">Checkout opens Razorpay's hosted payment form. Success is confirmed by server-side signature verification and the Razorpay webhook.</p>
      </div>
    </Modal>
  );
}

function Payments({ reloadKey, onRefund, filters, setFilters }) {
  const [openId, setOpenId] = useState(null);
  const stats = useApi(() => paymentService.stats(filters), [JSON.stringify(filters), reloadKey]);
  const list = usePagedList(paymentService.list, filters);
  const refresh = () => { list.reload({ silent: true }); stats.reload({ silent: true }); };
  useSocketEvent('payment:new', refresh);
  useSocketEvent('payment:update', refresh);
  const s = stats.data;
  return (
    <>
      <div className="stats">
        <StatCard channel="payment" label="Revenue (net)" value={formatMoney(s?.revenue, s?.currency)} />
        <StatCard channel="payment" label="Successful" value={formatNumber(s?.successful)} />
        <StatCard channel="payment" label="Failed" value={formatNumber(s?.failed)} />
        <StatCard channel="payment" label="Refunded" value={formatMoney(s?.refunded, s?.currency)} />
        <StatCard channel="payment" label="Average value" value={formatMoney(s?.averageValue, s?.currency)} />
      </div>
      <div className="card">
        <FilterBar filters={filters} onChange={setFilters} fields={[
          { key: 'q', type: 'search', placeholder: 'Search payment or order ID' },
          { key: 'status', type: 'select', placeholder: 'Any status', options: ['created', 'authorized', 'captured', 'failed', 'partially_refunded', 'refunded'] },
          { key: 'range', type: 'range' },
        ]} />
        <Async res={list} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No payments in this range" hint="Payments appear here once Razorpay reports them via checkout verification or webhook." />}>{(d) => (
          <>
            <DataTable rows={d.items} onRowClick={(p) => setOpenId(p._id)} columns={[
              { key: 'paymentId', header: 'Transaction ID', render: (p) => <code>{p.paymentId}</code> },
              { key: 'orderId', header: 'Order ID', render: (p) => <code>{p.orderId || '—'}</code> },
              { key: 'customer', header: 'Customer', render: (p) => custName(p.customerId) },
              { key: 'amount', header: 'Amount', render: (p) => <b>{formatMoney(p.amount, p.currency)}</b> },
              { key: 'currency', header: 'Currency' },
              { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
              { key: 'method', header: 'Method', render: (p) => (p.method ? titleCase(p.method) : '—') },
              { key: 'createdAt', header: 'Created', render: (p) => <span className="muted">{formatDateTime(p.createdAt)}</span> },
              { key: 'updatedAt', header: 'Updated', render: (p) => <span className="muted">{formatDateTime(p.updatedAt)}</span> },
            ]} />
            <Pagination page={list.page} pages={d.pages} total={d.total} onPage={list.setPage} />
          </>)}
        </Async>
      </div>
      {openId && <PaymentDetail id={openId} onClose={() => setOpenId(null)} onRefund={(p) => { setOpenId(null); onRefund(p); }} />}
    </>
  );
}

function Orders() {
  const [filters, setFilters] = useState({ range: 'last30' });
  const list = usePagedList(paymentService.orders, filters);
  return (
    <div className="card">
      <FilterBar filters={filters} onChange={setFilters} fields={[{ key: 'status', type: 'select', placeholder: 'Any status', options: ['created', 'attempted', 'paid'] }, { key: 'range', type: 'range' }]} />
      <Async res={list} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No orders" />}>{(d) => (
        <>
          <DataTable rows={d.items} columns={[
            { key: 'orderId', header: 'Order ID', render: (o) => <code>{o.orderId}</code> },
            { key: 'receipt', header: 'Receipt' },
            { key: 'customer', header: 'Customer', render: (o) => custName(o.customerId) },
            { key: 'amount', header: 'Amount', render: (o) => formatMoney(o.amount, o.currency) },
            { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
            { key: 'createdAt', header: 'Created', render: (o) => <span className="muted">{formatDateTime(o.createdAt)}</span> },
          ]} />
          <Pagination page={list.page} pages={d.pages} total={d.total} onPage={list.setPage} />
        </>)}
      </Async>
    </div>
  );
}

function Refunds() {
  const [filters, setFilters] = useState({ range: 'last30' });
  const list = usePagedList(paymentService.refunds, filters);
  return (
    <div className="card">
      <FilterBar filters={filters} onChange={setFilters} fields={[{ key: 'range', type: 'range' }]} />
      <Async res={list} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No refunds" />}>{(d) => (
        <>
          <DataTable rows={d.items} columns={[
            { key: 'refundId', header: 'Refund ID', render: (r) => <code>{r.refundId}</code> },
            { key: 'paymentId', header: 'Payment ID', render: (r) => <code>{r.paymentId}</code> },
            { key: 'customer', header: 'Customer', render: (r) => custName(r.customerId) },
            { key: 'amount', header: 'Amount', render: (r) => formatMoney(r.amount, r.currency) },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'reason', header: 'Reason', render: (r) => r.reason || '—' },
            { key: 'createdAt', header: 'Created', render: (r) => <span className="muted">{formatDateTime(r.createdAt)}</span> },
          ]} />
          <Pagination page={list.page} pages={d.pages} total={d.total} onPage={list.setPage} />
        </>)}
      </Async>
    </div>
  );
}

export default function PaymentsPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState('payments');
  const [filters, setFilters] = useState({ q: '', status: '', range: 'last30' });
  const [creating, setCreating] = useState(false);
  const [refunding, setRefunding] = useState(null);
  const [key, setKey] = useState(0);
  const bump = () => setKey((k) => k + 1);
  return (
    <>
      <PageHeader title="Payments" subtitle="Razorpay transactions, orders and refunds" actions={can('payments:write') ? <button className="btn primary" onClick={() => setCreating(true)}>New order</button> : null} />
      <Tabs tabs={[{ value: 'payments', label: 'Payments' }, { value: 'orders', label: 'Orders' }, { value: 'refunds', label: 'Refunds' }]} value={tab} onChange={setTab} />
      {tab === 'payments' && <Payments key={key} reloadKey={key} filters={filters} setFilters={setFilters} onRefund={setRefunding} />}
      {tab === 'orders' && <Orders key={key} />}
      {tab === 'refunds' && <Refunds key={key} />}
      {creating && <NewOrder onClose={() => setCreating(false)} onDone={() => { setCreating(false); bump(); }} />}
      {refunding && <RefundModal payment={refunding} onClose={() => setRefunding(null)} onDone={() => { setRefunding(null); bump(); }} />}
    </>
  );
}
