from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas import ProductOut, ProductCreate
from app.db import get_db
from app.crud import list_products, get_product, create_product
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_current_active_user, get_current_admin

router = APIRouter()

@router.get("/", response_model=List[ProductOut])
async def read_products(limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_db)):
    items = await list_products(db, limit, offset)
    return items

@router.get("/{product_id}", response_model=ProductOut)
async def read_product(product_id: str, db: AsyncSession = Depends(get_db)):
    p = await get_product(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p

@router.post("/", response_model=ProductOut)
async def create_new_product(data: ProductCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    p = await create_product(db, data.dict())
    return p


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, data: ProductCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    p = await get_product(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail='Product not found')
    for k, v in data.dict(exclude_unset=True).items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/{product_id}")
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    p = await get_product(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail='Product not found')
    await db.delete(p)
    await db.commit()
    return {'status': 'deleted'}
