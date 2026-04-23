# Permanent Deployment

This repository is now prepared for two permanent-access modes:

1. Local always-on macOS service via `launchd`
2. Cloud deployment via Docker-compatible platforms such as Railway

For the macOS service, the runtime bundle is synced to `~/cyrus-service` so launchd is not blocked by Downloads-folder privacy protections.

## Local Always-On Service

Build once:

```bash
cd /Users/cronet/Downloads/cyrus-part2-assets-fullzip
npm run build
```

Install and start the login service:

```bash
npm run service:install
```

Sync future code changes into the persistent service bundle:

```bash
npm run service:sync
npm run service:restart
```

Useful commands:

```bash
launchctl print gui/$(id -u)/com.cyrus.server
npm run service:restart
tail -f logs/runtime/server.log
tail -f logs/runtime/quantum-bridge.log
```

The service listens on port `3105` and restarts automatically after login and on process failure.

## Cloud Deployment

The repository now includes a production `Dockerfile` and `railway.json`.

Required environment variables in the hosting platform:

```bash
OPENAI_API_KEY=...
AI_INTEGRATIONS_OPENAI_API_KEY=...
ELEVENLABS_API_KEY=...
DATABASE_URL=...
PORT=3105
NODE_ENV=production
```

Recommended target: Railway.

Deployment flow:

```bash
railway login
railway init
railway up
```

## Current Limitation

Publishing to a permanent public URL still requires a hosting account session and domain/platform ownership. The codebase is prepared for that deployment, but the final publish step must be executed against your chosen hosting account.