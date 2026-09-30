import { useCallback, useEffect, useRef, useState } from 'react';

/** Load data with loading/error state and a stable reload(). Re-runs when `deps` change. */
export function useApi(fn, deps = [], { auto = true } = {}) {
  const [state, setState] = useState({ data: null, loading: auto, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const reload = useCallback(async ({ silent = false } = {}) => {
    const id = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (id === seq.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (id === seq.current) setState((s) => ({ data: silent ? s.data : null, loading: false, error }));
      return null;
    }
  }, []);

  useEffect(() => { if (auto) reload(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}

export function useDebounce(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Run an async action with a busy flag and toast-friendly error capture. */
export function useAction(fn) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (...args) => {
    setBusy(true);
    try { return await fn(...args); } finally { setBusy(false); }
  }, [fn]);
  return [run, busy];
}

export function usePagedList(loader, filters) {
  const [page, setPage] = useState(1);
  const key = JSON.stringify(filters);
  useEffect(() => { setPage(1); }, [key]);
  const res = useApi(() => loader({ ...filters, page, limit: 25 }), [key, page]);
  return { ...res, page, setPage };
}
