require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:19006', 'http://localhost:5173', 'http://localhost:5174'],
  },
  // Chave compartilhada para chamadas servidor-a-servidor vindas do
  // crm-pet-shop-backend (ex: consultar métricas do Bitzy Club a partir
  // do CRM). Nunca é exposta a clientes finais — ver middlewares/internalAuth.js.
  internalApiKey: process.env.INTERNAL_API_KEY || '',
};