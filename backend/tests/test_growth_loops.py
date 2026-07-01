"""Growth loops: public share pages, the free no-signup teaser, posted-result
logging, and annual (yearly) billing allowances."""
import json

import pytest

import main
import routers.analyze_router as ar
import routers.billing_router as br
from config import settings
from db import engine
from models import User
from services.scoring import ScoreResult
from sqlmodel import Session


IMPROVEMENTS = {
    "verdict": "Lead with the stakes.",
    "hook_rewrites": ["I bet my channel on this.", "Watch me risk it all.", "Third take."],
    "title_suggestions": ["I Risked It All", "All In"],
    "caption": "Would you do this? 👇",
    "retention_risks": [{"moment": "0-3s", "risk": "flat open", "fix": "start mid-action"}],
}


def _scored(**kw):
    return ScoreResult(
        hook_score=80, retention_score=70, viral_score=75, feedback="private notes",
        hashtags={"primary": ["#a", "#b"], "niche": ["#c"], "broad": []},
        best_times={"timezone_note": "t", "summary": "s",
                    "slots": [{"day": "Tue", "time": "18:00", "why": "w"}]},
        improvements=IMPROVEMENTS, **kw,
    )


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """The shared in-memory limiter persists across tests; /api/try is 3/day."""
    main.app.state.limiter.reset()


def _analyze(client, auth, uid, monkeypatch, title="t"):
    monkeypatch.setattr(ar, "score_content", lambda *a, **kw: _scored())
    r = client.post("/api/analyze-idea", json={"title": title, "script": "s"}, headers=auth(uid))
    assert r.status_code == 200, r.text
    return r.json()


# --------------------------------------------------------------------------- #
# Share pages
# --------------------------------------------------------------------------- #
def test_share_create_fetch_revoke(client, make_user, auth, monkeypatch):
    uid = make_user("share@t.com", credits=10)
    body = _analyze(client, auth, uid, monkeypatch)
    aid = body["id"]
    assert isinstance(aid, int)

    r = client.post(f"/api/analysis/{aid}/share", json={"enabled": True}, headers=auth(uid))
    assert r.status_code == 200, r.text
    share_id = r.json()["share_id"]
    assert share_id and f"/r/{share_id}" in r.json()["share_url"]

    # Idempotent: sharing again keeps the same handle.
    r2 = client.post(f"/api/analysis/{aid}/share", json={"enabled": True}, headers=auth(uid))
    assert r2.json()["share_id"] == share_id

    # Public page: sanitized teaser only.
    pub = client.get(f"/api/public/report/{share_id}")
    assert pub.status_code == 200, pub.text
    data = pub.json()
    assert data["hook_score"] == 80
    assert data["verdict"] == "Lead with the stakes."
    assert data["hook_teaser"] == "I bet my channel on this."
    assert data["locked"] == {
        "hook_rewrites": 2, "title_suggestions": 2, "caption": True,
        "retention_risks": 1, "hashtags": 3, "best_times": 1,
    }
    raw = json.dumps(data)
    assert "private notes" not in raw     # feedback never leaks
    assert "share@t.com" not in raw       # owner never leaks
    assert "input_text" not in raw and "user_id" not in raw

    # History exposes the handle to the owner.
    h = client.get("/api/history", headers=auth(uid))
    assert h.json()[0]["share_id"] == share_id

    # Revoke -> public 404.
    r3 = client.post(f"/api/analysis/{aid}/share", json={"enabled": False}, headers=auth(uid))
    assert r3.json()["share_id"] is None
    assert client.get(f"/api/public/report/{share_id}").status_code == 404


def test_share_requires_owner(client, make_user, auth, monkeypatch):
    uid = make_user("owner@t.com", credits=10)
    other = make_user("other@t.com", credits=10)
    aid = _analyze(client, auth, uid, monkeypatch)["id"]

    r = client.post(f"/api/analysis/{aid}/share", json={"enabled": True}, headers=auth(other))
    assert r.status_code == 404  # never confirm existence to a non-owner
    assert client.post(f"/api/analysis/{aid}/share", json={"enabled": True}).status_code == 401


def test_public_report_unknown_404(client):
    assert client.get("/api/public/report/nope").status_code == 404


# --------------------------------------------------------------------------- #
# Free teaser (/api/try)
# --------------------------------------------------------------------------- #
def test_try_returns_teaser_without_account(client, monkeypatch):
    monkeypatch.setattr(ar, "score_content", lambda *a, **kw: _scored())
    r = client.post("/api/try", json={"title": "My hook", "script": "the script"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["hook_score"] == 80
    assert data["hook_teaser"] == "I bet my channel on this."
    assert data["locked"]["hashtags"] == 3
    raw = json.dumps(data)
    assert "private notes" not in raw
    assert "caption" not in data or data.get("caption") is None  # full fix-it withheld


def test_try_validates_and_rate_limits(client, monkeypatch):
    monkeypatch.setattr(ar, "score_content", lambda *a, **kw: _scored())
    # The validation failure still consumes one of the 3 daily slots.
    assert client.post("/api/try", json={"title": " ", "script": ""}).status_code == 400

    for _ in range(2):
        assert client.post("/api/try", json={"title": "t", "script": "s"}).status_code == 200
    assert client.post("/api/try", json={"title": "t", "script": "s"}).status_code == 429


# --------------------------------------------------------------------------- #
# Outcome loop (mark posted + log views)
# --------------------------------------------------------------------------- #
def test_result_logging_round_trip(client, make_user, auth, monkeypatch):
    uid = make_user("posted@t.com", credits=10)
    aid = _analyze(client, auth, uid, monkeypatch)["id"]

    r = client.patch(f"/api/analysis/{aid}/result", json={"posted": True}, headers=auth(uid))
    assert r.status_code == 200, r.text
    assert r.json()["posted_at"] is not None
    assert r.json()["result_views"] is None

    r2 = client.patch(f"/api/analysis/{aid}/result",
                      json={"posted": True, "views": 125000}, headers=auth(uid))
    assert r2.json()["result_views"] == 125000

    h = client.get("/api/history", headers=auth(uid)).json()[0]
    assert h["posted_at"] is not None and h["result_views"] == 125000

    # Un-mark clears both.
    r3 = client.patch(f"/api/analysis/{aid}/result", json={"posted": False}, headers=auth(uid))
    assert r3.json()["posted_at"] is None and r3.json()["result_views"] is None

    other = make_user("stranger@t.com")
    assert client.patch(f"/api/analysis/{aid}/result", json={"posted": True},
                        headers=auth(other)).status_code == 404


# --------------------------------------------------------------------------- #
# Annual billing (Paddle)
# --------------------------------------------------------------------------- #
def _paddle_env(monkeypatch):
    monkeypatch.setattr(settings, "payment_provider", "paddle")
    monkeypatch.setattr(settings, "paddle_api_key", "pk_test")
    monkeypatch.setattr(settings, "paddle_webhook_secret", "whsec_test")
    monkeypatch.setattr(settings, "paddle_price_pro", "pri_pro_month")
    monkeypatch.setattr(settings, "paddle_price_pro_year", "pri_pro_year")


def test_annual_checkout_uses_year_price(client, make_user, auth, monkeypatch):
    uid = make_user("annual@t.com")
    _paddle_env(monkeypatch)
    seen = {}

    def fake_checkout(*, price_id, success_url, customer_email, custom_data):
        seen.update(price_id=price_id, custom=custom_data)
        return "https://pay.example/checkout"

    monkeypatch.setattr(br.paddle_svc, "create_checkout", fake_checkout)
    r = client.post("/api/checkout/subscription",
                    json={"plan": "pro", "interval": "year"}, headers=auth(uid))
    assert r.status_code == 200, r.text
    assert seen["price_id"] == "pri_pro_year"
    assert seen["custom"]["interval"] == "year"

    r2 = client.post("/api/checkout/subscription", json={"plan": "pro"}, headers=auth(uid))
    assert r2.status_code == 200
    assert seen["price_id"] == "pri_pro_month"


def test_annual_subscription_grants_year_of_credits(client, make_user, auth, monkeypatch):
    uid = make_user("yearly@t.com")
    _paddle_env(monkeypatch)
    monkeypatch.setattr(br.paddle_svc, "verify_signature", lambda *a, **kw: True)
    monkeypatch.setattr(br, "_paddle_ts_fresh", lambda *a, **kw: True)

    event = {
        "event_type": "subscription.created",
        "data": {
            "id": "sub_123", "status": "active",
            "items": [{"price": {"id": "pri_pro_year"}}],
            "custom_data": {"user_id": uid, "kind": "subscription",
                            "plan": "pro", "interval": "year"},
        },
    }
    r = client.post("/api/paddle/webhook", content=json.dumps(event),
                    headers={"paddle-signature": "ts=1;h1=x"})
    assert r.status_code == 200, r.text

    with Session(engine) as s:
        u = s.get(User, uid)
        assert u.plan == "pro"
        assert u.subscription_credits == 800 * 12  # whole year upfront

    # Monthly stays monthly.
    uid2 = make_user("monthly@t.com")
    event["data"]["id"] = "sub_456"
    event["data"]["items"] = [{"price": {"id": "pri_pro_month"}}]
    event["data"]["custom_data"] = {"user_id": uid2, "kind": "subscription", "plan": "pro"}
    assert client.post("/api/paddle/webhook", content=json.dumps(event),
                       headers={"paddle-signature": "ts=1;h1=x"}).status_code == 200
    with Session(engine) as s:
        assert s.get(User, uid2).subscription_credits == 800
