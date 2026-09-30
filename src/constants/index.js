export const STATUS_TONE = {
  // generic
  connected: 'green', healthy: 'green', up: 'green', active: 'green', completed: 'green', success: 'green', ok: 'green',
  error: 'red', failed: 'red', down: 'red', rejected: 'red', blocked: 'red', bounced: 'red', invalid: 'red', spam: 'red',
  degraded: 'amber', pending: 'amber', queued: 'amber', processing: 'amber', untested: 'amber', warning: 'amber', deferred: 'amber', lead: 'amber', authorized: 'amber',
  not_configured: '', disconnected: '', ignored: '', archived: '', inactive: '',
  // messaging
  sent: 'blue', delivered: 'green', read: 'green', received: 'blue', opened: 'green', clicked: 'green',
  // payments
  captured: 'green', refunded: 'amber', partially_refunded: 'amber', created: 'blue', paid: 'green',
  // conversation
  open: 'blue', resolved: 'green',
};
export const CHANNEL_LABEL = { whatsapp: 'WhatsApp', email: 'Email', payment: 'Payment', telegram: 'Telegram', customer: 'Customer', auth: 'Security', system: 'System', webhook: 'Webhook' };
export const RANGES = [
  { value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' }, { value: 'last30', label: 'Last 30 days' }, { value: 'custom', label: 'Custom range' },
];
export const PROVIDER_LABEL = { msg91: 'WhatsApp (MSG91)', brevo: 'Brevo — Account 1', brevo2: 'Brevo — Account 2', razorpay: 'Razorpay', telegram: 'Telegram', mongodb: 'MongoDB', system: 'System' };
/** Integration types; filtering by a type matches every account of that type. */
export const PROVIDER_TYPE_LABEL = { msg91: 'WhatsApp (MSG91)', brevo: 'Brevo', razorpay: 'Razorpay', telegram: 'Telegram' };
export const PROVIDER_TYPE_OPTIONS = ['msg91', 'brevo', 'razorpay'].map((value) => ({ value, label: `${PROVIDER_TYPE_LABEL[value]} (all accounts)` }));
/** Label for any account key, including accounts added from the Integrations page (e.g. brevo_k3f9x2). */
export const providerLabel = (key) => PROVIDER_LABEL[key] || (PROVIDER_TYPE_LABEL[String(key).split('_')[0]] ? `${PROVIDER_TYPE_LABEL[String(key).split('_')[0]]} · ${String(key).split('_')[1]}` : key);
