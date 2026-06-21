"""Database models (SQLModel). Used for SQLite locally; Postgres-ready."""
import secrets
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_token() -> str:
    return secrets.token_urlsafe(24)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    # Purchased credit-pack balance; never expires, consumed per analysis.
    credits: int = 0
    # Monthly subscription allowance; refilled on each renewal (does NOT roll
    # over), and spent BEFORE purchased `credits`.
    subscription_credits: int = 0
    # "none" | "active" | "canceled"
    subscription_status: str = "none"
    # Active plan key ("creator" | "pro" | "agency"), or "free".
    plan: str = "free"
    stripe_customer_id: Optional[str] = Field(default=None, index=True)
    # Provider subscription id (Paddle / Lemon Squeezy / Stripe) for cancel matching.
    subscription_id: Optional[str] = Field(default=None, index=True)
    # New signups must confirm ownership of their email before they can log in
    # or spend credits. Existing rows are grandfathered to True by the migration.
    email_verified: bool = False
    created_at: datetime = Field(default_factory=_utcnow)

    @property
    def total_credits(self) -> int:
        return self.subscription_credits + self.credits


class Analysis(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    # "idea" | "video"
    kind: str = "idea"
    title: str
    # The hook/script text (idea) or the transcript (video).
    input_text: str = ""
    # Target platform for hashtag/timing tuning ("tiktok" | "youtube" | ...).
    platform: str = ""
    hook_score: int = 0
    retention_score: int = 0
    viral_score: int = 0
    feedback: str = ""
    # JSON-encoded optimization extras (see services/report.py for the shape):
    #   hashtags  -> {"primary": [...], "niche": [...], "broad": [...]}
    #   best_times-> {"timezone_note": str, "summary": str,
    #                 "slots": [{"day","time","why"}]}
    hashtags: str = ""
    best_times: str = ""
    created_at: datetime = Field(default_factory=_utcnow)


class RedeemedSession(SQLModel, table=True):
    """Tracks Stripe pay-per-use sessions already spent, so a single-use
    pay token can only buy one analysis."""
    session_id: str = Field(primary_key=True)
    redeemed_at: datetime = Field(default_factory=_utcnow)


class VideoJob(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # Unguessable public handle used for polling (sequential ids would be an IDOR).
    token: str = Field(default_factory=_new_token, index=True, unique=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    title: str = ""
    filename: str = ""
    # "queued" | "transcribing" | "scoring" | "done" | "error"
    status: str = "queued"
    error: Optional[str] = None
    # Access path used ("byok" | "subscription" | "credit" | "pay-token").
    method: Optional[str] = None
    analysis_id: Optional[int] = Field(default=None, foreign_key="analysis.id")
    created_at: datetime = Field(default_factory=_utcnow)


class PasswordResetToken(SQLModel, table=True):
    """Single-use password reset tokens, valid for 1 hour."""
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True, unique=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=_utcnow)


class EmailVerificationToken(SQLModel, table=True):
    """Single-use email-verification tokens, valid for 24 hours."""
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True, unique=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=_utcnow)
