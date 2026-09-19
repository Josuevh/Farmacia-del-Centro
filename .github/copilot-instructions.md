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

## Bugs reales encontrados en una revisión de código (2026-09-19) — pendientes de arreglar

Ordenados por severidad. Cada uno fue verificado contra el código real, no es
solo sospecha.

1. **Inventario reservado nunca se libera en pedidos que no se pagan**
   (`backend/app/services/order_service.py:81` y
   `backend/app/routers/admin.py` en la transición `pending_payment` →
   `cancelled`). Ni cuando falla la creación de la sesión de Stripe
   (`backend/app/routers/payments.py`'s `checkout_order`) ni cuando un admin
   cancela un pedido sin pagar se llama a `release_inventory`. Arreglo:
   llamar `release_inventory` para cada item del pedido en ambos casos.

2. **Condición de carrera al marcar "pagado" manualmente**
   (`backend/app/routers/admin.py`'s `update_order_status`, no hay bloqueo
   de fila). Dos clics rápidos o dos sesiones de admin/operador simultáneas
   pueden duplicar el pago y liberar inventario dos veces, porque
   `crud.create_payment`'s deduplicación solo aplica cuando hay
   `provider_payment_id` (el flujo manual siempre lo deja en `None`).
   Arreglo: usar `SELECT ... FOR UPDATE` al leer el pedido, o una
   verificación explícita de "ya existe un pago succeeded para esta orden"
   antes de insertar uno nuevo.

3. **El escáner de código de barras reinicia la cámara si el componente padre
   se vuelve a renderizar** (`frontend/src/components/BarcodeScanner.js:32`
   — el `useEffect` depende de `onDetected`, que en
   `frontend/src/layouts/CustomerLayout.js:31` es una función nueva en cada
   render, no memoizada). Arreglo: envolver `handleBarcodeDetected` (y el
   equivalente en `AdminProducts.js`) en `useCallback`.

4. **Guardar el stock con el campo vacío lo deja en cero**
   (`frontend/src/pages/AdminProducts.js:151` — `Number('')` es `0` en
   JavaScript, sin validación). Arreglo: deshabilitar el botón "Guardar" o
   validar que el campo no esté vacío/no sea NaN antes del PATCH.

5. **Un checkbox de categoría en la barra lateral de resultados borra los
   filtros de precio/receta que el cliente ya había puesto**
   (`frontend/src/pages/Products.js:219`, llama a `selectCategoryId` que
   siempre corre `clearFilters()` primero). Arreglo: que el checkbox de
   categoría en la barra lateral solo cambie `activeCategoryId`, sin limpiar
   los demás filtros.

6. **El panel de chat de admin puede mostrar mensajes del cliente
   equivocado** en una condición de carrera poco común
   (`frontend/src/pages/AdminChat.js:28`, `loadThread` no verifica que la
   respuesta siga correspondiendo al cliente actualmente seleccionado antes
   de hacer `setMessages`). Arreglo: guardar el `customerId` de la petición
   y comparar contra `selected` antes de aplicar la respuesta, o usar
   `AbortController`.

7. **Timestamps sin zona horaria comparados contra cortes con zona horaria
   explícita en el chat** (`backend/app/models.py:15` y otros —
   `created_at` usa `datetime.datetime.utcnow()` naive en columnas
   `DateTime(timezone=True)`, mientras `chat.py`'s `_parse_since` construye
   cortes con `timezone.utc` explícito). Riesgo bajo mientras el servidor de
   Postgres esté en UTC (el default de la imagen de Docker), pero es frágil.
   Arreglo: usar `datetime.datetime.now(timezone.utc)` en vez de
   `datetime.datetime.utcnow()` en los defaults de columna.

8. **El input de archivo no se resetea tras un error al subir una receta**
   (`frontend/src/pages/Prescriptions.js:37` — reseleccionar el mismo
   archivo no dispara `onChange`). Arreglo: usar una `ref` al `<input>` y
   limpiar `ref.current.value = ''` tras cada intento, o cambiar la `key`
   del input para forzar su remount.

9. **El registro de auditoría no es atómico con la acción que describe** al
   crear un operador o importar catálogo
   (`backend/app/routers/operators.py:50`, y
   `backend/app/routers/products.py`'s `import_catalog`) — ambas acciones
   ya comitearon internamente (`crud.create_user` / `catalog_import.process_rows`)
   antes de que `log_activity` se guarde en un commit aparte. Si ese segundo
   commit falla, la acción sí ocurrió pero sin rastro en el historial.
   Arreglo: bajo prioridad, pero si se resuelve, sería reestructurar para
   que `log_activity` se comitee en la misma transacción que la acción
   principal (requeriría cambiar `crud.create_user` y
   `catalog_import.process_rows` para no comitear internamente).

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
