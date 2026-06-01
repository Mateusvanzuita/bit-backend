// src/config/redis.js
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null; // desiste após 3 tentativas
    return Math.min(times * 200, 1000);
  },
});

redis.on('connect', () => console.log('✅ Redis conectado'));
redis.on('error', (err) => console.error('❌ Redis erro:', err.message));

module.exports = redis;