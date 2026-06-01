// src/utils/cache.js
const redis = require('../config/redis');

const cache = {
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null; // se Redis falhar, segue sem cache
    }
  },

  async set(key, value, ttlSeconds = 300) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // silencioso — cache é opcional, não crítico
    }
  },

  async del(key) {
    try {
      await redis.del(key);
    } catch {}
  },

  async delPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } catch {}
  },
};

module.exports = cache;