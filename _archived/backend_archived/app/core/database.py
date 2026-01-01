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
            error_msg = (
                "Supabase not configured. Set SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).\n"
                f"Current values: URL={'SET' if url else 'MISSING'}, KEY={'SET' if key else 'MISSING'}\n"
                "Check your .env file in the backend directory."
            )
            raise RuntimeError(error_msg)
        
        print(f"[Database] Connecting to Supabase: {url[:40]}...")
        try:
            _supabase_client = create_client(url, key)
        except Exception as e:
            # Provide helpful error message for invalid API key
            key_preview = f"{key[:10]}...{key[-4:]}" if len(key) > 14 else "***"
            error_msg = (
                f"Failed to connect to Supabase: {str(e)}\n"
                f"URL: {url[:50]}...\n"
                f"Key preview: {key_preview}\n"
                "Please verify:\n"
                "1. SUPABASE_PROJECT_URL is correct (should start with https://)\n"
                "2. SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is valid\n"
                "3. No extra spaces or quotes in your .env file\n"
                "4. The key matches your Supabase project (Settings > API)"
            )
            raise RuntimeError(error_msg) from e
    
    return _supabase_client


async def get_db():
    """Dependency to get Supabase client."""
    yield get_supabase()
