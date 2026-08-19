from fastapi import APIRouter, Depends, HTTPException
from app.deps import get_current_admin
from app.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app import crud

router = APIRouter()

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
    q = await db.execute('SELECT id, user_id, status, total_amount, created_at FROM orders ORDER BY created_at DESC LIMIT :limit OFFSET :offset', {'limit': limit, 'offset': offset})
    rows = q.fetchall()
    return [dict(row) for row in rows]
