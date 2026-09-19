import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { statusBadgeClass, ORDER_STATUS_LABEL } from '../utils/badge';

function authHeaders(){
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MyOrders(){
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    axios.get('/orders/my-orders', { headers: authHeaders() })
      .then(r=>setOrders(r.data))
      .catch(()=>setOrders([]))
      .finally(()=>setLoading(false));
  },[])

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Mis pedidos</h2>
          <p>Presenta tu código en el mostrador para recoger tu pedido</p>
        </div>
      </div>

      {loading ? (
        <div className="center-loader"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state card"><h3>Aún no tienes pedidos</h3><p>Cuando pagues un pedido, aparecerá aquí con su código de recolección.</p></div>
      ) : (
        <div className="prescription-list">
          {orders.map(o => (
            <div className="card prescription-row" key={o.id}>
              <div className="prescription-row-thumb">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4-9 4-9-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M3 7v10l9 4 9-4V7M12 11v10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
              </div>
              <div className="prescription-row-body">
                <strong>{o.pickup_code || `Pedido ${o.id.slice(0, 8)}`}</strong>
                <span>${Number(o.total_amount).toFixed(2)} · {new Date(o.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <span className={statusBadgeClass(o.status) + ' prescription-row-status'}>
                {ORDER_STATUS_LABEL[o.status] || o.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
