from fastapi import APIRouter, Depends, HTTPException
from app.schemas import OrderCreate, OrderOut
from app.db import get_db
from app import crud
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_current_active_user
from app.services.order_service import create_order_with_items

router = APIRouter()


@router.post('/', response_model=OrderOut)
async def create_order(order_in: OrderCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    user_id = order_in.user_id or str(current_user.id)
    try:
        order = await create_order_with_items(db, user_id, [ { 'product_id': str(i.product_id), 'quantity': int(i.quantity) } for i in order_in.items ])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return order


@router.get('/my-orders', response_model=list[OrderOut])
async def my_orders(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    orders = await crud.get_orders_by_user(db, str(current_user.id))
    return orders
