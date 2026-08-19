from fastapi import FastAPI
from app.routers import products, auth, orders, payments, admin, cart, inventory
from app.core.config import settings

app = FastAPI(title="Farmacia del Centro API")

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(cart.router, prefix="/cart", tags=["cart"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])

@app.get("/")
async def root():
    return {"message": "Farmacia del Centro API"}
