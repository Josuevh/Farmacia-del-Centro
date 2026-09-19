import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { statusBadgeClass } from '../utils/badge';
import { useToast } from '../components/Toast';
import { openAuthenticatedFile } from '../utils/authFile';

const STATUS_LABEL = { pending: 'En revisión', approved: 'Aprobada', rejected: 'Rechazada' };

function authHeaders(){
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminPrescriptions(){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [reviewingId, setReviewingId] = useState(null);
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    axios.get('/prescriptions/', { params: filter ? { status: filter } : {}, headers: authHeaders() })
      .then(r=>setItems(r.data))
      .catch(()=>setItems([]))
      .finally(()=>setLoading(false));
  }

  useEffect(()=>{ load(); },[filter]);

  const openReview = (p) => {
    setReviewingId(p.id);
    setNotes(p.notes || '');
  }

  const review = async (id, status) => {
    try{
      await axios.patch(`/prescriptions/${id}`, { status, notes }, { headers: authHeaders() });
      showToast(status === 'approved' ? 'Receta aprobada' : 'Receta rechazada', 'success');
      setReviewingId(null);
      load();
    }catch(e){
      showToast('No se pudo actualizar la receta', 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Recetas</h2>
          <p>Revisión de recetas médicas</p>
        </div>
      </div>

      <div className="tab-nav">
        <button className={filter === 'pending' ? 'active' : ''} onClick={()=>setFilter('pending')}>En revisión</button>
        <button className={filter === 'approved' ? 'active' : ''} onClick={()=>setFilter('approved')}>Aprobadas</button>
        <button className={filter === 'rejected' ? 'active' : ''} onClick={()=>setFilter('rejected')}>Rechazadas</button>
        <button className={filter === '' ? 'active' : ''} onClick={()=>setFilter('')}>Todas</button>
      </div>

      {loading ? (
        <div className="center-loader"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card"><h3>Sin recetas</h3><p>No hay recetas en este filtro.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Archivo</th><th>Médico</th><th>Fecha</th><th>Estado</th><th>Notas</th><th></th></tr></thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id}>
                  <td><button type="button" className="link" onClick={() => openAuthenticatedFile(p.file_url).catch(() => showToast('No se pudo abrir el archivo', 'error'))}>Ver archivo</button></td>
                  <td>{p.doctor_name || '—'}</td>
                  <td>{p.issued_date || '—'}</td>
                  <td><span className={statusBadgeClass(p.status)}>{STATUS_LABEL[p.status] || p.status}</span></td>
                  <td>
                    {reviewingId === p.id ? (
                      <input className="input stock-input" style={{width: 160}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas (opcional)" />
                    ) : (p.notes || '—')}
                  </td>
                  <td>
                    {reviewingId === p.id ? (
                      <div className="row-actions">
                        <button className="btn btn-primary btn-sm" onClick={()=>review(p.id, 'approved')}>Aprobar</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>review(p.id, 'rejected')}>Rechazar</button>
                        <button className="btn btn-outline btn-sm" onClick={()=>setReviewingId(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={()=>openReview(p)}>Revisar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
