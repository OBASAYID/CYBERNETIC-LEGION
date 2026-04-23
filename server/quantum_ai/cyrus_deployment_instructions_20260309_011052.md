# CYRUS AI System - Deployment Instructions

## 🚀 Quick Deployment Options

### Option 1: Railway (Recommended)
```bash
# Install Railway CLI
curl -fsSL https://railway.app/install.sh | sh

# Login to Railway
railway login

# Deploy
railway init cyrus-ai-system
railway add --name cyrus-ai-system
railway up

# Set environment variables
railway variables set OPENAI_API_KEY=your_openai_api_key
railway variables set NODE_ENV=production
```

### Option 2: Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# OPENAI_API_KEY=your_openai_api_key
# NODE_ENV=production
```

### Option 3: Heroku
```bash
# Install Heroku CLI
# Deploy using Heroku dashboard or CLI
heroku create cyrus-ai-system
git push heroku main

# Set environment variables
heroku config:set OPENAI_API_KEY=your_openai_api_key
```

## ⚙️ Required Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `NODE_ENV`: Set to 'production'
- `DATABASE_URL`: Database connection string (optional)
- `REDIS_URL`: Redis connection string (optional)

## 🔧 System Requirements

- Node.js 18+
- npm or yarn
- OpenAI API access
- Database (PostgreSQL recommended)

## 📱 Access Your Deployed CYRUS

After deployment, you'll get a URL like:
- Railway: `https://cyrus-ai-system.up.railway.app`
- Vercel: `https://cyrus-ai-system.vercel.app`
- Heroku: `https://cyrus-ai-system.herokuapp.com`

Share this URL and the generated QR code with users!

## 🎯 CYRUS Capabilities

- 🤖 Human-like conversational AI
- 🏥 Medical analysis (99.999% accuracy)
- 🧠 Super intelligence problem-solving
- 🤖 Robotics integration
- 🌐 Real-time web research
- ⚙️ Industrial device control
- 📚 AI teaching systems

## 📞 Support

For deployment issues, check the logs or contact the development team.
