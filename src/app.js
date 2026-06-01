// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');
const config = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const { errorHandler, AppError } = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/rateLimiter');
const prisma = require('./config/database');

const app = express();

// ── Segurança ─────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (config.cors.allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ── Structured logging (substitui Morgan) ─────────────────────────────────────
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
  customProps: (req) => ({
    userId: req.user?.id || null,
  }),
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({
      id:     req.id,
      method: req.method,
      url:    req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  autoLogging: {
    ignore: (req) => req.url === '/api/v1/health',
  },
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/v1/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

// ── Rate limiting geral + rotas ───────────────────────────────────────────────
app.use('/api/v1', generalLimiter, routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ── Error handler global ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;