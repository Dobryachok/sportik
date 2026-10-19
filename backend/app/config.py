from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    database_url: str = 'postgresql+asyncpg://app:app@localhost:5432/sport'
    redis_url: str = 'redis://localhost:6379/0'
    cache_ttl_seconds: int = 60
    cors_origins: str = 'http://localhost:5173,http://localhost:8000'
    session_cookie_name: str = 'sport_session'
    session_days: int = 14
    cookie_secure: bool = False
    upload_dir: Path = Path('/data/avatars')
    max_avatar_bytes: int = 5 * 1024 * 1024
    geo_url: str = 'https://nominatim.openstreetmap.org/reverse'
    geo_contact_email: str = ''
    geo_user_agent: str = 'SportVmeste/1.0'
    geo_timeout_seconds: float = 5
    default_city: str = ''

    @property
    def allowed_origins(self) -> list[str]:
        return [value.strip().rstrip('/') for value in self.cors_origins.split(',') if value.strip()]


settings = Settings()
