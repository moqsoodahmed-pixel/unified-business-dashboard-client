import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { LoadingState } from '../components/States.jsx';
import { SocketProvider } from '../context/SocketContext.jsx';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <SocketProvider>
      <div className="shell">
        <Sidebar open={open} onNavigate={() => setOpen(false)} />
        <div className="main">
          <Topbar onMenu={() => setOpen((o) => !o)} />
          <main className="content" id="main" key={loc.pathname.split('/')[1]}>
            <Suspense fallback={<LoadingState />}><Outlet /></Suspense>
          </main>
        </div>
      </div>
    </SocketProvider>
  );
}
