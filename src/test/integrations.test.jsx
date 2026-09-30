import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../services/index.js', () => ({ integrationService: { list: vi.fn(), types: vi.fn(), addAccount: vi.fn(), updateAccount: vi.fn(), deleteAccount: vi.fn(), test: vi.fn(), save: vi.fn(), connect: vi.fn(), disconnect: vi.fn() } }));

import { useAuth } from '../context/AuthContext.jsx';
import { integrationService } from '../services/index.js';
import IntegrationsPage from '../pages/IntegrationsPage.jsx';

const field = (key, label, extra = {}) => ({ key, label, secret: false, required: false, ...extra });
const TYPES = [
  { type: 'msg91', label: 'WhatsApp (MSG91)', webhook: true, fields: [field('authKey', 'Auth key', { secret: true, required: true })] },
  { type: 'brevo', label: 'Brevo (email)', webhook: true, fields: [field('apiKey', 'API key', { secret: true, required: true }), field('senderEmail', 'Sender email'), field('senderName', 'Sender name'), field('webhookSecret', 'Webhook bearer token', { secret: true })] },
  { type: 'razorpay', label: 'Razorpay', webhook: true, fields: [field('keyId', 'Key ID', { required: true })] },
  { type: 'telegram', label: 'Telegram', webhook: false, fields: [field('botToken', 'Bot token', { secret: true, required: true })] },
];
const acct = (provider, type, label, extra = {}) => ({
  provider, type, label, builtin: !provider.includes('_'), isDefault: false, status: 'connected', configured: true, config: {}, secretsConfigured: {},
  secretPlaceholder: '••••', fields: TYPES.find((t) => t.type === type).fields, webhookUrl: type === 'telegram' ? null : `https://api.test/api/webhooks/${type}${provider.includes('_') ? `/${provider}` : ''}`, ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  integrationService.types.mockResolvedValue(TYPES);
  integrationService.list.mockResolvedValue([
    acct('brevo', 'brevo', 'Brevo — Account 1'), acct('brevo2', 'brevo', 'Brevo — Account 2'), acct('brevo_abc123', 'brevo', 'Brevo — Marketing'),
    acct('razorpay', 'razorpay', 'Razorpay'), acct('razorpay_store2x', 'razorpay', 'Store 2', { isDefault: true }),
    acct('msg91', 'msg91', 'WhatsApp (MSG91)', { status: 'not_configured', configured: false }), acct('telegram', 'telegram', 'Telegram'),
    { provider: 'mongodb', label: 'MongoDB', status: 'connected', fields: [], config: { state: 'connected' } },
  ]);
});

describe('Integrations page with multiple accounts', () => {
  it('groups accounts by provider, shows each webhook URL and marks the default', async () => {
    useAuth.mockReturnValue({ can: () => true });
    render(<IntegrationsPage />);
    expect(await screen.findByText('Brevo — Marketing')).toBeInTheDocument();
    expect(screen.getByText('https://api.test/api/webhooks/brevo/brevo_abc123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Brevo (email) account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Razorpay account' })).toBeInTheDocument();
    const store2 = screen.getByText('Store 2').closest('.int-card');
    expect(within(store2).getByText('Default')).toBeInTheDocument();
    expect(within(store2).getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    const builtin = screen.getByText('Razorpay', { selector: 'h3' }).closest('.int-card');
    expect(within(builtin).queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(within(builtin).getByRole('button', { name: 'Make default' })).toBeInTheDocument();
  });

  it('adds a Brevo account with API key, sender and webhook token', async () => {
    useAuth.mockReturnValue({ can: () => true });
    integrationService.addAccount.mockResolvedValue({});
    render(<IntegrationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Brevo (email) account' }));
    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Brevo — Sales' } });
    fireEvent.change(screen.getByLabelText('API key *'), { target: { value: 'xkeysib-new-key' } });
    fireEvent.change(screen.getByLabelText('Sender email'), { target: { value: 'sales@company.test' } });
    fireEvent.change(screen.getByLabelText('Sender name'), { target: { value: 'Sales' } });
    fireEvent.change(screen.getByLabelText('Webhook bearer token'), { target: { value: 'sales-webhook-token-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));
    await waitFor(() => expect(integrationService.addAccount).toHaveBeenCalledWith({
      type: 'brevo', label: 'Brevo — Sales', values: { apiKey: 'xkeysib-new-key', senderEmail: 'sales@company.test', senderName: 'Sales', webhookSecret: 'sales-webhook-token-123' }, force: undefined,
    }));
  });

  it('read-only users see accounts but no add or edit buttons', async () => {
    useAuth.mockReturnValue({ can: (p) => p !== 'integrations:write' });
    render(<IntegrationsPage />);
    expect(await screen.findByText('Brevo — Marketing')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+ Add/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Configure' })).not.toBeInTheDocument();
  });
});
