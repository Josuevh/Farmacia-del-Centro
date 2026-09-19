from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.routers import products, auth, orders, payments, admin, cart, inventory, categories, prescriptions, chat, operators
from app.core.config import settings
from app.core.limiter import limiter

app = FastAPI(title="Farmacia del Centro Chilpancingo API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(cart.router, prefix="/cart", tags=["cart"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(prescriptions.router, prefix="/prescriptions", tags=["prescriptions"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(operators.router, prefix="/admin/operators", tags=["operators"])

@app.get("/")
async def root():
    return {"message": "Farmacia del Centro Chilpancingo API"}
