"""The SEED_TEST_ACCOUNT startup helper creates a usable Agency test account."""
import main
from sqlmodel import Session, select

from auth import verify_password
from config import settings
from db import engine
from models import User
from studio import effective_features


def test_seed_creates_active_agency_account(monkeypatch):
    monkeypatch.setattr(settings, "seed_test_account", "tester@hyperyzer.com:Test12345!")
    main._seed_test_account()
    with Session(engine) as s:
        u = s.exec(select(User).where(User.email == "tester@hyperyzer.com")).first()
        assert u is not None
        assert u.plan == "agency" and u.subscription_status == "active"
        assert u.email_verified is True
        assert u.subscription_credits >= 3000
        assert verify_password("Test12345!", u.hashed_password)
        # All Studio features unlocked.
        feats = effective_features(u, s)
        assert {"script", "ad_script", "hooks", "optimize", "calendar", "bulk", "clients", "teams"} <= feats


def test_seed_noop_when_unset(monkeypatch):
    monkeypatch.setattr(settings, "seed_test_account", None)
    main._seed_test_account()  # should not raise
    with Session(engine) as s:
        assert s.exec(select(User)).first() is None
