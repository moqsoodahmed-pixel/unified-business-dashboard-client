import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../context/SocketContext.jsx', () => ({ useSocketEvent: () => {}, useSocket: () => null }));
vi.mock('../services/index.js', () => ({ whatsappService: { conversations: () => Promise.resolve({ unreadTotal: 3 }) } }));

import { useAuth } from '../context/AuthContext.jsx';
import { Sidebar } from '../layouts/Sidebar.jsx';
import { ROLE_PERMS } from './rolePerms.js';

const renderFor = (role) => {
  const perms = ROLE_PERMS[role];
  useAuth.mockReturnValue({ can: (p) => perms.includes(p) });
  return render(<MemoryRouter><Sidebar open onNavigate={() => {}} /></MemoryRouter>);
};

describe('sidebar permission gating', () => {
  it('hides admin-only pages from an operator', () => {
    renderFor('OPERATOR');
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
    for (const hidden of ['Users', 'Integrations', 'Settings', 'Webhooks', 'Reports', 'Telegram', 'System Health']) {
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }
  });
  it('shows integrations but not users to an admin', () => {
    renderFor('ADMIN');
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });
  it('shows everything to a super admin', () => {
    renderFor('SUPER_ADMIN');
    for (const label of ['Dashboard', 'WhatsApp', 'Inbox', 'Contacts', 'Email', 'Payments', 'Telegram', 'Notifications', 'Activity Logs', 'Reports', 'Integrations', 'Webhooks', 'Users', 'Settings', 'System Health']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
