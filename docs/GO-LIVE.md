# VidAnalyzer — Go-Live Runbook

Step-by-step to publish and take real payments. The code is already production-ready —
these are the things only **you** can do (they need your own accounts and secret keys).

**Architecture:** Frontend → Vercel · Backend (FastAPI + ffmpeg) → Render · DB → managed Postgres
· AI → your OpenAI key · Payments → Stripe.

Do everything in **Stripe TEST mode first**, verify end-to-end, then flip to live keys.

---

## 0. Prerequisites (≈15 min, free)
Create these accounts (I can't create them for you):
- [ ] GitHub (push this repo — it already has its own git repo with commits)
- [ ] OpenAI Platform → create an API key, add a small billing balance (analyses cost fractions of a cent)
- [ ] Stripe (no business details needed for test mode)
- [ ] Render (backend) and Vercel (frontend) — sign in with GitHub

Push the repo:
```bash
cd saas-video-analyzer
gh repo create vidanalyzer --private --source=. --push   # or create on github.com and: git push
```

---

## 1. Stripe setup (test mode)
In the Stripe dashboard (toggle **Test mode** ON, top-right):

1. **Get API keys** — Developers → API keys → copy the **Secret key** (`sk_test_...`).
2. **Create the Pro subscription price:**
   - Products → **+ Add product** → name "VidAnalyzer Pro".
   - Pricing: **Recurring**, **$9.00 / month**, USD → Save.
   - Copy the **Price ID** (`price_...`). (If you change the price, update the `$9/mo` text on the landing page.)
3. **Webhook** — Developers → Webhooks → **+ Add endpoint**:
   - URL: `https://YOUR-BACKEND.onrender.com/api/stripe/webhook` (fill in after step 2 of deploy; you can add it now and edit the URL later).
   - Events to send: `checkout.session.completed` and `customer.subscription.deleted`.
   - After creating, copy the **Signing secret** (`whsec_...`).
   - ⚠️ The backend **requires** this secret in production — it refuses unsigned webhooks.

You now have: `STRIPE_SECRET_KEY`, `STRIPE_SUBSCRIPTION_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.

---

## 2. Deploy the backend (Render)
1. Render → **New → Blueprint** → pick your repo. It reads `render.yaml` and creates the
   `vidanalyzer-api` web service + a free Postgres DB. (`JWT_SECRET` is auto-generated; `DATABASE_URL`
   is auto-wired.)
2. In the service's **Environment**, fill the `sync:false` secrets:
   - `OPENAI_API_KEY` = your `sk-...`
   - `STRIPE_SECRET_KEY` = `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
   - `STRIPE_SUBSCRIPTION_PRICE_ID` = `price_...`
   - `FRONTEND_URL` = your Vercel URL (fill after step 3; redeploy after).
3. Deploy. Confirm `https://YOUR-BACKEND.onrender.com/` returns `{"message": "...running"}` and
   `https://YOUR-BACKEND.onrender.com/api/config` shows `"billing_enabled": true`.
4. Go back to the Stripe webhook and set its URL to this backend's `/api/stripe/webhook`.

> No Dockerfile changes needed — `backend/Dockerfile` installs ffmpeg and runs uvicorn on `$PORT`.

---

## 3. Deploy the frontend (Vercel)
1. Vercel → **Add New → Project** → import your repo. Set **Root Directory = `frontend`**
   (Next.js auto-detected).
2. Environment Variables → add `NEXT_PUBLIC_API_URL` = `https://YOUR-BACKEND.onrender.com`.
3. Deploy → you get `https://your-app.vercel.app`.
4. **Back on Render**, set `FRONTEND_URL` to this exact URL and redeploy the backend (so CORS +
   Stripe redirects point at the live site).

---

## 4. End-to-end test (still in Stripe test mode)
On your live Vercel URL:
- [ ] Sign up → you get 3 credits; run an idea analysis → real scores.
- [ ] Upload a short clip → transcribes → scores (first call is slower while it warms).
- [ ] **Subscribe** (Go Pro) → pay with test card `4242 4242 4242 4242`, any future date/CVC →
      after redirect, your account shows "Pro — unlimited" (the webhook activated it).
- [ ] **Pay per use** → same test card → returns and unlocks one analysis.
- [ ] In Stripe → Developers → Webhooks, confirm events show **succeeded** (200).

---

## 5. Flip to live
1. Stripe: switch **Test mode OFF**, redo the **Pro price** + **webhook** in live mode, grab the
   **live** `sk_live_...` / `whsec_...` / `price_...`.
2. Render: replace the three Stripe env vars with the live values → redeploy.
3. (Optional) Add a custom domain in Vercel; update `FRONTEND_URL` / `CORS_ORIGINS` on Render to match.
4. Activate your Stripe account (business + bank details) to receive payouts.

You're live and taking money. 💸

---

## Costs & margins
- OpenAI: `gpt-4o-mini` scoring ≈ $0.0002/analysis; Whisper ≈ $0.006/audio-min. A typical analysis
  costs you **under 1¢** → a $0.99 charge is ~99% margin; $9/mo is almost pure profit.
- Render/Vercel/Neon free tiers cover early traffic; upgrade Render to Starter ($7/mo) to avoid
  cold-start sleeps once you have users.

## Hardening before scale (already coded, just be aware)
- Production guard refuses weak `JWT_SECRET` / missing webhook secret — keep them strong.
- Video jobs are capped (`MAX_ACTIVE_VIDEO_JOBS`) and use unguessable tokens.
- Consider adding rate-limiting and email verification as you grow (see README roadmap).
