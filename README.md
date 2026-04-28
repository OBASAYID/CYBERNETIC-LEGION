# CYRUS AI System

Fused-stack AI platform with a Node/Express gateway, React frontends, and optional Python AI-core services.

[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/new?template=https://github.com/crypton980/cyrus-cybernetic)
[![Open in Replit](https://replit.com/badge/github/crypton980/cyrus-cybernetic)](https://replit.com/new/github/crypton980/cyrus-cybernetic)
[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue)](https://crypton980.github.io/cyrus-cybernetic)

## 🌟 Live Demos

- **🌐 GitHub Pages Interface**: [crypton980.github.io/cyrus-cybernetic](https://crypton980.github.io/cyrus-cybernetic)
- **🚀 Full AI Deployment**: [Railway/Vercel/Replit deployments available](#deployment)

## 🚀 Quick Deploy

### One-Click Deployments

| Platform | Status | Link |
|----------|--------|------|
| **Railway** | ✅ Ready | [Deploy](https://railway.app/new?template=https://github.com/crypton980/cyrus-cybernetic) |
| **Replit** | ✅ Ready | [Open](https://replit.com/new/github/crypton980/cyrus-cybernetic) |
| **Vercel** | ✅ Ready | [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/crypton980/cyrus-cybernetic) |

### Manual Deployment

**Canonical layout:** build and ship from the **repo root** (`Dockerfile.prod`, `scripts/entrypoint.prod.sh`). See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full layout and commands.

```bash
# Clone the repository
git clone https://github.com/crypton980/cyrus-cybernetic.git
cd cyrus-cybernetic

# Install dependencies
npm ci

# Run locally (single-origin fused mode)
npm run dev

# Access at http://localhost:3020
```

## 🎯 CYRUS Capabilities

### 🤖 Core AI Features
- **🎭 Conversational AI**: Human-like conversations with emotional intelligence
- **🏥 Medical Analysis**: 99.999% accurate disease diagnosis and treatment development
- **🧠 Super Intelligence**: Problem-solving beyond human capability (millennium prize problems)
- **🤖 Robotics Integration**: Advanced automation and control systems
- **🌐 Web Research**: Real-time information gathering and synthesis
- **⚙️ Device Control**: Industrial protocol integration and IoT management
- **📚 AI Teaching**: Self-learning systems with continuous knowledge expansion

### 🔧 Technical Features
- **Modern Web UI**: Chat-style interface with real-time messaging
- **API Endpoints**: RESTful API for all AI capabilities
- **Multi-Platform**: Deployable to Railway, Vercel, Replit, or any cloud platform
- **Authentication**: Secure user sessions and data protection
- **Scalable Architecture**: Built for high-performance AI operations

## 📋 Requirements

- **Python**: 3.12+
- **Node.js**: 18+ (for some integrations)
- **OpenAI API Key**: For AI functionality
- **Cloud Platform**: Railway, Vercel, or Replit for deployment

## 🚀 Deployment Options

Canonical deployment wiring is documented in `DEPLOYMENT.md` and `docs/architecture.md`.

### Option 1: Railway (Recommended)
```bash
# One-click deploy
# Click the Railway button above or:
curl -fsSL https://railway.app/install.sh | sh
railway login
railway init
railway up
```

### Option 2: Replit AI
```bash
# One-click deploy
# Click the Replit button above or:
# Import this repository into Replit
# Run: ./deploy_replit.sh
```

### Option 3: Vercel
```bash
# One-click deploy
# Click the Vercel button above or:
npm install -g vercel
vercel --prod
```

### Option 4: Local development (single clear URL)

The default dev command runs **Express + embedded Vite** for the `cyrus-ui` shell on **one port** (no separate `cyrus-ui` dev server required).

```bash
npm ci
npm run dev
```

Open **`http://127.0.0.1:3020/`** (or `http://localhost:3020/`). Example route: **`http://127.0.0.1:3020/scan`**. **One process, one port:** the UI, `/api/*`, `/health/*`, Vite HMR, Socket.IO (`/cyrus-io`), and `/ws` all share that origin. Do **not** set `VITE_CYRUS_API_BASE` for this mode. Only run a separate `cyrus-ui` Vite dev server (different port, proxied API) if you intentionally need split processes.

Optional: `npm run start:all` also brings up extra services; the fused web UI stays on **`http://127.0.0.1:3020/`** when **`CYRUS_LIVE_PORT=3020`** (or `PORT` mirrors it).

### Agent / editor development (Cursor and others)

Use **`AGENTS.md`** at the repo root and **`.cursor/rules/cyrus-engineering.mdc`** for shared vocabulary: how `cyrus-ui` talks to `server/`, when `REPL_ID` switches auth, and how to avoid duplicate API wiring. That keeps assistants aligned without Replit- or Copilot-specific phrasing in source comments.

## 🔐 Environment Variables

Create a `.env` file or set these in your deployment platform:

```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=your_database_url_here
CYRUS_LIVE_PORT=3020
CYRUS_AI_PORT=8001
SECRET_KEY=your_secret_key_here
```

## 📁 Project Structure

```
├── client/                   # Command Center pages (optional `CYRUS_UI_ROOT=client`)
├── original-cyrus-ui-extracted/client/  # Legacy export snapshot (optional `CYRUS_UI_ROOT`)
├── cyrus-ui/                 # Primary dashboard shell (default `CYRUS_UI_ROOT` for `npm run dev`)
├── server/                   # Backend API gateway (Express + TypeScript)
│   └── index.ts              # Server entrypoint
├── cyrus-ai/                 # AI core service (FastAPI)
│   └── api.py               # FastAPI app
├── docs/                     # GitHub Pages site
├── .github/workflows/        # GitHub Actions
├── cyrus-ai/requirements.txt # Python dependencies
├── replit.nix               # Replit environment
└── README.md                # This file
```

## ⚡ Quick Start

```bash
# 1. Clone and install
git clone https://github.com/crypton980/cyrus-cybernetic.git
cd cyrus-cybernetic
npm ci

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, ADMIN_ACCESS_CODE, SESSION_SECRET, etc.

# 3. Run locally (fused Express + Vite, single port)
npm run dev
# Open http://localhost:3020
```

For production Docker:
```bash
docker build -f Dockerfile.prod -t cyrus:prod .
docker run --rm -p 8080:8080 --env-file .env cyrus:prod
```

## 🔌 API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health/live` | Liveness probe — always 200 when process is up |
| `GET` | `/health/ready` | Readiness probe — checks DB connectivity |
| `GET` | `/api/status` | Service status + live metrics snapshot |
| `GET` | `/api/ready` | API-channel readiness (same as `/health/ready`) |
| `POST` | `/api/login` | Authenticate with `ADMIN_ACCESS_CODE` or `USER_ACCESS_CODE` |
| `POST` | `/api/cyrus` | Send a message to the CYRUS AI (requires auth) |
| `GET` | `/api/demo/:capability` | Demo responses for `medical`, `robotics`, `intelligence` |

Full route inventory is in `server/routes.ts` and the per-feature route files under `server/`.

## 🛠 Troubleshooting

**App won't start / `EADDRINUSE`**
Set `CYRUS_LIVE_PORT` (or `PORT`) to a free port. Default is `3020` in dev, `8080` in production.

**`DATABASE_URL` not set warning**
The app runs without a database (in-memory fallback) but sessions and persistent data won't work. Set `DATABASE_URL` to a PostgreSQL connection string.

**AI responses return errors**
Set `OPENAI_API_KEY` in your environment. Without it the app falls back to local LLM stubs. Set `CYRUS_ENABLE_PYTHON=0` to disable Python AI services if they aren't needed.

**Health check returns 503 `degraded`**
The database is unreachable. Verify `DATABASE_URL` is correct and the PostgreSQL service is running. On Railway, ensure the database service is linked to the app service.

**CORS errors in browser**
Set `CORS_ORIGIN` to your exact frontend origin (e.g. `https://your-app.up.railway.app`). Do not include a trailing slash.

**Session not persisting**
`SESSION_SECRET` must be set and consistent across restarts. If using multiple replicas, ensure all share the same PostgreSQL session store.

## ✅ Quality Gates

```bash
npm run typecheck   # TypeScript — server + shared
npm run lint        # Alias for typecheck
npm run build       # Compile server TS + Vite frontend bundle
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built with cutting-edge AI technologies
- Inspired by the future of artificial intelligence
- Designed for maximum user benefit and safety

---

**🚀 Ready to experience super-intelligence? Deploy CYRUS today!**
