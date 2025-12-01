"""Database connection using Supabase client (HTTPS API)."""
import os
from supabase import create_client, Client
from sqlalchemy.orm import declarative_base

from .config import get_settings

settings = get_settings()

# Base class for models (kept for compatibility)
Base = declarative_base()

# Supabase client
_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Get Supabase client instance with service role key (bypasses RLS)."""
    global _supabase_client
    
    if _supabase_client is None:
        url = settings.SUPABASE_PROJECT_URL or os.getenv("SUPABASE_PROJECT_URL", "")
        # Use service role key to bypass RLS, fallback to anon key
        key = (
            settings.SUPABASE_SERVICE_ROLE_KEY 
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
            or settings.SUPABASE_ANON_KEY 
            or os.getenv("SUPABASE_ANON_KEY", "")
        )
        
        if not url or not key:
            raise RuntimeError(
                "Supabase not configured. Set SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY."
            )
        
        print(f"[Database] Connecting to Supabase: {url[:40]}...")
        _supabase_client = create_client(url, key)
    
    return _supabase_client


async def get_db():
    """Dependency to get Supabase client."""
    yield get_supabase()
