import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, tokenStore, setAuthLostHandler, ApiClientError } from '../api/client.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  tokenStore.set(null);
  setAuthLostHandler(() => {});
  vi.restoreAllMocks();
});

describe('api client', () => {
  it('unwraps the success envelope and sends the bearer token', async () => {
    tokenStore.set('tok');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { success: true, message: 'ok', data: { a: 1 } }));
    await expect(api.get('/customers')).resolves.toEqual({ a: 1 });
    expect(spy.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
    expect(spy.mock.calls[0][0]).toBe('/api/customers');
  });

  it('throws ApiClientError with errorCode and field details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(400, { success: false, message: 'Invalid input', errorCode: 'VALIDATION_ERROR', data: { details: { phone: 'Bad phone' } } }));
    const err = await api.post('/customers', {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.errorCode).toBe('VALIDATION_ERROR');
    expect(err.details.phone).toBe('Bad phone');
  });

  it('refreshes once on 401 and replays the request', async () => {
    tokenStore.set('old');
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401, { success: false, message: 'Expired', errorCode: 'TOKEN_EXPIRED' }))
      .mockResolvedValueOnce(json(200, { success: true, data: { accessToken: 'new', user: {} } }))
      .mockResolvedValueOnce(json(200, { success: true, data: { ok: true } }));
    await expect(api.get('/dashboard')).resolves.toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls[1][0]).toBe('/api/auth/refresh');
    expect(tokenStore.get()).toBe('new');
  });

  it('shares one refresh call between parallel 401s', async () => {
    tokenStore.set('old');
    let refreshCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (url === '/api/auth/refresh') { refreshCalls += 1; return json(200, { success: true, data: { accessToken: 'new', user: {} } }); }
      return init.headers.Authorization === 'Bearer new'
        ? json(200, { success: true, data: 'ok' })
        : json(401, { success: false, message: 'Expired', errorCode: 'TOKEN_EXPIRED' });
    });
    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect(refreshCalls).toBe(1);
  });

  it('signs the user out when the refresh fails', async () => {
    const lost = vi.fn();
    setAuthLostHandler(lost);
    tokenStore.set('old');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => (url === '/api/auth/refresh'
      ? json(401, { success: false, message: 'Session expired' })
      : json(401, { success: false, message: 'Expired', errorCode: 'TOKEN_EXPIRED' })));
    await expect(api.get('/x')).rejects.toBeInstanceOf(ApiClientError);
    expect(lost).toHaveBeenCalled();
  });
});
