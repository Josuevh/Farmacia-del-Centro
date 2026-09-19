from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app import models
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# How often to write last_seen_at — every request would be wasteful; this is only
# for the admin panel's "quién está en línea" indicator, so a bit of staleness is fine.
PRESENCE_UPDATE_INTERVAL = timedelta(seconds=30)


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    q = await db.execute(select(models.User).where(models.User.id == user_id))
    user = q.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    now = datetime.now(timezone.utc)
    if not user.last_seen_at or (now - user.last_seen_at) > PRESENCE_UPDATE_INTERVAL:
        user.last_seen_at = now
        await db.commit()
        await db.refresh(user)
    return user

async def get_current_active_user(current_user = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin(current_user = Depends(get_current_active_user)):
    # "Admin panel" access — the client's operadores get the exact same panel access
    # as the owner/admin account; only the operator-management area (get_current_superadmin
    # below) is restricted to the real admin. Built on get_current_active_user (not
    # get_current_user directly) so a deactivated operator loses access immediately,
    # not just on the customer-facing side.
    if current_user.role not in ('admin', 'operador'):
        raise HTTPException(status_code=403, detail="Requires admin role")
    return current_user

async def get_current_superadmin(current_user = Depends(get_current_active_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Requires admin (owner) role")
    return current_user
