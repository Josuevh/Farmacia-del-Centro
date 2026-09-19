import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { statusBadgeClass, ORDER_STATUS_LABEL } from '../utils/badge';
import { useToast } from '../components/Toast';

function authHeaders(){
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const NEXT_STEP = {
  pending_payment: { status: 'paid', label: 'Marcar como pagado', confirm: true },
  paid: { status: 'ready_for_pickup', label: 'Marcar listo para recoger' },
  ready_for_pickup: { status: 'completed', label: 'Confirmar entrega' },
};

export default function AdminOrders(){
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    axios.get('/admin/orders', { headers: authHeaders() })
      .then(r=>setOrders(r.data))
      .catch(()=>setOrders([]))
      .finally(()=>setLoading(false));
  }

  useEffect(()=>{ load(); },[])

  const advance = async (order, nextStatus, needsConfirm) => {
    if (needsConfirm && !window.confirm(`¿Confirmas que el pedido ${order.pickup_code || order.id} ya fue pagado? Úsalo solo si el pago se confirmó por otro medio (ej. Stripe) y no se reflejó aquí automáticamente.`)) return;
    setUpdatingId(order.id);
    try{
      await axios.patch(`/admin/orders/${order.id}/status`, { status: nextStatus }, { headers: authHeaders() });
      const messages = { completed: 'Pedido marcado como entregado', ready_for_pickup: 'Pedido listo para recoger', paid: 'Pedido marcado como pagado' };
      showToast(messages[nextStatus] || 'Pedido actualizado', 'success');
      load();
    }catch(e){
      showToast(e.response?.data?.detail || 'No se pudo actualizar el pedido', 'error');
    }finally{
      setUpdatingId(null);
    }
  }

  const cancel = async (order) => {
    const alreadyPaid = order.status === 'paid' || order.status === 'ready_for_pickup';
    const confirmMsg = alreadyPaid
      ? `Este pedido (${order.pickup_code || order.id}) ya está pagado. Al cancelarlo se le reembolsará el dinero al cliente automáticamente en Stripe. ¿Continuar?`
      : `¿Cancelar el pedido con código ${order.pickup_code || order.id}?`;
    if (!window.confirm(confirmMsg)) return;
    setUpdatingId(order.id);
    try{
      const res = await axios.patch(`/admin/orders/${order.id}/status`, { status: 'cancelled' }, { headers: authHeaders() });
      showToast(res.data.status === 'refunded' ? 'Pedido cancelado y reembolsado en Stripe' : 'Pedido cancelado', 'success');
      if (res.data.refund_note) showToast(res.data.refund_note, 'error');
      load();
    }catch(e){
      showToast(e.response?.data?.detail || 'No se pudo cancelar el pedido', 'error');
    }finally{
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Órdenes</h2>
          <p>Órdenes para recoger en tienda</p>
        </div>
      </div>

      {loading ? (
        <div className="center-loader"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state card"><h3>Sin órdenes</h3><p>Aún no se han registrado órdenes.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Código</th><th>Usuario</th><th>Estado</th><th>Total</th><th>Creado</th><th></th></tr></thead>
            <tbody>
              {orders.map(o => {
                const next = NEXT_STEP[o.status];
                const canCancel = o.status === 'pending_payment' || o.status === 'paid' || o.status === 'ready_for_pickup';
                return (
                  <tr key={o.id}>
                    <td className="mono">{o.pickup_code || '—'}</td>
                    <td className="mono">{o.user_id}</td>
                    <td><span className={statusBadgeClass(o.status)}>{ORDER_STATUS_LABEL[o.status] || o.status}</span></td>
                    <td>${Number(o.total_amount).toFixed(2)}</td>
                    <td>{o.created_at}</td>
                    <td>
                      <div className="row-actions">
                        {next && (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={updatingId === o.id}
                            onClick={()=>advance(o, next.status, next.confirm)}
                          >
                            {updatingId === o.id ? 'Actualizando…' : next.label}
                          </button>
                        )}
                        {canCancel && (
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={updatingId === o.id}
                            onClick={()=>cancel(o)}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
