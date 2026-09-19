# Farmacia del Centro Chilpancingo — Estado del proyecto

Documento de referencia para continuar el proyecto sin depender de una sesión
de IA en curso. Última actualización: 2026-09-19.

## Stack y cómo levantar el proyecto

FastAPI (backend) + React/CRA (frontend) + PostgreSQL, todo en Docker.

```bash
docker-compose up -d          # levanta los 3 contenedores (db, web, frontend)
docker-compose logs -f web    # logs del backend
docker-compose logs -f frontend
```

- Sitio: http://localhost:3000
- API: http://localhost:8000
- Las variables sensibles (SECRET_KEY, STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET,
  GEMINI_API_KEY) viven en `.env` en la raíz del proyecto — **ese archivo no
  está en git** (por seguridad), así que si se clona el repo en otra máquina
  hay que recrearlo a mano con esos 4 valores.

## Cuentas de prueba (base de datos local de desarrollo)

No se listan contraseñas aquí a propósito (este archivo queda en git). Las
cuentas de prueba que existen en la base local son:

- `admin@test.com` — rol admin (dueño)
- `operador1@test.com` — rol operador (cuenta de prueba, se puede borrar)
- `cliente@test.com` / `juan@gmail.com` — clientes

Si no recuerdas alguna contraseña, se puede restablecer directamente en la
base de datos local generando un hash bcrypt nuevo y actualizando la columna
`password_hash` del usuario en la tabla `users` — no hace falta pasar por el
flujo de "olvidé mi contraseña" (que, de hecho, todavía no existe en el
sitio — es una función pendiente si se necesita).

Estas son solo para el ambiente de desarrollo local — no existen en un
servidor de producción todavía porque el proyecto no se ha desplegado fuera
de esta laptop.

## Checklist de lanzamiento — qué falta

### Del cliente (esperando)
- [ ] Comprar el dominio `farmaciacentrochilpancingo.com`
- [ ] Crear un correo Gmail exclusivo del negocio (no personal de nadie)
- [ ] Crear la cuenta de Hetzner (VPS) con ese correo
- [ ] Crear su cuenta de Stripe en modo real (ya confirmó que tiene RFC con
      actividad empresarial, así que no hay bloqueo — solo falta que la cree)
- [ ] Dar acceso a Josue como colaborador en Stripe y en Hetzner
- [ ] Mandar el archivo de export de Pharmacy Lite (catálogo real)
- [ ] Mandar fotos de los productos
- [ ] Dar los correos de los operadores reales de su personal

### Técnico (falta hacer, sin depender de IA para hacerlo)
- [ ] **Build de producción del frontend** — ahora mismo corre en modo
      desarrollo (`npm start` vía CRACO). Antes de publicar: `npm run build`
      dentro de `frontend/`, y servir la carpeta `build/` resultante con un
      servidor estático (nginx o Caddy) en vez del servidor de desarrollo.
- [ ] **Configurar el VPS** una vez exista: instalar Docker, correr el mismo
      `docker-compose.yml` (con `.env` recreado ahí), configurar HTTPS
      (recomendado: Caddy, que renueva el certificado solo) y apuntar el
      dominio al servidor.
- [ ] **Importar el catálogo real** cuando llegue el archivo de Pharmacy Lite
      — ver sección "Importar catálogo" abajo.
- [ ] **Cambiar Stripe a modo real**: cuando el cliente tenga su cuenta live,
      reemplazar el valor de la variable de la API de Stripe en `.env` (la de
      prueba por la real) y el secreto del webhook con el que Stripe genere
      para la URL de producción en su Dashboard.
      También hay que configurar `stripe listen` o el webhook real de Stripe
      en el servidor de producción (en desarrollo se usa `stripe listen`
      manualmente, eso no funciona en un servidor real).
- [ ] **Limpiar datos de prueba** antes de que el cliente vea la base de
      datos real: cuenta `operador1@test.com`, los 3 productos con barcodes
      de prueba (`7501234567890`, `7502345678901`, `7503456789012` — se
      pueden dejar o reemplazar cuando lleguen los códigos reales del
      proveedor), carritos/pedidos viejos de pruebas.
- [ ] Mínimo de contraseña (8 caracteres) para registro de clientes/admin —
      ahora mismo no hay ninguna validación, se puede registrar alguien con
      una contraseña de un carácter. Pendiente, no urgente.

### Ya resuelto (no requiere más trabajo)
- Aviso de privacidad: el cliente decidió no usarlo por ahora. El borrador
  (`.docx`) se le entregó y quedó guardado por si lo necesita después —
  recomendado que lo revise un abogado antes de usarlo, dado que el sitio
  maneja recetas médicas (dato sensible de salud bajo la ley mexicana).
- Seguridad: clave de sesión (JWT) corregida, límite de intentos de login,
  archivos de recetas protegidos por autenticación, reembolsos reales en
  Stripe conectados (ya no es solo una etiqueta).
- Rol "operador" + panel de monitoreo (altas, en línea, historial de
  actividad) — construido y probado.
- Rebrand: colores navy del logo real, nombre "Farmacia del Centro
  Chilpancingo" en todo el sitio, dirección/horario/teléfono/mapa reales.

## Cómo usar las herramientas clave sin ayuda de IA

### Importar catálogo (cuando llegue el archivo de Pharmacy Lite)
1. Entra al panel de admin → **Productos** → botón **"Importar catálogo"**.
2. Sube el archivo Excel/CSV del cliente.
3. El sistema muestra una **vista previa** de qué se va a crear/actualizar
   **antes** de guardar nada — revísala con calma.
4. Si las columnas no coinciden con la plantilla esperada, la herramienta
   reconoce nombres parecidos automáticamente; si algo no cuadra, lo va a
   decir ahí mismo en la vista previa, no falla en silencio.
5. Solo si confirmas, se aplican los cambios de verdad.
6. Si el archivo del cliente viene en un formato muy distinto, se puede
   bajar la plantilla de referencia desde el mismo botón de importar
   (endpoint `GET /products/import/template`) para comparar columna por
   columna y reacomodar el archivo del cliente antes de subirlo.

### Dar de alta un operador
1. Panel de admin (con la cuenta `admin`, no funciona con una cuenta
   `operador`) → pestaña **"Operadores"** en el menú superior.
2. Formulario "Dar de alta un operador": correo, contraseña temporal,
   nombre. El operador podrá cambiar su contraseña una vez que inicie
   sesión (si se agrega esa función — hoy no existe "cambiar mi
   contraseña" para ningún usuario, ni cliente ni admin).
3. En la misma pantalla se ve quién está en línea (punto verde) y el
   historial de todo lo que ha hecho cada operador.
4. Para quitarle el acceso a alguien: botón "Desactivar" junto a su
   nombre — pierde el acceso de inmediato, sin borrar su cuenta ni su
   historial.

### Reembolsar un pedido
1. Panel de admin → **Órdenes**.
2. Botón **"Cancelar"** en el pedido correspondiente.
3. Si el pedido ya estaba pagado, el sistema pide confirmación explícita
   ("se le devolverá el dinero al cliente") y ejecuta el reembolso real en
   Stripe automáticamente — no hay que entrar al Dashboard de Stripe.
4. Excepción: si el pedido se había marcado "pagado" manualmente (el botón
   de respaldo para cuando el aviso automático de Stripe no llega), el
   sistema no siempre puede encontrar el cobro exacto para reembolsarlo
   solo — en ese caso avisa que hay que hacerlo a mano desde
   dashboard.stripe.com.

## Probar el sitio desde un celular (mientras no hay servidor real)

La laptop no es accesible desde internet directamente. Para que un celular
pruebe el sitio (por ejemplo, el escáner de código de barras, que necesita
HTTPS):

```bash
"/c/Program Files (x86)/cloudflared/cloudflared.exe" tunnel --url http://localhost:3000
```

Esto imprime una URL pública temporal tipo `https://algo.trycloudflare.com`
que sirve el sitio real corriendo en la laptop. Se cae si se cierra la
terminal o se apaga la laptop — es solo para pruebas, no para uso real. Ya no
hace falta esto una vez que el sitio esté en un servidor real con dominio.

## Notas técnicas importantes

- `docker-compose.yml` lee `SECRET_KEY`, `STRIPE_API_KEY`,
  `STRIPE_WEBHOOK_SECRET` y `GEMINI_API_KEY` de `.env` — si `.env` no existe
  o le falta alguna variable, el backend arranca con valores por defecto
  inseguros o vacíos (esto ya pasó una vez con `SECRET_KEY`, se corrigió).
- El correo IA del chatbot usa la API gratuita de Google Gemini
  (`GEMINI_API_KEY`), con un límite duro de 20 solicitudes/minuto en el plan
  gratuito. Si el volumen de clientes crece mucho, puede hacer falta pasar a
  un plan de pago de Google.
- Las imágenes de recetas médicas se guardan en `backend/uploads/prescriptions/`
  dentro del contenedor — en un servidor real, ese volumen necesita respaldo
  (backup) igual que la base de datos, o se pierden las recetas de los
  clientes si el servidor falla.
- El proyecto usa `craco` en vez de `react-scripts` directo (ver
  `frontend/craco.config.js`) — necesario para permitir el túnel de pruebas
  y para silenciar warnings inofensivos de una librería de código de barras.
