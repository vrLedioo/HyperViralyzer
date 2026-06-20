# ViralYzer — AI Growth Toolkit for Creators

A SaaS that turns a video idea or clip into a full **growth report**: hook / retention / viral
scores (0–100) with actionable feedback, the **best hashtags** to use, and the **best time to
post** — all tuned to your platform and audience. Two modes:

- **Idea Tester** — paste a title + the first 30–60s of your script; get an instant report.
- **Video Upload** — upload a clip; we extract the audio (ffmpeg), transcribe it (OpenAI
  Whisper), and analyze the *real* hook you delivered.

## Monetization

Subscriptions grant a **monthly credit allowance** (refills each renewal, no rollover); credit
packs are one-time top-ups that never expire. An idea report costs **1 credit**; a video report
costs **5** (it includes transcription).

| Path | Account? | Price | Grants |
|------|----------|-------|--------|
| **BYOK** | No | Free | User pastes their own OpenAI key (unlimited). |
| **Free** | Yes | Free | 10 starter credits on signup. |
| **Creator** | Yes | €14/mo | 150 credits / month. |
| **Pro** | Yes | €29/mo | 500 credits / month + priority. |
| **Agency** | Yes | €79/mo | 2,000 credits / month + team. |
| **Credit packs** | Yes | €9 / €29 | 50 or 200 credits, one-off (never expire). |

Payments use **Lemon Squeezy** (a Merchant of Record — works in countries Stripe doesn't, e.g.
Kosovo, and handles tax/VAT). Stripe is also supported via `PAYMENT_PROVIDER=stripe`.

## Tech stack

- **Backend:** FastAPI + SQLModel (SQLite locally, Postgres-ready), OpenAI (`gpt-4o-mini` +
  `whisper-1`), Lemon Squeezy / Stripe, JWT auth (PyJWT + bcrypt).
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4, lucide-react.

## Prerequisites

- **Python 3.11+** and **Node 18+**
- **ffmpeg** on your PATH (required for video analysis) — verify with `ffmpeg -version`
- An AI provider for scoring/transcription. Pick one:
  - **No key (local, free):** [Ollama](https://ollama.com) + a small model, e.g.
    `ollama pull llama3.2:3b`. Transcription uses `faster-whisper` locally. This is the
    default in `.env.example` (see the "Keyless local setup" block).
  - **OpenAI key:** set `OPENAI_API_KEY` and leave `LLM_BASE_URL` empty.
  - **Other OpenAI-compatible API:** e.g. Groq's free tier — set `LLM_BASE_URL`,
    `LLM_API_KEY`, `LLM_MODEL`.
- A **Lemon Squeezy** account — only needed to exercise billing (see [docs/GO-LIVE.md](docs/GO-LIVE.md))

### Keyless local setup (no OpenAI key)

```bash
# 1. Install Ollama (https://ollama.com), then pull a small, fast model:
ollama pull llama3.2:3b
# 2. In backend/.env:
#    LLM_BASE_URL=http://localhost:11434/v1
#    LLM_API_KEY=ollama
#    LLM_MODEL=llama3.2:3b
#    TRANSCRIPTION_PROVIDER=local
```

Scoring then runs entirely on your machine; video transcription uses `faster-whisper`
(downloads a small model on first use). Note: on a CPU-only machine, expect ~10–40s per
analysis — small models are strongly recommended (avoid 7B+ "thinking" models like qwen3).

## Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
# For the keyless LOCAL transcription path (faster-whisper), instead run:
#   pip install -r requirements-local.txt
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
Landing page: http://localhost:3000 · the app itself: http://localhost:3000/app

### Billing (local)
Billing is off by default (`PAYMENT_PROVIDER=none`) — the app runs fully without it. To exercise
payments locally, set up Lemon Squeezy (test mode) per [docs/GO-LIVE.md](docs/GO-LIVE.md) and point
its webhook at `http://localhost:8008/api/lemonsqueezy/webhook` (use a tunnel like ngrok/cloudflared).

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/signup` · `/login` | Create account / log in (returns JWT) |
| GET  | `/api/auth/me` | Current user (credits, subscription) |
| POST | `/api/analyze-idea` | Score a title + script (idea mode) |
| POST | `/api/analyze-video` | Upload a video → returns an opaque job token |
| GET  | `/api/jobs/{token}` | Poll a video job (transcribing → scoring → done); owner-only |
| GET  | `/api/history` | Logged-in user's past analyses |
| GET  | `/api/config` | Public capability flags (provider, billing, credit costs, etc.) |
| POST | `/api/checkout/subscription` | Start a subscription checkout (Lemon Squeezy / Stripe) |
| POST | `/api/checkout/credits` | Buy a credit pack (Lemon Squeezy) |
| POST | `/api/checkout/pay-per-use` · `/verify` | Anonymous one-off (Stripe only) |
| POST | `/api/lemonsqueezy/webhook` · `/api/stripe/webhook` | Fulfill orders/subscriptions |

## Access model

Every analysis passes through one gate (`backend/access.py`): BYOK key → account credits →
single-use pay token. Account credits combine a monthly subscription allowance (spent first) and
purchased pack credits (spent second). If none apply, the request is rejected with `402` (no more
silent fake scores).

## Publishing / going live

- **[docs/GO-LIVE.md](docs/GO-LIVE.md)** — exact steps to deploy (Vercel + Render + Postgres),
  set up Stripe, and take real payments.
- **[docs/MARKETING.md](docs/MARKETING.md)** — brand, positioning, and a copy/paste launch kit
  (Product Hunt, X, Reddit, email).
- Production runs on a cloud OpenAI key (`TRANSCRIPTION_PROVIDER=openai`); the free local Ollama
  setup is for development. `render.yaml` + `backend/Dockerfile` make the backend one-click deployable.

## Security & production

- **`APP_ENV=production`** turns on fail-fast startup guards: the app refuses to boot with a
  weak/default `JWT_SECRET` (< 32 chars or a known placeholder) or with a payment provider enabled
  but no webhook signing secret. Local dev (`APP_ENV=development`, the default) relaxes these.
- **Webhooks are always signature-verified** (Lemon Squeezy HMAC-SHA256 / Stripe signature) — there
  is no unsigned fallback. Credit grants are idempotent; the Stripe one-off `/checkout/verify` also
  validates the session's mode, paid status, currency, and exact amount.
- **Video jobs use unguessable tokens** and are owner-scoped (no IDOR via sequential ids).
- **Upload/DoS guards:** in-flight job cap (429), `Content-Length` pre-check, ffmpeg timeout,
  and a lock around the local Whisper model.

### Port note

If port `8000` is taken on your machine, run the backend on another port
(`uvicorn main:app --port 8008`) and set `NEXT_PUBLIC_API_URL=http://localhost:8008` in
`frontend/.env.local`.

## Notes / roadmap (v2)

Frame/vision analysis, production deployment, password reset, Postgres + a real job queue,
short-lived access tokens with refresh, and rate limiting are intentionally out of scope for
this local-first build.
