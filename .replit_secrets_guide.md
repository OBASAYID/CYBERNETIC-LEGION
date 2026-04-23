# CYRUS AI - Replit Secrets Setup

## Required Secrets (Add in Replit Secrets tab):

### 1. OPENAI_API_KEY
- **Value**: Your OpenAI API key
- **Purpose**: Powers CYRUS AI chat and analysis capabilities

### 2. SESSION_SECRET
- **Value**: A random secure string (generate at https://replit.com/@util/Secret-generator)
- **Purpose**: Secures user sessions for Replit Auth

### 3. REPL_ID
- **Value**: Automatically provided by Replit (don't change)
- **Purpose**: Identifies your Replit project for Auth

## Optional Secrets:

### AI_INTEGRATIONS_OPENAI_API_KEY
- **Value**: Alternative OpenAI key for Replit AI integrations
- **Purpose**: Used by Replit AI integration modules

### AI_INTEGRATIONS_OPENAI_BASE_URL
- **Value**: Custom OpenAI base URL if needed
- **Purpose**: For custom OpenAI endpoints

## How to Add Secrets:
1. Go to your Replit project
2. Click "Tools" → "Secrets"
3. Add each secret with its name and value
4. Restart your repl after adding secrets

## Verification:
After adding secrets, check the Replit console for:
```
✅ Replit Auth initialized
✅ AI Integrations loaded
```
