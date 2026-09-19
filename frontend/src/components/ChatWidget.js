import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useToast } from './Toast';

function authHeaders(){
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ChatWidget(){
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const { showToast } = useToast();
  // Fixed the moment this widget mounts — i.e. on page refresh or right after
  // logging back in (the widget only renders while logged in, so it unmounts on
  // logout and remounts fresh on the next login). Sent on every chat request so
  // older messages stay safely in the DB for admin, but the customer only ever
  // sees/continues a conversation that started in this session.
  const sessionStartRef = useRef(new Date().toISOString());

  const loadMessages = async () => {
    try{
      const resp = await axios.get('/chat/messages', { params: { since: sessionStartRef.current }, headers: authHeaders() });
      setMessages(resp.data);
    }catch(e){ /* silent: polling, don't spam toasts */ }
  }

  const loadUnread = async () => {
    try{
      const resp = await axios.get('/chat/unread-count', { params: { since: sessionStartRef.current }, headers: authHeaders() });
      setUnreadCount(resp.data.unread_count);
    }catch(e){ /* silent */ }
  }

  useEffect(() => {
    loadUnread();
    const interval = setInterval(() => {
      if (open) loadMessages(); else loadUnread();
    }, open ? 4000 : 15000);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (open) {
      loadMessages();
      setUnreadCount(0);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const body = input.trim();
    if (!body) return;
    setInput('');
    setSending(true);
    try{
      await axios.post('/chat/messages', { body, since: sessionStartRef.current }, { headers: authHeaders() });
      await loadMessages();
    }catch(e){
      showToast('No se pudo enviar el mensaje', 'error');
    }finally{
      setSending(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span>Chat con la farmacia</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar chat">✕</button>
          </div>
          <div className="chat-panel-body" ref={scrollRef}>
            {messages.length === 0 ? (
              <p className="chat-empty-hint">Escríbenos tu duda. Un asistente virtual te responde al instante; si necesitas algo más, un miembro de nuestro equipo puede intervenir.</p>
            ) : messages.map(m => (
              <div key={m.id} className="chat-bubble-wrap">
                {m.sender_role === 'bot' && <span className="chat-bubble-label">Asistente virtual</span>}
                <div className={"chat-bubble " + (m.sender_role === 'customer' ? 'chat-bubble-mine' : 'chat-bubble-theirs')}>
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          <form className="chat-panel-input" onSubmit={send}>
            <input
              className="input"
              placeholder="Escribe un mensaje…"
              value={input}
              onChange={e=>setInput(e.target.value)}
              maxLength={2000}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !input.trim()}>Enviar</button>
          </form>
        </div>
      )}

      <button type="button" className="chat-bubble-toggle" onClick={() => setOpen(o => !o)} aria-label={open ? 'Cerrar chat' : 'Abrir chat'}>
        {!open && unreadCount > 0 && <span className="chat-unread-badge">{unreadCount}</span>}
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-4.06 7.19 8.5 8.5 0 01-8.94 0L3 21l1.31-5c-.87-1.28-1.31-2.79-1.31-4.35A8.5 8.5 0 0112.5 3a8.38 8.38 0 018.5 8.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
      </button>
    </div>
  )
}
