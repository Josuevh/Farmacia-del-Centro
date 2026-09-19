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
    role = sa.Column(sa.Enum('customer','admin','pharmacist','operador', name='user_role'), nullable=False, server_default='customer')
    phone = sa.Column(sa.String(50))
    is_active = sa.Column(sa.Boolean, default=True)
    # Refreshed on every authenticated request (throttled) so the admin panel can show
    # which operators are online right now, without needing websockets.
    last_seen_at = sa.Column(sa.DateTime(timezone=True))
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
    barcode = sa.Column(sa.String(64), unique=True)
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
    status = sa.Column(sa.Enum('cart','pending_payment','paid','ready_for_pickup','completed','cancelled','refunded', name='order_status'), nullable=False, server_default='cart')
    total_amount = sa.Column(sa.Numeric(12,2), default=0)
    currency = sa.Column(sa.String(3), default='USD')
    billing_address = sa.Column(JSONB)
    pickup_code = sa.Column(sa.String(20), unique=True)
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
    payment_metadata = sa.Column('metadata', JSONB)
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


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()'))
    # customer_id identifies which customer's single ongoing thread this belongs
    # to, regardless of who actually sent it (customer or a replying admin).
    customer_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    sender_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'))
    sender_role = sa.Column(sa.Enum('customer', 'admin', 'bot', name='chat_sender_role'), nullable=False)
    body = sa.Column(sa.Text, nullable=False)
    read_by_admin = sa.Column(sa.Boolean, nullable=False, default=False)
    read_by_customer = sa.Column(sa.Boolean, nullable=False, default=False)
    created_at = sa.Column(sa.DateTime(timezone=True), default=datetime.datetime.utcnow)
