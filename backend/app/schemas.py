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

class CategoryOut(BaseModel):
    id: UUID
    name: str
    slug: Optional[str]
    class Config:
        orm_mode = True

class ProductOut(BaseModel):
    id: UUID
    sku: Optional[str]
    name: str
    description: Optional[str]
    price: float
    requires_prescription: bool
    attributes: Optional[Any]
    class Config:
        orm_mode = True

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str]
    description: Optional[str]
    category_id: Optional[UUID]
    price: float
    requires_prescription: Optional[bool] = False

class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int

class OrderCreate(BaseModel):
    user_id: Optional[UUID]
    items: List[OrderItemCreate]
    shipping_address: Optional[Any]
    billing_address: Optional[Any]

class OrderOut(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    status: str
    total_amount: float
    class Config:
        orm_mode = True
