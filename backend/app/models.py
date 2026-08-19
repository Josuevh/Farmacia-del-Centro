import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    email = sa.Column(sa.String(255), unique=True, nullable=False)
    password_hash = sa.Column(sa.String(255), nullable=False)
    full_name = sa.Column(sa.String(255))
    role = sa.Column(sa.Enum('customer','admin','pharmacist', name='user_role'), nullable=False, server_default='customer')
    phone = sa.Column(sa.String(50))
    is_active = sa.Column(sa.Boolean, default=True)
    created_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Category(Base):
    __tablename__ = "categories"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    name = sa.Column(sa.String(255), nullable=False)
    slug = sa.Column(sa.String(255), unique=True)
    parent_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='SET NULL'))
    created_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    sku = sa.Column(sa.String(100), unique=True)
    name = sa.Column(sa.String(255), nullable=False)
    description = sa.Column(sa.Text)
    category_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='SET NULL'))
    price = sa.Column(sa.Numeric(10,2), nullable=False)
    cost_price = sa.Column(sa.Numeric(10,2))
    requires_prescription = sa.Column(sa.Boolean, default=False)
    is_active = sa.Column(sa.Boolean, default=True)
    attributes = sa.Column(JSONB)
    created_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Inventory(Base):
    __tablename__ = "inventory"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    product_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('products.id', ondelete='CASCADE'))
    quantity = sa.Column(sa.Integer, nullable=False, default=0)
    reserved = sa.Column(sa.Integer, nullable=False, default=0)
    batch_number = sa.Column(sa.String(100))
    expiry_date = sa.Column(sa.Date)
    location = sa.Column(sa.String(255))
    last_updated = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    user_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'))
    status = sa.Column(sa.Enum('cart','pending_payment','paid','processing','shipped','delivered','cancelled','refunded', name='order_status'), nullable=False, server_default='cart')
    total_amount = sa.Column(sa.Numeric(12,2), default=0)
    currency = sa.Column(sa.String(3), default='USD')
    shipping_address = sa.Column(JSONB)
    billing_address = sa.Column(JSONB)
    shipping_method = sa.Column(sa.String(255))
    created_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class OrderItem(Base):
    __tablename__ = "order_items"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    order_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('orders.id', ondelete='CASCADE'))
    product_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('products.id', ondelete='RESTRICT'))
    quantity = sa.Column(sa.Integer, nullable=False)
    unit_price = sa.Column(sa.Numeric(10,2), nullable=False)
    total_price = sa.Column(sa.Numeric(12,2), nullable=False)
    prescription_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('prescriptions.id', ondelete='SET NULL'))

class Payment(Base):
    __tablename__ = "payments"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    order_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('orders.id', ondelete='CASCADE'))
    provider = sa.Column(sa.String(100))
    provider_payment_id = sa.Column(sa.String(255))
    amount = sa.Column(sa.Numeric(12,2), nullable=False)
    currency = sa.Column(sa.String(3), default='USD')
    status = sa.Column(sa.Enum('initiated','succeeded','failed','refunded', name='payment_status'), nullable=False, server_default='initiated')
    metadata = sa.Column(JSONB)
    created_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow)

class Prescription(Base):
    __tablename__ = "prescriptions"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    user_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'))
    order_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('orders.id', ondelete='SET NULL'))
    file_url = sa.Column(sa.Text)
    doctor_name = sa.Column(sa.String(255))
    issued_date = sa.Column(sa.Date)
    status = sa.Column(sa.Enum('pending','approved','rejected', name='prescription_status'), nullable=False, server_default='pending')
    reviewed_by = sa.Column(UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'))
    notes = sa.Column(sa.Text)
    created_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ProductImage(Base):
    __tablename__ = "product_images"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    product_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('products.id', ondelete='CASCADE'))
    url = sa.Column(sa.Text, nullable=False)
    alt_text = sa.Column(sa.String(255))
    sort_order = sa.Column(sa.Integer, default=0)

class Coupon(Base):
    __tablename__ = "coupons"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    code = sa.Column(sa.String(100), unique=True, nullable=False)
    type = sa.Column(sa.String(50))
    discount_value = sa.Column(sa.Numeric(10,2))
    valid_from = sa.Column(sa.DateTime)
    valid_to = sa.Column(sa.DateTime)
    usage_limit = sa.Column(sa.Integer)
    used_count = sa.Column(sa.Integer, default=0)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    user_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'))
    action = sa.Column(sa.String(255), nullable=False)
    resource_type = sa.Column(sa.String(100))
    resource_id = sa.Column(UUID(as_uuid=True))
    meta = sa.Column(JSONB)
    created_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow)


class StripeEvent(Base):
    __tablename__ = "stripe_events"
    event_id = sa.Column(sa.String(255), primary_key=True)
    received_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow)
    payload = sa.Column(JSONB)
