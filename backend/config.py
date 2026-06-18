"""Application configuration, loaded from environment / .env file."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Core ---
    openai_api_key: str | None = None
    database_url: str = "sqlite:///./video_analyzer.db"

    # --- Auth (JWT) ---
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    free_credits_on_signup: int = 3

    # --- Stripe ---
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_subscription_price_id: str | None = None  # recurring price (monthly)
    pay_per_use_amount_cents: int = 99  # $0.99 single analysis

    # --- URLs (local dev) ---
    frontend_url: str = "http://localhost:3000"

    # --- Uploads ---
    upload_dir: str = "./uploads"
    max_upload_mb: int = 200


settings = Settings()
