from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    groq_api_key: str | None = None
    groq_model: str = "qwen/qwen3.8-27b"
    google_maps_api_key: str | None = None
    openrouteservice_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "OPENROUTESERVICE_API_KEY",
            "OPENROUTERSERVICE_API_KEY",
            "ORS_API_KEY",
        ),
    )
    openrouteservice_base_url: str = "https://api.openrouteservice.org"
    vanta_depot_latitude: float = 17.3850
    vanta_depot_longitude: float = 78.4867
    max_upload_mb: int = 10
    duplicate_radius_meters: int = 100

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
