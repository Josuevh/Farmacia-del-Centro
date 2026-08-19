from sqlalchemy.future import select
from sqlalchemy import update
from app import models
from app.db import AsyncSession
from passlib.context import CryptContext
from decimal import Decimal

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_product(db: AsyncSession, product_id):
    q = await db.execute(select(models.Product).where(models.Product.id == product_id))
    return q.scalars().first()

async def list_products(db: AsyncSession, limit: int = 50, offset: int = 0):
    q = await db.execute(select(models.Product).offset(offset).limit(limit))
    return q.scalars().all()

async def create_user(db: AsyncSession, email: str, password: str, full_name: str = None):
    hashed = pwd_context.hash(password)
    user = models.User(email=email, password_hash=hashed, full_name=full_name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def authenticate_user(db: AsyncSession, email: str, password: str):
    q = await db.execute(select(models.User).where(models.User.email == email))
    user = q.scalars().first()
    if not user:
        return None
    if not pwd_context.verify(password, user.password_hash):
        return None
    return user

async def create_product(db: AsyncSession, product_data: dict):
    p = models.Product(**product_data)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p

async def create_order(db: AsyncSession, order: models.Order):
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def create_payment(db: AsyncSession, order_id: str, provider: str, provider_payment_id: str, amount, currency: str = 'USD', status: str = 'initiated', metadata: dict = None):
    # Check for existing payment with same provider_payment_id to avoid duplicates
    if provider_payment_id:
        q = await db.execute(select(models.Payment).where(models.Payment.provider == provider).where(models.Payment.provider_payment_id == provider_payment_id))
        existing = q.scalars().first()
        if existing:
            return existing
    payment = models.Payment(order_id=order_id, provider=provider, provider_payment_id=provider_payment_id, amount=amount, currency=currency, status=status, metadata=metadata)
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


async def mark_order_paid(db: AsyncSession, order_id: str):
    q = await db.execute(select(models.Order).where(models.Order.id == order_id))
    order = q.scalars().first()
    if not order:
        return None
    order.status = 'paid'
    await db.commit()
    await db.refresh(order)
    return order


async def get_orders_by_user(db: AsyncSession, user_id: str):
    q = await db.execute(select(models.Order).where(models.Order.user_id == user_id).order_by(models.Order.created_at.desc()))
    return q.scalars().all()


async def is_event_processed(db: AsyncSession, event_id: str):
    q = await db.execute(select(models.StripeEvent).where(models.StripeEvent.event_id == event_id))
    return q.scalars().first() is not None


async def mark_event_processed(db: AsyncSession, event_id: str, payload: dict = None):
    se = models.StripeEvent(event_id=event_id, payload=payload)
    db.add(se)
    try:
        await db.commit()
    except Exception:
        # ignore race conditions where another process inserted the same event
        await db.rollback()
    return True
