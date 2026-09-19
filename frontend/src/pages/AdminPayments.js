import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { statusBadgeClass } from '../utils/badge';

export default function AdminPayments(){
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const token = localStorage.getItem('access_token');
    axios.get('/admin/payments', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r=>setPayments(r.data))
      .catch(()=>setPayments([]))
      .finally(()=>setLoading(false))
  },[])

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Pagos</h2>
          <p>Pagos procesados</p>
        </div>
      </div>

      {loading ? (
        <div className="center-loader"><div className="spinner" /></div>
      ) : payments.length === 0 ? (
        <div className="empty-state card"><h3>Sin pagos</h3><p>Aún no se han registrado pagos.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Orden</th><th>Proveedor</th><th>ID Proveedor</th><th>Monto</th><th>Estado</th><th>Creado</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="mono">{p.id}</td>
                  <td className="mono">{p.order_id}</td>
                  <td>{p.provider}</td>
                  <td className="mono">{p.provider_payment_id}</td>
                  <td>${Number(p.amount).toFixed(2)}</td>
                  <td><span className={statusBadgeClass(p.status)}>{p.status}</span></td>
                  <td>{p.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
