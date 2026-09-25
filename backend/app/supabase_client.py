from functools import lru_cache
from supabase import Client, create_client
from .config import get_settings


@lru_cache
def is_supabase_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.supabase_url
        and settings.supabase_service_role_key
        and settings.supabase_service_role_key.strip()
        and "your_backend" not in settings.supabase_service_role_key
    )


def get_supabase() -> Client | None:
    if not is_supabase_configured():
        return None
    settings = get_settings()
    try:
        return create_client(settings.supabase_url, settings.supabase_service_role_key)
    except Exception:
        return None

