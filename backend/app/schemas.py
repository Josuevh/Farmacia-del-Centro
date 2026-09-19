from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr
from uuid import UUID
import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[UUID]
    role: Optional[str]

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str]

class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    full_name: Optional[str]
    role: str
    class Config:
        orm_mode = True

class OperatorCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str]

class OperatorOut(BaseModel):
    id: UUID
    email: EmailStr
    full_name: Optional[str]
    is_active: bool
    is_online: bool = False
    last_seen_at: Optional[datetime.datetime]
    created_at: datetime.datetime

class ActivityLogOut(BaseModel):
    id: UUID
    actor_email: Optional[str]
    actor_name: Optional[str]
    action: str
    resource_type: Optional[str]
    created_at: datetime.datetime

class CategoryOut(BaseModel):
    id: UUID
    name: str
    slug: Optional[str]
    class Config:
        orm_mode = True

class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str]

class ProductOut(BaseModel):
    id: UUID
    sku: Optional[str]
    barcode: Optional[str]
    name: str
    description: Optional[str]
    category_id: Optional[UUID]
    price: float
    requires_prescription: bool
    is_active: bool
    attributes: Optional[Any]
    class Config:
        orm_mode = True

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str]
    barcode: Optional[str]
    description: Optional[str]
    category_id: Optional[UUID]
    price: float
    requires_prescription: Optional[bool] = False
    initial_quantity: Optional[int] = 0

class InventoryOut(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    reserved: int
    available: int
    location: Optional[str]

class InventoryUpdate(BaseModel):
    quantity: Optional[int]
    location: Optional[str]

class PrescriptionOut(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    order_id: Optional[UUID]
    file_url: str
    is_pdf: bool = False
    doctor_name: Optional[str]
    issued_date: Optional[datetime.date]
    status: str
    notes: Optional[str]
    created_at: datetime.datetime
    class Config:
        orm_mode = True

class PrescriptionReview(BaseModel):
    status: str
    notes: Optional[str] = None

class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int

class OrderCreate(BaseModel):
    user_id: Optional[UUID]
    items: List[OrderItemCreate]
    billing_address: Optional[Any]

class OrderOut(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    status: str
    total_amount: float
    pickup_code: Optional[str]
    created_at: datetime.datetime
    class Config:
        orm_mode = True

class OrderStatusUpdate(BaseModel):
    status: str

class ChatMessageOut(BaseModel):
    id: UUID
    customer_id: UUID
    sender_id: Optional[UUID]
    sender_role: str
    body: str
    created_at: datetime.datetime
    class Config:
        orm_mode = True

class ChatMessageCreate(BaseModel):
    body: str
    # Client-side chat session boundary (ISO datetime) — when set, the AI reply for
    # this message only considers conversation history from this point forward, so a
    # customer's "reset" (refresh/re-login) is a real reset, not just a display trick.
    since: Optional[str] = None

class ChatThreadOut(BaseModel):
    customer_id: UUID
    customer_email: str
    last_message: str
    last_message_at: datetime.datetime
    unread_count: int
