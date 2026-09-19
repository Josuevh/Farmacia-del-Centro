import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useToast } from '../components/Toast';

function authHeaders(){
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminChat(){
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const { showToast } = useToast();

  const loadThreads = async () => {
    try{
      const resp = await axios.get('/chat/admin/threads', { headers: authHeaders() });
      setThreads(resp.data);
    }catch(e){ /* silent: polling */ }
    finally{ setLoadingThreads(false); }
  }

  const loadThread = async (customerId) => {
    try{
      const resp = await axios.get(`/chat/admin/threads/${customerId}`, { headers: authHeaders() });
      setMessages(resp.data);
      loadThreads();
    }catch(e){ /* silent */ }
  }

  useEffect(() => {
    loadThreads();
    const t = setInterval(loadThreads, 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadThread(selected);
    const t = setInterval(() => loadThread(selected), 4000);
    return () => clearInterval(t);
  }, [selected]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const body = input.trim();
    if (!body || !selected) return;
    setInput('');
    setSending(true);
    try{
      await axios.post(`/chat/admin/threads/${selected}`, { body }, { headers: authHeaders() });
      await loadThread(selected);
    }catch(e){
      showToast('No se pudo enviar el mensaje', 'error');
    }finally{
      setSending(false);
    }
  }

  const selectedThread = threads.find(t => t.customer_id === selected);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Chat</h2>
          <p>Conversaciones con clientes</p>
        </div>
      </div>

      <div className="chat-admin-layout">
        <div className="card chat-thread-list">
          {loadingThreads ? (
            <div className="center-loader"><div className="spinner" /></div>
          ) : threads.length === 0 ? (
            <div className="empty-state"><h3>Sin conversaciones</h3><p>Aún no hay mensajes de clientes.</p></div>
          ) : threads.map(t => (
            <button
              key={t.customer_id}
              type="button"
              className={"chat-thread-item" + (selected === t.customer_id ? ' active' : '')}
              onClick={() => setSelected(t.customer_id)}
            >
              <span className="chat-thread-avatar">{t.customer_email.charAt(0).toUpperCase()}</span>
              <span className="chat-thread-info">
                <strong>{t.customer_email}</strong>
                <span>{t.last_message}</span>
              </span>
              {t.unread_count > 0 && <span className="chat-unread-badge chat-unread-badge-inline">{t.unread_count}</span>}
            </button>
          ))}
        </div>

        <div className="card chat-conversation">
          {!selected ? (
            <div className="empty-state"><h3>Selecciona una conversación</h3><p>Elige un cliente de la lista para ver los mensajes.</p></div>
          ) : (
            <>
              <div className="chat-conversation-header">
                <strong>{selectedThread?.customer_email || 'Cliente'}</strong>
                <span className="chat-conversation-hint">El asistente virtual responde automáticamente. Si escribes aquí, el bot se pausa por 30 minutos en esta conversación.</span>
              </div>
              <div className="chat-panel-body chat-conversation-body" ref={scrollRef}>
                {messages.map(m => (
                  <div key={m.id} className="chat-bubble-wrap">
                    {m.sender_role === 'bot' && <span className="chat-bubble-label" style={{alignSelf: 'flex-end'}}>Asistente virtual</span>}
                    <div className={"chat-bubble " + (m.sender_role === 'customer' ? 'chat-bubble-theirs' : 'chat-bubble-mine')}>
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <form className="chat-panel-input" onSubmit={send}>
                <input
                  className="input"
                  placeholder="Escribe una respuesta…"
                  value={input}
                  onChange={e=>setInput(e.target.value)}
                  maxLength={2000}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !input.trim()}>Enviar</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
