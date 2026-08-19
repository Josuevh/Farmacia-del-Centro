from sqlalchemy.future import select
from app import models
from app.db import AsyncSession


async def get_available_quantity(db: AsyncSession, product_id: str) -> int:
    q = await db.execute(select(models.Inventory).where(models.Inventory.product_id == product_id))
    inv = q.scalars().first()
    if not inv:
        return 0
    return max(0, (inv.quantity - inv.reserved))


async def reserve_inventory(db: AsyncSession, product_id: str, quantity: int) -> bool:
    """Business rule: only reserve if available stock is enough."""
    q = await db.execute(select(models.Inventory).where(models.Inventory.product_id == product_id))
    inv = q.scalars().first()
    if not inv:
        return False
    available = inv.quantity - inv.reserved
    if available < quantity:
        return False
    inv.quantity = inv.quantity - quantity
    inv.reserved = inv.reserved + quantity
    await db.commit()
    await db.refresh(inv)
    return True


async def release_inventory(db: AsyncSession, product_id: str, quantity: int) -> bool:
    q = await db.execute(select(models.Inventory).where(models.Inventory.product_id == product_id))
    inv = q.scalars().first()
    if not inv:
        return False
    inv.quantity = inv.quantity + quantity
    inv.reserved = max(0, inv.reserved - quantity)
    await db.commit()
    await db.refresh(inv)
    return True


async def finalize_order_inventory(db: AsyncSession, order_id: str) -> bool:
    q = await db.execute(select(models.OrderItem).where(models.OrderItem.order_id == order_id))
    items = q.scalars().all()
    for it in items:
        inv_q = await db.execute(select(models.Inventory).where(models.Inventory.product_id == it.product_id))
        inv = inv_q.scalars().first()
        if inv:
            inv.reserved = max(0, inv.reserved - it.quantity)
            await db.commit()
            await db.refresh(inv)
    return True


async def validate_stock_for_items(db: AsyncSession, items: list) -> None:
    for item in items:
        product_id = item['product_id']
        quantity = int(item['quantity'])
        available = await get_available_quantity(db, product_id)
        if available < quantity:
            raise ValueError(f'Insufficient stock for product {product_id}')
