# VidAnalyzer — AI Video & Idea Analyzer

A SaaS that scores short-form video content for **hook strength, retention, and viral
potential**, and returns actionable feedback. Two modes:

- **Idea Tester** — paste a title + the first 30–60s of your script; get instant AI scoring.
- **Video Upload** — upload a clip; we extract the audio (ffmpeg), transcribe it (OpenAI
  Whisper), and score the *real* hook.

## Monetization (three ways to use it)

| Path | Account? | Cost | Notes |
|------|----------|------|-------|
| **BYOK** | No | Free | User pastes their own OpenAI key. |
| **Pay-per-use** | No | $0.99 | Stripe checkout → single-use token grants one analysis. |
| **Subscription** | Yes | Recurring | Unlimited analyses + saved history. New accounts get 3 free credits. |

## Tech stack

- **Backend:** FastAPI + SQLModel (SQLite locally, Postgres-ready), OpenAI (`gpt-4o-mini` +
  `whisper-1`), Stripe, JWT auth (PyJWT + bcrypt).
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4, lucide-react.

## Prerequisites

- **Python 3.11+** and **Node 18+**
- **ffmpeg** on your PATH (required for video analysis) — verify with `ffmpeg -version`
- An **OpenAI API key** (for the server-side / non-BYOK paths)
- A **Stripe** account in test mode + the **Stripe CLI** (for local webhooks) — only needed
  to exercise billing

## Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
copy .env.example .env           # then fill in your keys (cp on macOS/Linux)
uvicorn main:app --reload --port 8000
```
Interactive API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
# optional: copy .env.local.example .env.local  (defaults to localhost:8000)
npm run dev
```
App: http://localhost:3000

### Stripe webhooks (local, for subscriptions)
```bash
stripe listen --forward-to localhost:8000/api/stripe/webhook
# copy the printed whsec_... into backend/.env as STRIPE_WEBHOOK_SECRET
```
Create a recurring Price in the Stripe dashboard and put its id in
`STRIPE_SUBSCRIPTION_PRICE_ID`. Test card: `4242 4242 4242 4242`, any future expiry/CVC.

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/signup` · `/login` | Create account / log in (returns JWT) |
| GET  | `/api/auth/me` | Current user (credits, subscription) |
| POST | `/api/analyze-idea` | Score a title + script (idea mode) |
| POST | `/api/analyze-video` | Upload a video → returns a background job id |
| GET  | `/api/jobs/{id}` | Poll a video job (transcribing → scoring → done) |
| GET  | `/api/history` | Logged-in user's past analyses |
| POST | `/api/checkout/pay-per-use` · `/subscription` | Start a Stripe checkout |
| POST | `/api/checkout/verify` | Mint a single-use token after a paid checkout |
| POST | `/api/stripe/webhook` | Fulfill subscription activation/cancellation |

## Access model

Every analysis passes through one gate (`backend/access.py`): BYOK key → active subscription →
account credits → single-use pay token. If none apply, the request is rejected with `402`
(no more silent fake scores).

## Notes / roadmap (v2)

Frame/vision analysis, production deployment, password reset, Postgres + a real job queue,
and rate limiting are intentionally out of scope for this local-first build.
