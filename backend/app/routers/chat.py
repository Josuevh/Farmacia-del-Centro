import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import models
from app.db import get_db, AsyncSessionLocal
from app.deps import get_current_active_user, get_current_admin
from app.schemas import ChatMessageOut, ChatMessageCreate, ChatThreadOut
from app.services.ai_service import generate_reply
from app.services.activity_log import log_activity

router = APIRouter()

MAX_MESSAGE_LEN = 2000
AI_HISTORY_LIMIT = 12
BURST_COALESCE_SECONDS = 2.5
ADMIN_TAKEOVER_MINUTES = 30


def _parse_since(since: Optional[str]):
    """Parses the client's chat-session-boundary ISO string, if present and valid.
    Anything unparseable is treated as "no boundary" rather than a 400 — this only
    ever narrows what the customer sees of their own chat, never a security check,
    so failing open (show more, not less) is the safe direction for a bad value."""
    if not since:
        return None
    try:
        parsed = datetime.fromisoformat(since.replace('Z', '+00:00'))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


async def _build_catalog_context(db) -> str:
    """Real, current product data (name/price/category/prescription/stock) formatted
    as plain text for the AI's system prompt — this is what lets the bot answer price
    and availability questions accurately instead of refusing to guess."""
    q = await db.execute(
        select(
            models.Product.name,
            models.Product.price,
            models.Product.requires_prescription,
            models.Category.name.label('category_name'),
            (func.coalesce(models.Inventory.quantity, 0) - func.coalesce(models.Inventory.reserved, 0)).label('available'),
        )
        .outerjoin(models.Category, models.Category.id == models.Product.category_id)
        .outerjoin(models.Inventory, models.Inventory.product_id == models.Product.id)
        .where(models.Product.is_active.is_(True))
        .order_by(models.Product.price.asc())
    )
    lines = []
    for name, price, requires_prescription, category_name, available in q.all():
        receta = "requiere receta" if requires_prescription else "sin receta"
        disponible = "en stock" if (available or 0) > 0 else "agotado por ahora"
        lines.append(f"- {name} | ${float(price):.2f} MXN | {category_name or 'Sin categoría'} | {receta} | {disponible}")
    return "\n".join(lines)


async def _generate_and_store_bot_reply(customer_id: str, triggering_message_id, since: Optional[str] = None):
    """Runs after the response is sent, in its own DB session.

    Waits a couple seconds first so a rapid burst of customer messages ("hola" /
    "tengo una duda" / the actual question, three separate sends) only triggers one
    API call, not one per message. If a newer customer message has already arrived
    by the time we wake up, this task is stale — the task queued for that newer
    message will cover this one too, so we bail out rather than fire an overlapping,
    redundant call at the already-flaky free-tier API.

    `since`: the customer's current chat-session boundary (set on the frontend at
    widget mount, i.e. on page refresh or re-login) — when present, the AI only sees
    conversation history from that point on. Without this, a "reset" conversation
    would still have the bot silently remembering everything from before the reset,
    which would be confusing (it'd reference things the customer can no longer see)."""
    await asyncio.sleep(BURST_COALESCE_SECONDS)
    async with AsyncSessionLocal() as db:
        latest_q = await db.execute(
            select(models.ChatMessage.id)
            .where(models.ChatMessage.customer_id == customer_id)
            .order_by(models.ChatMessage.created_at.desc())
            .limit(1)
        )
        if str(latest_q.scalars().first()) != str(triggering_message_id):
            return

        # A human admin reply pauses the bot only while the admin is actively engaged
        # (a recent reply), not forever — an old one-off intervention (e.g. covering
        # for a bot hiccup) shouldn't permanently disable the bot for that customer.
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=ADMIN_TAKEOVER_MINUTES)
        recent_admin_q = await db.execute(
            select(models.ChatMessage.id)
            .where(models.ChatMessage.customer_id == customer_id)
            .where(models.ChatMessage.sender_role == 'admin')
            .where(models.ChatMessage.created_at >= cutoff)
            .limit(1)
        )
        if recent_admin_q.scalars().first() is not None:
            return

        history_stmt = (
            select(models.ChatMessage)
            .where(models.ChatMessage.customer_id == customer_id)
            .order_by(models.ChatMessage.created_at.desc())
            .limit(AI_HISTORY_LIMIT)
        )
        since_dt = _parse_since(since)
        if since_dt is not None:
            history_stmt = history_stmt.where(models.ChatMessage.created_at >= since_dt)
        history_q = await db.execute(history_stmt)
        recent = list(reversed(history_q.scalars().all()))
        history = [
            {"role": "user" if m.sender_role == "customer" else "model", "text": m.body}
            for m in recent
        ]
        catalog_context = await _build_catalog_context(db)
        reply_text = await generate_reply(history, catalog_context=catalog_context)
        # If the AI is unavailable after every retry, the customer should still get
        # something rather than silence — a canned, honest note beats no reply at all.
        # The customer's own message is already unread-by-admin by default, so it
        # still surfaces in the admin unread badge/thread list without extra work here.
        if not reply_text:
            reply_text = (
                "Estamos teniendo un problema técnico temporal para responder "
                "automáticamente. Un miembro de nuestro equipo revisará tu mensaje "
                "en breve."
            )
        bot_msg = models.ChatMessage(
            customer_id=customer_id,
            sender_id=None,
            sender_role='bot',
            body=reply_text,
            read_by_admin=True,
        )
        db.add(bot_msg)
        await db.commit()


def _clean_body(body: str) -> str:
    body = (body or '').strip()
    if not body:
        raise HTTPException(status_code=400, detail='El mensaje no puede estar vacío')
    return body[:MAX_MESSAGE_LEN]


# --- Customer side: one thread per customer, identified by their own user id ---

@router.get('/messages', response_model=List[ChatMessageOut])
async def my_messages(since: Optional[str] = None, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    # `since`: the customer's current chat-session boundary — the widget sends this on
    # every request (set once at mount, i.e. on page refresh or re-login) so a "reset"
    # conversation only ever shows messages from that point forward. The full history
    # still exists in the DB either way — admin's endpoints below never filter by this.
    since_dt = _parse_since(since)
    stmt = select(models.ChatMessage).where(models.ChatMessage.customer_id == current_user.id)
    read_update = (
        update(models.ChatMessage)
        .where(models.ChatMessage.customer_id == current_user.id)
        .where(models.ChatMessage.sender_role.in_(['admin', 'bot']))
        .where(models.ChatMessage.read_by_customer.is_(False))
    )
    if since_dt is not None:
        stmt = stmt.where(models.ChatMessage.created_at >= since_dt)
        read_update = read_update.where(models.ChatMessage.created_at >= since_dt)
    q = await db.execute(stmt.order_by(models.ChatMessage.created_at))
    messages = q.scalars().all()
    await db.execute(read_update.values(read_by_customer=True))
    await db.commit()
    return messages


@router.post('/messages', response_model=ChatMessageOut)
async def send_message(data: ChatMessageCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    msg = models.ChatMessage(
        customer_id=current_user.id,
        sender_id=current_user.id,
        sender_role='customer',
        body=_clean_body(data.body),
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    background_tasks.add_task(_generate_and_store_bot_reply, str(current_user.id), str(msg.id), data.since)
    return msg


@router.get('/unread-count')
async def my_unread_count(since: Optional[str] = None, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_active_user)):
    since_dt = _parse_since(since)
    stmt = (
        select(func.count()).select_from(models.ChatMessage)
        .where(models.ChatMessage.customer_id == current_user.id)
        .where(models.ChatMessage.sender_role.in_(['admin', 'bot']))
        .where(models.ChatMessage.read_by_customer.is_(False))
    )
    if since_dt is not None:
        stmt = stmt.where(models.ChatMessage.created_at >= since_dt)
    q = await db.execute(stmt)
    return {'unread_count': q.scalar() or 0}


# --- Admin side: sees every customer's thread ---

@router.get('/admin/threads', response_model=List[ChatThreadOut])
async def list_threads(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    q = await db.execute('''
        SELECT * FROM (
          SELECT DISTINCT ON (cm.customer_id)
            cm.customer_id,
            u.email AS customer_email,
            cm.body AS last_message,
            cm.created_at AS last_message_at,
            (SELECT COUNT(*) FROM chat_messages cm2
             WHERE cm2.customer_id = cm.customer_id
               AND cm2.sender_role = 'customer'
               AND cm2.read_by_admin = false) AS unread_count
          FROM chat_messages cm
          JOIN users u ON u.id = cm.customer_id
          ORDER BY cm.customer_id, cm.created_at DESC
        ) t
        ORDER BY last_message_at DESC
    ''')
    return [dict(row) for row in q.fetchall()]


@router.get('/admin/unread-count')
async def admin_unread_count(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    q = await db.execute(
        select(func.count()).select_from(models.ChatMessage)
        .where(models.ChatMessage.sender_role == 'customer')
        .where(models.ChatMessage.read_by_admin.is_(False))
    )
    return {'unread_count': q.scalar() or 0}


@router.get('/admin/threads/{customer_id}', response_model=List[ChatMessageOut])
async def get_thread(customer_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    q = await db.execute(
        select(models.ChatMessage)
        .where(models.ChatMessage.customer_id == customer_id)
        .order_by(models.ChatMessage.created_at)
    )
    messages = q.scalars().all()
    if not messages:
        raise HTTPException(status_code=404, detail='No hay conversación con ese cliente')
    await db.execute(
        update(models.ChatMessage)
        .where(models.ChatMessage.customer_id == customer_id)
        .where(models.ChatMessage.sender_role == 'customer')
        .where(models.ChatMessage.read_by_admin.is_(False))
        .values(read_by_admin=True)
    )
    await db.commit()
    return messages


@router.post('/admin/threads/{customer_id}', response_model=ChatMessageOut)
async def reply_to_thread(customer_id: str, data: ChatMessageCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_admin)):
    msg = models.ChatMessage(
        customer_id=customer_id,
        sender_id=current_user.id,
        sender_role='admin',
        body=_clean_body(data.body),
    )
    db.add(msg)

    customer_q = await db.execute(select(models.User.email).where(models.User.id == customer_id))
    customer_email = customer_q.scalars().first() or customer_id
    log_activity(db, current_user, f"Respondió el chat de {customer_email}", resource_type='chat', resource_id=customer_id)

    await db.commit()
    await db.refresh(msg)
    return msg
