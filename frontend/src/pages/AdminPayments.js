import React, {useEffect, useState} from 'react';
import axios from 'axios';

export default function AdminPayments(){
  const [payments, setPayments] = useState([]);
  useEffect(()=>{
    const token = localStorage.getItem('access_token');
    axios.get('/admin/payments', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r=>setPayments(r.data))
      .catch(()=>setPayments([]))
  },[])
  return (
    <div>
      <h2>Admin - Pagos</h2>
      <table>
        <thead><tr><th>ID</th><th>Order</th><th>Provider</th><th>Provider ID</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.order_id}</td>
              <td>{p.provider}</td>
              <td>{p.provider_payment_id}</td>
              <td>{p.amount}</td>
              <td>{p.status}</td>
              <td>{p.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
