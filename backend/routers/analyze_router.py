"""Analysis endpoints: idea scoring, history, public share pages, the free
no-signup teaser, and posted-result logging. (Video lives in video_router.)"""
import json
import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from access import AccessDenied, apply_consumption, resolve_access
from auth import get_current_user, get_optional_user
from config import settings
from db import get_session
from limiter import limiter
from llm import server_llm_configured
from models import Analysis, User
from services.scoring import ScoringError, score_content

router = APIRouter(prefix="/api", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    title: str
    script: str
    platform: Optional[str] = None      # target platform for hashtags/timing
    audience: Optional[str] = None      # target audience (region / who)
    language: Optional[str] = None      # output language ("" = match input)
    user_api_key: Optional[str] = None  # BYOK
    pay_token: Optional[str] = None     # single-use pay-per-use token


class AnalyzeResponse(BaseModel):
    id: Optional[int] = None  # saved Analysis id (share / result logging handle)
    hook_score: int
    retention_score: int
    viral_score: int
    feedback: str
    hashtags: dict = {}
    best_times: dict = {}
    improvements: dict = {}
    pay_token_consumed: bool = False


class AnalysisOut(BaseModel):
    id: int
    kind: str
    title: str
    platform: Optional[str] = None
    transcript: Optional[str] = None
    hook_score: int
    retention_score: int
    viral_score: int
    feedback: str
    hashtags: dict = {}
    best_times: dict = {}
    improvements: dict = {}
    share_id: Optional[str] = None
    posted_at: Optional[datetime] = None
    result_views: Optional[int] = None
    created_at: datetime


def _loads(raw: str) -> dict:
    """Decode a stored JSON blob; tolerate empty/legacy rows."""
    if not raw:
        return {}
    try:
        v = json.loads(raw)
        return v if isinstance(v, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def save_analysis(
    session: Session,
    *,
    user: Optional[User],
    kind: str,
    title: str,
    input_text: str,
    result,
    platform: str = "",
) -> Analysis:
    record = Analysis(
        user_id=user.id if user else None,
        kind=kind,
        title=title,
        input_text=input_text,
        platform=platform or "",
        hook_score=result.hook_score,
        retention_score=result.retention_score,
        viral_score=result.viral_score,
        feedback=result.feedback,
        hashtags=json.dumps(getattr(result, "hashtags", {}) or {}),
        best_times=json.dumps(getattr(result, "best_times", {}) or {}),
        improvements=json.dumps(getattr(result, "improvements", {}) or {}),
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.post("/analyze-idea", response_model=AnalyzeResponse)
@limiter.limit("30/minute")
def analyze_idea(
    request: Request,
    req: AnalyzeRequest,
    user: Optional[User] = Depends(get_optional_user),
    session: Session = Depends(get_session),
):
    try:
        grant = resolve_access(
            user=user,
            user_api_key=req.user_api_key,
            pay_token=req.pay_token,
            session=session,
            cost=settings.idea_credit_cost,
        )
    except AccessDenied as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))

    try:
        result = score_content(
            req.title, req.script,
            platform=req.platform, audience=req.audience, language=req.language,
            byok_key=grant.byok_key,
        )
    except ScoringError as e:
        if grant.method == "byok":
            raise HTTPException(
                status_code=401,
                detail="Invalid OpenAI API Key provided. Please check your key and try again.",
            )
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {e}")

    # Only spend the credit / pay token after a successful analysis.
    apply_consumption(grant, session)
    record = save_analysis(
        session, user=user, kind="idea", title=req.title,
        input_text=req.script, result=result, platform=req.platform or "",
    )

    return AnalyzeResponse(
        id=record.id,
        hook_score=result.hook_score,
        retention_score=result.retention_score,
        viral_score=result.viral_score,
        feedback=result.feedback,
        hashtags=result.hashtags,
        best_times=result.best_times,
        improvements=result.improvements,
        pay_token_consumed=(grant.method == "pay-token"),
    )


@router.get("/history", response_model=list[AnalysisOut])
def history(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    limit: int = 50,
    offset: int = 0,
):
    rows = session.exec(
        select(Analysis)
        .where(Analysis.user_id == user.id)
        .order_by(Analysis.created_at.desc())
        .limit(min(limit, 200))
        .offset(max(offset, 0))
    ).all()
    return [
        AnalysisOut(
            id=r.id, kind=r.kind, title=r.title, platform=r.platform or None,
            transcript=r.input_text if r.kind == "video" else None,
            hook_score=r.hook_score, retention_score=r.retention_score,
            viral_score=r.viral_score, feedback=r.feedback,
            hashtags=_loads(r.hashtags), best_times=_loads(r.best_times),
            improvements=_loads(r.improvements),
            share_id=r.share_id, posted_at=r.posted_at, result_views=r.result_views,
            created_at=r.created_at,
        )
        for r in rows
    ]


# --------------------------------------------------------------------------- #
# Sharing — public report pages (/r/<share_id> on the frontend)
# --------------------------------------------------------------------------- #
def _owned_analysis(analysis_id: int, user: User, session: Session) -> Analysis:
    record = session.get(Analysis, analysis_id)
    # 404 (not 403) on a mismatch so we never confirm a row exists to a non-owner.
    if not record or record.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return record


class ShareRequest(BaseModel):
    enabled: bool = True


class ShareResponse(BaseModel):
    share_id: Optional[str] = None
    share_url: Optional[str] = None


@router.post("/analysis/{analysis_id}/share", response_model=ShareResponse)
def share_analysis(
    analysis_id: int,
    req: ShareRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create (idempotent) or revoke the public share link for an analysis."""
    record = _owned_analysis(analysis_id, user, session)
    if req.enabled and not record.share_id:
        record.share_id = secrets.token_urlsafe(9)
    elif not req.enabled:
        record.share_id = None
    session.add(record)
    session.commit()
    session.refresh(record)
    return ShareResponse(
        share_id=record.share_id,
        share_url=f"{settings.frontend_url}/r/{record.share_id}" if record.share_id else None,
    )


def _teaser_fields(improvements: dict, hashtags: dict, best_times: dict) -> dict:
    """The public/anonymous slice of a report: the verdict + ONE hook rewrite as
    proof of value, plus counts of everything held back (the signup hook)."""
    rewrites = [str(r) for r in (improvements.get("hook_rewrites") or [])]
    n_hashtags = sum(len(v) for v in hashtags.values() if isinstance(v, list))
    slots = best_times.get("slots") if isinstance(best_times, dict) else None
    return {
        "verdict": str(improvements.get("verdict") or ""),
        "hook_teaser": rewrites[0] if rewrites else "",
        "locked": {
            "hook_rewrites": max(0, len(rewrites) - 1),
            "title_suggestions": len(improvements.get("title_suggestions") or []),
            "caption": bool(improvements.get("caption")),
            "retention_risks": len(improvements.get("retention_risks") or []),
            "hashtags": n_hashtags,
            "best_times": len(slots) if isinstance(slots, list) else 0,
        },
    }


class PublicReport(BaseModel):
    kind: str
    title: str
    platform: Optional[str] = None
    hook_score: int
    retention_score: int
    viral_score: int
    verdict: str = ""
    hook_teaser: str = ""   # one rewrite shown as proof of value
    locked: dict = {}       # counts of what signing up unlocks
    created_at: datetime


@router.get("/public/report/{share_id}", response_model=PublicReport)
@limiter.limit("60/minute")
def public_report(request: Request, share_id: str, session: Session = Depends(get_session)):
    """Anonymous, sanitized view of a shared report. Never includes the input
    text, the full fix-it set, feedback, or anything about the owner."""
    record = session.exec(select(Analysis).where(Analysis.share_id == share_id)).first()
    if not share_id or not record:
        raise HTTPException(status_code=404, detail="Report not found.")
    teaser = _teaser_fields(_loads(record.improvements), _loads(record.hashtags),
                            _loads(record.best_times))
    return PublicReport(
        kind=record.kind, title=record.title, platform=record.platform or None,
        hook_score=record.hook_score, retention_score=record.retention_score,
        viral_score=record.viral_score, created_at=record.created_at, **teaser,
    )


# --------------------------------------------------------------------------- #
# Outcome loop — mark an analysis as posted and log the real result
# --------------------------------------------------------------------------- #
class ResultLogRequest(BaseModel):
    posted: bool = True
    views: Optional[int] = None  # None = just mark posted; log views later


class ResultLogResponse(BaseModel):
    id: int
    posted_at: Optional[datetime] = None
    result_views: Optional[int] = None


@router.patch("/analysis/{analysis_id}/result", response_model=ResultLogResponse)
def log_result(
    analysis_id: int,
    req: ResultLogRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    record = _owned_analysis(analysis_id, user, session)
    if req.posted:
        if record.posted_at is None:
            record.posted_at = datetime.now(timezone.utc)
        if req.views is not None:
            record.result_views = max(0, min(int(req.views), 2_000_000_000))
    else:
        record.posted_at = None
        record.result_views = None
    session.add(record)
    session.commit()
    session.refresh(record)
    return ResultLogResponse(id=record.id, posted_at=record.posted_at,
                             result_views=record.result_views)


# --------------------------------------------------------------------------- #
# Free teaser — one no-signup analysis (the 10-second taste on the landing page)
# --------------------------------------------------------------------------- #
class TryRequest(BaseModel):
    title: str
    script: str
    platform: Optional[str] = None


class TryResponse(BaseModel):
    hook_score: int
    retention_score: int
    viral_score: int
    verdict: str = ""
    hook_teaser: str = ""
    locked: dict = {}


@router.post("/try", response_model=TryResponse)
@limiter.limit("3/day")
def try_analysis(request: Request, req: TryRequest):
    """Anonymous teaser analysis: full scoring call, teaser-sized response, no
    account, no credits, nothing persisted. Hard-capped per IP per day."""
    if not server_llm_configured():
        raise HTTPException(
            status_code=503,
            detail="The free trial analyzer is offline right now. Sign up to analyze with your own key.",
        )
    title = (req.title or "").strip()[:120]
    script = (req.script or "").strip()[:2000]
    if not title or not script:
        raise HTTPException(status_code=400, detail="Give your idea a title and a script or hook.")
    try:
        result = score_content(title, script, platform=req.platform)
    except ScoringError as e:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {e}")
    teaser = _teaser_fields(result.improvements or {}, result.hashtags or {},
                            result.best_times or {})
    return TryResponse(
        hook_score=result.hook_score, retention_score=result.retention_score,
        viral_score=result.viral_score, **teaser,
    )
