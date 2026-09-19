import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { statusBadgeClass } from '../utils/badge';
import { useToast } from '../components/Toast';
import { openAuthenticatedFile } from '../utils/authFile';

const STATUS_LABEL = { pending: 'En revisión', approved: 'Aprobada', rejected: 'Rechazada' };

const STATUS_ICON = {
  pending: <path d="M12 7v5l3 3M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
  approved: <path d="M9 12l2 2 4-4M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
  rejected: <path d="M15 9l-6 6M9 9l6 6M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
};

function authHeaders(){
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Prescriptions(){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [doctorName, setDoctorName] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    axios.get('/prescriptions/me', { headers: authHeaders() })
      .then(r=>setItems(r.data))
      .catch(()=>setItems([]))
      .finally(()=>setLoading(false));
  }

  useEffect(()=>{ load(); },[]);

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!file) { showToast('Selecciona un archivo primero', 'error'); return; }
    const formData = new FormData();
    formData.append('file', file);
    if (doctorName) formData.append('doctor_name', doctorName);
    if (issuedDate) formData.append('issued_date', issuedDate);
    setUploading(true);
    try{
      await axios.post('/prescriptions/', formData, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
      showToast('Receta subida, queda pendiente de revisión', 'success');
      setFile(null);
      setDoctorName('');
      setIssuedDate('');
      load();
    }catch(e){
      showToast(e.response?.data?.detail || 'No se pudo subir la receta', 'error');
    }finally{
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Mis recetas</h2>
          <p>Sube tu receta médica para poder comprar productos que la requieren</p>
        </div>
      </div>

      <div className="card prescription-upload-card">
        <h3>Subir nueva receta</h3>
        <form onSubmit={submitUpload}>
          <label className={"dropzone" + (file ? ' has-file' : '')}>
            <input
              className="dropzone-input"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={e=>setFile(e.target.files[0] || null)}
            />
            <span className="dropzone-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 16V4M12 4l-4 4M12 4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            {file ? (
              <>
                <strong className="dropzone-filename">{file.name}</strong>
                <span className="dropzone-hint">Haz clic para cambiar el archivo</span>
              </>
            ) : (
              <>
                <strong>Haz clic para seleccionar tu receta</strong>
                <span className="dropzone-hint">JPG, PNG o PDF · máx. 8MB</span>
              </>
            )}
          </label>

          <div className="form-grid" style={{marginTop: 16}}>
            <div className="field">
              <label>Médico (opcional)</label>
              <input className="input" value={doctorName} onChange={e=>setDoctorName(e.target.value)} placeholder="Dr. Nombre Apellido" />
            </div>
            <div className="field">
              <label>Fecha de emisión (opcional)</label>
              <input className="input" type="date" value={issuedDate} onChange={e=>setIssuedDate(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={uploading}>
              {uploading ? 'Subiendo…' : 'Subir receta'}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="center-loader"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card"><h3>Aún no has subido recetas</h3><p>Sube una arriba para comenzar.</p></div>
      ) : (
        <div className="prescription-list">
          {items.map(p => (
            <div className="card prescription-row" key={p.id}>
              <button
                type="button"
                onClick={() => openAuthenticatedFile(p.file_url).catch(() => showToast('No se pudo abrir el archivo', 'error'))}
                className="prescription-row-thumb"
              >
                {p.is_pdf ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="9" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.4"/><path d="M21 16l-5.5-5.5a2 2 0 00-2.8 0L4 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </button>
              <div className="prescription-row-body">
                <strong>{p.doctor_name || 'Médico no especificado'}</strong>
                <span>{p.issued_date ? `Emitida el ${p.issued_date}` : 'Sin fecha registrada'}</span>
                {p.notes && <span className="prescription-row-notes">"{p.notes}"</span>}
              </div>
              <span className={statusBadgeClass(p.status) + ' prescription-row-status'}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">{STATUS_ICON[p.status]}</svg>
                {STATUS_LABEL[p.status] || p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
