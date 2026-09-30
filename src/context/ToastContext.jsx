import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'info', ms = 4200) => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s.slice(-3), { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), ms);
  }, []);
  const api = useMemo(() => ({
    show: push, success: (m) => push(m, 'success'), error: (m) => push(m, 'error', 6500), info: (m) => push(m, 'info'),
  }), [push]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}
