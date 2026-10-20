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
    geo_search_url: str = 'https://nominatim.openstreetmap.org/search'
    geo_contact_email: str = ''
    geo_user_agent: str = 'Sportik/1.0'
    geo_timeout_seconds: float = 5
    default_city: str = ''
    # Optional bootstrap identity. The matching account still authenticates normally;
    # this setting only grants the ADMIN application role after a successful login.
    admin_email: str = ''
    # Inserts safe mock catalog records after migrations during local/demo startup.
    seed_mock_data: bool = True

    @property
    def allowed_origins(self) -> list[str]:
        return [value.strip().rstrip('/') for value in self.cors_origins.split(',') if value.strip()]

    @property
    def geo_contact_email_effective(self) -> str:
        """Nominatim requires a reachable contact; admin email is a practical fallback."""
        return (self.geo_contact_email or self.admin_email or '').strip()

    @property
    def geo_user_agent_effective(self) -> str:
        base = (self.geo_user_agent or 'Sportik/1.0').strip()
        email = self.geo_contact_email_effective
        if email and '(' not in base:
            return f'{base} ({email})'
        return base


settings = Settings()
