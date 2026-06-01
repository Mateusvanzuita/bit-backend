// src/config/logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { service: 'bitzy-api' },

  // Desenvolvimento: formato colorido e legível no terminal
  // Produção: JSON puro — Railway indexa automaticamente
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,service',
      },
    },
  }),
});

module.exports = logger;