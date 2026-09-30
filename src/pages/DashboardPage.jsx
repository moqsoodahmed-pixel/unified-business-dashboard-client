import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services/index.js';
import { useApi } from '../hooks/index.js';
import { useSocketEvent } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DateRangeFilter } from '../components/FilterBar.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { ChartCard, TimeSeries } from '../components/Chart.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { Async } from '../components/States.jsx';
import { Timeline } from '../components/Timeline.jsx';
import { displayName, formatMoney, formatNumber, timeAgo } from '../utils/format.js';
import { PROVIDER_LABEL } from '../constants/index.js';

const C = { wa: '#1f9d55', mail: '#2f6fdb', pay: '#c2571a', tg: '#229ed9', cust: '#0f6b5c', bad: '#c0392b' };

function TodayLine({ d }) {
  const bits = [];
  if (d.payments) bits.push(<span key="p"><b>{formatMoney(d.payments.today.revenue, d.payments.currency)}</b> collected</span>);
  if (d.whatsapp) bits.push(<span key="w"><b>{formatNumber(d.whatsapp.unreadConversations)}</b> conversation{d.whatsapp.unreadConversations === 1 ? '' : 's'} waiting for a reply</span>);
  if (d.customers) bits.push(<span key="c"><b>{formatNumber(d.customers.newToday)}</b> new customer{d.customers.newToday === 1 ? '' : 's'}</span>);
  if (!bits.length) return null;
  return <p className="today">{bits.reduce((acc, b, i) => (i ? [...acc, ', ', b] : [b]), [])} today.</p>;
}

export default function DashboardPage() {
  const { can } = useAuth();
  const [filter, setFilter] = useState({ range: 'last7', from: '', to: '' });
  const query = useMemo(() => ({ range: filter.range, ...(filter.range === 'custom' ? { from: filter.from, to: filter.to } : {}) }), [filter]);
  const res = useApi(() => dashboardService.get(query), [JSON.stringify(query)]);

  const refresh = () => res.reload({ silent: true });
  useSocketEvent('whatsapp:message:new', refresh);
  useSocketEvent('payment:update', refresh);
  useSocketEvent('payment:new', refresh);
  useSocketEvent('email:update', refresh);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live view across every channel" actions={<DateRangeFilter value={filter} onChange={setFilter} />} />
      <Async res={res}>{(d) => (
        <div className="stack gap-lg">
          <TodayLine d={d} />
          <div className="stats">
            {d.customers && <StatCard channel="cust" label="Total customers" value={formatNumber(d.customers.total)} sub={`${formatNumber(d.customers.newToday)} new today`} />}
            {d.whatsapp && <StatCard channel="wa" label="WhatsApp messages today" value={formatNumber(d.whatsapp.messagesToday)} sub={`${formatNumber(d.whatsapp.unreadMessages)} unread messages`} />}
            {d.email && <StatCard channel="mail" label="Emails sent today" value={formatNumber(d.email.sentToday)} sub={`${formatNumber(d.email.range.delivered)} delivered in range`} />}
            {d.payments && <StatCard channel="pay" label="Payments today" value={formatMoney(d.payments.today.revenue, d.payments.currency)} sub={`${formatNumber(d.payments.today.successful)} successful today`} />}
            {d.payments && <StatCard channel="pay" label="Successful payments" value={formatNumber(d.payments.range.successful)} sub="in selected range" />}
            {d.payments && <StatCard channel="pay" label="Failed payments" value={formatNumber(d.payments.range.failed)} sub="in selected range" />}
            {d.telegram && <StatCard channel="tg" label="Telegram notifications" value={formatNumber(d.telegram.sent)} sub={`${formatNumber(d.telegram.failed)} failed`} />}
          </div>

          <div className="grid2">
            {d.whatsapp && <ChartCard title="WhatsApp messages" subtitle="incoming and outgoing"><TimeSeries type="bar" data={d.whatsapp.series} series={[{ key: 'inbound', name: 'Received', color: C.wa, stack: 'a' }, { key: 'outbound', name: 'Sent', color: '#9bd8b3', stack: 'a' }]} /></ChartCard>}
            {d.payments && <ChartCard title="Revenue" subtitle="captured payments"><TimeSeries data={d.payments.series} series={[{ key: 'revenue', name: 'Revenue', color: C.pay }]} format={(v) => formatMoney(v, 'INR').replace(/\.00$/, '')} /></ChartCard>}
            {d.email && <ChartCard title="Email activity"><TimeSeries type="bar" data={d.email.series} series={[{ key: 'sent', name: 'Sent', color: C.mail }, { key: 'delivered', name: 'Delivered', color: '#8fb3ee' }, { key: 'failed', name: 'Failed', color: C.bad }]} /></ChartCard>}
            {d.customers && <ChartCard title="Customer growth"><TimeSeries data={d.customers.growth} series={[{ key: 'total', name: 'Customers', color: C.cust }]} /></ChartCard>}
          </div>
          {d.integrationActivity ? <ChartCard title="Integration activity" subtitle="webhooks received"><TimeSeries type="bar" data={d.integrationActivity} series={[{ key: 'msg91', name: 'MSG91', color: C.wa, stack: 'a' }, { key: 'brevo', name: 'Brevo', color: C.mail, stack: 'a' }, { key: 'razorpay', name: 'Razorpay', color: C.pay, stack: 'a' }]} /></ChartCard> : null}

          <div className="grid2">
            {d.whatsapp && (
              <div className="card"><div className="card-head"><h3>Recent conversations</h3><Link to="/inbox" className="small">Open inbox</Link></div>
                {d.whatsapp.recentConversations.length ? d.whatsapp.recentConversations.map((c) => (
                  <Link key={c._id} to="/inbox" state={{ conversationId: c._id }} className="conv" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <div className="grow"><div className="row between"><b>{displayName(c.customerId) || `+${c.phone}`}</b><span className="small faint">{timeAgo(c.lastMessageAt)}</span></div><div className="small muted truncate">{c.lastMessagePreview}</div></div>
                    {c.unreadCount ? <span className="unread">{c.unreadCount}</span> : null}
                  </Link>)) : <div className="empty small">No conversations yet</div>}
              </div>)}
            {d.payments && (
              <div className="card"><div className="card-head"><h3>Recent payments</h3><Link to="/payments" className="small">All payments</Link></div>
                {d.payments.recent.length ? d.payments.recent.map((p) => (
                  <div key={p._id} className="conv"><div className="grow"><div className="row between"><b className="num">{formatMoney(p.amount, p.currency)}</b><StatusBadge status={p.status} /></div><div className="small muted">{p.method || 'payment'} · {timeAgo(p.createdAt)}</div></div></div>)) : <div className="empty small">No payments yet</div>}
              </div>)}
          </div>

          <div className="grid2">
            {d.recentActivity && <div className="card"><div className="card-head"><h3>Recent activity</h3><Link to="/activity" className="small">Full log</Link></div><div className="card-pad"><Timeline items={d.recentActivity} /></div></div>}
            {d.health && (
              <div className="card"><div className="card-head"><h3>API health</h3>{can('health:read') && <Link to="/health" className="small">Details</Link>}</div>
                <div className="card-pad stack">{d.health.map((h) => (
                  <div key={h.provider} className="row between"><span>{h.label || PROVIDER_LABEL[h.provider]}</span><StatusBadge status={h.status} /></div>))}</div></div>)}
          </div>
        </div>
      )}</Async>
    </>
  );
}
