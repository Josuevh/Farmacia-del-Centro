from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import models
from app.db import get_db
from app.deps import get_current_admin
from app.schemas import CategoryOut, CategoryCreate

router = APIRouter()


@router.get('/', response_model=List[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(models.Category).order_by(models.Category.name))
    return q.scalars().all()


@router.post('/', response_model=CategoryOut)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    slug = data.slug or data.name.lower().replace(' ', '-')
    q = await db.execute(select(models.Category).where(models.Category.slug == slug))
    if q.scalars().first():
        raise HTTPException(status_code=400, detail='A category with that slug already exists')
    cat = models.Category(name=data.name, slug=slug)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete('/{category_id}')
async def delete_category(category_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    q = await db.execute(select(models.Category).where(models.Category.id == category_id))
    cat = q.scalars().first()
    if not cat:
        raise HTTPException(status_code=404, detail='Category not found')
    await db.delete(cat)
    await db.commit()
    return {'status': 'deleted'}
