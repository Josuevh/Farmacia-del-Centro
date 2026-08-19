from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.config import settings
import stripe
from app.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app import crud
from decimal import Decimal
from app.deps import get_current_active_user
from app.services.inventory_service import finalize_order_inventory
from app.services.order_service import create_order_with_items

router = APIRouter()

stripe.api_key = settings.STRIPE_API_KEY


@router.post('/create-checkout-session')
async def create_checkout_session(payload: dict):
    # payload should contain 'amount' in cents and 'currency' and 'success_url'/'cancel_url' and optional metadata
    amount = payload.get('amount')
    currency = payload.get('currency', 'usd')
    success_url = payload.get('success_url', 'https://example.com/success')
    cancel_url = payload.get('cancel_url', 'https://example.com/cancel')
    metadata = payload.get('metadata', {})
    if not amount:
        raise HTTPException(status_code=400, detail='amount required (in cents)')
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': currency,
                'product_data': {'name': 'Compra Farmacia'},
                'unit_amount': int(amount),
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    return {'checkout_url': session.url, 'session_id': session.id}


@router.post('/webhook')
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Webhook error: {e}')

    event_id = event.get('id')
    # Idempotency: if event already processed, return success
    if event_id and await crud.is_event_processed(db, event_id):
        return {'status': 'already_processed'}

    # Handle the checkout.session.completed event
    try:
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            # metadata should include order_id if available
            order_id = session.get('metadata', {}).get('order_id')
            amount = session.get('amount_total') or session.get('amount_subtotal')
            currency = session.get('currency') or 'usd'
            try:
                amt = Decimal(int(amount)) / Decimal(100) if amount else None
            except Exception:
                amt = None

            # finalize inventory reservations for order
            if order_id:
                await finalize_order_inventory(db, order_id)
            # create payment record (crud.create_payment is idempotent by provider_payment_id)
            await crud.create_payment(db, order_id=order_id, provider='stripe', provider_payment_id=session.get('id'), amount=amt, currency=currency, status='succeeded', metadata=session)
            # mark order as paid if order_id provided
            if order_id:
                await crud.mark_order_paid(db, order_id)

        # mark event processed only after successful handling
        if event_id:
            await crud.mark_event_processed(db, event_id, payload=event)
    except Exception as e:
        # Do not mark event as processed; return 500 so Stripe will retry
        raise HTTPException(status_code=500, detail=f'Processing error: {e}')

    return {'status': 'success'}



@router.post('/checkout-order')
async def checkout_order(payload: dict, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    """Crea una orden en backend, reserva stock y devuelve URL de Stripe Checkout.
    Requiere autenticación; si se desea permitir guest, adaptar."""
    from app.schemas import OrderCreate
    # Validate basic structure
    items = payload.get('items')
    if not items:
        raise HTTPException(status_code=400, detail='items required')
    # create order
    user_id = payload.get('user_id') or None
    if not user_id:
        # require authenticated user
        raise HTTPException(status_code=401, detail='Authentication required')
    try:
        order = await create_order_with_items(db, user_id, items)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # create stripe session
    amount_cents = int(Decimal(order.total_amount) * Decimal(100)) if order.total_amount else 0
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {'name': f'Orden {order.id}'},
                'unit_amount': amount_cents,
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url=payload.get('success_url', 'https://example.com/success'),
        cancel_url=payload.get('cancel_url', 'https://example.com/cancel'),
        metadata={'order_id': str(order.id)}
    )
    return {'checkout_url': session.url, 'session_id': session.id, 'order_id': str(order.id)}
