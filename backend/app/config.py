from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ombor_savdo"
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_days: int = 30
    cors_origins: list[str] = ["http://localhost:5173"]
    admin_phone: str = "+998900000000"
    admin_password: str = "admin123"

    @field_validator("database_url")
    @classmethod
    def use_psycopg3(cls, v: str) -> str:
        """Har qanday Postgres URL'ni psycopg (v3) drayveriga moslaydi.

        `postgres://`, `postgresql://` (Neon / Vercel) va `postgresql+psycopg2://` ham ishlaydi.
        """
        for prefix in ("postgresql+psycopg2://", "postgresql://", "postgres://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix):]
        return v


settings = Settings()
