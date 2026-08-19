import React, {useEffect, useState} from 'react';
import axios from 'axios';

export default function AdminOrders(){
  const [orders, setOrders] = useState([]);
  useEffect(()=>{
    const token = localStorage.getItem('access_token');
    axios.get('/admin/orders', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r=>setOrders(r.data))
      .catch(()=>setOrders([]))
  },[])
  return (
    <div>
      <h2>Admin - Órdenes</h2>
      <table>
        <thead><tr><th>ID</th><th>User</th><th>Status</th><th>Total</th><th>Created</th></tr></thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.user_id}</td>
              <td>{o.status}</td>
              <td>{o.total_amount}</td>
              <td>{o.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
