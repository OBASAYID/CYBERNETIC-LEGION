# Security Guidelines

## Environment Variables
- Never commit `.env` files — use `.env.example` as a template only
- Use strong random secrets (32+ characters) for `ENCRYPTION_SECRET`, `SESSION_SECRET`, and access codes
- Rotate encryption keys regularly; re-encrypt stored data after rotation
- Set `NODE_ENV=production` in all production deployments

## Authentication
- Password gate for user access via `USER_ACCESS_CODE` / `ADMIN_ACCESS_CODE`
- Session-based auth stored in PostgreSQL (`sessions` table)
- Admin-only routes protected by `requireAdminForSensitiveApi` middleware
- CORS protection enabled — set `CORS_ORIGIN` to your exact production domain

## Data Protection
- Sensitive values (API keys, tokens) encrypted at rest using AES-256-GCM
- `ENCRYPTION_SECRET` and `ENCRYPTION_SALT` must be set before first run
- HTTPS enforced in production via Railway's TLS termination
- File uploads validated by MIME type and size limit (2 MB JSON, configurable for files)

## Rate Limiting
- Standard limiter: 100 requests per 15 minutes on all `/api/*` routes
- Stricter limiter applied to inference, vision, upload, and speech endpoints
- Limits are enforced via `express-rate-limit` in `server/security/middleware.ts`

## Security Headers
- `helmet` applied globally with `crossOriginResourcePolicy: false` for asset serving
- Content-Security-Policy disabled by default (SPA with inline scripts); enable and tune for your CSP needs
- `trust proxy` enabled when `TRUST_PROXY=1` (required behind Railway's load balancer)

## Deployment
- Use Railway's built-in TLS and private networking
- Enable health checks (`/health/ready`) so Railway restarts unhealthy instances
- Monitor error logs — unhandled rejections and uncaught exceptions are logged via Winston
- Set `CYRUS_ENABLE_PYTHON=0` unless Python AI services are explicitly required
