"""Billing — provider-aware (Stripe or Lemon Squeezy).

Same public checkout paths regardless of provider, so the frontend only needs the
capability flags from /api/config. PAYMENT_PROVIDER selects the active provider.

- Stripe: subscription + anonymous one-off pay-per-use (verify -> single-use token).
- Lemon Squeezy (Merchant of Record, works in Kosovo): subscription + credit packs.
  Paid usage is account-based; fulfillment is webhook-driven.
"""
import json
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from auth import create_pay_token, get_current_user
from config import settings
from db import get_session
from models import RedeemedSession, User
from services import lemonsqueezy as ls

router = APIRouter(prefix="/api", tags=["billing"])

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


class CheckoutResponse(BaseModel):
    url: str


class VerifyRequest(BaseModel):
    session_id: str


class PayTokenResponse(BaseModel):
    pay_token: str


# --------------------------------------------------------------------------- #
# Shared
# --------------------------------------------------------------------------- #
def _find_user_by(session: Session, *, user_id=None, email=None) -> Optional[User]:
    if user_id:
        try:
            u = session.get(User, int(user_id))
            if u:
                return u
        except (TypeError, ValueError):
            pass
    if email:
        return session.exec(select(User).where(User.email == email)).first()
    return None


# --------------------------------------------------------------------------- #
# Checkout (provider-dispatched)
# --------------------------------------------------------------------------- #
@router.post("/checkout/subscription", response_model=CheckoutResponse)
def checkout_subscription(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Recurring subscription checkout. Requires a logged-in account."""
    if not settings.subscription_enabled:
        raise HTTPException(status_code=503, detail="Subscriptions are not configured.")

    if settings.payment_provider == "stripe":
        try:
            checkout = stripe.checkout.Session.create(
                mode="subscription",
                payment_method_types=["card"],
                line_items=[{"price": settings.stripe_subscription_price_id, "quantity": 1}],
                customer_email=user.email,
                client_reference_id=str(user.id),
                success_url=f"{settings.frontend_url}/?subscribed=success",
                cancel_url=f"{settings.frontend_url}/?subscribed=cancelled",
            )
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
        return CheckoutResponse(url=checkout.url)

    # Lemon Squeezy
    try:
        url = ls.create_checkout(
            variant_id=settings.lemonsqueezy_subscription_variant_id,
            redirect_url=f"{settings.frontend_url}/?subscribed=success",
            email=user.email,
            custom={"user_id": user.id, "kind": "subscription"},
        )
    except ls.LemonSqueezyError as e:
        raise HTTPException(status_code=502, detail=f"Lemon Squeezy error: {e}")
    return CheckoutResponse(url=url)


@router.post("/checkout/credits", response_model=CheckoutResponse)
def checkout_credits(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Buy a one-time credit pack (Lemon Squeezy). Requires a logged-in account."""
    if not settings.credits_purchase_enabled:
        raise HTTPException(status_code=503, detail="Credit purchases are not configured.")
    try:
        url = ls.create_checkout(
            variant_id=settings.lemonsqueezy_credits_variant_id,
            redirect_url=f"{settings.frontend_url}/?credits=success",
            email=user.email,
            custom={"user_id": user.id, "kind": "credits"},
        )
    except ls.LemonSqueezyError as e:
        raise HTTPException(status_code=502, detail=f"Lemon Squeezy error: {e}")
    return CheckoutResponse(url=url)


# --------------------------------------------------------------------------- #
# Stripe-only: anonymous one-off pay-per-use
# --------------------------------------------------------------------------- #
@router.post("/checkout/pay-per-use", response_model=CheckoutResponse)
def checkout_pay_per_use():
    """One-time $0.99 checkout, no account (Stripe only)."""
    if not settings.pay_per_use_enabled:
        raise HTTPException(status_code=503, detail="Pay-per-use is not available.")
    try:
        sess = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": "1 Video Analysis",
                        "description": "AI Hook, Retention, and Viral Potential Scoring",
                    },
                    "unit_amount": settings.pay_per_use_amount_cents,
                },
                "quantity": 1,
            }],
            success_url=f"{settings.frontend_url}/?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.frontend_url}/?payment=cancelled",
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    return CheckoutResponse(url=sess.url)


@router.post("/checkout/verify", response_model=PayTokenResponse)
def verify_pay_per_use(req: VerifyRequest):
    """Confirm a paid pay-per-use session and mint a single-use token (Stripe)."""
    if not settings.pay_per_use_enabled:
        raise HTTPException(status_code=503, detail="Pay-per-use is not available.")
    try:
        sess = stripe.checkout.Session.retrieve(req.session_id)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    if (
        getattr(sess, "mode", None) != "payment"
        or getattr(sess, "payment_status", None) != "paid"
        or getattr(sess, "currency", None) != "usd"
        or getattr(sess, "amount_total", None) != settings.pay_per_use_amount_cents
    ):
        raise HTTPException(status_code=402, detail="Payment not valid for an analysis.")
    return PayTokenResponse(pay_token=create_pay_token(req.session_id))


# --------------------------------------------------------------------------- #
# Webhooks
# --------------------------------------------------------------------------- #
@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, session: Session = Depends(get_session)):
    if settings.payment_provider != "stripe":
        raise HTTPException(status_code=404, detail="Not found.")
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook signing secret not configured.")
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    event = json.loads(payload)  # plain dict (StripeObject lacks .get())
    etype = event.get("type")
    obj = (event.get("data") or {}).get("object") or {}

    if etype == "checkout.session.completed" and obj.get("mode") == "subscription":
        email = (obj.get("customer_details") or {}).get("email") or obj.get("customer_email")
        user = _find_user_by(session, user_id=obj.get("client_reference_id"), email=email)
        if user:
            user.subscription_status = "active"
            if obj.get("customer"):
                user.stripe_customer_id = obj["customer"]
            session.add(user)
            session.commit()
    elif etype == "customer.subscription.deleted":
        customer_id = obj.get("customer")
        if customer_id:
            user = session.exec(select(User).where(User.stripe_customer_id == customer_id)).first()
            if user:
                user.subscription_status = "canceled"
                session.add(user)
                session.commit()

    return {"received": True}


@router.post("/lemonsqueezy/webhook")
async def lemonsqueezy_webhook(request: Request, session: Session = Depends(get_session)):
    """Fulfill Lemon Squeezy orders (credits) and subscriptions."""
    if settings.payment_provider != "lemonsqueezy":
        raise HTTPException(status_code=404, detail="Not found.")
    if not settings.lemonsqueezy_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook signing secret not configured.")
    payload = await request.body()
    sig = request.headers.get("x-signature")
    if not ls.verify_signature(payload, sig):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event = json.loads(payload)
    meta = event.get("meta") or {}
    event_name = meta.get("event_name") or request.headers.get("x-event-name")
    custom = meta.get("custom_data") or {}
    data = event.get("data") or {}
    attrs = data.get("attributes") or {}
    data_id = str(data.get("id") or "")

    if event_name == "order_created":
        if custom.get("kind") == "credits" and attrs.get("status") == "paid":
            # Idempotent: only credit once per order.
            key = f"ls_order_{data_id}"
            if not session.get(RedeemedSession, key):
                user = _find_user_by(session, user_id=custom.get("user_id"), email=attrs.get("user_email"))
                if user:
                    user.credits += settings.credit_pack_size
                    session.add(user)
                    session.add(RedeemedSession(session_id=key))
                    session.commit()

    elif event_name and event_name.startswith("subscription_"):
        status = attrs.get("status")
        active = status in ls.ACTIVE_STATUSES
        user = _find_user_by(session, user_id=custom.get("user_id"), email=attrs.get("user_email"))
        if not user and data_id:
            user = session.exec(select(User).where(User.subscription_id == data_id)).first()
        if user:
            user.subscription_status = "active" if active else "canceled"
            if data_id:
                user.subscription_id = data_id
            session.add(user)
            session.commit()

    return {"received": True}
