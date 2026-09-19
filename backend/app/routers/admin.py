import stripe
from fastapi import APIRouter, Depends, HTTPException
from app.deps import get_current_admin
from app.db import get_db
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import crud, models
from app.schemas import OrderStatusUpdate
from app.services.inventory_service import finalize_order_inventory, release_order_inventory
from app.services.activity_log import log_activity

router = APIRouter()
stripe.api_key = settings.STRIPE_API_KEY

# Pickup-only order flow: an order can only ever move forward one step at a
# time, and only staff (admin) can advance it — the customer never marks
# their own order as picked up.
# 'pending_payment' -> 'paid' is a manual fallback for when the Stripe webhook
# doesn't fire (e.g. stripe listen not running in dev); see update_order_status.
ORDER_STATUS_TRANSITIONS = {
    'pending_payment': {'paid', 'cancelled'},
    'paid': {'ready_for_pickup', 'cancelled', 'refunded'},
    'ready_for_pickup': {'completed', 'cancelled', 'refunded'},
}

@router.get('/stripe-events')
async def list_stripe_events(limit: int = 100, offset: int = 0, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    q = await db.execute('SELECT event_id, received_at, payload FROM stripe_events ORDER BY received_at DESC LIMIT :limit OFFSET :offset', {'limit': limit, 'offset': offset})
    rows = q.fetchall()
    return [dict(row) for row in rows]

@router.get('/payments')
async def list_payments(limit: int = 100, offset: int = 0, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    q = await db.execute('SELECT id, order_id, provider, provider_payment_id, amount, currency, status, created_at FROM payments ORDER BY created_at DESC LIMIT :limit OFFSET :offset', {'limit': limit, 'offset': offset})
    rows = q.fetchall()
    return [dict(row) for row in rows]

@router.get('/orders')
async def list_orders(limit: int = 100, offset: int = 0, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    q = await db.execute('SELECT id, user_id, status, total_amount, pickup_code, created_at FROM orders ORDER BY created_at DESC LIMIT :limit OFFSET :offset', {'limit': limit, 'offset': offset})
    rows = q.fetchall()
    return [dict(row) for row in rows]

@router.patch('/orders/{order_id}/status')
async def update_order_status(order_id: str, data: OrderStatusUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    # Locks the row until this request commits or rolls back — without this, two
    # concurrent requests (a double-click, or two staff sessions) can both read
    # the same 'pending_payment' order before either writes, both pass the
    # transition check below, and both create a duplicate manual payment.
    q = await db.execute(select(models.Order).where(models.Order.id == order_id).with_for_update())
    order = q.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    allowed = ORDER_STATUS_TRANSITIONS.get(order.status, set())
    if data.status not in allowed:
        raise HTTPException(status_code=400, detail=f"No se puede pasar de \"{order.status}\" a \"{data.status}\"")

    if order.status == 'pending_payment' and data.status == 'paid':
        # Manual fallback for when the Stripe webhook never fires — mirrors what
        # payments.py's webhook does on checkout.session.completed: release the
        # reserved stock into a real deduction and leave an audit trail in payments.
        await finalize_order_inventory(db, str(order.id))
        await crud.create_payment(
            db, order_id=str(order.id), provider='manual', provider_payment_id=None,
            amount=order.total_amount, currency='usd', status='succeeded',
            payment_metadata={'marked_paid_by_admin': str(current_user.id)},
        )
    elif order.status == 'pending_payment' and data.status == 'cancelled':
        # Nothing was ever charged, but stock was reserved at checkout — give it
        # back or it stays permanently unavailable even though nothing sold.
        await release_order_inventory(db, str(order.id))

    previous_status = order.status
    final_status = data.status
    refund_note = None

    # Cancelling (or explicitly refunding) an order that was already charged must
    # actually return the money via Stripe — changing the label alone would leave
    # the customer's card charged with no way to get it back except the admin
    # manually finding it in the Stripe dashboard.
    if previous_status in ('paid', 'ready_for_pickup') and data.status in ('cancelled', 'refunded'):
        payment_q = await db.execute(
            select(models.Payment)
            .where(models.Payment.order_id == order.id)
            .where(models.Payment.status == 'succeeded')
            .order_by(models.Payment.created_at.desc())
        )
        payment = payment_q.scalars().first()
        payment_intent_id = (payment.payment_metadata or {}).get('payment_intent') if payment and payment.provider == 'stripe' else None

        if payment_intent_id:
            try:
                stripe.Refund.create(payment_intent=payment_intent_id)
            except stripe.error.StripeError as e:
                raise HTTPException(status_code=502, detail=f'Stripe no pudo procesar el reembolso: {e.user_message or str(e)}')
            payment.status = 'refunded'
            final_status = 'refunded'
        else:
            # No hay un pago de Stripe identificable (ej. se marcó "pagado" manualmente
            # sin pasar por el webhook) — se permite el cambio de estado, pero se avisa
            # que el reembolso, si aplica, hay que hacerlo a mano en el Dashboard de Stripe.
            refund_note = 'No se encontró un pago de Stripe asociado a este pedido — si el cliente ya pagó, reembólsalo manualmente desde el Dashboard de Stripe.'

    order.status = final_status
    log_activity(
        db, current_user,
        f"Cambió el pedido {order.pickup_code or order.id} de \"{previous_status}\" a \"{final_status}\""
        + (" (reembolso real ejecutado en Stripe)" if final_status == 'refunded' and not refund_note else ""),
        resource_type='order', resource_id=order.id,
    )
    await db.commit()
    await db.refresh(order)
    return {'id': str(order.id), 'status': order.status, 'pickup_code': order.pickup_code, 'refund_note': refund_note}
