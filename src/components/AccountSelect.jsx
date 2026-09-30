import { useEffect, useState } from 'react';
import { integrationService } from '../services/index.js';
import { Select } from './Field.jsx';

/**
 * Loads the accounts of one integration type (msg91 | brevo | razorpay | telegram). Returns [] while loading
 * or when the user cannot see them. Account rows never contain secrets.
 */
export function useAccounts(type) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let alive = true;
    integrationService.accounts(type).then((r) => { if (alive) setRows(r || []); }).catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [type]);
  return rows;
}

/**
 * Account picker. The empty value means "use the default" (or, for WhatsApp, the number the customer wrote to).
 * Hidden when there is only one usable account, so single-account setups look exactly as before.
 */
export function AccountSelect({ type, value, onChange, label = 'Account', defaultLabel, hint, alwaysShow = false }) {
  const rows = useAccounts(type);
  const ready = rows.filter((r) => r.configured);
  if (!alwaysShow && ready.length < 2 && !value) return null;
  const def = rows.find((r) => r.effectiveDefault);
  const options = [
    { value: '', label: defaultLabel || `Default${def ? ` (${def.label})` : ''}` },
    ...rows.map((r) => ({ value: r.key, label: `${r.label}${r.configured ? '' : ' (not configured)'}`, disabled: !r.configured })),
  ];
  return <Select label={label} value={value || ''} onChange={(e) => onChange(e.target.value)} options={options} hint={hint} />;
}

/** Label for an account key, falling back to the key itself. */
export const accountLabel = (rows, key) => rows.find((r) => r.key === key)?.label || key;
