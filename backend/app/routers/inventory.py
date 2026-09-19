from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import models
from app.db import get_db
from app.deps import get_current_admin
from app.schemas import InventoryUpdate
from app.services.inventory_service import get_available_quantity
from app.services.activity_log import log_activity

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


@router.patch('/{product_id}')
async def update_inventory(product_id: str, data: InventoryUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    q = await db.execute(select(models.Inventory).where(models.Inventory.product_id == product_id))
    inv = q.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail='Inventory record not found')
    payload = data.dict(exclude_unset=True)
    if 'quantity' in payload and payload['quantity'] is not None:
        if payload['quantity'] < inv.reserved:
            raise HTTPException(status_code=400, detail='Quantity cannot be less than reserved units')
        inv.quantity = payload['quantity']
    if 'location' in payload:
        inv.location = payload['location']

    product_q = await db.execute(select(models.Product.name).where(models.Product.id == product_id))
    product_name = product_q.scalars().first() or product_id
    log_activity(db, current_user, f"Actualizó inventario de {product_name} (cantidad: {inv.quantity})", resource_type='inventory', resource_id=inv.id)

    await db.commit()
    await db.refresh(inv)
    return {
        'id': str(inv.id),
        'product_id': str(inv.product_id),
        'quantity': inv.quantity,
        'reserved': inv.reserved,
        'available': max(0, inv.quantity - inv.reserved),
        'location': inv.location,
    }
