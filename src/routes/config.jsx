import { lazy } from 'react';

const page = (loader) => lazy(loader);

/** Single source of truth for navigation, routing and permission gating. */
export const ROUTES = [
  { path: '/', label: 'Dashboard', icon: 'dashboard', permission: 'dashboard:read', element: page(() => import('../pages/DashboardPage.jsx')), end: true },
  { path: '/whatsapp', label: 'WhatsApp', icon: 'whatsapp', permission: 'whatsapp:read', element: page(() => import('../pages/WhatsAppPage.jsx')) },
  { path: '/inbox', label: 'Inbox', icon: 'inbox', permission: 'whatsapp:read', element: page(() => import('../pages/InboxPage.jsx')), badge: 'unread' },
  { path: '/contacts', label: 'Contacts', icon: 'contacts', permission: 'customers:read', element: page(() => import('../pages/ContactsPage.jsx')) },
  { path: '/contacts/:id', permission: 'customers:read', element: page(() => import('../pages/ContactProfilePage.jsx')), hidden: true },
  { path: '/email', label: 'Email', icon: 'email', permission: 'email:read', element: page(() => import('../pages/EmailPage.jsx')) },
  { path: '/payments', label: 'Payments', icon: 'payments', permission: 'payments:read', element: page(() => import('../pages/PaymentsPage.jsx')) },
  { path: '/telegram', label: 'Telegram', icon: 'telegram', permission: 'telegram:read', element: page(() => import('../pages/TelegramPage.jsx')) },
  { path: '/notifications', label: 'Notifications', icon: 'bell', permission: 'notifications:read', element: page(() => import('../pages/NotificationsPage.jsx')) },
  { path: '/activity', label: 'Activity Logs', icon: 'activity', permission: 'activity:read', element: page(() => import('../pages/ActivityPage.jsx')) },
  { path: '/reports', label: 'Reports', icon: 'reports', permission: 'reports:read', element: page(() => import('../pages/ReportsPage.jsx')) },
  { path: '/integrations', label: 'Integrations', icon: 'plug', permission: 'integrations:read', element: page(() => import('../pages/IntegrationsPage.jsx')), group: 'Admin' },
  { path: '/webhooks', label: 'Webhooks', icon: 'webhook', permission: 'webhooks:read', element: page(() => import('../pages/WebhooksPage.jsx')), group: 'Admin' },
  { path: '/users', label: 'Users', icon: 'users', permission: 'users:read', element: page(() => import('../pages/UsersPage.jsx')), group: 'Admin' },
  { path: '/settings', label: 'Settings', icon: 'settings', permission: 'settings:read', element: page(() => import('../pages/SettingsPage.jsx')), group: 'Admin' },
  { path: '/health', label: 'System Health', icon: 'health', permission: 'health:read', element: page(() => import('../pages/HealthPage.jsx')), group: 'Admin' },
];

/** Routes the given permission list may see (sidebar and router both use this). */
export const visibleRoutes = (can) => ROUTES.filter((r) => can(r.permission));
