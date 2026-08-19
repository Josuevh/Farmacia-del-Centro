-- Esquema inicial para Farmacia del Centro (PostgreSQL)
-- Requiere: CREATE EXTENSION IF NOT EXISTS pgcrypto; para gen_random_uuid()

-- Extensiones
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tipos enumerados
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'pharmacist');
CREATE TYPE order_status AS ENUM ('cart', 'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('initiated', 'succeeded', 'failed', 'refunded');
CREATE TYPE prescription_status AS ENUM ('pending', 'approved', 'rejected');

-- Usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'customer',
  phone VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categorías
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  parent_id UUID NULL REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Productos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  cost_price NUMERIC(10,2),
  requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  attributes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_name ON products USING gin (to_tsvector('spanish', coalesce(name, '')));
CREATE INDEX idx_products_sku ON products (sku);

-- Imágenes
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  sort_order INT DEFAULT 0
);

-- Inventario
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  batch_number VARCHAR(100),
  expiry_date DATE,
  location VARCHAR(255),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, batch_number) -- si se desea inventario por lote, puede ajustarse
);

-- Recetas (prescriptions) - opcional pero incluida
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  file_url TEXT,
  doctor_name VARCHAR(255),
  issued_date DATE,
  status prescription_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'cart',
  total_amount NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  shipping_address JSONB,
  billing_address JSONB,
  shipping_method VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items de pedido
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL
);

-- Pagos
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  provider VARCHAR(100),
  provider_payment_id VARCHAR(255),
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status payment_status NOT NULL DEFAULT 'initiated',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cupones / Promociones (opcional)
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50),
  discount_value NUMERIC(10,2),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  usage_limit INT,
  used_count INT DEFAULT 0
);

-- Logs / Auditoría
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para registrar eventos de Stripe procesados (idempotencia de webhooks)
CREATE TABLE stripe_events (
  event_id VARCHAR(255) PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB
);

-- Índices adicionales
CREATE INDEX idx_inventory_product ON inventory (product_id);
CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_payments_order ON payments (order_id);

-- Triggers / funciones auxiliares (actualizar timestamps)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Fin del esquema
