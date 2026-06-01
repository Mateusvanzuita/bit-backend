// src/middlewares/rateLimiter.js
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const msg = (minutos) => ({
  status: 'error',
  message: `Muitas requisições. Tente novamente em ${minutos} minuto${minutos > 1 ? 's' : ''}.`,
});

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: msg(15),
  standardHeaders: true,
  legacyHeaders: false,
});

exports.registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: msg(60),
  standardHeaders: true,
  legacyHeaders: false,
});

exports.aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    status: 'error',
    message: 'Limite de consultas à IA atingido. Tente novamente em 1 hora.',
  },
  keyGenerator: (req) => {
    if (req.user?.id) return `user:${req.user.id}`;
    return ipKeyGenerator(req); // helper oficial — trata IPv6 corretamente
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: msg(60),
  standardHeaders: true,
  legacyHeaders: false,
});

exports.generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: msg(1),
  standardHeaders: true,
  legacyHeaders: false,
});