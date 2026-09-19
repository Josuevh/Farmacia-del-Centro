import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { useToast } from '../components/Toast';

function authHeaders(){
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function timeAgo(iso){
  if (!iso) return 'Nunca ha entrado';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

export default function AdminOperators(){
  const [tab, setTab] = useState('operators');
  const [operators, setOperators] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [creating, setCreating] = useState(false);
  const [activityFilter, setActivityFilter] = useState('');
  const { showToast } = useToast();

  const loadOperators = () => {
    axios.get('/admin/operators/', { headers: authHeaders() })
      .then(r => setOperators(r.data))
      .catch(() => {});
  };

  const loadActivity = () => {
    axios.get('/admin/operators/activity', {
      headers: authHeaders(),
      params: activityFilter ? { user_id: activityFilter } : {},
    })
      .then(r => setActivity(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/admin/operators/', { headers: authHeaders() }).then(r => setOperators(r.data)),
      axios.get('/admin/operators/activity', { headers: authHeaders() }).then(r => setActivity(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  // Refresca la lista de operadores cada 15s para que el estado "en línea" se sienta
  // en vivo, igual que el patrón de polling que ya usa el chat en este panel.
  useEffect(() => {
    const t = setInterval(loadOperators, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { loadActivity(); }, [activityFilter]);

  const createOperator = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setCreating(true);
    try {
      await axios.post('/admin/operators/', { email, password, full_name: fullName || null }, { headers: authHeaders() });
      showToast('Operador dado de alta', 'success');
      setEmail(''); setPassword(''); setFullName('');
      loadOperators();
      loadActivity();
    } catch (e) {
      showToast(e.response?.data?.detail || 'No se pudo crear el operador', 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (op) => {
    try {
      await axios.patch(`/admin/operators/${op.id}`, null, { headers: authHeaders(), params: { is_active: !op.is_active } });
      showToast(op.is_active ? 'Operador desactivado' : 'Operador activado', 'success');
      loadOperators();
      loadActivity();
    } catch (e) {
      showToast('No se pudo actualizar el operador', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Operadores</h2>
          <p>Da de alta operadores, revisa quién está en línea y su historial de acciones</p>
        </div>
      </div>

      <div className="tab-nav">
        <button className={tab === 'operators' ? 'active' : ''} onClick={() => setTab('operators')}>Operadores</button>
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Historial de actividad</button>
      </div>

      {loading ? (
        <div className="center-loader"><div className="spinner" /></div>
      ) : tab === 'operators' ? (
        <>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Dar de alta un operador</h4>
            <form onSubmit={createOperator} className="form-grid">
              <div className="field">
                <label>Correo</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label>Contraseña temporal</label>
                <input className="input" type="text" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="field">
                <label>Nombre (opcional)</label>
                <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
                  {creating ? 'Creando…' : 'Dar de alta'}
                </button>
              </div>
            </form>
          </div>

          {operators.length === 0 ? (
            <div className="empty-state card"><h3>Aún no hay operadores</h3><p>Da de alta el primero arriba.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Operador</th><th>Estado</th><th>Última actividad</th><th></th></tr></thead>
                <tbody>
                  {operators.map(op => (
                    <tr key={op.id}>
                      <td>
                        <strong>{op.full_name || op.email}</strong>
                        {op.full_name && <div className="mono">{op.email}</div>}
                      </td>
                      <td>
                        <span className={`presence-dot ${op.is_online ? 'presence-online' : 'presence-offline'}`} />
                        {op.is_online ? 'En línea' : 'Desconectado'}
                        {!op.is_active && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Desactivado</span>}
                      </td>
                      <td>{timeAgo(op.last_seen_at)}</td>
                      <td>
                        <button
                          className={`btn btn-sm ${op.is_active ? 'btn-outline' : 'btn-primary'}`}
                          onClick={() => toggleActive(op)}
                        >
                          {op.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="results-filter-group" style={{ marginBottom: 16 }}>
            <label>Filtrar por operador</label>
            <select className="input" value={activityFilter} onChange={e => setActivityFilter(e.target.value)}>
              <option value="">Todos</option>
              {operators.map(op => (
                <option key={op.id} value={op.id}>{op.full_name || op.email}</option>
              ))}
            </select>
          </div>
          {activity.length === 0 ? (
            <div className="empty-state card"><h3>Sin actividad registrada</h3><p>Las acciones de los operadores aparecerán aquí.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Quién</th><th>Acción</th><th>Cuándo</th></tr></thead>
                <tbody>
                  {activity.map(a => (
                    <tr key={a.id}>
                      <td>{a.actor_name || a.actor_email || 'Sistema'}</td>
                      <td>{a.action}</td>
                      <td className="mono">{new Date(a.created_at).toLocaleString('es-MX')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
