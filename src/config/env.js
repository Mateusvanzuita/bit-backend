// src/config/env.js
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

// Em produção, falha cedo se os segredos estiverem ausentes, curtos ou iguais.
if (isProd) {
  for (const k of ['JWT_SECRET', 'ONG_JWT_SECRET']) {
    if (!process.env[k] || process.env[k].length < 32) {
      throw new Error(`${k} ausente ou curto (mín. 32 caracteres)`);
    }
  }
  if (process.env.ONG_JWT_SECRET === process.env.JWT_SECRET) {
    throw new Error('ONG_JWT_SECRET deve ser diferente de JWT_SECRET');
  }
}

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    // Sem fallback em produção (a validação acima já garante que existe).
    secret: process.env.JWT_SECRET || (isProd ? undefined : 'dev-only-secret'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  ongPortal: {
    // SEGREDO PRÓPRIO, diferente do JWT_SECRET do app: um token de ONG nunca vale no app nem no admin, e vice-versa.
    // Sem fallback: se faltar, as rotas do portal respondem 503.
    jwtSecret: process.env.ONG_JWT_SECRET,
    accessTtl: process.env.ONG_ACCESS_TTL || '15m',
    refreshTtlDias: Number(process.env.ONG_REFRESH_TTL_DIAS || 30),
    // Produção: .bitzy.com.br (cookie compartilhado entre ong.bitzy.com.br e a API). Em dev: vazio.
    cookieDomain: process.env.ONG_COOKIE_DOMAIN || undefined,
  },
  cors: {
    // Se ALLOWED_ORIGINS existir, SUBSTITUI esta lista: inclua todas as origens (app, CRM e portal).
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
      : ['http://localhost:19006', 'http://localhost:5173', 'http://localhost:5174'],
  },
  // Chave compartilhada para chamadas servidor-a-servidor vindas do
  // crm-pet-shop-backend (ex: consultar métricas do Bitzy Club a partir
  // do CRM). Nunca é exposta a clientes finais — ver middlewares/internalAuth.js.
  internalApiKey: process.env.INTERNAL_API_KEY || '',
  // Base do portal das ONGs, usada no link do convite e do "esqueci a senha" (sem barra no final).
  // O portal roda em dev na porta 5174.
  ongPortalUrl: (process.env.ONG_PORTAL_URL || 'http://localhost:5174').replace(/\/$/, ''),
};