"""FastAPI application entry point."""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from .core.auth import get_current_user, User
from .core.config import get_settings
from .routers import holidays, flights, ai, price_tracking

settings = get_settings()

app = FastAPI(
    title="Flyin.to API",
    description="Flight search and holiday management API",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(holidays.router)
app.include_router(flights.router)
app.include_router(ai.router)
app.include_router(price_tracking.router)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/me")
async def me(user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return {"user_id": user.id}