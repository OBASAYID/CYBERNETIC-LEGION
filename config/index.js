// Central config loader for CYRUS (cloud-ready)
// Loads environment variables, validates required keys, and exports config

const requiredVars = [
  'PORT',
  'SERVER_HOST',
  'NODE_ENV',
  'PUBLIC_BASE_URL',
  'CYRUS_AI_URL',
  'REDIS_URL',
  'QUANTUM_BRIDGE_URL',
  'COMMS_ML_URL',
  'ADMIN_ACCESS_CODE',
  'USER_ACCESS_CODE',
  'ENCRYPTION_SECRET',
  'ENCRYPTION_SALT',
  'CORS_ORIGIN',
  'OPENAI_API_KEY',
  'AI_INTEGRATIONS_OPENAI_API_KEY',
  'DATABASE_URL',
];

const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const config = {
  port: process.env.PORT,
  host: process.env.SERVER_HOST,
  nodeEnv: process.env.NODE_ENV,
  publicBaseUrl: process.env.PUBLIC_BASE_URL,
  cyrusAiUrl: process.env.CYRUS_AI_URL,
  redisUrl: process.env.REDIS_URL,
  quantumBridgeUrl: process.env.QUANTUM_BRIDGE_URL,
  commsMlUrl: process.env.COMMS_ML_URL,
  adminAccessCode: process.env.ADMIN_ACCESS_CODE,
  userAccessCode: process.env.USER_ACCESS_CODE,
  encryptionSecret: process.env.ENCRYPTION_SECRET,
  encryptionSalt: process.env.ENCRYPTION_SALT,
  corsOrigin: process.env.CORS_ORIGIN,
  openaiApiKey: process.env.OPENAI_API_KEY,
  aiIntegrationsOpenaiApiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  databaseUrl: process.env.DATABASE_URL,
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  newsApiKey: process.env.NEWS_API_KEY,
};

module.exports = config;
