import { api } from '../api/client.js';
import { toQuery } from '../utils/format.js';

export const authService = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
  sessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  revokeOthers: () => api.post('/auth/sessions/revoke-others'),
};
export const dashboardService = { get: (q) => api.get(`/dashboard${toQuery(q)}`) };
export const searchService = { search: (q) => api.get(`/search${toQuery({ q })}`) };
export const activityService = { list: (q) => api.get(`/activity${toQuery(q)}`) };
export const userService = {
  list: () => api.get('/users'), create: (b) => api.post('/users', b), update: (id, b) => api.patch(`/users/${id}`, b),
  resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }), unlock: (id) => api.post(`/users/${id}/unlock`),
};
export const customerService = {
  list: (q) => api.get(`/customers${toQuery(q)}`), get: (id) => api.get(`/customers/${id}`), create: (b) => api.post('/customers', b),
  update: (id, b) => api.patch(`/customers/${id}`, b), addNote: (id, text) => api.post(`/customers/${id}/notes`, { text }),
  deleteNote: (id, noteId) => api.delete(`/customers/${id}/notes/${noteId}`), addTags: (id, tags) => api.post(`/customers/${id}/tags`, { tags }),
  removeTag: (id, tag) => api.delete(`/customers/${id}/tags/${encodeURIComponent(tag)}`),
};
export const whatsappService = {
  conversations: (q) => api.get(`/whatsapp/conversations${toQuery(q)}`), conversation: (id) => api.get(`/whatsapp/conversations/${id}`),
  messages: (id, q) => api.get(`/whatsapp/conversations/${id}/messages${toQuery(q)}`), send: (b) => api.post('/whatsapp/messages', b),
  read: (id) => api.post(`/whatsapp/conversations/${id}/read`), unread: (id) => api.post(`/whatsapp/conversations/${id}/unread`),
  archive: (id) => api.post(`/whatsapp/conversations/${id}/archive`), unarchive: (id) => api.post(`/whatsapp/conversations/${id}/unarchive`),
  patch: (id, b) => api.patch(`/whatsapp/conversations/${id}`, b), assign: (id, userId) => api.post(`/whatsapp/conversations/${id}/assign`, { userId }),
  addTag: (id, tag) => api.post(`/whatsapp/conversations/${id}/tags`, { tag }), removeTag: (id, tag) => api.delete(`/whatsapp/conversations/${id}/tags/${encodeURIComponent(tag)}`),
  addNote: (id, text) => api.post(`/whatsapp/conversations/${id}/notes`, { text }),
  templates: () => api.get('/whatsapp/templates'), createTemplate: (b) => api.post('/whatsapp/templates', b),
  updateTemplate: (id, b) => api.patch(`/whatsapp/templates/${id}`, b), deleteTemplate: (id) => api.delete(`/whatsapp/templates/${id}`),
};
export const emailService = {
  list: (q) => api.get(`/email${toQuery(q)}`), get: (id) => api.get(`/email/${id}`), stats: (q) => api.get(`/email/stats${toQuery(q)}`), send: (b) => api.post('/email/send', b),
  templates: () => api.get('/email/templates'), accounts: () => api.get('/email/accounts'), createTemplate: (b) => api.post('/email/templates', b), updateTemplate: (id, b) => api.patch(`/email/templates/${id}`, b),
  deleteTemplate: (id) => api.delete(`/email/templates/${id}`), contacts: (q) => api.get(`/email/contacts${toQuery(q)}`), updateContact: (id, b) => api.patch(`/email/contacts/${id}`, b),
};
export const paymentService = {
  list: (q) => api.get(`/payments${toQuery(q)}`), get: (id) => api.get(`/payments/${id}`), stats: (q) => api.get(`/payments/stats${toQuery(q)}`),
  orders: (q) => api.get(`/payments/orders${toQuery(q)}`), refunds: (q) => api.get(`/payments/refunds${toQuery(q)}`),
  createOrder: (b) => api.post('/payments/orders', b), verify: (b) => api.post('/payments/verify', b), refund: (id, b) => api.post(`/payments/${id}/refund`, b),
};
export const telegramService = {
  routes: () => api.get('/telegram/routes'), createRoute: (b) => api.post('/telegram/routes', b), updateRoute: (id, b) => api.patch(`/telegram/routes/${id}`, b),
  deleteRoute: (id) => api.delete(`/telegram/routes/${id}`), testRoute: (id) => api.post(`/telegram/routes/${id}/test`),
  bot: (account) => api.get(`/telegram/bot${account ? `?account=${encodeURIComponent(account)}` : ''}`).catch(() => null),
  discover: (account) => api.get(`/telegram/discover${account ? `?account=${encodeURIComponent(account)}` : ''}`), notifications: (q) => api.get(`/telegram/notifications${toQuery(q)}`),
};
export const settingsService = {
  all: () => api.get('/settings'), update: (section, b) => api.put(`/settings/${section}`, b),
  notifications: () => api.get('/settings/notifications'), updateNotifications: (b) => api.put('/settings/notifications', b),
};
export const integrationService = {
  list: () => api.get('/integrations'), save: (provider, values, opts = {}) => api.put(`/integrations/${provider}`, { values, ...opts }),
  test: (provider) => api.post(`/integrations/${provider}/test`), disconnect: (provider) => api.post(`/integrations/${provider}/disconnect`),
  connect: (provider) => api.post(`/integrations/${provider}/connect`),
  types: () => api.get('/integrations/types'),
  addAccount: (b) => api.post('/integrations/accounts', b),
  updateAccount: (provider, b) => api.patch(`/integrations/${provider}`, b),
  deleteAccount: (provider) => api.delete(`/integrations/${provider}`),
  /** Accounts of one type (msg91 | brevo | razorpay | telegram) for the pickers on each screen; no secrets. */
  accounts: (type) => api.get(`/integrations/accounts/${type}`),
};
export const webhookService = { list: (q) => api.get(`/webhooks${toQuery(q)}`), get: (id) => api.get(`/webhooks/${id}`), retry: (id) => api.post(`/webhooks/${id}/retry`), endpoints: () => api.get('/webhooks/endpoints') };
export const reportService = { list: () => api.get('/reports'), run: (key, q) => api.get(`/reports/${key}${toQuery(q)}`), csv: (key, q) => api.text(`/reports/${key}/csv${toQuery(q)}`) };
export const healthService = { detailed: () => api.get('/health/detailed'), probe: () => api.post('/health/probe') };
