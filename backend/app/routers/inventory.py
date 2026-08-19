from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import models
from app.db import get_db
from app.deps import get_current_admin
from app.services.inventory_service import get_available_quantity

router = APIRouter()


@router.get('/')
async def list_inventory(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    q = await db.execute(select(models.Inventory))
    rows = q.scalars().all()
    payload = []
    for inv in rows:
        payload.append({
            'id': str(inv.id),
            'product_id': str(inv.product_id),
            'quantity': inv.quantity,
            'reserved': inv.reserved,
            'available': max(0, inv.quantity - inv.reserved),
            'location': inv.location,
        })
    return payload


@router.get('/{product_id}')
async def get_inventory_for_product(product_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    available = await get_available_quantity(db, product_id)
    return {'product_id': product_id, 'available': available}
