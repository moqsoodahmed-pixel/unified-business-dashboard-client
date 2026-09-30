import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../context/SocketContext.jsx';
import { useApi } from '../hooks/index.js';
import { whatsappService } from '../services/index.js';
import { visibleRoutes } from '../routes/config.jsx';
import { Icon } from '../components/Icons.jsx';

export function Sidebar({ open, onNavigate }) {
  const { can } = useAuth();
  const items = visibleRoutes(can).filter((r) => !r.hidden);
  const unread = useApi(() => (can('whatsapp:read') ? whatsappService.conversations({ limit: 1 }) : Promise.resolve(null)), []);
  useSocketEvent('whatsapp:message:new', () => unread.reload({ silent: true }));
  const count = unread.data?.unreadTotal || 0;

  let lastGroup = null;
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#22384f" /><path d="M8 20l5-8 4 5 3-4 4 7" fill="none" stroke="#f2b134" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Operations Desk
      </div>
      <nav className="nav">
        {items.map((r) => {
          const header = r.group && r.group !== lastGroup ? <div className="nav-group" key={`g-${r.group}`}>{r.group}</div> : null;
          lastGroup = r.group || lastGroup;
          return (
            <span key={r.path} style={{ display: 'contents' }}>
              {header}
              <NavLink to={r.path} end={r.end} onClick={onNavigate}>
                <Icon name={r.icon} />
                <span>{r.label}</span>
                {r.badge === 'unread' && count > 0 ? <span className="count" aria-label={`${count} unread`}>{count > 99 ? '99+' : count}</span> : null}
              </NavLink>
            </span>
          );
        })}
      </nav>
    </aside>
  );
}
