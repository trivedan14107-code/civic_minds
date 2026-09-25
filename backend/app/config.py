from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    groq_api_key: str | None = None
    groq_model: str = "qwen/qwen3.8-27b"
    google_maps_api_key: str | None = None
    max_upload_mb: int = 10
    duplicate_radius_meters: int = 100

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
