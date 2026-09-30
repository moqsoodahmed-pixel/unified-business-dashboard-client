import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket, useSocketEvent } from '../context/SocketContext.jsx';
import { useApi } from '../hooks/index.js';
import { healthService } from '../services/index.js';
import { GlobalSearch } from '../components/GlobalSearch.jsx';
import { Icon } from '../components/Icons.jsx';
import { initials, timeAgo } from '../utils/format.js';

function SystemStatus() {
  const { can } = useAuth();
  const { connected } = useSocket();
  const health = useApi(() => (can('health:read') ? healthService.detailed() : Promise.resolve(null)), []);
  useEffect(() => { const t = setInterval(() => health.reload({ silent: true }), 60000); return () => clearInterval(t); }, []); // eslint-disable-line
  useSocketEvent('system:alert', () => health.reload({ silent: true }));
  const status = health.data?.status;
  const tone = !connected ? 'warn' : status === 'down' ? 'bad' : status === 'degraded' ? 'warn' : 'ok';
  const label = !connected ? 'Live updates offline' : status ? `System ${status}` : 'Live';
  return <span className="row small muted" title={label}><span className={`dot ${tone}`} />{label}</span>;
}

function Bell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef(null);
  useSocketEvent('notification:new', (n) => setItems((s) => [n, ...s].slice(0, 15)));
  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn ghost" aria-label={`Notifications${items.length ? `, ${items.length} new` : ''}`} onClick={() => setOpen((o) => !o)}>
        <Icon name="bell" />{items.length ? <span className="unread">{items.length}</span> : null}
      </button>
      {open ? (
        <div className="gsearch-results" style={{ width: 340, right: 0, left: 'auto', top: 40 }}>
          {!items.length ? <div className="empty small">You’re all caught up</div> : items.map((n, i) => (
            <div key={i} className="gsearch-item" onClick={() => { setOpen(false); nav('/activity'); }}>
              <span className={`dot ${n.category}`} /><div className="grow"><div>{n.description}</div><div className="small faint">{timeAgo(n.at)}</div></div>
            </div>
          ))}
          {items.length ? <div className="gsearch-item" onClick={() => setItems([])}><span className="muted">Clear all</span></div> : null}
        </div>
      ) : null}
    </div>
  );
}

export function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="topbar">
      <button className="btn ghost menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <GlobalSearch />
      <div className="grow" />
      <SystemStatus />
      <Bell />
      <div className="row" title={user.email}>
        <div className="avatar" aria-hidden="true">{initials(user.name)}</div>
        <div style={{ lineHeight: 1.2 }} className="hide-sm"><div style={{ fontWeight: 600 }}>{user.name}</div><div className="small muted">{user.role.replace('_', ' ').toLowerCase()}</div></div>
      </div>
      <button className="btn ghost" aria-label="Sign out" onClick={async () => { await logout(); nav('/login'); }}><Icon name="logout" /></button>
    </header>
  );
}
