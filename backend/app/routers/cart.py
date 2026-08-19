from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app import crud, models
from app.deps import get_current_active_user
from decimal import Decimal
from app.services.inventory_service import reserve_inventory, release_inventory

router = APIRouter()


async def _get_or_create_cart(db: AsyncSession, user_id: str):
    # find existing cart
    q = await db.execute("SELECT id FROM orders WHERE user_id = :uid AND status = 'cart' LIMIT 1", {'uid': user_id})
    row = q.fetchone()
    if row:
        return str(row[0])
    # create cart order
    order = models.Order(user_id=user_id, status='cart')
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return str(order.id)


@router.get('/', response_model=dict)
async def get_cart(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    q = await db.execute('SELECT * FROM orders WHERE user_id = :uid AND status = :st LIMIT 1', {'uid': str(current_user.id), 'st': 'cart'})
    row = q.fetchone()
    if not row:
        return {'items': [], 'total_amount': 0}
    order_id = row[0]
    q2 = await db.execute('SELECT product_id, quantity, unit_price, total_price FROM order_items WHERE order_id = :oid', {'oid': order_id})
    items = [dict(r) for r in q2.fetchall()]
    return {'order_id': str(order_id), 'items': items, 'total_amount': float(row[3] or 0)}


@router.post('/add')
async def add_to_cart(payload: dict, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    product_id = payload.get('product_id')
    quantity = int(payload.get('quantity', 1))
    if not product_id:
        raise HTTPException(status_code=400, detail='product_id required')
    # get or create cart
    order_id = await _get_or_create_cart(db, str(current_user.id))
    # reserve inventory
    ok = await reserve_inventory(db, product_id, quantity)
    if not ok:
        raise HTTPException(status_code=400, detail='Insufficient stock')
    # add or update order_item
    q = await db.execute('SELECT id, quantity FROM order_items WHERE order_id = :oid AND product_id = :pid', {'oid': order_id, 'pid': product_id})
    row = q.fetchone()
    # fetch product price
    prod = await crud.get_product(db, product_id)
    if not prod:
        await release_inventory(db, product_id, quantity)
        raise HTTPException(status_code=404, detail='Product not found')
    unit = prod.price
    if row:
        item_id, existing_qty = row[0], int(row[1])
        new_qty = existing_qty + quantity
        total_price = Decimal(unit) * new_qty
        await db.execute('UPDATE order_items SET quantity = :q, unit_price = :u, total_price = :t WHERE id = :id', {'q': new_qty, 'u': unit, 't': total_price, 'id': item_id})
    else:
        total_price = Decimal(unit) * quantity
        await db.execute('INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price) VALUES (gen_random_uuid(), :oid, :pid, :q, :u, :t)', {'oid': order_id, 'pid': product_id, 'q': quantity, 'u': unit, 't': total_price})
    # update order total
    await db.execute('UPDATE orders SET total_amount = (SELECT COALESCE(SUM(total_price),0) FROM order_items WHERE order_id = :oid) WHERE id = :oid', {'oid': order_id})
    await db.commit()
    return {'order_id': order_id}


@router.post('/remove')
async def remove_from_cart(payload: dict, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    product_id = payload.get('product_id')
    if not product_id:
        raise HTTPException(status_code=400, detail='product_id required')
    q = await db.execute('SELECT id, quantity, order_id FROM order_items WHERE product_id = :pid AND order_id IN (SELECT id FROM orders WHERE user_id = :uid AND status = :st)', {'pid': product_id, 'uid': str(current_user.id), 'st': 'cart'})
    row = q.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='Item not in cart')
    item_id, qty, order_id = row[0], int(row[1]), str(row[2])
    # delete item and release inventory
    await db.execute('DELETE FROM order_items WHERE id = :id', {'id': item_id})
    await release_inventory(db, product_id, qty)
    await db.execute('UPDATE orders SET total_amount = (SELECT COALESCE(SUM(total_price),0) FROM order_items WHERE order_id = :oid) WHERE id = :oid', {'oid': order_id})
    await db.commit()
    return {'order_id': order_id}
