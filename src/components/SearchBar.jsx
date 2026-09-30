import { useEffect, useState } from 'react';
import { useDebounce } from '../hooks/index.js';

/** Debounced text filter. Calls onChange(value) after the user pauses typing. */
export function SearchBar({ value = '', onChange, placeholder = 'Search…' }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, 300);
  useEffect(() => { if (debounced !== value) onChange(debounced); }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  return <input className="input" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} style={{ minWidth: 220 }} />;
}
