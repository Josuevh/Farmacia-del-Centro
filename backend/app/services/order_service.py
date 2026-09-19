import random
import string
from decimal import Decimal
from sqlalchemy.future import select
from app import models
from app.crud import get_product
from app.services.inventory_service import reserve_inventory, release_inventory, validate_stock_for_items
from app.db import AsyncSession

# Excludes visually ambiguous characters (0/O, 1/I) since customers read this aloud at the counter.
_PICKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def _generate_pickup_code() -> str:
    return 'FC-' + ''.join(random.choices(_PICKUP_CODE_ALPHABET, k=6))


async def _assert_prescriptions_cleared(db: AsyncSession, user_id: str, items: list):
    """Blocks checkout if any item requires a prescription and the user has
    no prescription approved by a pharmacist/admin on file."""
    blocked_names = []
    for item in items:
        product = await get_product(db, item['product_id'])
        if product and product.requires_prescription:
            blocked_names.append(product.name)
    if not blocked_names:
        return
    q = await db.execute(
        select(models.Prescription.id)
        .where(models.Prescription.user_id == user_id)
        .where(models.Prescription.status == 'approved')
        .limit(1)
    )
    if q.scalars().first():
        return
    raise ValueError(
        'Necesitas una receta médica aprobada para comprar: ' + ', '.join(blocked_names)
        + '. Sube tu receta en "Mis recetas" y espera a que sea aprobada.'
    )


async def create_order_with_items(db: AsyncSession, user_id: str, items: list):
    """Business layer: validates stock, reserves it, creates order and items."""
    await validate_stock_for_items(db, items)
    await _assert_prescriptions_cleared(db, user_id, items)

    order = models.Order(user_id=user_id, status='pending_payment', pickup_code=_generate_pickup_code())
    total = Decimal('0')
    db.add(order)
    await db.flush()
    reserved_items = []
    try:
        for item in items:
            product_id = item['product_id']
            quantity = int(item['quantity'])
            product = await get_product(db, product_id)
            if not product:
                raise ValueError(f'Product {product_id} not found')

            reserved = await reserve_inventory(db, product_id, quantity)
            if not reserved:
                raise ValueError(f'Insufficient stock for product {product.name}')

            reserved_items.append((product_id, quantity))
            unit = Decimal(product.price)
            total += unit * quantity
            oi = models.OrderItem(
                order_id=order.id,
                product_id=product_id,
                quantity=quantity,
                unit_price=unit,
                total_price=unit * quantity,
            )
            db.add(oi)
    except Exception:
        for pid, qty in reserved_items:
            await release_inventory(db, pid, qty)
        raise

    order.total_amount = total
    await db.commit()
    await db.refresh(order)
    return order
