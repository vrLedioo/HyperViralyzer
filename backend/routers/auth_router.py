"""Auth endpoints: signup, login, current user, account deletion, GDPR export."""
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from auth import create_access_token, get_current_user, hash_password, verify_password
from config import settings
from db import get_session
from limiter import limiter
from models import Analysis, User, VideoJob

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    credits: int               # purchased pack credits (never expire)
    subscription_credits: int  # monthly plan allowance (refills, no rollover)
    total_credits: int         # what's actually spendable right now
    plan: str                  # "free" | "creator" | "pro" | "agency"
    subscription_status: str


def _user_out(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        credits=user.credits,
        subscription_credits=user.subscription_credits,
        total_credits=user.total_credits,
        plan=user.plan,
        subscription_status=user.subscription_status,
    )


@router.post("/signup", response_model=TokenResponse)
@limiter.limit("10/minute")
def signup(request: Request, req: SignupRequest, session: Session = Depends(get_session)):
    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    existing = session.exec(select(User).where(User.email == req.email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        credits=settings.free_credits_on_signup,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, req: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == req.email)).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return _user_out(user)


@router.delete("/account", status_code=204)
def delete_account(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Permanently delete the authenticated user's account and all their data (GDPR Art. 17)."""
    # Delete in FK-safe order: VideoJobs → Analyses → User
    jobs = session.exec(select(VideoJob).where(VideoJob.user_id == user.id)).all()
    for j in jobs:
        session.delete(j)
    session.flush()

    analyses = session.exec(select(Analysis).where(Analysis.user_id == user.id)).all()
    for a in analyses:
        session.delete(a)
    session.flush()

    session.delete(user)
    session.commit()
    return Response(status_code=204)


@router.get("/export")
def export_data(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Export all personal data for the authenticated user (GDPR Art. 20)."""
    analyses = session.exec(
        select(Analysis).where(Analysis.user_id == user.id).order_by(Analysis.created_at)
    ).all()
    jobs = session.exec(
        select(VideoJob).where(VideoJob.user_id == user.id).order_by(VideoJob.created_at)
    ).all()

    def _loads(raw: str) -> dict:
        try:
            v = json.loads(raw or "")
            return v if isinstance(v, dict) else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    data = {
        "account": {
            "id": user.id,
            "email": user.email,
            "plan": user.plan,
            "subscription_status": user.subscription_status,
            "credits": user.credits,
            "subscription_credits": user.subscription_credits,
            "created_at": user.created_at.isoformat(),
        },
        "analyses": [
            {
                "id": a.id,
                "kind": a.kind,
                "title": a.title,
                "platform": a.platform,
                "input_text": a.input_text,
                "hook_score": a.hook_score,
                "retention_score": a.retention_score,
                "viral_score": a.viral_score,
                "feedback": a.feedback,
                "hashtags": _loads(a.hashtags),
                "best_times": _loads(a.best_times),
                "created_at": a.created_at.isoformat(),
            }
            for a in analyses
        ],
        "video_jobs": [
            {
                "token": j.token,
                "title": j.title,
                "status": j.status,
                "method": j.method,
                "created_at": j.created_at.isoformat(),
            }
            for j in jobs
        ],
    }

    content = json.dumps(data, indent=2, ensure_ascii=False)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=hyperyzer-data-export.json"},
    )
