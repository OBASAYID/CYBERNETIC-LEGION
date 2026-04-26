# Railway Deployment (Bun)

This project is configured to deploy on Railway using Bun and `Dockerfile.railway`.

## Build and runtime

- Builder: Dockerfile (`Dockerfile.railway`)
- Build command: `bun run build`
- Start command: `bun dist/server/index.js`
- Health check path: `/health/ready`

## Required Railway environment variables

Set these in Railway service variables:

- `NODE_ENV=production`
- `SESSION_SECRET=<long-random-secret>`
- `ADMIN_ACCESS_CODE=<admin-code>`
- `USER_ACCESS_CODE=<user-code>`
- `DATABASE_URL=<postgres-connection-string>`
- `PUBLIC_BASE_URL=https://<your-railway-domain>`
- `CORS_ORIGIN=https://<your-railway-domain>`
- `CYRUS_ENABLE_PYTHON=0`
- `ENABLE_REUSE_PORT=false`

## Important notes

- Do not hardcode `PORT` in Railway variables. Railway injects it.
- Do not set `CYRUS_LIVE_PORT` to a different value than Railway `PORT`.
- Leave `FRONTEND_STATIC_DIR` unset unless you intentionally override static detection.

## Railway service setup

1. Connect repository: `OBASAYID/CYBERNETIC-LEGION`
2. Branch: `main` (or your active deploy branch)
3. Ensure root is repository root
4. Confirm `railway.toml` and `Dockerfile.railway` are detected
5. Deploy and verify:
   - `GET /health/ready` returns 200
   - App loads and login works with your access code
