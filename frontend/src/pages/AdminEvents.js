import React, {useEffect, useState} from 'react';
import axios from 'axios';

export default function AdminEvents(){
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const token = localStorage.getItem('access_token');
    axios.get('/admin/stripe-events', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r=>setEvents(r.data))
      .catch(()=>setEvents([]))
      .finally(()=>setLoading(false))
  },[])

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Eventos Stripe</h2>
          <p>Eventos recibidos desde Stripe</p>
        </div>
      </div>

      {loading ? (
        <div className="center-loader"><div className="spinner" /></div>
      ) : events.length === 0 ? (
        <div className="empty-state card"><h3>Sin eventos</h3><p>No se han recibido eventos de Stripe.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Event ID</th><th>Recibido</th><th>Payload</th></tr></thead>
            <tbody>
              {events.map(e => (
                <tr key={e.event_id}>
                  <td className="mono">{e.event_id}</td>
                  <td>{e.received_at}</td>
                  <td><pre className="payload-box">{JSON.stringify(e.payload,null,2)}</pre></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
