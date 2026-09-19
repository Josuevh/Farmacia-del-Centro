# Farmacia del Centro Chilpancingo — contexto para Copilot

Sitio de e-commerce para una farmacia real (Chilpancingo, Guerrero, México).
FastAPI + SQLAlchemy async (asyncpg) + PostgreSQL en el backend, React (CRA +
CRACO) en el frontend, todo en Docker Compose. El dueño del proyecto no tiene
experiencia de desarrollo — prioriza cambios simples, explicados, y que no
rompan lo que ya funciona.

## Cómo correr el proyecto

```bash
docker-compose up -d
```
- Sitio: http://localhost:3000 — API: http://localhost:8000
- `.env` en la raíz (no está en git) debe traer `SECRET_KEY`, `STRIPE_API_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `GEMINI_API_KEY`.

## Arquitectura y decisiones ya tomadas (no las repitas ni las cuestiones sin motivo)

- **Roles** (`User.role` enum en `backend/app/models.py`): `customer`,
  `admin`, `operador`, y un cuarto valor `pharmacist` que **existe en el
  enum pero nunca se usó en ningún endpoint** (no lo borres sin preguntar,
  pero tampoco asumas que hace algo).
  - `get_current_admin` (en `backend/app/deps.py`) da acceso al panel de
    admin a **ambos** `admin` y `operador` — es intencional, el cliente
    pidió que el operador tenga el mismo panel que el admin de hoy.
  - `get_current_superadmin` (mismo archivo) exige `role == 'admin'`
    exactamente — solo para gestionar operadores
    (`backend/app/routers/operators.py`).
- **Auditoría**: la tabla `audit_logs` (modelo `AuditLog`) ya existía en el
  esquema pero estaba sin usar — ahora se llena vía
  `backend/app/services/activity_log.py`'s `log_activity(db, actor, action,
  ...)`. Esa función solo hace `db.add()`, **no comitea** — depende de que
  quien la llame haga `await db.commit()` después, en la misma función.
- **Presencia en línea**: `User.last_seen_at` se actualiza dentro de
  `get_current_user` (en `deps.py`), throttleado a 1 vez cada 30s por
  usuario — no hay endpoint de heartbeat separado. El panel de operadores
  considera "en línea" un `last_seen_at` de los últimos 2 minutos.
- **Pagos**: Stripe. `payments.py` maneja el checkout normal (webhook). El
  botón "Cancelar" en `AdminOrders.js` ahora sí ejecuta un reembolso real en
  Stripe (`backend/app/routers/admin.py`'s `update_order_status`) cuando el
  pedido ya estaba pagado — busca `payment_metadata['payment_intent']` en el
  `Payment` guardado por el webhook. Si no hay Stripe de por medio (pago
  manual de respaldo), no puede reembolsar solo y avisa con `refund_note`.
- **Chat con IA**: `backend/app/routers/chat.py` usa la API gratuita de
  Google Gemini (`backend/app/services/ai_service.py`). Si un admin/operador
  responde a mano, el bot se calla 30 minutos en esa conversación
  (`ADMIN_TAKEOVER_MINUTES`).
- **Recetas médicas**: los archivos ya NO son públicos — se sirven por
  `GET /prescriptions/{id}/file`, autenticado, solo el dueño o admin/operador
  puede verlos. El frontend los abre vía blob (`frontend/src/utils/authFile.js`)
  porque un `<a href>` normal no manda el header de autorización.
- **Catálogo**: `backend/app/services/catalog_import.py` importa Excel/CSV
  con vista previa antes de aplicar cambios (dry-run). El cliente aún no ha
  mandado su archivo real de Pharmacy Lite/Bisoft — cuando llegue, puede
  necesitar mapeo de columnas.

## Bugs encontrados en una revisión de código (2026-09-19) — 8 de 9 ya arreglados

Una revisión completa del código encontró 9 bugs reales, verificados contra
el código (no solo sospecha). 8 ya se corrigieron y se probaron en vivo el
mismo día — no hace falta tocarlos de nuevo salvo que reaparezca el síntoma:

1. ✅ Inventario reservado que nunca se liberaba en pedidos sin pagar —
   corregido con `release_order_inventory()` en `inventory_service.py`,
   llamado desde `payments.py` (falla de Stripe) y `admin.py` (cancelación
   de un pedido sin pagar).
2. ✅ Condición de carrera al marcar "pagado" manualmente — corregido con
   `SELECT ... FOR UPDATE` en `admin.py`'s `update_order_status`.
3. ✅ El escáner de código de barras reiniciaba la cámara en cada
   re-render del padre — corregido con `useCallback` en
   `CustomerLayout.js` y `AdminProducts.js`.
4. ✅ Guardar el stock con el campo vacío lo dejaba en cero — corregido
   con validación en `saveStock` (`AdminProducts.js`).
5. ✅ El checkbox de categoría en la barra lateral borraba los demás
   filtros — corregido con una función separada `toggleCategoryFilter`
   en `Products.js` que no llama a `clearFilters()`.
6. ✅ El chat de admin podía mostrar mensajes del cliente equivocado en
   una carrera de tiempos — corregido con un `selectedRef` en
   `AdminChat.js` que descarta respuestas obsoletas.
7. ✅ Timestamps sin zona horaria (`datetime.datetime.utcnow()`) en
   columnas `DateTime(timezone=True)` y en el `exp` del JWT — corregido
   con un helper `_utcnow()` en `models.py` (reemplazó las 20 ocurrencias)
   y `datetime.now(timezone.utc)` en `security.py`.
8. ✅ El input de archivo no se reseteaba tras un intento de subir
   receta, bloqueando re-seleccionar el mismo archivo — corregido con un
   `ref` en `Prescriptions.js` que limpia `.value` en el `finally`.

9. ⚠️ **Sigue pendiente (parcial)**: el registro de auditoría no es
   atómico con la acción que describe. Para dar de alta un operador
   (`backend/app/routers/operators.py`) YA SE CORRIGIÓ — `crud.create_user`
   ahora acepta `commit=False` para que la cuenta y su entrada en el
   historial se guarden en una sola transacción. **Para importar catálogo
   (`backend/app/routers/products.py`'s `import_catalog`) SIGUE SIN
   corregirse a propósito**: el parámetro `commit` de
   `catalog_import.process_rows` no solo controla el guardado final, sino
   si cada fila se aplica de verdad o no (es el mecanismo de vista previa
   / dry-run) — reutilizarlo para diferir el commit rompería el import
   real convirtiéndolo en una vista previa silenciosa. Si se quiere
   corregir esto de verdad, hay que separar esas dos responsabilidades
   dentro de `process_rows` (aplicar cambios vs. cuándo comitear), no solo
   cambiar el valor de `commit` en la llamada — probar exhaustivamente el
   import real después de cualquier cambio ahí, incluyendo con un archivo
   grande, antes de confiar en el resultado.

## Checklist de lanzamiento pendiente

Ver `HANDOFF.md` en la raíz del repo — tiene el detalle completo de qué
falta del lado del cliente (dominio, Stripe en modo real, catálogo, fotos)
y qué falta técnicamente (build de producción, servidor real, limpieza de
datos de prueba).

## Estilo de código de este proyecto

- Sin comentarios explicando qué hace el código (los nombres ya lo dicen);
  solo comentarios cuando hay una razón no obvia (una restricción oculta,
  un workaround a un bug específico).
- No agregar abstracciones, validaciones, ni manejo de errores para casos
  que no pueden pasar — este proyecto prioriza cambios mínimos y directos
  sobre "por si acaso".
- Sigue los patrones ya existentes en archivos similares (por ejemplo, los
  routers de FastAPI siguen todos la misma forma; las páginas de
  admin en React siguen el mismo patrón de `authHeaders()` + `axios` +
  `useToast`).
