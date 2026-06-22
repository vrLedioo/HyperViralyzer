"""Paddle Billing payment provider (Merchant of Record).

Used when PAYMENT_PROVIDER=paddle. Works in Kosovo and handles tax/VAT.
We create hosted checkouts via the REST API and fulfill via signed webhooks.

Webhook signature format (Paddle-Signature header):
  ts=<unix-timestamp>;h1=<hmac-sha256-hex>
  HMAC input: "<ts>:<raw-body>"
"""
import hashlib
import hmac
from typing import Optional

import httpx

from config import settings

_PROD_BASE = "https://api.paddle.com"
_SANDBOX_BASE = "https://sandbox-api.paddle.com"


class PaddleError(Exception):
    pass


def _api_base() -> str:
    return _SANDBOX_BASE if settings.paddle_sandbox else _PROD_BASE


def configured() -> bool:
    return bool(settings.paddle_api_key)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.paddle_api_key}",
        "Content-Type": "application/json",
    }


def _error_detail(resp: httpx.Response) -> str:
    """Extract Paddle's human-readable error from a failed response.

    Paddle error shape: {"error": {"code","detail","errors":[{"field","message"}]}}.
    Falls back to the raw body so nothing is hidden.
    """
    try:
        err = (resp.json() or {}).get("error") or {}
    except Exception:  # noqa: BLE001 — non-JSON body
        return (resp.text or "").strip()[:500] or "(empty response)"
    parts = [err.get("code"), err.get("detail")]
    for f in (err.get("errors") or []):
        if isinstance(f, dict):
            parts.append(f"{f.get('field', '')}: {f.get('message', '')}".strip(": "))
    msg = " | ".join(str(p) for p in parts if p)
    return msg or (resp.text or "").strip()[:500] or "(no detail)"


def create_checkout(
    *,
    price_id: str,
    success_url: str,
    customer_email: Optional[str] = None,
    custom_data: Optional[dict] = None,
) -> str:
    """Create a Paddle hosted-checkout transaction and return its checkout URL."""
    if not configured():
        raise PaddleError("Paddle is not configured.")

    payload: dict = {
        "items": [{"price_id": price_id, "quantity": 1}],
        "checkout": {"settings": {"success_url": success_url}},
    }
    if customer_email:
        payload["customer"] = {"email": customer_email}
    if custom_data:
        payload["custom_data"] = {k: str(v) for k, v in custom_data.items()}

    try:
        resp = httpx.post(
            f"{_api_base()}/transactions",
            json=payload,
            headers=_headers(),
            timeout=httpx.Timeout(30.0, connect=5.0),
        )
    except httpx.RequestError as e:
        raise PaddleError(f"Could not reach Paddle: {e}") from e

    # Surface Paddle's actual error reason (not httpx's generic status message),
    # so a misconfigured price/domain is diagnosable from the response.
    if resp.status_code >= 400:
        raise PaddleError(f"Paddle {resp.status_code}: {_error_detail(resp)}")

    data = resp.json().get("data") or {}
    url = ((data.get("checkout") or {}).get("url")) if isinstance(data, dict) else None
    if not url:
        # A 200 with no checkout URL means hosted checkout isn't fully set up.
        raise PaddleError(
            "Paddle accepted the request but returned no checkout URL. In Paddle → "
            "Checkout settings, set a Default Payment Link and approve your domain "
            "(hyperyzer.com)."
        )
    return url


def verify_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """Verify the Paddle-Signature header.

    Header format: ts=<unix-timestamp>;h1=<hex-hmac-sha256>
    HMAC input:   "<timestamp>:<raw-body-bytes-decoded-as-utf8>"
    """
    secret = settings.paddle_webhook_secret
    if not secret or not signature_header:
        return False

    parts: dict[str, str] = {}
    for segment in signature_header.split(";"):
        if "=" in segment:
            k, v = segment.split("=", 1)
            parts[k.strip()] = v.strip()

    ts = parts.get("ts")
    h1 = parts.get("h1")
    if not ts or not h1:
        return False

    signed = f"{ts}:{raw_body.decode('utf-8', errors='replace')}"
    digest = hmac.new(secret.encode(), signed.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, h1)


# Subscription statuses Paddle considers "paying / entitled".
ACTIVE_STATUSES = {"active", "trialing", "past_due"}
