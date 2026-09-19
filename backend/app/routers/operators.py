from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import models, crud
from app.db import get_db
from app.deps import get_current_superadmin
from app.schemas import OperatorCreate, OperatorOut, ActivityLogOut
from app.services.activity_log import log_activity

router = APIRouter()

# Matches the ~30s presence heartbeat in deps.py with a comfortable margin, so an
# operator who just navigated away doesn't flicker to "offline" between requests.
ONLINE_THRESHOLD = timedelta(minutes=2)


def _serialize_operator(user: models.User) -> dict:
    now = datetime.now(timezone.utc)
    is_online = bool(user.last_seen_at and (now - user.last_seen_at) <= ONLINE_THRESHOLD)
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_online": is_online,
        "last_seen_at": user.last_seen_at,
        "created_at": user.created_at,
    }


@router.get('/', response_model=List[OperatorOut])
async def list_operators(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_superadmin)):
    q = await db.execute(
        select(models.User)
        .where(models.User.role == 'operador')
        .order_by(models.User.created_at.desc())
    )
    return [_serialize_operator(u) for u in q.scalars().all()]


@router.post('/', response_model=OperatorOut)
async def create_operator(data: OperatorCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_superadmin)):
    q = await db.execute(select(models.User).where(models.User.email == data.email))
    if q.scalars().first():
        raise HTTPException(status_code=400, detail='Ya existe una cuenta con ese correo')
    # commit=False: the account creation and its audit-log entry land in one
    # transaction — if the commit below fails, the operator account was never
    # actually created either, instead of existing with no record of who made it.
    user = await crud.create_user(db, data.email, data.password, data.full_name, role='operador', commit=False)
    log_activity(db, current_user, f"Dio de alta al operador {user.email}", resource_type='user', resource_id=user.id)
    await db.commit()
    await db.refresh(user)
    return _serialize_operator(user)


@router.get('/activity', response_model=List[ActivityLogOut])
async def list_activity(
    user_id: Optional[str] = None,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_superadmin),
):
    stmt = (
        select(models.AuditLog, models.User.email, models.User.full_name)
        .outerjoin(models.User, models.User.id == models.AuditLog.user_id)
        .order_by(models.AuditLog.created_at.desc())
        .limit(min(limit, 500))
    )
    if user_id:
        stmt = stmt.where(models.AuditLog.user_id == user_id)
    q = await db.execute(stmt)
    return [
        {
            "id": log.id,
            "actor_email": email,
            "actor_name": full_name,
            "action": log.action,
            "resource_type": log.resource_type,
            "created_at": log.created_at,
        }
        for log, email, full_name in q.all()
    ]


@router.patch('/{operator_id}', response_model=OperatorOut)
async def set_operator_active(operator_id: str, is_active: bool, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_superadmin)):
    q = await db.execute(select(models.User).where(models.User.id == operator_id).where(models.User.role == 'operador'))
    user = q.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail='Operador no encontrado')
    user.is_active = is_active
    log_activity(
        db, current_user,
        f"{'Activó' if is_active else 'Desactivó'} al operador {user.email}",
        resource_type='user', resource_id=user.id,
    )
    await db.commit()
    await db.refresh(user)
    return _serialize_operator(user)
