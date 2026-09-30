import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../services/index.js';
import { useDebounce } from '../hooks/index.js';
import { Icon } from './Icons.jsx';

export function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const debounced = useDebounce(q, 250);
  const nav = useNavigate();
  const box = useRef(null);

  useEffect(() => {
    let live = true;
    if (debounced.trim().length < 2) { setResults([]); return undefined; }
    setBusy(true);
    searchService.search(debounced.trim()).then((d) => { if (live) setResults(d.results || []); }).catch(() => live && setResults([])).finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [debounced]);

  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const go = (r) => { setOpen(false); setQ(''); nav(r.route); };

  return (
    <div className="gsearch" ref={box}>
      <div className="row" style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, color: 'var(--faint)' }}><Icon name="search" size={16} /></span>
        <input className="input" style={{ paddingLeft: 32 }} type="search" placeholder="Search customers, chats, emails, payments…" aria-label="Global search"
          value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) go(results[0]); if (e.key === 'Escape') setOpen(false); }} />
      </div>
      {open && q.trim().length >= 2 ? (
        <div className="gsearch-results" role="listbox">
          {busy && !results.length ? <div className="empty small">Searching…</div> : null}
          {!busy && !results.length ? <div className="empty small">No matches for “{q}”</div> : null}
          {results.map((r) => (
            <div key={`${r.source}-${r.id}`} className="gsearch-item" role="option" tabIndex={0} onClick={() => go(r)} onKeyDown={(e) => e.key === 'Enter' && go(r)}>
              <span className={`dot ${r.source}`} />
              <div className="grow"><div className="truncate"><b>{r.title}</b></div><div className="small muted truncate">{r.subtitle}</div></div>
              <span className="badge plain">{r.source}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
