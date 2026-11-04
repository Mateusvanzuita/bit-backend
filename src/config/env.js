// src/config/env.js  (SUBSTITUI o arquivo atual: só acrescenta o portal do pet shop)
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

// Em produção, falha cedo se os segredos estiverem ausentes, curtos ou iguais.
if (isProd) {
  for (const k of ['JWT_SECRET', 'ONG_JWT_SECRET', 'PETSHOP_JWT_SECRET']) {
    if (!process.env[k] || process.env[k].length < 32) {
      throw new Error(`${k} ausente ou curto (mín. 32 caracteres)`);
    }
  }
  const segredos = [process.env.JWT_SECRET, process.env.ONG_JWT_SECRET, process.env.PETSHOP_JWT_SECRET];
  if (new Set(segredos).size !== segredos.length) {
    throw new Error('JWT_SECRET, ONG_JWT_SECRET e PETSHOP_JWT_SECRET devem ser diferentes entre si');
  }
}

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET || (isProd ? undefined : 'dev-only-secret'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  ongPortal: {
    jwtSecret: process.env.ONG_JWT_SECRET,
    accessTtl: process.env.ONG_ACCESS_TTL || '15m',
    refreshTtlDias: Number(process.env.ONG_REFRESH_TTL_DIAS || 30),
    cookieDomain: process.env.ONG_COOKIE_DOMAIN || undefined,
  },
  // Portal do pet shop (petshop.bitzy.com.br). Segredo PRÓPRIO: um token de pet shop nunca vale no app, no admin nem no portal da ONG.
  petshopPortal: {
    jwtSecret: process.env.PETSHOP_JWT_SECRET,
    accessTtl: process.env.PETSHOP_ACCESS_TTL || '15m',
    refreshTtlDias: Number(process.env.PETSHOP_REFRESH_TTL_DIAS || 30),
    // Produção: .bitzy.com.br (cookie compartilhado entre petshop.bitzy.com.br e a API). Em dev: vazio.
    cookieDomain: process.env.PETSHOP_COOKIE_DOMAIN || undefined,
  },
  cors: {
    // Se ALLOWED_ORIGINS existir, SUBSTITUI esta lista: inclua app, CRM, portal da ONG E portal do pet shop.
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
      : ['http://localhost:19006', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  },
  internalApiKey: process.env.INTERNAL_API_KEY || '',
  ongPortalUrl: (process.env.ONG_PORTAL_URL || 'http://localhost:5174').replace(/\/$/, ''),
  // Base do portal do pet shop, usada no link do convite e do "esqueci a senha" (sem barra no final).
  petshopPortalUrl: (process.env.PETSHOP_PORTAL_URL || 'http://localhost:5175').replace(/\/$/, ''),
};
