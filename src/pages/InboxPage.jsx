import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { whatsappService } from '../services/index.js';
import { useApi } from '../hooks/index.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../context/SocketContext.jsx';
import { ConversationList } from '../components/inbox/ConversationList.jsx';
import { MessageBubble } from '../components/inbox/MessageBubble.jsx';
import { InfoPanel } from '../components/inbox/InfoPanel.jsx';
import { TemplateModal, MediaModal } from '../components/inbox/SendPanels.jsx';
import { displayName, displayPhone } from '../utils/format.js';

export default function InboxPage() {
  const toast = useToast();
  const { can } = useAuth();
  const loc = useLocation();
  const [view, setView] = useState('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(loc.state?.conversationId || null);
  const [conv, setConv] = useState(null);
  const [msgQ, setMsgQ] = useState('');
  const [text, setText] = useState('');
  const [modal, setModal] = useState(null);
  const [sending, setSending] = useState(false);
  const [needsTemplate, setNeedsTemplate] = useState(false);
  const endRef = useRef(null);

  const list = useApi(() => whatsappService.conversations({ view, q, limit: 50 }), [view, q]);
  const msgs = useApi(() => (selectedId ? whatsappService.messages(selectedId, { q: msgQ, limit: 100 }) : Promise.resolve(null)), [selectedId, msgQ]);

  const open = useCallback(async (id) => {
    setSelectedId(id); setNeedsTemplate(false); setMsgQ('');
    try {
      const c = await whatsappService.conversation(id);
      setConv(c);
      if (c.unreadCount || c.markedUnread) { await whatsappService.read(id); list.reload({ silent: true }); }
    } catch (e) { toast.error(e.message); }
  }, []); // eslint-disable-line

  useEffect(() => { if (selectedId && !conv) open(selectedId); }, []); // eslint-disable-line
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.data?.items?.length, selectedId]);

  // Real-time: update in place instead of reloading the page.
  useSocketEvent('whatsapp:message:new', (e) => {
    list.reload({ silent: true });
    if (e.conversationId === selectedId) { msgs.reload({ silent: true }); whatsappService.read(selectedId).catch(() => {}); }
  });
  useSocketEvent('whatsapp:message:status', (e) => { if (e.conversationId === selectedId) msgs.reload({ silent: true }); });
  useSocketEvent('whatsapp:conversation:update', (e) => {
    list.reload({ silent: true });
    if (e.conversationId === selectedId) whatsappService.conversation(selectedId).then(setConv).catch(() => {});
  });

  async function send(payload) {
    setSending(true);
    try {
      await whatsappService.send({ conversationId: selectedId, ...payload });
      setText(''); setModal(null); setNeedsTemplate(false);
      msgs.reload({ silent: true }); list.reload({ silent: true });
    } catch (e) {
      if (e.errorCode === 'OUTSIDE_SESSION_WINDOW') setNeedsTemplate(true);
      toast.error(e.message);
    } finally { setSending(false); }
  }

  const name = conv ? (displayName(conv.customerId) === 'Unknown' ? displayPhone(conv.phone) : displayName(conv.customerId)) : '';
  const canWrite = can('whatsapp:write');

  return (
    <div className="inbox">
      <div className={`listcol ${selectedId ? 'hidden-m' : ''}`} style={{ minHeight: 0 }}>
        <ConversationList data={list.data} loading={list.loading} selectedId={selectedId} onSelect={open} view={view} onView={setView} q={q} onQ={setQ} />
      </div>

      <div className={`chatcol ${selectedId ? '' : 'hidden-m'}`}>
        {!selectedId || !conv ? (
          <div className="empty" style={{ margin: 'auto' }}><h3>Select a conversation</h3><p>Customer messages appear here as soon as MSG91 delivers them.</p></div>
        ) : (
          <>
            <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <div><button className="btn ghost sm menu-btn" onClick={() => { setSelectedId(null); setConv(null); }}>Back</button> <b>{name}</b></div>
              <input className="input" style={{ width: 200 }} type="search" placeholder="Search in chat" value={msgQ} onChange={(e) => setMsgQ(e.target.value)} aria-label="Search in conversation" />
            </div>
            <div className="chat">
              {msgs.data?.hasMore ? <div className="small faint" style={{ textAlign: 'center' }}>Showing the latest {msgs.data.items.length} messages</div> : null}
              {msgs.data?.items.length === 0 ? <div className="empty small">{msgQ ? 'No messages match.' : 'No messages yet.'}</div> : null}
              {msgs.data?.items.map((m) => <MessageBubble key={m._id} m={m} />)}
              <div ref={endRef} />
            </div>
            {needsTemplate ? <div className="alert" style={{ margin: 10 }}>The 24-hour reply window is closed for this customer. Send an approved template to start the conversation again. <button className="btn sm" onClick={() => setModal('template')}>Choose template</button></div> : null}
            {canWrite ? (
              <form className="composer" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send({ type: 'text', text: text.trim() }); }}>
                <button type="button" className="btn" onClick={() => setModal('template')}>Template</button>
                <button type="button" className="btn" onClick={() => setModal('media')}>Attach</button>
                <textarea className="textarea" rows={1} value={text} placeholder="Write a reply" aria-label="Reply" onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim() && !sending) send({ type: 'text', text: text.trim() }); } }} />
                <button className="btn primary" disabled={sending || !text.trim()}>{sending ? 'Sending…' : 'Send'}</button>
              </form>
            ) : null}
          </>
        )}
      </div>

      {conv ? <InfoPanel conv={conv} onChange={(c) => { if (c) setConv(c); list.reload({ silent: true }); }} toast={toast} /> : <div className="info" />}

      {modal === 'template' && <TemplateModal busy={sending} onClose={() => setModal(null)} onSend={send} />}
      {modal === 'media' && <MediaModal busy={sending} onClose={() => setModal(null)} onSend={send} />}
    </div>
  );
}
