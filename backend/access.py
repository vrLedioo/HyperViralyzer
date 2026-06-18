"""Unified access gate for analysis (idea + video).

An analysis is allowed via exactly one of these paths, checked in order:
  1. BYOK      - caller supplied their own OpenAI key (free, no server cost)
  2. subscription - logged-in user with an active subscription (unlimited)
  3. credit    - logged-in user with >= 1 credit (consumes one on success)
  4. pay-token - a valid single-use token from a paid Stripe checkout

If none apply, access is denied (402) and the caller must pay, subscribe,
buy credits, or provide their own key.
"""
from dataclasses import dataclass
from typing import Optional

import jwt
from sqlmodel import Session

from auth import PURPOSE_PAY, decode_token
from config import settings
from models import RedeemedSession, User


class AccessDenied(Exception):
    def __init__(self, message: str, status_code: int = 402):
        super().__init__(message)
        self.status_code = status_code


@dataclass
class AccessGrant:
    api_key: str
    method: str  # "byok" | "subscription" | "credit" | "pay-token"
    user: Optional[User] = None
    session_id: Optional[str] = None


def _valid_pay_session(pay_token: Optional[str], session: Session) -> Optional[str]:
    if not pay_token:
        return None
    try:
        payload = decode_token(pay_token)
    except jwt.PyJWTError:
        return None
    if payload.get("purpose") != PURPOSE_PAY:
        return None
    session_id = payload.get("sub")
    if not session_id:
        return None
    # Already spent?
    if session.get(RedeemedSession, session_id):
        return None
    return session_id


def resolve_access(
    *,
    user: Optional[User],
    user_api_key: Optional[str],
    pay_token: Optional[str],
    session: Session,
) -> AccessGrant:
    # 1. BYOK — always free, never touches the server key.
    if user_api_key:
        return AccessGrant(api_key=user_api_key, method="byok")

    # Every other path needs the server's OpenAI key.
    if not settings.openai_api_key:
        raise AccessDenied(
            "Server has no OpenAI key configured. Provide your own key (BYOK).",
            status_code=503,
        )

    # 2. Active subscription — unlimited.
    if user and user.subscription_status == "active":
        return AccessGrant(api_key=settings.openai_api_key, method="subscription", user=user)

    # 3. Account credits.
    if user and user.credits > 0:
        return AccessGrant(api_key=settings.openai_api_key, method="credit", user=user)

    # 4. Single-use pay token.
    session_id = _valid_pay_session(pay_token, session)
    if session_id:
        return AccessGrant(
            api_key=settings.openai_api_key, method="pay-token", session_id=session_id
        )

    raise AccessDenied(
        "No usable access. Buy a single analysis, subscribe, use account credits, "
        "or provide your own OpenAI key.",
        status_code=402,
    )


def apply_consumption(grant: AccessGrant, session: Session) -> None:
    """Spend the credit / mark the pay token used. Call only after success."""
    if grant.method == "credit" and grant.user is not None:
        grant.user.credits = max(0, grant.user.credits - 1)
        session.add(grant.user)
        session.commit()
    elif grant.method == "pay-token" and grant.session_id:
        session.add(RedeemedSession(session_id=grant.session_id))
        session.commit()
    # byok / subscription consume nothing.
