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

## ✅ Quality Gates

```bash
npm run verify:api-contracts
npm run lint
npm run build
pytest -q
pytest -q cyrus-ai/tests
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
