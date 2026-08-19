Farmacia del Centro - Proyecto

Estructura básica con backend FastAPI y frontend React.

Requisitos:
- Docker y docker-compose

Arranque rápido:

```bash
docker-compose up --build
```

Backend:
- API en http://localhost:8000
- Docs: http://localhost:8000/docs

Notas:
- Cambia `SECRET_KEY` en el entorno para producción.
- El script de migración usa `sql/schema_postgres.sql` para crear tablas iniciales.
Stripe integration:
- Set `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` in `docker-compose.yml` or your environment.
- Use the endpoint `POST /payments/create-checkout-session` to create checkout sessions (send JSON with `amount` in cents, `currency`, `success_url`, `cancel_url`).
- Configure Stripe dashboard to call `/payments/webhook` for events; for local testing use `stripe-cli` or `stripe listen`.
Use the endpoint `POST /payments/checkout-order` to create an `Order` on the server and a Stripe Checkout session in one call. Payload example:

```json
{
	"items": [{ "product_id": "<uuid>", "quantity": 1 }],
	"success_url": "https://your.site/success",
	"cancel_url": "https://your.site/cancel"
}
```

Notes:
- The endpoint requires authentication (Bearer token) — obtain it from `/auth/token`.
- The returned JSON includes `checkout_url` and `order_id`. The webhook handler will mark the order as `paid` when Stripe confirms payment.
- Configure Stripe dashboard or `stripe listen` to forward events to `/payments/webhook`.
Idempotency and webhooks:
- The server records processed Stripe event IDs in `stripe_events` to avoid double-processing of retries.
- Payments are deduplicated by `provider_payment_id` when creating `Payment` records.
- When testing webhooks locally use `stripe listen` which may deliver the same event multiple times; the server will ignore duplicates.
Admin endpoints:
- `GET /admin/stripe-events` — lista eventos de Stripe (admin only).
- `GET /admin/payments` — lista pagos registrados (admin only).
- `GET /admin/orders` — lista órdenes (admin only).

These endpoints require an admin user (role `admin`). Use `/auth/register` and set `role` to `admin` in the DB, or create the first superuser via environment variables in the future.

Admin UI:
- The frontend includes simple admin pages to inspect orders, payments and Stripe events at the paths visible in the app's navigation (requires admin token stored in `localStorage` as `access_token`).
Login and protected routes:
- The frontend provides a `/login` page where you can authenticate with email/password. The token is stored in `localStorage` as `access_token` and `user_role`.
- Admin pages (`/admin/*`) are protected in the frontend and will only render for users with role `admin`.
