// src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});

exports.aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 5,
  message: { error: 'Limite de análises por minuto atingido.' }
});

exports.generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});