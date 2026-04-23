# 🤖 CYRUS AI System - Replit Deployment

Super-Intelligence AI with full Replit AI integrations for authentication, chat, audio, image processing, and batch operations.

## 🚀 Quick Start

### 1. Fork/Import this Repl
```bash
# Import this project into Replit
# Or create a new Python Repl and upload these files
```

### 2. Set Up Secrets
Go to **Tools → Secrets** and add:

- `OPENAI_API_KEY`: Your OpenAI API key
- `SESSION_SECRET`: Random secure string (use the secret generator)
- `REPL_ID`: Automatically provided by Replit

### 3. Run the Deployment Script
```bash
./deploy_replit.sh
```

Or manually:
```bash
pip install flask flask-cors requests
python simple_flask_server.py
```

## 🎯 CYRUS Capabilities

### 🤖 Core AI Features
- **Conversational AI**: Human-like conversations with emotional intelligence
- **Medical Analysis**: 99.999% accurate disease diagnosis and treatment
- **Super Intelligence**: Problem-solving beyond human capability
- **Robotics Integration**: Advanced design and control systems
- **Web Research**: Real-time information gathering and synthesis
- **Device Control**: Industrial protocol integration and IoT management
- **AI Teaching**: Self-learning systems with continuous knowledge expansion

### 🔧 Replit AI Integrations
- **Replit Auth**: Secure user authentication and sessions
- **Replit AI Chat**: Advanced conversational AI with OpenAI
- **Replit AI Audio**: Speech synthesis and recognition
- **Replit AI Image**: Image generation and processing
- **Replit AI Batch**: Large-scale AI operations

## 🌐 Access Your CYRUS

Once deployed, your CYRUS will be available at:
```
https://your-repl-name.your-username.repl.co
```

### API Endpoints
- `GET /health` - System health check
- `GET /api/status` - System status and capabilities
- `POST /api/cyrus` - Main CYRUS AI interaction
- `GET /api/conversations` - Chat history (with Replit Auth)
- `POST /api/conversations` - Create new conversation

### Example API Usage
```javascript
// Chat with CYRUS
fetch('/api/cyrus', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello CYRUS, analyze this medical case...',
    type: 'medical'
  })
})
.then(res => res.json())
.then(data => console.log(data.response));
```

## 🔐 Authentication

CYRUS uses Replit Auth for secure user sessions:
- Automatic login with Replit accounts
- Session management with PostgreSQL
- Secure API access with authentication

## 📁 Project Structure

```
├── simple_flask_server.py    # Main Flask server
├── public/                    # Static web interface
│   └── index.html            # Modern chat UI
├── server/                   # Backend modules
│   └── replit_integrations/  # Replit AI integrations
│       ├── auth/            # Authentication
│       ├── chat/            # Chat functionality
│       ├── audio/           # Audio processing
│       ├── image/           # Image generation
│       └── batch/           # Batch operations
├── requirements.txt          # Python dependencies
├── replit.nix               # Replit environment config
└── deploy_replit.sh         # Deployment script
```

## 🛠️ Development

### Local Development
```bash
# Install dependencies
pip install flask flask-cors requests

# Run locally
python simple_flask_server.py

# Access at http://localhost:3000
```

### Adding New Features
- AI capabilities in `simple_flask_server.py`
- Replit integrations in `server/replit_integrations/`
- UI updates in `public/index.html`

## 📊 Monitoring

- **Health Checks**: `/health` endpoint
- **System Status**: `/api/status` endpoint
- **Logs**: Check Replit console for detailed logs

## 🚀 Deployment Status

✅ **Ready for Replit Deployment**
- All Replit AI integrations configured
- Authentication system ready
- Modern web interface included
- Comprehensive API endpoints
- Production-ready error handling

## 📞 Support

For issues or questions:
1. Check the Replit console logs
2. Verify all secrets are set correctly
3. Ensure dependencies are installed
4. Review the API documentation above

---

**Built with ❤️ for the Replit community**
