# Deployment — canonical layout

Use the **repository root** as the only source of truth for new deployments.

## UI inventory — Command Center vs other frontends

There are **two** full **Vite + React Command Center** trees (same routes, slightly different shell polish). Default **`vite.config.ts`** uses the one you carried in **VS Code** when you moved the system:

| UI folder | `npm run …` | What you get |
|-----------|-------------|--------------|
| **`client/`** | **`dev:main-ui`**, **`cyrus:up`**, **`npm run dev`** (default) | **VS Code Command Center** — sidebar (“Now viewing”, escape-to-close menu, etc.), all module routes, **`/modules`** console grid. This is the UI you had open in VS Code before consolidating the repo here. |
| **`original-cyrus-ui-extracted/client/`** | **`dev:replit-ui`**, **`dev:replit`** | **Replit export snapshot** of the same Command Center (older shell styling). Use if you want to compare or fall back to the extracted copy. |
| **`cyrus-ui/`** | **`dev:cyrus-ui`**, **`dev:dashboard-ui`** | **Different app**: dashboard / trading / assistant package. Set `CYRUS_UI_ROOT=cyrus-ui` only when you want this shell. |

To see **all** Command Center modules: run **`npm run dev`**, pass the gate, then use the **sidebar** or **`/modules`**.

### Static “Replit upload” pages (not the Command Center)

| Path | Verdict |
|------|--------|
| **`cyrus_replit_upload/`**, **`server/quantum_ai/cyrus_replit_upload/`** | Single-file **HTML** landing pages + Flask-style helpers — **not** the multi-route React Command Center. |

### Command Center gate (local dev)

**`cyrus-ui`** uses **`POST /api/login`** (`standalone/auth-adapter.ts`): **`ADMIN_ACCESS_CODE`** grants **admin** (any username); **`USER_ACCESS_CODE`** grants **user**. Override both in **`.env`**. The older **`client/…/AccessGate.tsx`** client-only gate is separate.

## Production (recommended)

| Artifact | Purpose |
|----------|---------|
| `Dockerfile.prod` | Multi-stage Node 20 image: `npm ci` → `npm run build` → runtime + `cyrus-ai` pip deps |
| `scripts/entrypoint.prod.sh` | Starts **FastAPI** (`cyrus-ai`, port `PYTHON_PORT` / default `8001`) and **Node** (`dist/server/index.js`, `PORT` / default `5000`) |
| `railway.toml` | Railway: build from `Dockerfile.prod`, start via entrypoint, health `/health/ready` |

Build and run locally with Docker:

```bash
docker build -f Dockerfile.prod -t cyrus:prod .
docker run --rm -p 5000:5000 -p 8001:8001 --env-file .env.example cyrus:prod
```

## Application entrypoints (dev)

In development, **one** Node process serves both the Vite UI and `/api/*` (same origin). Set `CYRUS_UI_ROOT` to override the tree in `vite.config.ts`. **Default when unset: `client/`** (VS Code Command Center).

| Command | Stack |
|---------|--------|
| `npm run cyrus:up` | Safe launcher (default: **`client/`**). Options: `bash scripts/cyrus-up.sh --help` |
| `npm run dev` / `dev:main-ui` / `dev:command-center` | **Default** — **`client/`** Command Center |
| `npm run dev:replit-ui` / `dev:replit` | **`CYRUS_UI_ROOT=original-cyrus-ui-extracted/client`** (Replit snapshot) |
| `npm run dev:cyrus-ui` / `dev:dashboard-ui` | **`cyrus-ui/`** package |
| `npm run dev:stack:replit` | `cyrus-ai/api.py` + `dev:main-ui` (Python on `CYRUS_AI_PORT`, default `8001`) |
| `npm run dev:stack:cyrus-ui` | `cyrus-ai/api.py` + `dev:cyrus-ui` |
| `npm run start:app` | `tsx server/index.ts`; Vite uses **`client/`** unless `CYRUS_UI_ROOT` is set |
| `npm run start:app:cyrus-ui` | Same as `dev:cyrus-ui` |
| `npm run start:app:extracted-ui` | Same as `dev:replit-ui` |
| `npm run start:all` | Python `cyrus-ai/api.py` + `npm run start` (production `node dist/...`) |
| `make start-local` | `PORT=3020` dev server |

## Typecheck / build

| Scope | Command |
|-------|---------|
| Server + shared only (excludes `server/quantum_ai`) | `npm run typecheck` |
| UI package | `cd cyrus-ui && npm run check` |
| Both | `npm run typecheck:all` |
| Production assets | `npm run build` (root `tsc` + Vite for default UI) |

## Experimental tree (`server/quantum_ai/`)

`server/quantum_ai/` is an experimental / alternate server tree. It is **excluded from root `tsc`**; the main app may still reference scripts such as `quantum_bridge.py` — keep it in the image if you use those features.

Older snapshot directories (`cyrus-deployment-*`, `zip_*_ui/`, `migrated_workspaces/`, etc.) have been **removed from this repository** to keep a single canonical layout at the root.

## Vercel

`vercel.json` targets `dist/server/index.js`. Run `npm run build` at the repo root before deploy so `dist/` exists.
