from decimal import Decimal
from app import models
from app.crud import get_product
from app.services.inventory_service import reserve_inventory, release_inventory, validate_stock_for_items
from app.db import AsyncSession


async def create_order_with_items(db: AsyncSession, user_id: str, items: list):
    """Business layer: validates stock, reserves it, creates order and items."""
    await validate_stock_for_items(db, items)

    order = models.Order(user_id=user_id, status='pending_payment')
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
