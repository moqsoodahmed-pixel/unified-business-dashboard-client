import { useEffect, useState } from 'react';
import { Modal } from '../Modal.jsx';
import { Field, TextInput } from '../Field.jsx';
import { whatsappService } from '../../services/index.js';

export function TemplateModal({ onClose, onSend, busy }) {
  const [templates, setTemplates] = useState([]);
  const [id, setId] = useState('');
  const [vars, setVars] = useState([]);
  useEffect(() => { whatsappService.templates().then((t) => setTemplates(t.filter((x) => x.enabled))).catch(() => {}); }, []);
  const tpl = templates.find((t) => t._id === id);
  useEffect(() => { setVars(Array.from({ length: tpl?.variableCount || 0 }, () => '')); }, [id]); // eslint-disable-line
  return (
    <Modal title="Send a template message" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!tpl || busy || vars.some((v) => !v.trim())} onClick={() => onSend({ type: 'template', templateId: tpl._id, template: { name: tpl.name, language: tpl.language, variables: vars } })}>{busy ? 'Sending…' : 'Send template'}</button></>}>
      <div className="stack">
        {!templates.length ? <div className="alert">No templates registered yet. Add the templates you have approved in MSG91 on the WhatsApp page.</div> : null}
        <Field label="Template">{(fid) => (
          <select id={fid} className="select" value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Choose…</option>{templates.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.language})</option>)}
          </select>)}
        </Field>
        {tpl?.bodyText ? <div className="card card-pad small" style={{ background: 'var(--line-2)' }}>{tpl.bodyText}</div> : null}
        {vars.map((v, i) => <TextInput key={i} label={`Value for {{${i + 1}}}`} value={v} onChange={(e) => setVars(vars.map((x, j) => (j === i ? e.target.value : x)))} />)}
      </div>
    </Modal>
  );
}

export function MediaModal({ onClose, onSend, busy }) {
  const [type, setType] = useState('image');
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [filename, setFilename] = useState('');
  const valid = /^https:\/\//.test(url);
  return (
    <Modal title="Attach media" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!valid || busy} onClick={() => onSend({ type, media: { url, ...(caption ? { caption } : {}), ...(type === 'document' && filename ? { filename } : {}) } })}>{busy ? 'Sending…' : 'Send'}</button></>}>
      <div className="stack">
        <Field label="Type">{(id) => <select id={id} className="select" value={type} onChange={(e) => setType(e.target.value)}>{['image', 'video', 'audio', 'document'].map((t) => <option key={t}>{t}</option>)}</select>}</Field>
        <TextInput label="Public file URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" hint="WhatsApp fetches the file from this HTTPS address." error={url && !valid ? 'Use an https:// link' : undefined} />
        {type !== 'audio' ? <TextInput label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} /> : null}
        {type === 'document' ? <TextInput label="File name (optional)" value={filename} onChange={(e) => setFilename(e.target.value)} /> : null}
      </div>
    </Modal>
  );
}
