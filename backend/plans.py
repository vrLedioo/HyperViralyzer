"""Subscription plans and one-time credit packs — the pricing catalog.

This is the single source of truth for what we sell. Prices here are *display
only*; the real charge lives in the matching Lemon Squeezy variant. Each plan /
pack is linked to a Lemon Squeezy **variant id** supplied via env (see config).

Monetization model:
  - A subscription grants a monthly bucket of credits (`monthly_credits`) that is
    refilled on every successful renewal payment (it does NOT roll over).
  - A credit pack is a one-time top-up of `credits` that never expires.
  - Both buckets are spent by analyses; subscription credits are spent first
    (use-it-or-lose-it), purchased pack credits second.
"""

# Plan key -> metadata. Order matters for display (cheapest first).
PLANS: dict[str, dict] = {
    "creator": {
        "name": "Creator",
        "price_eur": 14,
        "monthly_credits": 150,
        "priority": False,
        "team": False,
        "tagline": "For creators posting every week.",
    },
    "pro": {
        "name": "Pro",
        "price_eur": 29,
        "monthly_credits": 500,
        "priority": True,
        "team": False,
        "tagline": "For serious creators shipping daily.",
    },
    "agency": {
        "name": "Agency",
        "price_eur": 79,
        "monthly_credits": 2000,
        "priority": True,
        "team": True,
        "tagline": "For teams and agencies running many accounts.",
    },
}

# Pack key -> metadata.
PACKS: dict[str, dict] = {
    "small": {"name": "Starter pack", "price_eur": 9, "credits": 50},
    "large": {"name": "Value pack", "price_eur": 29, "credits": 200},
}


def plan_monthly_credits(plan_key: str | None) -> int:
    p = PLANS.get(plan_key or "")
    return int(p["monthly_credits"]) if p else 0


def pack_credits(pack_key: str | None) -> int:
    p = PACKS.get(pack_key or "")
    return int(p["credits"]) if p else 0
