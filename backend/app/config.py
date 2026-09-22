"""
Central place for all configuration.
Everything is read from environment variables (via a .env file in dev).
Sensible defaults are provided so the app runs out of the box.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./b2world.db"

    SECRET_KEY: str = "insecure-dev-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RESET_TOKEN_EXPIRE_MINUTES: int = 30

    GEMINI_API_KEY: str = ""
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "no-reply@b2world.local"

    # SMTP Configuration (e.g. Gmail App Password, Outlook, etc.)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    UPLOAD_DIR: str = "uploads/resumes"


settings = Settings()
