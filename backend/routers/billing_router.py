"""Stripe billing: pay-per-use (anonymous) + subscription (account) + webhook."""
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from auth import create_pay_token, get_current_user
from config import settings
from db import get_session
from models import User

router = APIRouter(prefix="/api", tags=["billing"])

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


def _require_stripe():
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Billing is not configured on the server.")


class CheckoutResponse(BaseModel):
    url: str


class VerifyRequest(BaseModel):
    session_id: str


class PayTokenResponse(BaseModel):
    pay_token: str


@router.post("/checkout/pay-per-use", response_model=CheckoutResponse)
def checkout_pay_per_use():
    """One-time $0.99 checkout. Anonymous — no account required."""
    _require_stripe()
    try:
        session = stripe.checkout.Session.create(
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
    return CheckoutResponse(url=session.url)


@router.post("/checkout/subscription", response_model=CheckoutResponse)
def checkout_subscription(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Recurring subscription checkout. Requires a logged-in account."""
    _require_stripe()
    if not settings.stripe_subscription_price_id:
        raise HTTPException(status_code=503, detail="Subscription price is not configured.")
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


@router.post("/checkout/verify", response_model=PayTokenResponse)
def verify_pay_per_use(req: VerifyRequest):
    """After a pay-per-use redirect, confirm the session was paid and mint a
    single-use token granting one analysis (no account needed)."""
    _require_stripe()
    try:
        sess = stripe.checkout.Session.retrieve(req.session_id)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    if sess.get("mode") != "payment" or sess.get("payment_status") != "paid":
        raise HTTPException(status_code=402, detail="Payment not completed for this session.")
    return PayTokenResponse(pay_token=create_pay_token(req.session_id))


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, session: Session = Depends(get_session)):
    """Fulfill subscriptions: activate on completed checkout, deactivate on cancel."""
    _require_stripe()
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    if settings.stripe_webhook_secret:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig, settings.stripe_webhook_secret
            )
        except Exception as e:  # noqa: BLE001 - bad signature / parse
            raise HTTPException(status_code=400, detail=f"Webhook error: {e}")
    else:
        # Dev fallback when no signing secret is configured.
        import json
        event = json.loads(payload)

    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed" and obj.get("mode") == "subscription":
        user = _find_user_for_subscription(obj, session)
        if user:
            user.subscription_status = "active"
            if obj.get("customer"):
                user.stripe_customer_id = obj["customer"]
            session.add(user)
            session.commit()

    elif etype == "customer.subscription.deleted":
        customer_id = obj.get("customer")
        if customer_id:
            user = session.exec(
                select(User).where(User.stripe_customer_id == customer_id)
            ).first()
            if user:
                user.subscription_status = "canceled"
                session.add(user)
                session.commit()

    return {"received": True}


def _find_user_for_subscription(obj: dict, session: Session) -> Optional[User]:
    ref = obj.get("client_reference_id")
    if ref:
        try:
            user = session.get(User, int(ref))
            if user:
                return user
        except (TypeError, ValueError):
            pass
    email = (obj.get("customer_details") or {}).get("email") or obj.get("customer_email")
    if email:
        return session.exec(select(User).where(User.email == email)).first()
    return None
