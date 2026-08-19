from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas import UserCreate, Token
from app.db import get_db
from app import crud
from sqlalchemy.ext.asyncio import AsyncSession
from app.core import security

router = APIRouter()


@router.post('/register', response_model=dict)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await crud.create_user(db, user_in.email, user_in.password, user_in.full_name)
    return {"id": str(user.id), "email": user.email}


@router.post('/token', response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail='Incorrect credentials')
    token = security.create_access_token({"user_id": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.post('/login', response_model=Token)
async def login_json(payload: dict, db: AsyncSession = Depends(get_db)):
    username = payload.get('email')
    password = payload.get('password')
    if not username or not password:
        raise HTTPException(status_code=400, detail='email and password required')
    user = await crud.authenticate_user(db, username, password)
    if not user:
        raise HTTPException(status_code=401, detail='Incorrect credentials')
    token = security.create_access_token({"user_id": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.get('/me', response_model=UserOut)
async def read_current_user(current_user=Depends(get_current_active_user)):
    return current_user
