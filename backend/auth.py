"""Authentication: password hashing, JWT, and FastAPI user dependencies."""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Header
from sqlmodel import Session, select

from config import settings
from db import get_session
from models import User

# Token "purposes" let us tell apart a login session from a single-use pay token.
PURPOSE_ACCESS = "access"
PURPOSE_PAY = "pay-per-use"


# --- Password hashing (bcrypt directly; reliable on Python 3.14) ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


# --- JWT ---
def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "purpose": PURPOSE_ACCESS, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_pay_token(session_id: str) -> str:
    """Single-use token tied to a paid Stripe checkout session."""
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    payload = {"sub": session_id, "purpose": PURPOSE_PAY, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return authorization.strip()


def get_optional_user(
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
) -> Optional[User]:
    """Return the logged-in user if a valid access token is present, else None."""
    token = _extract_bearer(authorization)
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("purpose") != PURPOSE_ACCESS:
            return None
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    user = session.get(User, user_id)
    # An unverified account is treated as not-logged-in everywhere, so it can
    # never spend credits or reach an authenticated endpoint. Tokens are only
    # ever issued to verified users (login blocks the unverified), so this is a
    # defense-in-depth backstop.
    if user is None or not user.email_verified:
        return None
    return user


def get_current_user(user: Optional[User] = Depends(get_optional_user)) -> User:
    """Require a logged-in user."""
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
