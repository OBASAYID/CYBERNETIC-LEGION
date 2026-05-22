# CYRUS Architecture

## Stack
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: Express 5 + TypeScript + Node 22
- **Database**: PostgreSQL
- **Real-time**: Socket.IO
- **Auth**: Session-based with password gate
- **Deployment**: Docker + Railway

## Services
- cybernetic-legion (main app)
- PostgreSQL (database)

## API Routes
- `/api/*` — API endpoints
- `/health/*` — Health checks
- `/ws` — WebSocket signaling
- `/` — Frontend (SPA)

## Directory Layout

```
├── client/                   # Command Center React UI (default CYRUS_UI_ROOT)
├── cyrus-ui/                 # Dashboard/assistant shell (alt CYRUS_UI_ROOT)
├── server/                   # Express + TypeScript API gateway
│   ├── index.ts              # Server entrypoint — bootstrap, middleware, routing
│   ├── routes.ts             # Core route registration (Socket.IO, uploads, etc.)
│   ├── db.ts                 # PostgreSQL pool (pg + drizzle-orm)
│   ├── storage.ts            # Drizzle ORM data-access layer
│   ├── ai/                   # AI modules (brain, knowledge, learning, vision)
│   ├── config/               # Port/env helpers
│   ├── observability/        # Structured logging (Winston) + metrics
│   ├── security/             # Auth middleware, rate limiting
│   └── settings/             # User/system settings routes
├── drizzle/                  # SQL migrations (drizzle-kit)
├── Dockerfile.prod           # Multi-stage production image
├── railway.toml              # Railway deployment config
└── .env.example              # Environment variable template
```

## Data Flow

```
Browser → CORS → Helmet → Rate Limiter → Auth Middleware → Route Handler → DB / AI
                                                                    ↓
                                                             Socket.IO (real-time)
```

## Authentication

- **Standalone** (Railway/Docker): `POST /api/login` with `ADMIN_ACCESS_CODE` or `USER_ACCESS_CODE`
- **Replit**: OpenID Connect via `REPL_ID` detection
- Sessions stored in PostgreSQL via `connect-pg-simple`

## Observability

- Structured JSON logs via Winston (`server/observability/logger.ts`)
- Request/response timing logged for all `/api/*` routes
- Metrics tracked in `server/observability/metrics.ts`
- Health endpoints: `GET /health/ready`, `GET /health/live`, `GET /api/status`
