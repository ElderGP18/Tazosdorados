import json
from functools import lru_cache
from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Tazos Dorados API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False  # False por defecto en producción

    # MySQL — componentes individuales (usados si DATABASE_URL no está definida)
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "password"
    DB_NAME: str = "tazos_dorados"

    # DATABASE_URL directa (tiene precedencia — Render/Railway la inyectan aquí)
    DATABASE_URL: str = ""

    @model_validator(mode="after")
    def resolve_database_url(self):
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
                f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            )
        # Normaliza prefijo si viene como mysql:// en vez de mysql+pymysql://
        if self.DATABASE_URL.startswith("mysql://"):
            self.DATABASE_URL = self.DATABASE_URL.replace(
                "mysql://", "mysql+pymysql://", 1
            )
        return self

    # JWT
    SECRET_KEY: str = "cambia-esta-clave-en-produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS — string plano, separado por comas o JSON array
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        v = self.CORS_ORIGINS.strip()
        if v.startswith("["):
            return json.loads(v)
        return [o.strip() for o in v.split(",") if o.strip()]

    # Admin key
    API_ADMIN_KEY: str = "cambia-esta-clave-admin"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
