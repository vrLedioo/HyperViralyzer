# Hyperyzer — Go-Live Runbook

Step-by-step to publish and take real payments. The code is already production-ready —
these are the things only **you** can do (they need your own accounts and secret keys).

**Architecture:** Frontend → Vercel · Backend (FastAPI + ffmpeg) → Render · DB → managed Postgres
· AI → your OpenAI key · Payments → **Lemon Squeezy** (Merchant of Record — works in Kosovo,
handles tax/VAT, and pays you out via PayPal/Wise).

> Why Lemon Squeezy instead of Stripe? Stripe doesn't onboard sellers in Kosovo. Lemon Squeezy
> sells on your behalf and remits to you, so it works. (The code still supports Stripe via
> `PAYMENT_PROVIDER=stripe` if you ever need it.)

Do everything in **Lemon Squeezy test mode first**, verify end-to-end, then switch to live.

---

## What you sell (the catalog)

Subscriptions grant a **monthly credit allowance** (refills each renewal, no rollover).
Credit packs are **one-time** top-ups that never expire. An idea report costs **1 credit**;
a video report costs **5** (it includes transcription).

| Product | Type | Price | Grants |
|---|---|---|---|
| Creator | Subscription | €14 / mo | 150 credits / month |
| Pro ⭐ | Subscription | €29 / mo | 500 credits / month |
| Agency | Subscription | €79 / mo | 2,000 credits / month |
| Starter pack | Single payment | €9 | 50 credits |
| Value pack | Single payment | €29 | 200 credits |

> The credit amounts are defined in code (`backend/plans.py`). The **prices** live in Lemon
> Squeezy — set them to match the table above (or tweak both together).

---

## 0. Prerequisites (≈15 min, free)
Create these accounts (I can't create them for you):
- [ ] GitHub (push this repo — it already has its own git repo with commits)
- [ ] OpenAI Platform → create an API key, add a small balance (analyses cost fractions of a cent)
- [ ] **Lemon Squeezy** → sign up, create a **Store**
- [ ] Render (backend) + Vercel (frontend) — sign in with GitHub
- [ ] A payout method Lemon Squeezy supports for Kosovo (**Wise** or **PayPal**) — confirm in
      Lemon Squeezy → Settings → Payouts before launching.

Push the repo:
```bash
cd saas-video-analyzer
gh repo create hyperyzer --private --source=. --push   # or create on github.com and: git push
```

---

## 1. Lemon Squeezy setup (test mode)
Turn on **Test mode** (toggle in the dashboard) while setting up.

1. **API key** — Settings → API → **Create API key** → copy it (`LEMONSQUEEZY_API_KEY`).
2. **Store ID** — Settings → Stores (the numeric id, e.g. `12345`) → `LEMONSQUEEZY_STORE_ID`.
3. **Create 3 subscription products** (Products → **+ New Product**, pricing **Subscription**):
   - "Hyperyzer Creator" — **€14 / month** → variant id → `LS_VARIANT_CREATOR`
   - "Hyperyzer Pro" — **€29 / month** → variant id → `LS_VARIANT_PRO`
   - "Hyperyzer Agency" — **€79 / month** → variant id → `LS_VARIANT_AGENCY`
4. **Create 2 credit-pack products** (pricing **Single payment**):
   - "50 Credits" — **€9** → variant id → `LS_VARIANT_PACK_SMALL`
   - "200 Credits" — **€29** → variant id → `LS_VARIANT_PACK_LARGE`

   For each product: Publish it, open the product → its **Variant** → copy the **variant ID**
   (in the variant URL / "Share" checkout link, or via the API `GET /v1/variants`).
   You only need to create the products you want to sell — any variant id you leave blank simply
   hides that plan/pack in the app.
5. **Webhook** — Settings → Webhooks → **+ Add endpoint**:
   - URL: `https://YOUR-BACKEND.onrender.com/api/lemonsqueezy/webhook` (you can edit it after deploy).
   - **Signing secret**: enter a long random string → that's your `LEMONSQUEEZY_WEBHOOK_SECRET`.
   - Events: `order_created`, `order_refunded`, `subscription_created`, `subscription_updated`,
     `subscription_payment_success`, `subscription_cancelled`, `subscription_expired`.
   - ⚠️ The backend **requires** this secret in production and rejects unsigned/forged webhooks.

You now have: API key, store id, webhook secret, and up to 5 variant ids.

---

## 2. Deploy the backend (Render)
1. Render → **New → Blueprint** → pick your repo. It reads `render.yaml` and creates the
   `hyperyzer-api` web service + a free Postgres DB. (`JWT_SECRET` is auto-generated; `DATABASE_URL`
   is auto-wired; `PAYMENT_PROVIDER=lemonsqueezy` is preset.)
2. In the service's **Environment**, fill the `sync:false` secrets:
   - `OPENAI_API_KEY` = your `sk-...`
   - `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`
   - `LS_VARIANT_CREATOR`, `LS_VARIANT_PRO`, `LS_VARIANT_AGENCY` (the plans you created)
   - `LS_VARIANT_PACK_SMALL`, `LS_VARIANT_PACK_LARGE` (the packs you created)
   - `FRONTEND_URL` = your Vercel URL (fill after step 3; redeploy after)
3. Deploy. Confirm `https://YOUR-BACKEND.onrender.com/api/config` shows
   `"payment_provider": "lemonsqueezy"`, `"subscription_enabled": true`, and that the `plans`/`packs`
   arrays list the ones you configured with `"available": true`.
4. Set the Lemon Squeezy webhook URL to this backend's `/api/lemonsqueezy/webhook`.

> No Dockerfile changes needed — `backend/Dockerfile` installs ffmpeg and runs uvicorn on `$PORT`.

---

## 3. Deploy the frontend (Vercel)
1. Vercel → **Add New → Project** → import your repo. Set **Root Directory = `frontend`**.
2. Environment Variables → `NEXT_PUBLIC_API_URL` = `https://YOUR-BACKEND.onrender.com`.
3. Deploy → you get `https://your-app.vercel.app`.
4. **Back on Render**, set `FRONTEND_URL` to this exact URL and redeploy (so CORS + payment
   redirects point at the live site).

---

## 4. End-to-end test (Lemon Squeezy test mode)
On your live Vercel URL:
- [ ] Sign up → you get **10 credits**; run an idea report (1 credit) → real scores + hashtags + best time.
- [ ] Upload a short clip → transcribes → full report (5 credits).
- [ ] **Subscribe to a plan** → pay with a Lemon Squeezy **test card** → after redirect your account
      shows the plan name and its monthly credits (the `subscription_created` webhook loaded them).
- [ ] **Buy a credit pack** → test card → your balance increases by the pack size once the
      `order_created` webhook lands (a couple seconds).
- [ ] (Optional) Issue a test refund in Lemon Squeezy → confirm the pack credits are deducted
      (`order_refunded`).
- [ ] In Lemon Squeezy → Settings → Webhooks, confirm deliveries show **200 OK**.

---

## 5. Go live
1. Lemon Squeezy: **activate your store** (business details + payout method — Wise/PayPal for Kosovo),
   then turn **Test mode OFF**.
2. Variant IDs are usually the same in live mode; re-copy them if Lemon Squeezy issued new ones, and
   update the Render env vars. Keep the same webhook (or recreate for the live store) and update
   `LEMONSQUEEZY_WEBHOOK_SECRET` if it changed.
3. (Optional) Add a custom domain in Vercel; update `FRONTEND_URL` / `CORS_ORIGINS` on Render.

You're live and taking money. 💸

---

## Costs & margins
- OpenAI: `gpt-4o-mini` scoring ≈ $0.0003/report; Whisper ≈ $0.006/audio-min. A typical report
  costs you **about a cent or less**. Lemon Squeezy takes ~5% + fees as Merchant of Record — still
  leaving the vast majority as margin on a €14–€79 plan or a credit pack.
- Render/Vercel/Neon free tiers cover early traffic; upgrade Render to Starter ($7/mo) to avoid
  cold-start sleeps once you have users.

## Pricing knobs
- **Credit amounts per plan/pack:** `backend/plans.py` (`PLANS`, `PACKS`).
- **Credit costs & free trial (Render env vars):**

  | Var | Default | Controls |
  |---|---|---|
  | `IDEA_CREDIT_COST` | `1` | credits per idea report |
  | `VIDEO_CREDIT_COST` | `5` | credits per video report |
  | `FREE_CREDITS_ON_SIGNUP` | `10` | trial credits |

- **Prices:** set in the Lemon Squeezy dashboard. Keep the landing page's pricing copy
  (`frontend/src/app/page.tsx`) in sync with what you charge.

## Hardening (already coded)
- Production guard refuses a weak `JWT_SECRET` or a payment provider without its webhook secret.
- Webhooks are signature-verified; orders/refunds are idempotent; video jobs are capped and use
  unguessable tokens.
- Consider rate-limiting and email verification as you scale (README roadmap).
