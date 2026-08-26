const Redis = require('ioredis');
const config = require('../config/env');

let redisClient = null;

function getRedisClient() {
  if (!redisClient && config.REDIS_URL) {
    try {
      redisClient = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          // Retry up to 3 times, then give up for soft health degradation
          if (times > 3) return null;
          return Math.min(times * 100, 1000);
        },
        lazyConnect: true
      });

      redisClient.on('error', (err) => {
        // Soft error handling so app stays up even if Redis is unreachable
        console.warn('Redis Connection Warning:', err.message);
      });
    } catch (err) {
      console.warn('Redis Initialization Error:', err.message);
      redisClient = null;
    }
  }
  return redisClient;
}

async function pingRedis() {
  const client = getRedisClient();
  if (!client) {
    return { status: 'disabled', message: 'Redis URL not configured' };
  }
  try {
    if (client.status === 'wait') {
      await client.connect();
    }
    const pong = await client.ping();
    return { status: 'connected', response: pong };
  } catch (err) {
    return { status: 'disconnected', error: err.message };
  }
}

async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (e) {
      redisClient.disconnect();
    }
    redisClient = null;
  }
}

module.exports = {
  getRedisClient,
  pingRedis,
  closeRedis
};
