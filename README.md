# Adevos-X Tech Host Platform

A unified cloud hosting platform: WhatsApp bots, websites, Node.js/Python apps, and more —
deployed through one dashboard, routed automatically across multiple infrastructure providers.

```
FRONTEND  = EXPERIENCE   (Next.js — apps you see)
BACKEND   = TRUTH        (NestJS API — source of record)
WORKERS   = EXECUTION    (separate process — runs deployments/cron)
DATABASE  = STATE        (PostgreSQL via Prisma)
PROVIDERS = INFRASTRUCTURE (Pterodactyl / Render / Vercel / Cloudflare / Heroku adapters)
ROUTER    = DECISION ENGINE (chooses a provider per service, never hardcoded)
```

## Repository layout

```
backend/    NestJS API + BullMQ worker (apps/api/src/workers/worker.main.ts)
frontend/   Next.js 14 App Router web app
docker-compose.yml   Runs the whole stack together
```

## Local development

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in JWT_SECRET / JWT_REFRESH_SECRET / ENCRYPTION_KEY (32+ chars each)
npm install
npx prisma migrate dev      # creates the schema
npx prisma db seed          # roles, permissions, dev service catalog, feature flags
npm run start:dev           # API on :4000
```

In a second terminal, start the worker (deployments and cron ticks run here, never inside the API process):

```bash
cd backend
npm run worker:dev
```

You'll also need Postgres and Redis running locally — the quickest way is:

```bash
docker compose -f backend/docker-compose.yml up postgres redis
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                 # web app on :3000
```

### 3. Full stack via Docker

```bash
cp backend/.env.example backend/.env   # fill in secrets first
docker compose up --build
```

## What's real vs. what needs your own credentials

Everything in this codebase is a genuine, working implementation — nothing is mocked to look
functional when it isn't. A few integrations are **adapters that require real third-party
credentials to activate**; without them, the platform fails safely with a clear
`PROVIDER_CONFIGURATION_ERROR` rather than pretending to succeed:

| Feature | Works out of the box? | Needs |
|---|---|---|
| Auth, RBAC, projects, deployment engine, credits ledger, admin | ✅ Yes | — |
| Storage (buckets/files) | ✅ Yes (local filesystem adapter) | — |
| Cron scheduling | ✅ Yes (real BullMQ repeatable jobs) | — |
| Domain verification | ✅ Yes (real DNS TXT lookup) | — |
| GitHub integration + repo analyzer | ✅ Yes | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` |
| Hosting providers (Pterodactyl/Render/Vercel/Cloudflare/Heroku) | Adapter is complete | Provider API keys in `.env` or Admin → Providers |
| WhatsApp pairing (QR / pairing-code-via-WhatsApp) | Protocol + callback endpoint complete | A deployed bot container that performs the actual WhatsApp device link |
| Rewarded ads | Ledger + fraud guards complete | An ad network with server-to-server reward verification |
| Push notifications | In-app notifications always work | `FCM_PROJECT_ID` / `FCM_CLIENT_EMAIL` / `FCM_PRIVATE_KEY` |
| Outbound email (verification/reset) | Logs intended sends in dev | `EMAIL_PROVIDER_API_KEY` |
| Card/ACH billing | Credits-funded subscriptions work today | A payment provider adapter (Stripe et al.) — not yet implemented |

## Testing

```bash
# backend
cd backend && npm test            # unit tests
cd backend && npm run test:e2e    # requires Postgres + Redis (see CI workflow for exact env)

# frontend
cd frontend && npm test           # unit/component tests
cd frontend && npm run test:e2e   # Playwright — builds and serves the app first
```

CI (`.github/workflows/ci.yml` in each package) runs lint → typecheck → unit → integration/E2E →
build → Docker image on every push, and fails the pipeline on any TypeScript error.

## Production notes

- Never commit `.env` — only `.env.example` files are tracked.
- Rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY` per environment; changing
  `ENCRYPTION_KEY` invalidates all previously-encrypted secrets (provider credentials, WhatsApp
  sessions, environment variable secrets) — plan key rotation accordingly.
- The API and worker are separate containers/processes by design — scale them independently.
- Run `npx prisma migrate deploy` (not `migrate dev`) in production.

