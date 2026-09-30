const BASE = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');

export class ApiClientError extends Error {
  constructor(message, { status, errorCode, details } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

let accessToken = null;
let onAuthLost = () => {};
let refreshing = null;
const listeners = new Set();

export const tokenStore = {
  get: () => accessToken,
  set(t) { accessToken = t; listeners.forEach((fn) => fn(t)); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
export const setAuthLostHandler = (fn) => { onAuthLost = fn; };

async function parse(res) {
  const type = res.headers.get('content-type') || '';
  if (type.includes('application/json')) return res.json();
  return { success: res.ok, message: res.statusText, data: await res.text() };
}

/** Single-flight token refresh: parallel 401s share one /auth/refresh call. */
export function refreshSession() {
  if (!refreshing) {
    refreshing = fetch(`${BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        const body = await parse(res);
        if (!res.ok || !body.success) throw new ApiClientError(body.message || 'Session expired', { status: res.status, errorCode: body.errorCode });
        tokenStore.set(body.data.accessToken);
        return body.data;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function request(path, { method = 'GET', body, raw = false, retry = true, headers = {} } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method, credentials: 'include',
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && retry && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    try {
      await refreshSession();
      return request(path, { method, body, raw, retry: false, headers });
    } catch {
      tokenStore.set(null);
      onAuthLost();
      throw new ApiClientError('Your session has expired. Please sign in again.', { status: 401, errorCode: 'SESSION_EXPIRED' });
    }
  }
  if (raw && res.ok) return res;
  const payload = await parse(res).catch(() => ({}));
  if (!res.ok || payload.success === false) {
    throw new ApiClientError(payload.message || `Request failed (${res.status})`, { status: res.status, errorCode: payload.errorCode, details: payload.data?.details });
  }
  return payload.data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body = {}) => request(p, { method: 'POST', body }),
  put: (p, body = {}) => request(p, { method: 'PUT', body }),
  patch: (p, body = {}) => request(p, { method: 'PATCH', body }),
  delete: (p) => request(p, { method: 'DELETE' }),
  text: async (p) => (await request(p, { raw: true })).text(),
};
