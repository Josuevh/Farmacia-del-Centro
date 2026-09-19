import os
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import models
from app.db import get_db
from app.deps import get_current_active_user, get_current_admin
from app.schemas import PrescriptionOut, PrescriptionReview
from app.services.activity_log import log_activity

router = APIRouter()

UPLOAD_DIR = "/app/uploads/prescriptions"
ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "application/pdf": ".pdf"}
MAX_SIZE = 8 * 1024 * 1024

os.makedirs(UPLOAD_DIR, exist_ok=True)


def _serialize(presc: models.Prescription) -> dict:
    """Recetas médicas son datos sensibles: el archivo ya no se sirve por una ruta
    estática pública, así que aquí sustituimos la ruta interna de disco por la URL
    del endpoint autenticado (/prescriptions/{id}/file), que sí valida quién pregunta."""
    raw_path = presc.file_url or ''
    return {
        "id": presc.id,
        "user_id": presc.user_id,
        "order_id": presc.order_id,
        "file_url": f"/prescriptions/{presc.id}/file",
        "is_pdf": raw_path.lower().endswith('.pdf'),
        "doctor_name": presc.doctor_name,
        "issued_date": presc.issued_date,
        "status": presc.status,
        "notes": presc.notes,
        "created_at": presc.created_at,
    }


@router.post('/', response_model=PrescriptionOut)
async def upload_prescription(
    file: UploadFile = File(...),
    doctor_name: Optional[str] = Form(None),
    issued_date: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    ext = ALLOWED_TYPES.get(file.content_type)
    if not ext:
        raise HTTPException(status_code=400, detail='Formato no permitido. Usa JPG, PNG o PDF.')
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail='El archivo supera los 8MB permitidos.')

    filename = f"{uuid.uuid4()}{ext}"
    with open(os.path.join(UPLOAD_DIR, filename), 'wb') as f:
        f.write(content)

    parsed_date = None
    if issued_date:
        try:
            parsed_date = datetime.date.fromisoformat(issued_date)
        except ValueError:
            pass

    presc = models.Prescription(
        user_id=current_user.id,
        file_url=f"/uploads/prescriptions/{filename}",
        doctor_name=doctor_name or None,
        issued_date=parsed_date,
        status='pending',
    )
    db.add(presc)
    await db.commit()
    await db.refresh(presc)
    return _serialize(presc)


@router.get('/me', response_model=List[PrescriptionOut])
async def my_prescriptions(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    q = await db.execute(
        select(models.Prescription)
        .where(models.Prescription.user_id == current_user.id)
        .order_by(models.Prescription.created_at.desc())
    )
    return [_serialize(p) for p in q.scalars().all()]


@router.get('/', response_model=List[PrescriptionOut])
async def list_prescriptions(status: Optional[str] = None, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    stmt = select(models.Prescription).order_by(models.Prescription.created_at.desc())
    if status:
        stmt = stmt.where(models.Prescription.status == status)
    q = await db.execute(stmt)
    return [_serialize(p) for p in q.scalars().all()]


@router.get('/{prescription_id}/file')
async def get_prescription_file(prescription_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    q = await db.execute(select(models.Prescription).where(models.Prescription.id == prescription_id))
    presc = q.scalars().first()
    if not presc:
        raise HTTPException(status_code=404, detail='Prescription not found')
    if current_user.role not in ('admin', 'operador') and str(presc.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail='No autorizado para ver este archivo')
    disk_path = os.path.join(UPLOAD_DIR, os.path.basename(presc.file_url or ''))
    if not os.path.isfile(disk_path):
        raise HTTPException(status_code=404, detail='Archivo no encontrado')
    return FileResponse(disk_path)


@router.patch('/{prescription_id}', response_model=PrescriptionOut)
async def review_prescription(prescription_id: str, data: PrescriptionReview, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    if data.status not in ('approved', 'rejected'):
        raise HTTPException(status_code=400, detail="status debe ser 'approved' o 'rejected'")
    q = await db.execute(select(models.Prescription).where(models.Prescription.id == prescription_id))
    presc = q.scalars().first()
    if not presc:
        raise HTTPException(status_code=404, detail='Prescription not found')
    presc.status = data.status
    presc.notes = data.notes
    presc.reviewed_by = current_user.id

    customer_q = await db.execute(select(models.User.email).where(models.User.id == presc.user_id))
    customer_email = customer_q.scalars().first() or 'cliente desconocido'
    verb = 'Aprobó' if data.status == 'approved' else 'Rechazó'
    log_activity(db, current_user, f"{verb} la receta de {customer_email}", resource_type='prescription', resource_id=presc.id)

    await db.commit()
    await db.refresh(presc)
    return _serialize(presc)
