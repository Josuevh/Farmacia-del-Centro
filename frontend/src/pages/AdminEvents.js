import React, {useEffect, useState} from 'react';
import axios from 'axios';

export default function AdminEvents(){
  const [events, setEvents] = useState([]);
  useEffect(()=>{
    const token = localStorage.getItem('access_token');
    axios.get('/admin/stripe-events', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r=>setEvents(r.data))
      .catch(()=>setEvents([]))
  },[])
  return (
    <div>
      <h2>Admin - Stripe Events</h2>
      <table>
        <thead><tr><th>Event ID</th><th>Received At</th><th>Payload (JSON)</th></tr></thead>
        <tbody>
          {events.map(e => (
            <tr key={e.event_id}>
              <td>{e.event_id}</td>
              <td>{e.received_at}</td>
              <td><pre style={{maxHeight:120,overflow:'auto'}}>{JSON.stringify(e.payload,null,2)}</pre></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
