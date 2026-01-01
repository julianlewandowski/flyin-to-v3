"""Application configuration."""
import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# Find the backend directory (where .env should be)
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"


def _load_env_manual():
    """Manually load .env file to handle BOM and encoding issues."""
    if not ENV_FILE.exists():
        print(f"[Config] WARNING: .env file not found at {ENV_FILE}")
        return
    
    try:
        # Read with utf-8-sig to handle BOM
        content = ENV_FILE.read_text(encoding="utf-8-sig")
        for line in content.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip()
                # Remove quotes if present
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                # Set in environment if not already set
                if key and not os.environ.get(key):
                    os.environ[key] = value
    except Exception as e:
        print(f"[Config] Error loading .env: {e}")


# Load .env manually before Settings class is instantiated
_load_env_manual()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Supabase
    SUPABASE_PROJECT_URL: str = ""
    SUPABASE_DB_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # External APIs
    SERPAPI_KEY: str = ""
    AIRHOB_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # App settings
    DEV_BYPASS_AUTH: bool = False
    DEBUG: bool = False
    
    # Cron job security
    CRON_SECRET: str = ""
    
    # Email notifications (optional)
    RESEND_API_KEY: str = ""
    
    # Use pydantic-settings v2 syntax
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8-sig",  # Handle BOM
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    settings = Settings()
    # Always print debug info on first load for troubleshooting
    print(f"[Config] ENV file: {ENV_FILE} (exists: {ENV_FILE.exists()})")
    print(f"[Config] SUPABASE_PROJECT_URL: {'SET' if settings.SUPABASE_PROJECT_URL else 'MISSING'}")
    print(f"[Config] SUPABASE_SERVICE_ROLE_KEY: {'SET' if settings.SUPABASE_SERVICE_ROLE_KEY else 'MISSING'}")
    return settings
