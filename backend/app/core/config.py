"""Application configuration."""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


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
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
