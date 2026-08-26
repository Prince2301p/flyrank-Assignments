const express = require('express');
const router = express.Router();
const config = require('../config/env');
const { checkConnection } = require('../db/postgres');
const { pingRedis } = require('../db/redis');

// GET / - Root Metadata
router.get('/', (req, res) => {
  res.json({
    name: 'Task API (A3 Containerized)',
    version: '3.0',
    storage: config.STORAGE_TYPE,
    endpoints: [
      '/health',
      '/tasks',
      '/tasks/:id',
      '/stats'
    ]
  });
});

// GET /health - Server, PostgreSQL, and Redis Health Check
router.get('/health', async (req, res) => {
  let dbStatus = { connected: true, type: config.STORAGE_TYPE };
  
  if (config.STORAGE_TYPE === 'postgres') {
    dbStatus = await checkConnection();
    dbStatus.type = 'postgres';
  }

  const redisStatus = await pingRedis();

  const isHealthy = config.STORAGE_TYPE === 'memory' || dbStatus.connected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    storage: config.STORAGE_TYPE,
    database: dbStatus,
    redis: redisStatus
  });
});

module.exports = router;
