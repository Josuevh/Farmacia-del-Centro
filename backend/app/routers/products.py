from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from typing import List
from app import models
from app.schemas import ProductOut, ProductCreate
from app.db import get_db
from app.crud import list_products, get_product, create_product
from app.services import catalog_import
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_current_active_user, get_current_admin
from app.services.activity_log import log_activity

router = APIRouter()

@router.get("/", response_model=List[ProductOut])
async def read_products(limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_db)):
    items = await list_products(db, limit, offset)
    return items


# Registered before /{product_id} so "import" isn't swallowed by that catch-all route.
@router.get("/import/template")
async def download_import_template(current_user=Depends(get_current_admin)):
    content = catalog_import.build_template_workbook()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=plantilla_catalogo.xlsx"},
    )


@router.post("/import")
async def import_catalog(
    dry_run: bool = True,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    content = await file.read()
    try:
        rows = catalog_import.parse_file(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not rows:
        raise HTTPException(status_code=400, detail='El archivo no tiene filas de datos reconocibles. Revisa que use los encabezados de la plantilla.')
    result = await catalog_import.process_rows(db, rows, commit=not dry_run)
    if not dry_run:
        log_activity(db, current_user, f"Importó catálogo desde {file.filename} ({len(rows)} filas)", resource_type='product')
        await db.commit()
    return result


@router.get("/{product_id}", response_model=ProductOut)
async def read_product(product_id: str, db: AsyncSession = Depends(get_db)):
    p = await get_product(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p

@router.post("/", response_model=ProductOut)
async def create_new_product(data: ProductCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    payload = data.dict()
    initial_quantity = payload.pop('initial_quantity', 0) or 0
    p = await create_product(db, payload)
    db.add(models.Inventory(product_id=p.id, quantity=initial_quantity, reserved=0))
    log_activity(db, current_user, f"Creó el producto {p.name}", resource_type='product', resource_id=p.id)
    await db.commit()
    return p


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, data: ProductCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    p = await get_product(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail='Product not found')
    for k, v in data.dict(exclude_unset=True).items():
        if k == 'initial_quantity':
            continue
        setattr(p, k, v)
    log_activity(db, current_user, f"Actualizó el producto {p.name}", resource_type='product', resource_id=p.id)
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/{product_id}")
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    p = await get_product(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail='Product not found')
    log_activity(db, current_user, f"Eliminó el producto {p.name}", resource_type='product', resource_id=p.id)
    await db.delete(p)
    await db.commit()
    return {'status': 'deleted'}
