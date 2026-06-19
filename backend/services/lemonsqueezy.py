"""Lemon Squeezy payment provider (Merchant of Record).

Used when PAYMENT_PROVIDER=lemonsqueezy — works in countries Stripe doesn't
(e.g. Kosovo) and handles tax/VAT. We create hosted checkouts via the API and
fulfill via signed webhooks.
"""
import hashlib
import hmac
from typing import Optional

import httpx

from config import settings

API_BASE = "https://api.lemonsqueezy.com/v1"


class LemonSqueezyError(Exception):
    pass


def configured() -> bool:
    return bool(settings.lemonsqueezy_api_key and settings.lemonsqueezy_store_id)


def _headers() -> dict:
    return {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "Authorization": f"Bearer {settings.lemonsqueezy_api_key}",
    }


def create_checkout(
    *,
    variant_id: str,
    redirect_url: str,
    email: Optional[str] = None,
    custom: Optional[dict] = None,
) -> str:
    """Create a hosted checkout and return its URL.

    `custom` is echoed back in webhook `meta.custom_data` (values must be strings).
    """
    if not configured():
        raise LemonSqueezyError("Lemon Squeezy is not configured.")

    checkout_data: dict = {}
    if email:
        checkout_data["email"] = email
    if custom:
        checkout_data["custom"] = {k: str(v) for k, v in custom.items()}

    payload = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": checkout_data,
                "product_options": {
                    "redirect_url": redirect_url,
                    "enabled_variants": [int(variant_id)],
                },
            },
            "relationships": {
                "store": {"data": {"type": "stores", "id": str(settings.lemonsqueezy_store_id)}},
                "variant": {"data": {"type": "variants", "id": str(variant_id)}},
            },
        }
    }
    try:
        resp = httpx.post(
            f"{API_BASE}/checkouts", json=payload, headers=_headers(),
            timeout=httpx.Timeout(30.0, connect=5.0),
        )
        resp.raise_for_status()
        return resp.json()["data"]["attributes"]["url"]
    except Exception as e:  # noqa: BLE001
        raise LemonSqueezyError(str(e)) from e


def verify_signature(raw_body: bytes, signature: Optional[str]) -> bool:
    """Verify the X-Signature header (hex HMAC-SHA256 of the raw body)."""
    secret = settings.lemonsqueezy_webhook_secret
    if not secret or not signature:
        return False
    digest = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)


# Subscription statuses Lemon Squeezy considers "paying / entitled".
ACTIVE_STATUSES = {"active", "on_trial"}
