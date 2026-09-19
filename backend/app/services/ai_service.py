import asyncio
import logging
import re
import httpx
from app.core.config import settings

logger = logging.getLogger("ai_service")

GEMINI_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
MAX_ATTEMPTS = 4
RETRY_BACKOFF_SECONDS = [1.5, 3, 5]  # one entry per retry (len == MAX_ATTEMPTS - 1)
RATE_LIMIT_WAIT_CAP = 65  # seconds — don't block a background task indefinitely
_RETRY_HINT_RE = re.compile(r"retry in ([\d.]+)s", re.IGNORECASE)

SYSTEM_PROMPT_TEMPLATE = """Eres el asistente virtual de Farmacia del Centro Chilpancingo, una farmacia local con venta en línea y recolección en tienda (no hacemos entregas a domicilio).

Así funciona el sitio realmente — descríbelo así, sin inventar variantes:
- Catálogo: se navega por categorías o se busca por nombre en la barra de búsqueda del encabezado (también se puede escanear el código de barras del producto con el ícono junto al buscador).
- Carrito y pago: se agregan productos al carrito y se paga en línea de forma segura con Stripe.
- Recetas: se suben ÚNICAMENTE desde la sección "Mis recetas" (no durante el carrito ni el pago) — ahí se sube una foto o PDF de la receta. Un farmacéutico del equipo la revisa y la aprueba o rechaza. Una vez que el cliente tiene al menos una receta aprobada, puede completar la compra de productos que requieren receta.
- Recolección: después de pagar, se genera un código de pedido único; con ese código se recoge el pedido físicamente en la farmacia. El estado del pedido se consulta en "Mis pedidos".

CATÁLOGO ACTUAL (nombre | precio | categoría | receta | disponibilidad) — esta es la información real y vigente ahora mismo, úsala con confianza para responder preguntas de precio, "cuál es más barato/caro", disponibilidad o categoría:
{catalog_context}

Reglas sobre el catálogo:
- Si preguntan por un producto que SÍ aparece en la lista de arriba, responde con su precio/disponibilidad exactos tal cual están ahí. No los redondees ni los inventes de otra forma.
- Si preguntan por un producto que NO aparece en la lista, di claramente que no lo tienes en el catálogo actual — no inventes un precio ni digas que sí lo tienes.
- Si la lista de catálogo viene vacía, dilo y sugiere consultar el catálogo en línea directamente.

NUNCA hagas lo siguiente, bajo ninguna circunstancia:
- No des consejos médicos, diagnósticos, dosis, interacciones entre medicamentos, ni recomendaciones de tratamiento, aunque te lo pidan de forma insistente.
- No inventes horarios, dirección, teléfono, ni ningún detalle del funcionamiento del sitio que no esté descrito arriba.

Si preguntan algo médico o que requiera criterio de un profesional de salud, responde con amabilidad que no puedes dar ese tipo de consejo y que un miembro del equipo (farmacéutico) puede ayudarles directamente en este mismo chat.

Responde siempre en español de México, de forma breve, clara y amable (máximo 3-4 oraciones)."""


async def generate_reply(history: list, catalog_context: str = ""):
    """history: list of {'role': 'user'|'model', 'text': str}, oldest first.
    catalog_context: preformatted "- nombre | precio | categoría | receta | stock" lines,
    built fresh from the DB by the caller — this is what lets the bot answer price/
    availability questions with real data instead of refusing or guessing.
    Returns the reply text, or None if the AI is unavailable/misconfigured/errors out
    (callers should treat None as "no automatic reply this time", not raise)."""
    if not settings.GEMINI_API_KEY:
        return None

    contents = [
        {"role": h["role"], "parts": [{"text": h["text"]}]}
        for h in history
        if h.get("text")
    ]
    if not contents:
        return None

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        catalog_context=catalog_context or "(catálogo vacío)"
    )
    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 500,
            # This model family reasons internally before answering, and that "thinking"
            # eats into maxOutputTokens too — without a low budget, simple customer-service
            # replies get cut off (MAX_TOKENS) before any visible text comes out. budget=0
            # is rejected by the API, so 1 is the practical minimum.
            "thinkingConfig": {"thinkingBudget": 1},
        },
    }

    url = GEMINI_URL_TEMPLATE.format(model=settings.GEMINI_MODEL)
    data = None
    # The free tier is noticeably flaky under load — both transient 503s ("high demand")
    # and plain slow responses that blow past a short timeout. A single retry wasn't
    # enough in practice (roughly 1 in 3 individual calls failed, so two calls in a row
    # both failing wasn't rare — that's what made the bot look like it "stopped
    # responding" after a few messages). This runs in a background task, not on the
    # customer's request, so it's fine to spend up to ~90s across attempts before giving up.
    for attempt in range(MAX_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, params={"key": settings.GEMINI_API_KEY}, json=payload)
                resp.raise_for_status()
                data = resp.json()
            break
        except Exception as exc:
            logger.warning("Gemini call failed (attempt %d/%d): %s", attempt + 1, MAX_ATTEMPTS, exc)
            if attempt >= MAX_ATTEMPTS - 1:
                return None
            # A 429 is a hard per-minute quota limit (free tier: 20 requests/minute as
            # of testing), not a "try again in a second" hiccup — Google tells us how
            # long to wait in the error message ("...retry in 58.4s"). The short fixed
            # backoff used for other errors is pointless here since the quota window
            # won't have reset yet; wait out the real hint instead (capped so one
            # unlucky message can't stall the background task indefinitely).
            wait = RETRY_BACKOFF_SECONDS[attempt]
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status == 429:
                body = getattr(exc.response, "text", "")
                m = _RETRY_HINT_RE.search(body)
                wait = min(float(m.group(1)), RATE_LIMIT_WAIT_CAP) + 1 if m else RATE_LIMIT_WAIT_CAP
            await asyncio.sleep(wait)
            continue

    candidates = data.get("candidates") or []
    if not candidates:
        return None
    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts).strip()
    return text or None
