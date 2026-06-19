# VidAnalyzer — Go-Live Runbook

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
gh repo create vidanalyzer --private --source=. --push   # or create on github.com and: git push
```

---

## 1. Lemon Squeezy setup (test mode)
Turn on **Test mode** (toggle in the dashboard) while setting up.

1. **API key** — Settings → API → **Create API key** → copy it (`LEMONSQUEEZY_API_KEY`).
2. **Store ID** — Settings → Stores (the numeric id, e.g. `12345`) → `LEMONSQUEEZY_STORE_ID`.
3. **Pro subscription product** — Products → **+ New Product**:
   - Name "VidAnalyzer Pro", pricing **Subscription**, **$9 / month**.
   - Publish, then open the product → its **Variant** → copy the **variant ID**
     (visible in the variant's URL / "Share" checkout link, or via the API `/v1/variants`).
     → `LEMONSQUEEZY_SUBSCRIPTION_VARIANT_ID`.
4. **Credit-pack product** — Products → **+ New Product**:
   - Name e.g. "30 Analysis Credits", pricing **Single payment**, your price (e.g. $9).
   - Copy its **variant ID** → `LEMONSQUEEZY_CREDITS_VARIANT_ID`.
   - (The number of credits granted is set by `CREDIT_PACK_SIZE`, default 30 — keep them consistent.)
5. **Webhook** — Settings → Webhooks → **+ Add endpoint**:
   - URL: `https://YOUR-BACKEND.onrender.com/api/lemonsqueezy/webhook` (you can edit the URL after deploy).
   - **Signing secret**: enter a long random string → that's your `LEMONSQUEEZY_WEBHOOK_SECRET`.
   - Events: `order_created`, `subscription_created`, `subscription_updated`,
     `subscription_cancelled`, `subscription_expired`.
   - ⚠️ The backend **requires** this secret in production and rejects unsigned/forged webhooks.

You now have 5 values: API key, store id, webhook secret, subscription variant id, credits variant id.

---

## 2. Deploy the backend (Render)
1. Render → **New → Blueprint** → pick your repo. It reads `render.yaml` and creates the
   `vidanalyzer-api` web service + a free Postgres DB. (`JWT_SECRET` is auto-generated; `DATABASE_URL`
   is auto-wired; `PAYMENT_PROVIDER=lemonsqueezy` is preset.)
2. In the service's **Environment**, fill the `sync:false` secrets:
   - `OPENAI_API_KEY` = your `sk-...`
   - `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`,
     `LEMONSQUEEZY_SUBSCRIPTION_VARIANT_ID`, `LEMONSQUEEZY_CREDITS_VARIANT_ID`
   - `FRONTEND_URL` = your Vercel URL (fill after step 3; redeploy after)
3. Deploy. Confirm `https://YOUR-BACKEND.onrender.com/api/config` shows
   `"payment_provider": "lemonsqueezy"`, `"subscription_enabled": true`, `"credits_purchase_enabled": true`.
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
- [ ] Sign up → you get 3 credits; run an idea analysis (1 credit) → real scores.
- [ ] Upload a short clip → transcribes → scores (3 credits).
- [ ] **Go Pro** → pay with a Lemon Squeezy **test card** → after redirect your account shows
      "Pro — unlimited" (the `subscription_created` webhook activated it).
- [ ] **Buy credits** → test card → your credit balance increases by `CREDIT_PACK_SIZE` once the
      `order_created` webhook lands (a couple seconds).
- [ ] In Lemon Squeezy → Settings → Webhooks, confirm deliveries show **200 OK**.

---

## 5. Go live
1. Lemon Squeezy: **activate your store** (business details + payout method — Wise/PayPal for Kosovo),
   then turn **Test mode OFF**.
2. The product variant IDs are usually the same in live mode; re-copy them if Lemon Squeezy issued
   new ones, and update the Render env vars. Keep the same webhook (or recreate for the live store)
   and update `LEMONSQUEEZY_WEBHOOK_SECRET` if it changed.
3. (Optional) Add a custom domain in Vercel; update `FRONTEND_URL` / `CORS_ORIGINS` on Render.

You're live and taking money. 💸

---

## Costs & margins
- OpenAI: `gpt-4o-mini` scoring ≈ $0.0002/analysis; Whisper ≈ $0.006/audio-min. A typical analysis
  costs you **well under 1¢**. Lemon Squeezy takes ~5% + fees as Merchant of Record — still leaving
  the vast majority as margin on a $9 plan or a credit pack.
- Render/Vercel/Neon free tiers cover early traffic; upgrade Render to Starter ($7/mo) to avoid
  cold-start sleeps once you have users.

## Pricing knobs (Render env vars)
| Var | Default | Controls |
|---|---|---|
| `CREDIT_PACK_SIZE` | `30` | credits granted per credit-pack purchase |
| `IDEA_CREDIT_COST` | `1` | credits per idea analysis |
| `VIDEO_CREDIT_COST` | `3` | credits per video analysis |
| `FREE_CREDITS_ON_SIGNUP` | `3` | trial credits |
| Lemon Squeezy variant prices | — | set in the Lemon Squeezy dashboard |

Keep the landing page's "$9/mo" and credit-pack copy in sync with your Lemon Squeezy prices.

## Hardening (already coded)
- Production guard refuses a weak `JWT_SECRET` or a payment provider without its webhook secret.
- Webhooks are signature-verified; video jobs are capped and use unguessable tokens.
- Consider rate-limiting and email verification as you scale (README roadmap).
