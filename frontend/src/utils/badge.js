export function statusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (['paid', 'succeeded', 'completed', 'active', 'approved'].includes(s)) return 'badge badge-success';
  if (['pending_payment', 'initiated', 'ready_for_pickup', 'pending'].includes(s)) return 'badge badge-warning';
  if (['cancelled', 'failed', 'refunded', 'rejected'].includes(s)) return 'badge badge-danger';
  if (['cart'].includes(s)) return 'badge badge-info';
  return 'badge badge-neutral';
}

export const ORDER_STATUS_LABEL = {
  cart: 'Carrito',
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  ready_for_pickup: 'Listo para recoger',
  completed: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};
